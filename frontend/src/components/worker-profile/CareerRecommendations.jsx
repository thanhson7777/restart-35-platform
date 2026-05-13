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
  BarChart3
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
  clearRAGRecommendation
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
      {type === 'rag' ? (
        <Sparkles size={24} className="text-slate-400" />
      ) : (
        <TrendingUp size={24} className="text-slate-400" />
      )}
    </div>
    <p className="text-sm text-muted-foreground mb-3">
      {type === 'rag' ? 'Chưa có gợi ý từ AI' : 'Chưa có gợi ý lộ trình sự nghiệp'}
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

  // Local state
  const [dataSource, setDataSource] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null)
  const [activeTab, setActiveTab] = useState('legacy') // 'legacy' | 'rag'
  const [useRAG, setUseRAG] = useState(true) // Toggle between legacy and RAG

  // Refs to prevent infinite loops
  const hasFetchedRAG = useRef(false)
  const hasFetchedLegacy = useRef(false)
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

      if (useRAG) {
        // Refresh RAG data
        const ragProfile = buildProfileData(profileData)
        console.log('[Refresh] Triggering RAG with profile:', ragProfile)
        await dispatch(triggerRAGRecommendation({ profile: ragProfile })).unwrap()
        setDataSource('fresh')
        setLastGenerated(new Date())
      } else {
        // Refresh legacy data - needs flat structure
        const legacyProfile = profileData?.basicInfo
          ? {
              age: profileData.basicInfo.age,
              experiences: profileData.employmentHistory?.map(exp => ({
                industry: exp.industry,
                role: exp.position || exp.role,
                years: exp.duration ? Math.floor(exp.duration / 12) : (exp.years || 0),
                skills: exp.skills || []
              })) || [],
              currentRole: profileData.employmentHistory?.[0]?.position,
              currentIndustry: profileData.employmentHistory?.[0]?.industry
            }
          : {
              age: profileData.age,
              experiences: profileData.experiences || [],
              currentRole: profileData.primary_role || profileData.current_role,
              currentIndustry: profileData.primary_industry || profileData.current_industry
            }

        console.log('[Refresh] Triggering legacy with profile:', legacyProfile)
        await triggerGeneration(legacyProfile)
      }
    } catch (err) {
      console.error('[Refresh] Error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-fetch on mount - only fetch once
  useEffect(() => {
    // Get profile data - from props first, then from Redux state
    const profileData = userProfile || careerPath?.user_profile

    // Check if profile has age - handle both formData and direct structure
    const hasAge = profileData?.basicInfo?.age || profileData?.age

    // Check if profile changed
    const profileChanged = profileData !== prevProfileRef.current

    // Skip if not logged in
    if (!isLoggedIn) {
      console.log('[CareerRecs] User not logged in, skipping fetch')
      return
    }

    // Skip if no age
    if (!hasAge) {
      console.log('[CareerRecs] No profile age found, skipping fetch')
      return
    }

    if (!profileChanged && (hasFetchedRAG.current || hasFetchedLegacy.current)) {
      console.log('[CareerRecs] Profile unchanged and already fetched, skipping')
      return
    }

    // Mark profile as seen
    prevProfileRef.current = profileData

    if (useRAG) {
      console.log('[RAG] Fetching RAG data with profile:', profileData)
      hasFetchedRAG.current = true
      fetchRAGData(profileData)
    } else {
      // Legacy mode needs flat structure
      const legacyProfile = profileData?.basicInfo
        ? {
            age: profileData.basicInfo.age,
            experiences: profileData.employmentHistory?.map(exp => ({
              industry: exp.industry,
              role: exp.position || exp.role,
              years: exp.duration ? Math.floor(exp.duration / 12) : (exp.years || 0),
              skills: exp.skills || []
            })) || [],
            currentRole: profileData.employmentHistory?.[0]?.position,
            currentIndustry: profileData.employmentHistory?.[0]?.industry
          }
        : {
            age: profileData.age,
            experiences: profileData.experiences || [],
            currentRole: profileData.primary_role || profileData.current_role,
            currentIndustry: profileData.primary_industry || profileData.current_industry
          }

      console.log('[Legacy] Fetching career path with profile:', legacyProfile)
      hasFetchedLegacy.current = true
      fetchFromCache(legacyProfile)
    }
  }, [dispatch, userProfile, careerPath, useRAG, isLoggedIn])

  // Reset fetch flags when mode changes
  useEffect(() => {
    // Reset flags when toggling between RAG and Legacy
    hasFetchedRAG.current = false
    hasFetchedLegacy.current = false
    prevProfileRef.current = null
  }, [useRAG])

  const handleRetry = () => {
    // Reset flags for retry
    if (useRAG) {
      hasFetchedRAG.current = false
    } else {
      hasFetchedLegacy.current = false
    }
    handleRefresh()
  }

  // Determine which loading/error state to show
  const isLoading = useRAG ? isLoadingRAG : isLoadingLegacy
  const error = useRAG ? errorRAG : errorLegacy
  const hasData = useRAG ? hasRAGData : hasLegacyData

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-border p-6', className)}>
        <LoadingState isRAG={useRAG} />
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
        <EmptyState onRetry={handleRetry} type={useRAG ? 'rag' : 'legacy'} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          {/* Tab Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => {
                setUseRAG(false)
                hasFetchedLegacy.current = false
              }}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                !useRAG ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Rule-based
            </button>
            <button
              onClick={() => {
                setUseRAG(true)
                hasFetchedRAG.current = false
              }}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1',
                useRAG ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles size={12} />
              AI RAG
            </button>
          </div>

          {dataSource && (
            <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
              {dataSource === 'cache' ? 'Từ cache' : dataSource === 'database' ? 'Từ DB' : 'Mới tạo'}
            </span>
          )}
          {useRAG && ragIsFresh !== null && (
            <span className={cn(
              'text-xs px-2 py-1 rounded',
              ragIsFresh ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            )}>
              {ragIsFresh ? 'Fresh' : 'Expired'}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'p-2 rounded-lg hover:bg-slate-100 transition-colors',
              isRefreshing && 'opacity-50 cursor-not-allowed'
            )}
            title="Làm mới"
          >
            <RefreshCw size={16} className={cn('text-muted-foreground', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* RAG Mode */}
      {useRAG && (
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
        </div>
      )}

      {/* Legacy Mode */}
      {!useRAG && (
        <div className="space-y-6">
          {/* Management Track */}
          {managementTrack.length > 0 && (
            <div>
              <SectionHeader
                title="Thăng tiến trong nghành"
                subtitle="Lộ trình phát triển sự nghiệp"
                icon={TrendingUp}
                count={managementTrack.length}
              />
              <div className="space-y-3">
                {managementTrack.map((path, index) => (
                  <PathCard key={`mgmt-${index}`} path={path} type="management" index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Age Transition */}
          {ageTransition.length > 0 && (
            <div>
              <SectionHeader
                title="Chuyển đổi nghề nghiệp"
                subtitle="Phù hợp với độ tuổi"
                icon={AlertTriangle}
                count={ageTransition.length}
              />
              <div className="space-y-3">
                {ageTransition.map((path, index) => (
                  <PathCard key={`age-${index}`} path={path} type="age_transition" index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Skill Upgrades */}
          {skillUpgrades.length > 0 && (
            <div>
              <SectionHeader
                title="Nâng cấp kỹ năng"
                subtitle="Cần thiết để thăng tiến"
                icon={Zap}
                count={skillUpgrades.length}
              />
              <div className="space-y-3">
                {skillUpgrades.map((path, index) => (
                  <PathCard key={`skill-${index}`} path={path} type="skill_upgrade" index={index} />
                ))}
              </div>
            </div>
          )}

          {/* AI Advice */}
          {careerPath?.advice?.length > 0 && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Target size={16} className="text-primary" />
                Lời khuyên từ AI
              </h4>
              <ul className="space-y-2">
                {careerPath.advice.slice(0, 3).map((advice, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary font-medium">{i + 1}.</span>
                    {advice}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated timestamp */}
          {careerPath?.generated_at && (
            <p className="text-xs text-muted-foreground text-center">
              Phân tích lúc: {new Date(careerPath.generated_at).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default CareerRecommendations
