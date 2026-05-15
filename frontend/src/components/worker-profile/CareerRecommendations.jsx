import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  ArrowRight,
  Clock,
  DollarSign,
  Target,
  Loader2,
  RefreshCw,
  Sparkles,
  Database,
  BarChart3,
  Rocket,
  Brain,
  Route
} from 'lucide-react'
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
  // Skills Gap selectors
  selectSkillsGap,
  selectSkillsGapLoading,
  selectSkillsGapError,
  triggerSkillsGapAnalysis
} from '@/redux/ai/aiSlice'
import {
  getCachedCareerPathAPI,
  triggerCareerPathGenerationAPI,
  invalidateCareerPathCacheAPI
} from '@/apis/aiAPI'

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const UrgencyBadge = ({ urgency }) => {
  const config = {
    low: { label: 'Thấp', bg: 'bg-green-100', text: 'text-green-700', icon: null },
    medium: { label: 'Trung bình', bg: 'bg-amber-100', text: 'text-amber-700', icon: null },
    high: { label: 'Cao', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
    critical: { label: 'Khẩn cấp', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle }
  }

  const { label, bg, text, icon: Icon } = config[urgency] || config.low

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  )
}

const PathCard = ({ path, type, index }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.1, duration: 0.3 }
    }
  }

  const iconConfig = {
    management: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    age_transition: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
    skill_upgrade: { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' },
    // RAG types
    best_fit: { icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    income_boost: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
    progression: { icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-50' }
  }

  const { icon: Icon, color, bg } = iconConfig[type] || iconConfig.management

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
          <Icon size={20} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground truncate">{path.job_title || path.title}</h4>
            {path.urgency && <UrgencyBadge urgency={path.urgency} />}
            {path.match_score && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Match: {(path.match_score * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {path.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {path.description}
            </p>
          )}

          {/* Salary & Timeline */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {path.salary_range?.display && (
              <span className="inline-flex items-center gap-1">
                <DollarSign size={12} />
                {path.salary_range.display}
              </span>
            )}
            {path.salary_range && !path.salary_range?.display && (
              <span className="inline-flex items-center gap-1">
                <DollarSign size={12} />
                {path.salary_range}
              </span>
            )}
            {path.timeline_months > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {path.timeline_months} tháng
              </span>
            )}
            {path.timeline && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {path.timeline}
              </span>
            )}
            {path.score > 0 && (
              <span className="inline-flex items-center gap-1">
                <Target size={12} />
                Score: {path.score.toFixed(1)}
              </span>
            )}
          </div>

          {/* Learning Path (RAG) */}
          {path.learning_path?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1.5">Lộ trình học tập:</p>
              <div className="flex flex-wrap gap-1.5">
                {path.learning_path.slice(0, 4).map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs"
                  >
                    <ArrowRight size={10} />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills (Legacy) */}
          {path.missing_skills?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1.5">Cần học thêm:</p>
              <div className="flex flex-wrap gap-1.5">
                {path.missing_skills.slice(0, 4).map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary rounded text-xs"
                  >
                    <ArrowRight size={10} />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources (RAG) */}
          {path.sources?.length > 0 && (
            <div className="mt-3 flex items-center gap-1">
              <Database size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Nguồn: {path.sources.join(', ')}
              </span>
            </div>
          )}

          {/* Leverage Experience (Startup) */}
          {path.leverage_experience && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 leading-relaxed">
                {path.leverage_experience}
              </p>
            </div>
          )}

          {/* Pros/Cons */}
          {(path.pros?.length > 0 || path.cons?.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
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
        </div>
      </div>
    </motion.div>
  )
}

const SectionHeader = ({ title, subtitle, icon: Icon, count }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-primary" />}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
    {subtitle && (
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    )}
  </div>
)

const LoadingState = ({ isRAG }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Loader2 size={32} className="text-primary animate-spin mb-3" />
    <p className="text-sm text-muted-foreground">
      {isRAG ? 'Đang phân tích với AI...' : 'Đang phân tích lộ trình sự nghiệp...'}
    </p>
  </div>
)

const EmptyState = ({ onRetry, type }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
      {type === 'rag' || type === 'career' ? (
        <Sparkles size={24} className="text-slate-400" />
      ) : type === 'startup' ? (
        <Rocket size={24} className="text-slate-400" />
      ) : type === 'skills' ? (
        <Brain size={24} className="text-slate-400" />
      ) : (
        <TrendingUp size={24} className="text-slate-400" />
      )}
    </div>
    <p className="text-sm text-muted-foreground mb-3">
      {type === 'rag' || type === 'career'
        ? 'Chưa có gợi ý từ AI'
        : type === 'startup'
          ? 'Chưa có gợi ý khởi nghiệp'
          : type === 'skills'
            ? 'Chưa có phân tích kỹ năng'
            : 'Chưa có gợi ý lộ trình sự nghiệp'}
    </p>
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

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
      <AlertTriangle size={24} className="text-red-400" />
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

const StartupCard = ({ idea, index }) => {
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
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Rocket size={20} className="text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{idea.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <DollarSign size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground">Vốn:</span>
              <span className="font-medium">{idea.required_capital}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground">Thời gian:</span>
              <span className="font-medium">{idea.timeline}</span>
            </div>
          </div>

          {idea.expected_profit && (
            <p className="text-xs text-green-600 mt-2">
              Lợi nhuận dự kiến: {idea.expected_profit}
            </p>
          )}

          {idea.leverage_experience && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Tận dụng kinh nghiệm:</span> {idea.leverage_experience}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// SKILLS GAP ANALYSIS COMPONENT
// ============================================================================

const SkillsGapAnalysis = ({ data }) => {
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Endangered Skills */}
      {data.endangered_skills?.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Kỹ năng đang mất giá
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.endangered_skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Must Learn Skills */}
      {data.must_learn_skills?.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
            <Zap size={16} /> Kỹ năng cần học ngay
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.must_learn_skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Future Proof Skills */}
      {data.future_proof_skills?.length > 0 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
            <Target size={16} /> Kỹ năng an toàn tương lai
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.future_proof_skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Learning Path */}
      {data.learning_path?.length > 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <h4 className="font-medium text-emerald-700 mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> Lộ trình học tập
          </h4>
          <div className="space-y-3">
            {data.learning_path.map((month, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                  T{i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">
                    Tháng {month.month || i + 1}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(month.skills || []).map((skill, j) => (
                      <span key={j} className="px-2 py-0.5 bg-white text-emerald-700 rounded text-xs border border-emerald-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                  {month.resources?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tài liệu: {month.resources.length} nguồn
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const ragGeneratedAt = useSelector(selectRAGGeneratedAt)
  const ragIsFresh = useSelector(selectRAGIsFresh)
  const ragIsExpired = useSelector(selectRAGIsExpired)

  // Startup state
  const startupIdeas = useSelector(selectStartupIdeas)
  const startupLoading = useSelector(selectStartupLoading)
  const startupError = useSelector(selectStartupError)

  // Skills Gap state
  const skillsGap = useSelector(selectSkillsGap)
  const skillsGapLoading = useSelector(selectSkillsGapLoading)
  const skillsGapError = useSelector(selectSkillsGapError)

  // Local state
  const [dataSource, setDataSource] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null)
  const [activeTab, setActiveTab] = useState('career') // 'career' | 'startup' | 'skills'

  // Refs to prevent infinite loops
  const hasFetchedRAG = useRef(false)
  const hasFetchedLegacy = useRef(false)
  const hasFetchedStartup = useRef(false)
  const hasFetchedSkills = useRef(false)
  const prevProfileRef = useRef(null)

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
      const experiences = (profile.employmentHistory || []).map(exp => ({
        industry: exp.industry,
        role: exp.position || exp.role || exp.current_role,
        years: exp.duration ? Math.floor(exp.duration / 12) : (exp.years || 0),
        skills: exp.skills || []
      }))

      const aspirations = profile.aspirations || {}

      return {
        basicInfo: {
          age: basicInfo.age,
          gender: basicInfo.gender,
          province: basicInfo.province || basicInfo.location,
          education: basicInfo.education
        },
        employmentHistory: experiences,
        aspirations: {
          targetJob: aspirations.target_job || aspirations.targetJob,
          targetIndustry: aspirations.target_industry || aspirations.targetIndustry,
          skills: aspirations.skills || aspirations.desired_skills || [],
          targetSalary: aspirations.target_salary || aspirations.targetSalary
        },
        barriers: profile.barriers || {}
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
      barriers: profile.barriers || {}
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
      } else if (activeTab === 'skills') {
        // Refresh skills gap data
        const skillsProfile = buildProfileData(profileData)
        console.log('[Refresh] Triggering skills gap with profile:', skillsProfile)
        hasFetchedSkills.current = false
        dispatch(triggerSkillsGapAnalysis({ profile: skillsProfile }))
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
    hasFetchedSkills.current = false
    prevProfileRef.current = null

    // Fetch data based on active tab
    const profileData = userProfile || careerPath?.user_profile
    const hasAge = profileData?.basicInfo?.age || profileData?.age

    if (!isLoggedIn || !hasAge) return

    if (activeTab === 'career' && !hasFetchedRAG.current) {
      hasFetchedRAG.current = true
      fetchRAGData(profileData)
    }
    if (activeTab === 'startup' && !hasFetchedStartup.current && startupIdeas.length === 0) {
      hasFetchedStartup.current = true
      const profile = buildProfileData(profileData)
      dispatch(triggerStartupSuggestion({ profile }))
    }
    if (activeTab === 'skills' && !hasFetchedSkills.current && !skillsGap) {
      hasFetchedSkills.current = true
      const profile = buildProfileData(profileData)
      dispatch(triggerSkillsGapAnalysis({ profile }))
    }
  }, [activeTab, isLoggedIn, startupIdeas.length, skillsGap])

  const handleRetry = () => {
    // Reset flags for retry based on current tab
    if (activeTab === 'career') {
      hasFetchedRAG.current = false
      hasFetchedLegacy.current = false
    } else if (activeTab === 'startup') {
      hasFetchedStartup.current = false
    } else if (activeTab === 'skills') {
      hasFetchedSkills.current = false
    }
    handleRefresh()
  }

  // Determine which loading/error state to show based on active tab
  const isLoading = isLoadingRAG || startupLoading || skillsGapLoading
  const error = errorRAG || startupError || skillsGapError
  const hasData = hasLegacyData || hasRAGData

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
            <AlertTriangle size={24} className="text-amber-500" />
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
        <EmptyState onRetry={handleRetry} type={activeTab} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Lộ trình sự nghiệp
          </h2>
          {careerPath?.user_profile && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Dựa trên hồ sơ của bạn ({careerPath.user_profile.total_experience_years} năm kinh nghiệm)
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('career')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'career'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Route size={14} />
            Lộ trình nghề nghiệp
          </button>

          <button
            onClick={() => setActiveTab('startup')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'startup'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Rocket size={14} />
            Khởi nghiệp
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'skills'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Brain size={14} />
            Phân tích Kỹ năng
          </button>
        </div>
      </div>

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
                subtitle="Dựa trên RAG data"
                icon={Sparkles}
                count={bestFits.length}
              />
              <div className="space-y-3">
                {bestFits.map((path, index) => (
                  <PathCard key={`best-fit-${index}`} path={path} type="best_fit" index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Income Boost */}
          {incomeBoost.length > 0 && (
            <div>
              <SectionHeader
                title="Tăng thu nhập nhanh"
                subtitle="Những lựa chọn có thể tăng thu nhập"
                icon={DollarSign}
                count={incomeBoost.length}
              />
              <div className="space-y-3">
                {incomeBoost.map((path, index) => (
                  <PathCard key={`income-${index}`} path={path} type="income_boost" index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Progression */}
          {progression.length > 0 && (
            <div>
              <SectionHeader
                title="Lộ trình phát triển"
                subtitle="Cơ hội thăng tiến"
                icon={BarChart3}
                count={progression.length}
              />
              <div className="space-y-3">
                {progression.map((path, index) => (
                  <PathCard key={`progression-${index}`} path={path} type="progression" index={index} />
                ))}
              </div>
            </div>
          )}

          {/* RAG Generated timestamp */}
          {ragGeneratedAt && (
            <p className="text-xs text-muted-foreground text-center">
              Phân tích RAG lúc: {new Date(ragGeneratedAt).toLocaleString('vi-VN')}
            </p>
          )}

          {/* Show empty state if no RAG data */}
          {bestFits.length === 0 && incomeBoost.length === 0 && progression.length === 0 && !isLoadingRAG && !errorRAG && (
            <EmptyState type="rag" />
          )}
        </div>
      )}

      {/* Tab 2: Khởi nghiệp */}
      {activeTab === 'startup' && (
        <div className="space-y-4">
          {startupLoading ? (
            <LoadingState isRAG={false} />
          ) : startupError ? (
            <ErrorState error={startupError} onRetry={handleRetry} />
          ) : startupIdeas.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Dựa trên kinh nghiệm và kỹ năng của bạn, đây là những gợi ý khởi nghiệp phù hợp:
              </div>
              {startupIdeas.map((idea, i) => (
                <StartupCard key={i} idea={idea} index={i} />
              ))}
            </>
          ) : (
            <EmptyState type="startup" />
          )}
        </div>
      )}

      {/* Tab 3: Phân tích Kỹ năng */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          {skillsGapLoading ? (
            <LoadingState isRAG={false} />
          ) : skillsGapError ? (
            <ErrorState error={skillsGapError} onRetry={handleRetry} />
          ) : skillsGap ? (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Phân tích kỹ năng của bạn để xác định những gì cần học:
              </div>
              <SkillsGapAnalysis data={skillsGap} />
            </>
          ) : (
            <EmptyState type="skills" />
          )}
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-center pt-4 border-t border-border">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoadingRAG || startupLoading || skillsGapLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg transition-colors',
            (isRefreshing || isLoadingRAG || startupLoading || skillsGapLoading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
          Làm mới dữ liệu
        </button>
      </div>
    </div>
  )
}

export default CareerRecommendations
