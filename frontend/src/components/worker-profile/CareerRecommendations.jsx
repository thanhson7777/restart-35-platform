import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import {
  TrendUp,
  Warning,
  Lightning,
  ArrowRight,
  Clock,
  CurrencyDollar,
  Target,
  Check,
  CircleNotch,
  ArrowClockwise,
  Sparkle,
  Database,
  ChartBar,
  Rocket,
  Path,
  Lightbulb,
  ThumbsUp,
  BookOpenText,
  X
} from '@phosphor-icons/react'
import { cn } from '~/lib/utils'
import {
  selectCareerPath,
  selectCareerPathLoading,
  selectCareerPathError,
  selectManagementTrack,
  selectAgeTransition,
  selectSkillUpgrades,
  fetchCareerPath,
  setCareerPath,
  // RAG selectors
  selectRAGRecommendation,
  selectRAGLoading,
  selectRAGError,
  selectRAGSources,
  selectBestFits,
  selectIncomeBoost,
  selectProgression,
  selectRAGGeneratedAt,
  selectRAGIsFresh,
  selectRAGIsExpired,
  triggerRAGRecommendation,
  fetchCachedRAGRecommendation,
  clearRAGRecommendation,
  // Startup selectors
  selectStartupIdeas,
  selectStartupLoading,
  selectStartupError,
  triggerStartupSuggestion,
  // Batch selectors
  selectCourseRecommendationsMap,
  selectLearningPathsMap,
  selectSkillGapsMap,
  selectCourseLoading,
  setCourseRecommendations,
  setLearningPaths,
  setSkillGaps,
  setCourseLoading,
  clearCourseRecommendations,
  // RAG Skill Gap selectors
  selectRAGSkillsGap,
  selectRAGSkillsGapLoading,
  selectCareerIntroMessage
} from '@/redux/ai/aiSlice'
import {
  getCachedCareerPathAPI,
  triggerCareerPathGenerationAPI,
  invalidateCareerPathCacheAPI,
  analyzeSkillGapsFromEscoAPI,
  getCourseRecommendationsAPI,
  getLearningPathAPI,
  getRAGSkillsGapAPI
} from '@/apis/aiAPI'
import SkillGapSection from '@/components/SkillGapSection'
import CourseRecommendationSection from '@/components/course/CourseRecommendationSection'
import LearningPathSection from '@/components/course/LearningPathSection'
import { featureFlags } from '@/config/features'

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const UrgencyBadge = ({ urgency }) => {
  const config = {
    low: { label: 'Thấp', bg: 'bg-green-100', text: 'text-green-700', icon: null },
    medium: { label: 'Trung bình', bg: 'bg-amber-100', text: 'text-amber-700', icon: null },
    high: { label: 'Cao', bg: 'bg-orange-100', text: 'text-orange-700', icon: Warning },
    critical: { label: 'Khẩn cấp', bg: 'bg-red-100', text: 'text-red-700', icon: Warning }
  }

  const { label, bg, text, icon: Icon } = config[urgency] || config.low

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  )
}

const PathCard = ({ path, type, index, skillGaps, courses, learningPath, loading, onViewAllSkills }) => {
  const pathKey = path.job_title || path.title

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.1, duration: 0.3 }
    }
  }

  const iconConfig = {
    management: { icon: TrendUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    age_transition: { icon: Warning, color: 'text-amber-500', bg: 'bg-amber-50' },
    skill_upgrade: { icon: Lightning, color: 'text-purple-500', bg: 'bg-purple-50' },
    // RAG types
    best_fit: { icon: Sparkle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    income_boost: { icon: CurrencyDollar, color: 'text-green-500', bg: 'bg-green-50' },
    progression: { icon: ChartBar, color: 'text-indigo-500', bg: 'bg-indigo-50' }
  }

  const { icon: Icon, color, bg } = iconConfig[type] || iconConfig.management

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      {/* Header: Icon + Title + Match Score */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
          <Icon size={20} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{path.job_title || path.title}</h4>
        </div>
      </div>

      {/* Content: 1 khối gộp */}
      <div className="space-y-3">
        {/* Reasoning: Tại sao gợi ý */}
        {path.reasoning?.length > 0 && (
          <div className="bg-emerald-50 rounded-lg p-3 border-l-4 border-emerald-500">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={15} weight="fill" className="text-emerald-600 shrink-0" />
              <p className="text-base font-medium text-emerald-800">Tại sao gợi ý nghề này?</p>
            </div>
            <ul className="space-y-1">
              {path.reasoning.map((reason, i) => (
                <li key={i} className="text-sm text-emerald-700 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5"><Check size={11} weight="bold" className="shrink-0" /></span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks: Lưu ý */}
        {path.risks?.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <Warning size={14} className="text-amber-600" />
              <p className="text-base font-medium text-amber-800">Lưu ý</p>
            </div>
            <ul className="space-y-1">
              {path.risks.map((risk, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">!</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skill Gaps Preview Loading */}
        {loading && (!skillGaps || skillGaps.length === 0) && (
          <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-3">
              <Target size={15} weight="duotone" className="text-orange-500 shrink-0" />
              <p className="text-base font-medium text-orange-800">Kỹ năng cần phát triển</p>
            </div>
            <div className="animate-pulse flex flex-wrap gap-2 mb-3">
              <div className="h-6 w-24 bg-orange-200/60 rounded"></div>
              <div className="h-6 w-32 bg-orange-200/60 rounded"></div>
              <div className="h-6 w-20 bg-orange-200/60 rounded"></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <CircleNotch size={12} className="animate-spin" />
              <span>Đang phân tích kỹ năng...</span>
            </div>
          </div>
        )}

        {/* Skill Gaps Preview - ESCO-based or Fallback */}
        {(skillGaps?.length > 0 || (!loading && path.required_skills?.length > 0)) && (() => {
          let sourceGaps = skillGaps?.length > 0 ? skillGaps : path.required_skills;
          // Format in case required_skills are plain strings instead of objects
          const formattedGaps = sourceGaps.map(g => {
            if (typeof g === 'string') return { skill_name: g, priority: 'important' };
            return { skill_name: g.skill_name || g.name, priority: g.priority || 'important' };
          });

          const essential = formattedGaps.filter(g => g.priority === 'essential').slice(0, 3)
          const important = formattedGaps.filter(g => g.priority === 'important').slice(0, Math.max(0, 3 - essential.length))
          const preview = [...essential, ...important].slice(0, 3)
          return (
            <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target size={15} weight="duotone" className="text-orange-500 shrink-0" />
                  <p className="text-base font-medium text-orange-800">Kỹ năng cần phát triển</p>
                </div>
                <span className="text-sm text-orange-600 font-medium bg-orange-100 px-2 py-0.5 rounded-full">
                  {formattedGaps.length} kỹ năng
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((gap, i) => (
                  <span
                    key={i}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium',
                      gap.priority === 'essential'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {gap.priority === 'essential' ? (
                      <TrendUp size={11} weight="bold" />
                    ) : (
                      <Lightning size={11} weight="fill" />
                    )}
                    {gap.skill_name}
                  </span>
                ))}
              </div>
              {formattedGaps.length > 3 && onViewAllSkills && (
                <button
                  onClick={() => onViewAllSkills(path.job_title || path.title, formattedGaps)}
                  className="mt-2 flex items-center gap-1 text-sm text-orange-700 font-semibold hover:text-orange-900 hover:underline transition-colors"
                >
                  <BookOpenText size={12} />
                  Xem tất cả {formattedGaps.length} kỹ năng
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          )
        })()}

        {/* What to Learn: Cần học thêm — thay bằng course recommendations */}
        {(courses !== undefined || loading) && (
          <CourseRecommendationSection
            courses={courses || []}
            loading={loading && (!courses || courses.length === 0)}
            skillGapTotal={(path.what_to_learn || path.learning_path || path.missing_skills)?.length || skillGaps?.length || 0}
            jobTitle={path.job_title || path.title}
          />
        )}





        {/* Preferred Skills: Kỹ năng ưu tiên (Federated API) */}
        {path.preferred_skills?.length > 0 && (
          <div className="bg-cyan-50 rounded-lg p-3 border-l-4 border-cyan-500">
            <div className="flex items-center gap-2 mb-2">
              <Sparkle size={14} className="text-cyan-600" />
              <p className="text-base font-medium text-cyan-800">Kỹ năng ưu tiên</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {path.preferred_skills.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm"
                >
                  {typeof skill === 'object' ? skill.skill_name || skill.name : skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Salary & Growth: Thông tin bổ sung (Federated API) */}
        {(path.salary_range || path.growth_outlook) && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {path.salary_range && (
              <div className="flex items-center gap-1">
                <CurrencyDollar size={12} />
                <span>{path.salary_range}</span>
              </div>
            )}
            {path.growth_outlook && (
              <div className="flex items-center gap-1">
                <TrendUp size={12} />
                <span>{path.growth_outlook}</span>
              </div>
            )}
          </div>
        )}


        {/* Legacy: Description fallback if no reasoning */}
        {!path.reasoning?.length > 0 && path.description && (
          <p className="text-base text-muted-foreground">{path.description}</p>
        )}

        {/* Legacy: Pros/Cons fallback */}
        {(path.pros?.length > 0 || path.cons?.length > 0) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {path.pros?.length > 0 && (
              <div>
                <p className="text-green-600 font-medium mb-1">Ưu điểm:</p>
                <ul className="text-slate-600 space-y-0.5">
                  {path.pros.slice(0, 2).map((pro, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-green-500">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {path.cons?.length > 0 && (
              <div>
                <p className="text-amber-600 font-medium mb-1">Lưu ý:</p>
                <ul className="text-slate-600 space-y-0.5">
                  {path.cons.slice(0, 2).map((con, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-500">!</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Leverage Experience (Startup) */}
        {path.leverage_experience && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 leading-relaxed">
              {path.leverage_experience}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

const SectionHeader = ({ title, icon: Icon, count }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-primary" />}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  </div>
)

const LoadingState = ({ isRAG }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <CircleNotch size={32} className="text-primary animate-spin mb-3" />
    <p className="text-sm text-muted-foreground">
      {isRAG ? 'Đang phân tích với AI...' : 'Đang phân tích lộ trình sự nghiệp...'}
    </p>
  </div>
)

const EmptyState = ({ onRetry, type, missingAge }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
      {type === 'rag' || type === 'career' ? (
        <Sparkle size={24} className="text-slate-400" />
      ) : type === 'startup' ? (
        <Rocket size={24} className="text-slate-400" />
      ) : (
        <TrendUp size={24} className="text-slate-400" />
      )}
    </div>
    <p className="text-sm text-muted-foreground mb-3 max-w-sm">
      {missingAge
        ? 'Vui lòng cập nhật độ tuổi trong hồ sơ của bạn để AI có thể đưa ra gợi ý phù hợp.'
        : type === 'rag' || type === 'career'
        ? 'Chưa có gợi ý từ AI'
        : type === 'startup'
          ? 'Chưa có gợi ý lập nghiệp'
          : 'Chưa có gợi ý lộ trình sự nghiệp'}
    </p>
    {!missingAge && onRetry && (
      <button
        onClick={onRetry}
        className="text-sm text-primary hover:underline"
      >
        Thử lại
      </button>
    )}
  </div>
)

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
      <Warning size={24} className="text-red-400" />
    </div>
    <p className="text-sm text-red-600 mb-2">Đã xảy ra lỗi</p>
    <p className="text-xs text-muted-foreground mb-3">{error}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm text-primary hover:underline"
      >
        Thử lại
      </button>
    )}
  </div>
)

// ============================================================================
// STARTUP CARD COMPONENT
// ============================================================================

const StartupCard = ({ idea, index, onViewAllSkills, courses, learningPath, loading }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.1, duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      {/* Header: Rocket icon + Name + Match Score */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Rocket size={20} className="text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground">{idea.name}</h4>
          </div>
        </div>
      </div>

      {/* Content: 1 khối gộp */}
      <div className="space-y-3">
        {/* Reasoning: Tại sao gợi ý */}
        {idea.reasoning?.length > 0 && (
          <div className="bg-emerald-50 rounded-lg p-3 border-l-4 border-emerald-500">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={15} weight="fill" className="text-emerald-600 shrink-0" />
              <p className="text-base font-medium text-emerald-800">Tại sao gợi ý ý tưởng này?</p>
            </div>
            <ul className="space-y-1">
              {idea.reasoning.map((reason, i) => (
                <li key={i} className="text-sm text-emerald-700 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5"><Check size={11} weight="bold" className="shrink-0" /></span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks: Lưu ý */}
        {idea.risks?.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <Warning size={14} className="text-amber-600" />
              <p className="text-base font-medium text-amber-800">Lưu ý</p>
            </div>
            <ul className="space-y-1">
              {idea.risks.map((risk, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">!</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skill Gaps Preview - Startup-specific */}
        {idea.required_skills?.length > 0 && (() => {
          const essential = idea.required_skills.filter(s => s.priority === 'essential').slice(0, 3)
          const important = idea.required_skills.filter(s => s.priority === 'important').slice(0, Math.max(0, 3 - essential.length))
          const preview = [...essential, ...important].slice(0, 3)
          return (
            <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target size={15} weight="duotone" className="text-orange-500 shrink-0" />
                  <p className="text-base font-medium text-orange-800">Kỹ năng cần phát triển</p>
                </div>
                <span className="text-sm text-orange-600 font-medium bg-orange-100 px-2 py-0.5 rounded-full">
                  {idea.required_skills.length} kỹ năng
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((skill, i) => (
                  <span
                    key={i}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                      skill.priority === 'essential'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {skill.priority === 'essential' ? (
                      <TrendUp size={11} weight="bold" />
                    ) : (
                      <Lightning size={11} weight="fill" />
                    )}
                    {skill.skill_name}
                  </span>
                ))}
              </div>
              {idea.required_skills.length > 3 && onViewAllSkills && (
                <button
                  onClick={() => onViewAllSkills(idea.name, idea.required_skills)}
                  className="mt-2 flex items-center gap-1 text-sm text-orange-700 font-semibold hover:text-orange-900 hover:underline transition-colors"
                >
                  <BookOpenText size={12} />
                  Xem tất cả {idea.required_skills.length} kỹ năng
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          )
        })()}

        {/* What to Learn: Cần học thêm — thay bằng course recommendations */}
        {(courses !== undefined || loading) && (
          <CourseRecommendationSection
            courses={courses || []}
            loading={loading && (!courses || courses.length === 0)}
            skillGapTotal={idea.required_skills?.length || idea.what_to_learn?.length || 0}
            jobTitle={idea.name}
          />
        )}

        {/* Legacy: Description fallback if no reasoning */}
        {!idea.reasoning?.length > 0 && idea.description && (
          <p className="text-base text-muted-foreground">{idea.description}</p>
        )}

        {/* Legacy: leverage_experience fallback */}
        {idea.leverage_experience && (
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Tận dụng kinh nghiệm:</span> {idea.leverage_experience}
            </p>
          </div>
        )}
      </div>


    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CareerRecommendations({ className, userProfile }) {
  const dispatch = useDispatch()

  // Legacy career path state
  const careerPath = useSelector(selectCareerPath)
  const isLoadingLegacy = useSelector(selectCareerPathLoading)
  const errorLegacy = useSelector(selectCareerPathError)
  const managementTrack = useSelector(selectManagementTrack)
  const ageTransition = useSelector(selectAgeTransition)
  const skillUpgrades = useSelector(selectSkillUpgrades)

  // RAG state
  const ragRecommendation = useSelector(selectRAGRecommendation)
  const isLoadingRAG = useSelector(selectRAGLoading)
  const errorRAG = useSelector(selectRAGError)
  const ragSources = useSelector(selectRAGSources)
  const bestFits = useSelector(selectBestFits)
  const incomeBoost = useSelector(selectIncomeBoost)
  const progression = useSelector(selectProgression)
  const careerIntroMessage = useSelector(selectCareerIntroMessage)
  // Startup state
  const ragIsFresh = useSelector(selectRAGIsFresh)
  const ragIsExpired = useSelector(selectRAGIsExpired)

  // Startup state
  const startupIdeas = useSelector(selectStartupIdeas)
  const startupLoading = useSelector(selectStartupLoading)
  const startupError = useSelector(selectStartupError)

  // RAG Skill Gap state
  const ragSkillsGap = useSelector(selectRAGSkillsGap)
  const ragSkillsGapLoading = useSelector(selectRAGSkillsGapLoading)

  // Batch course/learning-path from Redux
  const courseRecommendationsMap = useSelector(selectCourseRecommendationsMap)
  const learningPathsMap = useSelector(selectLearningPathsMap)
  const skillGapsMapRedux = useSelector(selectSkillGapsMap)
  const courseLoading = useSelector(selectCourseLoading)

  // Local state
  const [dataSource, setDataSource] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null)
  const [activeTab, setActiveTab] = useState('career') // 'career' | 'skills'
  const [selectedCareerPath, setSelectedCareerPath] = useState(null)

  // Skill Gap Modal state
  const [skillModal, setSkillModal] = useState({ isOpen: false, occupation: null, result: null })
  const handleOpenSkillModal = (occupation, result) => setSkillModal({ isOpen: true, occupation, result })
  const handleCloseSkillModal = () => setSkillModal({ isOpen: false, occupation: null, result: null })

  // Startup Skill Gap Modal state
  const [startupSkillModal, setStartupSkillModal] = useState({ isOpen: false, startupName: null, skills: null })
  const handleOpenStartupSkillModal = (startupName, skills) => setStartupSkillModal({ isOpen: true, startupName, skills })
  const handleCloseStartupSkillModal = () => setStartupSkillModal({ isOpen: false, startupName: null, skills: null })

  const profileData = userProfile || careerPath?.user_profile
  // Check if user wants to see startup suggestions (robust check for all formats)
  const wantsToStartBusiness = 
    profileData?.aspirations?.wants_to_start_business ||
    profileData?.aspirations?.wantsToStartBusiness ||
    profileData?.wantsToStartBusiness ||
    userProfile?.aspirations?.wantsToStartBusiness || 
    false

  // Refs to prevent infinite loops
  const hasFetchedRAG = useRef(false)
  const hasFetchedLegacy = useRef(false)
  const hasFetchedStartup = useRef(false)
  const prevProfileRef = useRef(null)

  // Helper to create a hash of the full profile for change detection
  const getProfileHash = (profile) => {
    if (!profile) return null
    return JSON.stringify({
      basicInfo: profile.basicInfo,
      aspirations: profile.aspirations,
      barriers: profile.barriers,
      employmentHistory: profile.employmentHistory,
      // Also include top-level fields (from users collection)
      age: profile.age,
      gender: profile.gender,
      province: profile.province,
      education: profile.education
    })
  }

  // Update prevProfileRef BEFORE comparison (so first render has correct baseline)
  useEffect(() => {
    const currentProfile = userProfile || careerPath?.user_profile
    if (!currentProfile) return
    const currentProfileHash = getProfileHash(currentProfile)
    prevProfileRef.current = currentProfileHash
  }, [userProfile, careerPath])

  // Detect profile changes and reset fetch flags
  useEffect(() => {
    const currentProfile = userProfile || careerPath?.user_profile
    if (!currentProfile) return

    // Create a hash of the full profile (not just employmentHistory)
    const currentProfileHash = getProfileHash(currentProfile)
    const prevProfileHash = prevProfileRef.current

    // Reset fetch flags if ANY part of the profile changed
    // Note: prevProfileHash is already updated at the start of the effect,
    // so we compare against the value from the previous render
    if (prevProfileHash !== null && prevProfileHash !== currentProfileHash) {
      console.log('[Profile Change] Detected - resetting RAG cache flags')
      hasFetchedRAG.current = false
      hasFetchedLegacy.current = false
      hasFetchedStartup.current = false
    }
  }, [userProfile, careerPath])

  // Check if user is logged in
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('accessToken')

  const hasLegacyData = managementTrack.length > 0 || ageTransition.length > 0 || skillUpgrades.length > 0
  const hasRAGData = bestFits.length > 0 || incomeBoost.length > 0 || progression.length > 0

  // Build profile data for API calls
  // Handle both formData structure and direct profile structure
  const buildProfileData = (profile) => {
    // Case 1: formData structure from profileSlice
    if (profile.basicInfo || profile.employmentHistory) {
      const basicInfo = profile.basicInfo || {}

      // Transform employmentHistory to experiences format
      const experiences = (Array.isArray(profile.employmentHistory) ? profile.employmentHistory : []).map(exp => ({
        industry: exp.industry,
        role: exp.position || exp.role || exp.current_role,
        years: exp.duration ? Math.floor(exp.duration / 12) : (exp.years || 0),
        skills: exp.skills || []
      }))

      const aspirations = profile.aspirations || {}

      return {
        basicInfo: {
          age: basicInfo.age || profile.age,
          gender: basicInfo.gender || profile.gender,
          province: basicInfo.province || basicInfo.location || profile.province,
          education: basicInfo.education || profile.education
        },
        employmentHistory: experiences,
        aspirations: {
          targetJob: aspirations.target_job || aspirations.targetJob,
          targetIndustry: aspirations.target_industry || aspirations.targetIndustry,
          skills: aspirations.skills || aspirations.desired_skills || [],
          targetSalary: aspirations.target_salary || aspirations.targetSalary
        },
        barriers: profile.barriers || {},
        interests: profile.interests || []
      }
    }

    // Case 2: Direct profile structure (flattened)
    return {
      basicInfo: {
        age: profile.age,
        gender: profile.gender,
        province: profile.province || profile.location,
        education: profile.education
      },
      employmentHistory: profile.experiences?.map(exp => ({
        industry: exp.industry,
        role: exp.role || exp.current_role,
        years: exp.years,
        skills: exp.skills || []
      })) || [],
      aspirations: {
        targetJob: profile.target_job || profile.targetJob,
        targetIndustry: profile.target_industry || profile.targetIndustry,
        skills: profile.desired_skills || profile.skills || [],
        targetSalary: profile.target_salary || profile.targetSalary
      },
      barriers: profile.barriers || {},
      interests: profile.interests || []
    }
  }

  // Fetch RAG recommendation
  const fetchRAGData = async (profile) => {
    try {
      // Check if user is logged in (has token)
      const token = localStorage.getItem('accessToken')
      if (!token) {
        console.error('[RAG] No access token found - user not logged in')
        return
      }

      // First try to get cached data
      const cachedResult = await dispatch(fetchCachedRAGRecommendation()).unwrap()

      if (cachedResult?.success && cachedResult?.data) {
        setDataSource('cache')
        setLastGenerated(cachedResult.meta?.generatedAt)
        return
      }

      // No cached data - trigger new generation
      if (cachedResult?.meta?.hasData === false) {
        const profileData = buildProfileData(profile)
        console.log('[RAG] No cache, triggering new RAG recommendation with:', profileData)
        await dispatch(triggerRAGRecommendation({ profile: profileData })).unwrap()
        setDataSource('fresh')
        setLastGenerated(new Date())
      }
    } catch (err) {
      // Log detailed error info
      console.error('[RAG] Error fetching data:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      })

      // Fallback: try legacy career path if RAG fails
      try {
        const profileData = userProfile || careerPath?.user_profile
        if (profileData?.age) {
          console.log('[RAG] Falling back to legacy career path...')
          dispatch(fetchCareerPath({
            age: profileData.age,
            experiences: profileData.experiences || [],
            current_role: profileData.currentRole,
            current_industry: profileData.currentIndustry,
            include_age_transition: true,
            include_management_track: true
          }))
        }
      } catch (legacyErr) {
        console.error('[RAG] Legacy fallback also failed:', legacyErr)
      }
    }
  }

  // Fetch legacy career path
  const fetchFromCache = async (profileData) => {
    try {
      const result = await getCachedCareerPathAPI()

      if (result.success) {
        setDataSource(result.source)
        setLastGenerated(result.data?.generatedAt)

        if (result.data?.careerPath) {
          dispatch(setCareerPath(result.data.careerPath))
        }
        console.log(`[Cache] Career path loaded from ${result.source}`)
        return
      }

      if (result.needsGeneration) {
        await triggerGeneration(profileData)
      }
    } catch (err) {
      console.error('[Cache] Error fetching from cache')
      dispatch(fetchCareerPath({
        age: profileData.age,
        experiences: profileData.experiences || [],
        current_role: profileData.currentRole,
        current_industry: profileData.currentIndustry,
        include_age_transition: true,
        include_management_track: true
      }))
    }
  }

  // Trigger new career path generation
  const triggerGeneration = async (profileData) => {
    setIsRefreshing(true)
    try {
      const result = await triggerCareerPathGenerationAPI(profileData)

      if (result.success) {
        setDataSource('fresh')
        setLastGenerated(new Date())
        dispatch(setCareerPath(result.data))
      }
    } catch (err) {
      console.error('[Generation] Error')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Batch fetch all data after RAG completes (ESCO + courses + learning paths)
  const fetchAllCareerData = async (profileData) => {
    const rawHistory = profileData?.employmentHistory || profileData?.employment_history
    const employmentHistory = Array.isArray(rawHistory) ? rawHistory : []
    const userSkills = []

    for (const exp of employmentHistory) {
      if (exp.skills && Array.isArray(exp.skills)) {
        for (const skill of exp.skills) {
          if (typeof skill === 'string') userSkills.push(skill)
          else if (skill?.name) userSkills.push(skill.name)
          else if (skill?.titleVi) userSkills.push(skill.titleVi)
          else if (skill?.titleEn) userSkills.push(skill.titleEn)
        }
      }
    }

    // If still empty, try to get from general profile
    if (userSkills.length === 0) {
      const generalSkills = profileData?.skills || profileData?.basicInfo?.skills || profileData?.aspirations?.skills || []
      if (Array.isArray(generalSkills)) {
        for (const skill of generalSkills) {
          if (typeof skill === 'string') userSkills.push(skill)
          else if (skill?.name) userSkills.push(skill.name)
        }
      }
    }
    const occupationSet = new Set()
      ;[...bestFits, ...incomeBoost, ...progression, ...startupIdeas].forEach(item => {
        const title = item.job_title || item.title || item.name || ''
        if (title && !courseRecommendationsMap[title]) occupationSet.add(title)
      })
    if (Array.isArray(employmentHistory) && employmentHistory.length > 0) {
      const empOcc = employmentHistory[0].occupation?.titleVi || employmentHistory[0].occupation?.titleEn || employmentHistory[0].role || employmentHistory[0].jobTitle || employmentHistory[0].position || ''
      if (empOcc && !courseRecommendationsMap[empOcc]) occupationSet.add(empOcc)
    }
    const occupations = Array.from(occupationSet).slice(0, 15)
    if (occupations.length === 0) return

    const age = profileData?.basicInfo?.age || profileData?.age || 30
    const careerContext = {
      industry: profileData?.basicInfo?.industry || profileData?.industry || '',
      userStrengths: profileData?.strengths || [],
      aspirations: profileData?.aspirations || {},
      barriers: { age, ...(profileData?.barriers || {}) }
    }

    dispatch(setCourseLoading(true))

    // Step 1: Batch ESCO skill gaps (parallel)
    const escResults = await Promise.all(
      occupations.map(occ =>
        analyzeSkillGapsFromEscoAPI(userSkills, occ, age, 15, careerContext).catch(() => null)
      )
    )
    const skillGapsObj = { ...skillGapsMapRedux }
    escResults.forEach((r, i) => {
      if (r?.success) skillGapsObj[occupations[i]] = r
    })
    dispatch(setSkillGaps(skillGapsObj))

    const allGaps = Object.values(skillGapsObj).flatMap(r => r?.skill_gaps || []).slice(0, 15)
    const fallbackGaps = allGaps.map(g => ({ skill_name: g.skill_name, priority: g.priority }))

    // Step 2: Batch course recommendations + learning paths (parallel)
    const [courseResults, learningPathResults] = await Promise.all([
      Promise.all(occupations.map(occ => {
        const startupIdea = startupIdeas.find(idea => idea.name === occ)
        let occGaps = []
        if (startupIdea && startupIdea.required_skills?.length > 0) {
          occGaps = startupIdea.required_skills
            .slice(0, 15)
            .map(g => ({ skill_name: g.skill_name, priority: g.priority }))
        } else {
          occGaps = (skillGapsObj[occ]?.skill_gaps || [])
            .slice(0, 15)
            .map(g => ({ skill_name: g.skill_name, priority: g.priority }))
        }
        const targetGaps = occGaps.length > 0 ? occGaps : fallbackGaps
        return getCourseRecommendationsAPI({ skill_gaps: targetGaps, limit: 5 }).catch(() => null)
      })),
      Promise.all(occupations.map(occ => {
        const startupIdea = startupIdeas.find(idea => idea.name === occ)
        let occGaps = []
        if (startupIdea && startupIdea.required_skills?.length > 0) {
          occGaps = startupIdea.required_skills
            .slice(0, 15)
            .map(g => ({ skill_name: g.skill_name, priority: g.priority }))
        } else {
          occGaps = (skillGapsObj[occ]?.skill_gaps || [])
            .slice(0, 15)
            .map(g => ({ skill_name: g.skill_name, priority: g.priority }))
        }
        const targetGaps = occGaps.length > 0 ? occGaps : fallbackGaps
        return getLearningPathAPI({ skill_gaps: targetGaps, job_title: occ, max_steps: 5 }).catch(() => null)
      }))
    ])

    const courseMap = { ...courseRecommendationsMap }
    courseResults.forEach((r, i) => {
      courseMap[occupations[i]] = r?.courses || []
    })
    dispatch(setCourseRecommendations(courseMap))

    const learningPathMap = { ...learningPathsMap }
    learningPathResults.forEach((r, i) => {
      learningPathMap[occupations[i]] = r?.learning_path || null
    })
    dispatch(setLearningPaths(learningPathMap))

    dispatch(setCourseLoading(false))
  }

  // Trigger batch fetch when RAG data or Startup data is available
  useEffect(() => {
    if (!userProfile) return

    const occupationSet = new Set()
    ;[...bestFits, ...incomeBoost, ...progression, ...startupIdeas].forEach(item => {
      const title = item.job_title || item.title || item.name || ''
      if (title && !courseRecommendationsMap[title]) {
        occupationSet.add(title)
      }
    })

    if (occupationSet.size === 0) return
    if (courseLoading) return

    fetchAllCareerData(userProfile)
  }, [bestFits, incomeBoost, progression, startupIdeas, userProfile, courseRecommendationsMap, courseLoading])

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)

      // Get profile data - from props first, then from Redux state
      const profileData = userProfile || careerPath?.user_profile
      const hasAge = profileData?.basicInfo?.age || profileData?.age

      if (!hasAge) {
        console.log('[Refresh] No profile data available')
        return
      }

      // Invalidate legacy cache
      await invalidateCareerPathCacheAPI()

      if (activeTab === 'career') {
        // Refresh career data
        const ragProfile = buildProfileData(profileData)
        console.log('[Refresh] Triggering RAG with profile:', ragProfile)
        await dispatch(triggerRAGRecommendation({ profile: ragProfile })).unwrap()
        setDataSource('fresh')
        setLastGenerated(new Date())
      } else if (activeTab === 'startup') {
        // Refresh startup data
        const startupProfile = buildProfileData(profileData)
        console.log('[Refresh] Triggering startup with profile:', startupProfile)
        hasFetchedStartup.current = false
        dispatch(triggerStartupSuggestion({ profile: startupProfile }))
      }
    } catch (err) {
      console.error('[Refresh] Error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch data based on active tab
  useEffect(() => {
    // Reset flags when switching between tabs
    hasFetchedRAG.current = false
    hasFetchedLegacy.current = false
    hasFetchedStartup.current = false
    dispatch(clearCourseRecommendations())
    prevProfileRef.current = null

    // Fetch data based on active tab
    const profileData = userProfile || careerPath?.user_profile
    const hasAge = profileData?.basicInfo?.age || profileData?.age

    if (!isLoggedIn || !hasAge) return

    if (activeTab === 'career' && !hasFetchedRAG.current) {
      hasFetchedRAG.current = true
      fetchRAGData(profileData)
    }
    // Fetch startup when viewing career tab AND user wants to start business
    if (activeTab === 'career' && wantsToStartBusiness && !hasFetchedStartup.current && startupIdeas.length === 0) {
      hasFetchedStartup.current = true
      const profile = buildProfileData(profileData)
      dispatch(triggerStartupSuggestion({ profile }))
    }
  }, [activeTab, isLoggedIn, wantsToStartBusiness, startupIdeas.length, userProfile, dispatch])

  // Trigger ESCO skill gaps AFTER bestFits is populated (now handled inside fetchAllCareerData)

  const handleRetry = () => {
    // Reset flags for retry based on current tab
    if (activeTab === 'career') {
      hasFetchedRAG.current = false
      hasFetchedLegacy.current = false
      // Also reset startup if wantsToStartBusiness is true
      if (wantsToStartBusiness) {
        hasFetchedStartup.current = false
      }
    }
    handleRefresh()
  }

  // Determine which loading/error state to show based on active tab
  const isLoading = isLoadingRAG || startupLoading
  const error = errorRAG || startupError
  const hasData = hasLegacyData || hasRAGData

  const profileDataForRender = userProfile || careerPath?.user_profile
  const hasAgeForRender = profileDataForRender?.basicInfo?.age || profileDataForRender?.age

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <LoadingState isRAG={true} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
            <Warning size={24} className="text-amber-500" />
          </div>
          <p className="text-sm text-amber-600 mb-2">Vui lòng đăng nhập</p>
          <p className="text-xs text-muted-foreground mb-3">
            Bạn cần đăng nhập để xem lộ trình sự nghiệp
          </p>
        </div>
      </div>
    )
  }

  if (!hasData && !careerPath && !ragRecommendation) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <EmptyState onRetry={handleRetry} type={activeTab} missingAge={!hasAgeForRender} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Content */}

      {/* Tab 1: Lộ trình nghề nghiệp */}
      {activeTab === 'career' && (
        <div className="space-y-6">
          {/* RAG Sources */}
          {ragSources.length > 0 && (
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Nguồn dữ liệu RAG</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ragSources.map((source, i) => (
                  <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-700">
                    {source.replace('.json', '')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Best Fits */}
          {bestFits.length > 0 && (
            <div>
              <SectionHeader
                title="Gợi ý phù hợp nhất"
                icon={Sparkle}
                count={bestFits.length}
              />
              <div className="space-y-3">
                {bestFits.map((path, index) => {
                  const occKey = path.job_title || path.title
                  const gaps = skillGapsMapRedux[occKey]?.skill_gaps || []
                  const courses = courseRecommendationsMap[occKey] || []
                  const learningPath = learningPathsMap[occKey] || null
                  return (
                    <PathCard
                      key={`best-fit-${index}`}
                      path={path}
                      type="best_fit"
                      index={index}
                      skillGaps={gaps}
                      courses={courses}
                      learningPath={learningPath}
                      loading={courseLoading}
                      onViewAllSkills={handleOpenSkillModal}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Income Boost */}
          {incomeBoost.length > 0 && (
            <div>
              <SectionHeader
                title="Tăng thu nhập nhanh"
                icon={CurrencyDollar}
                count={incomeBoost.length}
              />
              <div className="space-y-3">
                {incomeBoost.map((path, index) => {
                  const occKey = path.job_title || path.title
                  const gaps = skillGapsMapRedux[occKey]?.skill_gaps || []
                  const courses = courseRecommendationsMap[occKey] || []
                  const learningPath = learningPathsMap[occKey] || null
                  return (
                    <PathCard
                      key={`income-${index}`}
                      path={path}
                      type="income_boost"
                      index={index}
                      skillGaps={gaps}
                      courses={courses}
                      learningPath={learningPath}
                      loading={courseLoading}
                      onViewAllSkills={handleOpenSkillModal}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Progression */}
          {progression.length > 0 && (
            <div>
              <SectionHeader
                title="Lộ trình phát triển"
                icon={ChartBar}
                count={progression.length}
              />
              <div className="space-y-3">
                {progression.map((path, index) => {
                  const occKey = path.job_title || path.title
                  const gaps = skillGapsMapRedux[occKey]?.skill_gaps || []
                  const courses = courseRecommendationsMap[occKey] || []
                  const learningPath = learningPathsMap[occKey] || null
                  return (
                    <PathCard
                      key={`progression-${index}`}
                      path={path}
                      type="progression"
                      index={index}
                      skillGaps={gaps}
                      courses={courses}
                      learningPath={learningPath}
                      loading={courseLoading}
                      onViewAllSkills={handleOpenSkillModal}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Startup Section - Chỉ hiển thị khi wantsToStartBusiness = true */}
          {wantsToStartBusiness && (
            <div>
              <SectionHeader
                title="Gợi ý lập nghiệp"
                icon={Rocket}
                count={startupIdeas.length}
              />
              {startupLoading ? (
                <LoadingState isRAG={false} />
              ) : startupError ? (
                <ErrorState error={startupError} onRetry={handleRetry} />
              ) : startupIdeas.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {startupIdeas.map((idea, i) => (
                    <StartupCard 
                      key={`startup-${i}`} 
                      idea={idea} 
                      index={i} 
                      courses={courseRecommendationsMap[idea.name]}
                      learningPath={learningPathsMap[idea.name]}
                      loading={courseLoading}
                      onViewAllSkills={handleOpenStartupSkillModal} 
                    />
                  ))}
                  </div>
                </div>
              ) : (
                <EmptyState type="startup" missingAge={!hasAgeForRender} />
              )}
            </div>
          )}

          {/* Show empty state if no RAG data */}
          {bestFits.length === 0 && incomeBoost.length === 0 && progression.length === 0 && !isLoadingRAG && !errorRAG && (
            <EmptyState type="rag" missingAge={!hasAgeForRender} />
          )}
        </div>
      )}

      {/* Skill Gap Modal */}
      {skillModal.isOpen && skillModal.occupation && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleCloseSkillModal}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="shrink-0 p-5 border-b bg-orange-50/70">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={18} weight="duotone" className="text-orange-500 shrink-0" />
                      <h2 className="text-lg font-semibold text-foreground">
                        Kỹ năng cần phát triển
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vị trí: <span className="font-medium text-foreground">{skillModal.occupation}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleCloseSkillModal}
                    className="shrink-0 p-2 rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-colors"
                  >
                    <X size={18} weight="bold" className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5">
                <SkillGapSection
                  occupation={skillModal.occupation}
                  result={{ skill_gaps: skillModal.result }}
                  showFilters={true}
                  showTrending={false}
                  showSoftSkills={false}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Refresh button */}
      {/* Startup Skill Gap Modal */}
      {startupSkillModal.isOpen && startupSkillModal.startupName && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={handleCloseStartupSkillModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="shrink-0 p-5 border-b bg-orange-50/70">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={18} weight="duotone" className="text-orange-500 shrink-0" />
                      <h2 className="text-lg font-semibold text-foreground">Kỹ năng cần phát triển</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ý tưởng: <span className="font-medium text-foreground">{startupSkillModal.startupName}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleCloseStartupSkillModal}
                    className="shrink-0 p-2 rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-colors"
                  >
                    <X size={18} weight="bold" className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <SkillGapSection
                  occupation={startupSkillModal.startupName}
                  result={{ skill_gaps: startupSkillModal.skills }}
                  showFilters={true}
                  showTrending={false}
                  showSoftSkills={false}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-center pt-4 border-t border-border">
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
          <Warning size={14} className="shrink-0" />
          Lưu ý: Đây là gợi ý từ AI, bạn nên cân nhắc trước khi áp dụng
        </div>
      </div>
    </div>
  )
}

export default CareerRecommendations
