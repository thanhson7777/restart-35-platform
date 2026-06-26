import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { JobCard } from '@/components/jobs'
import JobDetailModal from '@/components/jobs/JobDetailModal'
import CareerRecommendations from '@/components/worker-profile/CareerRecommendations'
import MainLayout from '@/components/layout/MainLayout'
import Footer from '@/components/layout/Footer'
import {
  fetchRecommendedJobs,
  fetchAllJobs,
  fetchSimilarJobs,
  selectRecommendedJobs,
  selectAllJobs,
  selectRecommendedLoading,
  selectJobsLoading,
  selectJobsError,
  selectJobFilters,
  selectSimilarJobs,
  selectSavedJobs,
  reportDeadLinkAsync,
  toggleSaveJob
} from '@/redux/job/jobSlice'
import {
  selectProfile,
  selectFormData,
  selectIsCompleted,
  fetchMyProfile
} from '@/redux/profile/profileSlice'
import {
  selectCareerPath,
  selectCareerPathLoading,
  fetchCareerPath
} from '@/redux/ai/aiSlice'
import {
  createOutcome,
  fetchMyOutcomes,
  selectOutcomes
} from '@/redux/outcome/outcomeSlice'
import { selectCurrentUser, selectIsAuthenticated } from '@/redux/user/userSlice'
import toast from 'react-hot-toast'

// Lucide React Icons
import {
  Sparkle,
  Warning,
  ArrowClockwise,
  Briefcase,
  BookmarkSimple,
  TrendUp,
  User,
  ArrowRight,
  CaretLeft,
  Stack,
  Sliders,
  Check
} from '@phosphor-icons/react'

// Tab options
const TABS = [
  { id: 'recommended', label: 'Việc làm phù hợp', icon: Sparkle },
  { id: 'career', label: 'Gợi ý việc làm từ AI', icon: TrendUp },
]

/**
 * JobsPage - Trang hiển thị việc làm gợi ý và danh sách việc làm
 *
 * Features:
 * - Header với tiêu đề và mô tả
 * - Tabs: Gợi ý cho bạn / Tất cả / Đã lưu
 * - FilterPanel (collapsible trên mobile)
 * - JobList (grid của JobCards)
 * - Empty state nếu không có profile
 * - Loading skeleton
 */
const JobsPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // State
  const [activeTab, setActiveTab] = useState('recommended')
  const [selectedJob, setSelectedJob] = useState(null)
  const [skillFilterMode, setSkillFilterMode] = useState('all') // 'all' | 'latest' | 'custom'
  const [selectedJobIndex, setSelectedJobIndex] = useState(null)
  const [showCustomDropdown, setShowCustomDropdown] = useState(false)
  const [appliedJobIds, setAppliedJobIds] = useState(new Set())

  // Handlers for job detail modal
  const handleOpenJobDetail = (job) => {
    setSelectedJob(job)
  }

  const handleCloseJobDetail = () => {
    setSelectedJob(null)
  }

  const handleReportDeadLink = (jobId) => {
    dispatch(reportDeadLinkAsync(jobId))
    toast.success('Cảm ơn bạn đã báo cáo!')
  }

  const handleSaveJob = (job) => {
    dispatch(toggleSaveJob(job))
    toast.success('Đã lưu việc làm!')
  }

  // Selectors
  const profile = useSelector(selectProfile)
  const formData = useSelector(selectFormData)
  const isProfileCompleted = useSelector(selectIsCompleted)
  const currentUser = useSelector(selectCurrentUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const recommendedJobs = useSelector(selectRecommendedJobs)
  const allJobs = useSelector(selectAllJobs)
  const savedJobs = useSelector(selectSavedJobs)
  const similarJobs = useSelector(selectSimilarJobs)
  const recommendedLoading = useSelector(selectRecommendedLoading)
  const jobsLoading = useSelector(selectJobsLoading)
  const error = useSelector(selectJobsError)
  const filters = useSelector(selectJobFilters)
  const careerPath = useSelector(selectCareerPath)
  const careerPathLoading = useSelector(selectCareerPathLoading)
  const myOutcomes = useSelector(selectOutcomes)

  // Refs to prevent infinite loops
  const hasFetchedRecommended = useRef(false)
  const hasFetchedAll = useRef(false)
  const hasFetchedCareer = useRef(false)

  // Fetch applied job IDs on mount
  useEffect(() => {
    if (!currentUser) return
    dispatch(fetchMyOutcomes())
  }, [dispatch, currentUser?._id])

  // Populate appliedJobIds from outcomes
  useEffect(() => {
    if (myOutcomes?.length > 0) {
      setAppliedJobIds(new Set(myOutcomes.map(o => o.jobId)))
    }
  }, [myOutcomes])

  // Clear local state when user logs out; reset refs when user account changes
  useEffect(() => {
    const userId = currentUser?._id
    if (userId) {
      // User logged in or switched account — reset refs so fetch effects re-run
      hasFetchedRecommended.current = false
      hasFetchedAll.current = false
      hasFetchedCareer.current = false
    } else {
      // User logged out — clear all UI state
      setSelectedJob(null)
      setSelectedJobIndex(null)
      setAppliedJobIds(new Set())
      setShowCustomDropdown(false)
      setSkillFilterMode('all')
      setActiveTab('all')
    }
  }, [currentUser?._id])

  // =============================================================================
  // HELPER FUNCTIONS - Auth guard for protected tabs
  // =============================================================================

  const handleTabClick = (tabId) => {
    const authRequiredTabs = ['recommended', 'saved', 'career']
    if (authRequiredTabs.includes(tabId) && !isAuthenticated) {
      toast.error('Bạn cần đăng nhập để sử dụng chức năng này.')
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    setActiveTab(tabId)
  }

  // =============================================================================
  // HELPER FUNCTIONS - Skills extraction
  // =============================================================================

  /**
   * Transform ESCO skills to string array for API calls.
   * ESCO format: {uri, titleEn, titleVi, type} -> string
   */
  const transformSkillsToStrings = (skills) => {
    if (!skills || !Array.isArray(skills)) return []

    return skills.map(skill => {
      // If already a string, return as-is
      if (typeof skill === 'string') return skill

      // If ESCO object format, extract titleEn (English) or titleVi (Vietnamese)
      if (skill.titleEn) return skill.titleEn
      if (skill.titleVi) return skill.titleVi

      // Fallback: return uri or skill itself
      return skill.uri || String(skill)
    }).filter(Boolean)
  }

  /**
   * Extract skills from profile data.
   * Priority: aspirations.skills > employmentHistory[*].skills
   * This matches the backend's extract_skills_for_matching logic.
   */
  const extractSkillsFromProfile = (profile) => {
    // Priority 1: aspirations.skills (legacy flow)
    if (profile?.aspirations?.skills && profile.aspirations.skills.length > 0) {
      return transformSkillsToStrings(profile.aspirations.skills)
    }

    // Priority 2: employmentHistory[*].skills (new flow - matches backend)
    // Note: profileSlice uses camelCase 'employmentHistory', not snake_case
    if (Array.isArray(profile?.employmentHistory) && profile.employmentHistory.length > 0) {
      const allSkills = []
      for (const job of profile.employmentHistory) {
        if (job.skills && Array.isArray(job.skills)) {
          const transformedSkills = transformSkillsToStrings(job.skills)
          allSkills.push(...transformedSkills)
        }
      }
      // Remove duplicates
      return [...new Set(allSkills)]
    }

    return []
  }

  /**
   * Extract skills from a specific job in employment history.
   * @param {Object} job - Single employment history job
   */
  const extractSkillsFromJob = (job) => {
    if (!job?.skills || !Array.isArray(job.skills)) return []
    return transformSkillsToStrings(job.skills)
  }

  // Get skills for API call (with fallback chain)
  const skillsForRecommendation = extractSkillsFromProfile(formData)

  // Get latest job for display
  const latestJob = Array.isArray(formData?.employmentHistory) ? formData.employmentHistory[0] : undefined

  // Helper to get display title from job (prioritize occupation from ESCO)
  const getJobTitle = (job) => {
    if (!job) return '...'
    // Priority: occupation.titleVi > occupation.titleEn > position > generic
    return job.occupation?.titleVi || job.occupation?.titleEn || job.position || 'Chưa chọn nghề'
  }

  // Computed skills based on filter mode
  const skillsByFilterMode = useMemo(() => {
    const employmentHistory = formData?.employmentHistory || []

    if (skillFilterMode === 'latest' && latestJob) {
      return extractSkillsFromJob(latestJob)
    }

    if (skillFilterMode === 'custom' && selectedJobIndex !== null && employmentHistory[selectedJobIndex]) {
      return extractSkillsFromJob(employmentHistory[selectedJobIndex])
    }

    // Default: all skills
    return skillsForRecommendation
  }, [skillFilterMode, selectedJobIndex, latestJob, formData, skillsForRecommendation])

  // Get selected custom job for display
  const selectedCustomJob = formData?.employmentHistory?.[selectedJobIndex]

  // Check if profile has required data for recommendations
  const hasProfileForRecommendations = useMemo(() => {
    // FIX: Check both aspirations.skills AND employment_history skills
    // This allows matching even when aspirations.skills is empty but employment_history has skills
    return skillsForRecommendation.length > 0
  }, [skillsForRecommendation])

  // Calculate experience from employment history (convert months to years)
  const totalExperience = useMemo(() => {
    if (!formData?.employmentHistory) return 0
    if (Array.isArray(formData.employmentHistory) && formData.employmentHistory.length === 0) return 0
    // Skip case: employmentHistory is { status: "không có" }
    if (!Array.isArray(formData.employmentHistory)) return 0
    const totalMonths = formData.employmentHistory.reduce((sum, job) => sum + (job.duration || 0), 0)
    return Math.floor(totalMonths / 12) // Convert months to years
  }, [formData])

  // Fetch worker profile on mount and whenever user account changes
  useEffect(() => {
    if (!profile && !isProfileCompleted) {
      dispatch(fetchMyProfile())
    }
  }, [dispatch, profile, isProfileCompleted, currentUser?._id])

  // Reset fetch flag when filter mode changes
  useEffect(() => {
    if (activeTab === 'recommended') {
      hasFetchedRecommended.current = false
    }
  }, [skillFilterMode, selectedJobIndex, activeTab])

  // Fetch jobs based on active tab
  useEffect(() => {
    // Only fetch recommended jobs once when tab is 'recommended' and profile is ready
    if (activeTab === 'recommended' && hasProfileForRecommendations && !recommendedLoading) {
      if (!hasFetchedRecommended.current) {
        hasFetchedRecommended.current = true
        dispatch(fetchRecommendedJobs({
          skills: skillsByFilterMode,
          experience: totalExperience,
          location: formData.basicInfo?.province,
          targetJob: formData.aspirations?.targetJob,
          targetSalary: formData.aspirations?.targetSalary,
          preferredJobType: formData.aspirations?.preferredJobType,
          limit: 50
        }))
      }
    } else if (activeTab === 'all' && !jobsLoading) {
      if (!hasFetchedAll.current) {
        hasFetchedAll.current = true
        dispatch(fetchAllJobs({
          limit: 50,
          ...filters
        }))
      }
    } else if (activeTab === 'career' && isProfileCompleted && !careerPathLoading) {
      if (!hasFetchedCareer.current && formData.basicInfo?.age) {
        hasFetchedCareer.current = true
        const experiences = (Array.isArray(formData.employmentHistory) ? formData.employmentHistory : [])
          .filter(job => job.companyName || job.position)
          .map(job => ({
            industry: formData.basicInfo.industry || 'general',
            role: job.position || 'Nhan vien',
            years: job.duration || 1,
            skills: []
          }))

        dispatch(fetchCareerPath({
          age: formData.basicInfo.age,
          current_role: formData.employmentHistory?.[0]?.position,
          current_industry: formData.basicInfo.industry,
          experiences: experiences,
          include_age_transition: true,
          include_management_track: true
        }))
      }
    }
    // saved tab doesn't need fetching - uses local state
  }, [
    activeTab,
    hasProfileForRecommendations,
    skillsByFilterMode,
    formData?.aspirations?.targetJob,
    formData?.aspirations?.targetSalary,
    formData?.aspirations?.preferredJobType,
    formData?.basicInfo?.province,
    formData?.basicInfo?.age,
    formData?.basicInfo?.industry,
    formData?.employmentHistory,
    totalExperience,
    filters,
    recommendedLoading,
    jobsLoading,
    careerPathLoading,
    isProfileCompleted,
    dispatch
  ])

  // Handle refresh
  const handleRefresh = () => {
    if (activeTab === 'recommended') {
      hasFetchedRecommended.current = false
      dispatch(fetchRecommendedJobs({
        skills: skillsByFilterMode,
        experience: totalExperience,
        location: formData.basicInfo?.province,
        targetJob: formData.aspirations?.targetJob,
        targetSalary: formData.aspirations?.targetSalary,
        preferredJobType: formData.aspirations?.preferredJobType,
        limit: 20
      }))
    } else if (activeTab === 'all') {
      hasFetchedAll.current = false
      dispatch(fetchAllJobs({
        limit: 50,
        ...filters
      }))
    } else if (activeTab === 'career') {
      hasFetchedCareer.current = false
      const experiences = (formData.employmentHistory || [])
        .filter(job => job.companyName || job.position)
        .map(job => ({
          industry: formData.basicInfo.industry || 'general',
          role: job.position || 'Nhan vien',
          years: job.duration || 1,
          skills: []
        }))

      dispatch(fetchCareerPath({
        age: formData.basicInfo.age,
        current_role: formData.employmentHistory?.[0]?.position,
        current_industry: formData.basicInfo.industry,
        experiences: experiences,
        include_age_transition: true,
        include_management_track: true
      }))
    }
    toast.success('Đã làm mới danh sách việc làm')
  }

  // Handle view similar jobs
  const handleViewSimilar = (job) => {
    if (job.id || job._id) {
      dispatch(fetchSimilarJobs({ jobId: job.id || job._id, limit: 5 }))
      toast.success(`Đang tìm việc làm tương tự cho "${job.title}"`)
    }
  }

  // Handle apply
  const handleApply = async (job) => {
    const jobId = job._id || job.id
    if (appliedJobIds.has(jobId)) {
      toast.warning('Bạn đã ứng tuyển vị trí này rồi')
      return
    }
    try {
      await dispatch(createOutcome({
        jobId,
        jobTitle: job.title || job.job_title,
        companyName: job.company || job.company_name,
        metadata: {
          location: job.location,
          salary: job.salary,
          employmentType: job.job_type,
          matchScore: job.matchScore,
        },
      })).unwrap()
      setAppliedJobIds(prev => new Set([...prev, jobId]))
      toast.success(`Đã nộp đơn ứng tuyển: ${job.title}`)
    } catch (error) {
      toast.error(error || 'Ứng tuyển thất bại. Vui lòng thử lại.')
    }
  }

  // Get current jobs based on tab
  const currentJobs = useMemo(() => {
    // console.log('=== DEBUG currentJobs ===', {
    //   activeTab,
    //   recommendedJobs,
    //   recommendedJobsLength: recommendedJobs?.length,
    //   allJobsLength: allJobs?.length,
    //   savedJobsLength: savedJobs?.length
    // })
    switch (activeTab) {
      case 'recommended':
        return recommendedJobs
      case 'all':
        // Apply client-side filters for "all" tab
        return allJobs.filter(job => {
          if (filters.matchMin && (job.match_score || job.matchScore || 0) < filters.matchMin) {
            return false
          }
          if (filters.jobType) {
            const jobTypes = filters.jobType.split(',')
            const jobType = job.job_type || job.jobType
            if (!jobTypes.includes(jobType)) {
              return false
            }
          }
          return true
        })
      case 'saved':
        return savedJobs
      default:
        return []
    }
  }, [activeTab, recommendedJobs, allJobs, savedJobs, filters])

  const isLoading = activeTab === 'recommended' ? recommendedLoading : jobsLoading

  return (
    <>
      <MainLayout>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <Sparkle className="w-8 h-8 text-primary" weight="fill" />
                  Việc làm gợi ý cho bạn
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Dựa trên kỹ năng và hồ sơ của bạn
                </p>
              </div>
              <div className="flex items-center gap-2">
                {currentUser && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentUser?.role === 'worker') navigate('/worker/profile')
                      else if (currentUser?.role === 'trainer') navigate('/trainer/profile')
                      else if (currentUser?.role === 'enterprise') navigate('/enterprise/profile')
                      else if (currentUser?.role === 'ngo') navigate('/ngo/profile')
                      else navigate('/profile') // fallback
                    }}
                    className="shrink-0"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Cập nhật hồ sơ
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  <ArrowClockwise className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                  Làm mới
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Profile Incomplete Banner */}
          {!isProfileCompleted && (
            <Card className="mb-6 border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Tạo hồ sơ năng lực của bạn</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hệ thống cần thêm thông tin về kinh nghiệm và mục tiêu của bạn để tìm kiếm những cơ hội việc làm phù hợp nhất. Hãy dành chút thời gian hoàn thiện hồ sơ nhé.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/worker/profile')}
                    className="shrink-0"
                  >
                    Tạo hồ sơ ngay
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Career Path Banner - Profile Not Completed */}
          {activeTab === 'career' && !isProfileCompleted && (
            <Card className="mb-6 border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Bổ sung thông tin hồ sơ</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Để AI thiết kế lộ trình sự nghiệp cá nhân hóa chính xác nhất, bạn cần cung cấp thêm thông tin về kinh nghiệm làm việc và mong muốn nghề nghiệp của mình.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/worker-profile')}
                    className="shrink-0"
                  >
                    Tiếp tục hoàn thiện
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missing Age Banner - Profile Completed but age is missing */}
          {activeTab === 'career' && isProfileCompleted && !formData?.basicInfo?.age && (
            <Card className="mb-6 border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Chỉ còn một bước nhỏ nữa...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Để AI có thể dự báo và thiết kế lộ trình sự nghiệp tối ưu nhất, vui lòng cho chúng tôi biết độ tuổi hiện tại của bạn.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/worker-profile?step=1')}
                    className="shrink-0"
                  >
                    Cập nhật độ tuổi
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missing Skills Banner - Chỉ hiển thị khi thực sự không có skills */}
          {activeTab === 'recommended' && !hasProfileForRecommendations && (
            <Card className="mb-6 border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Mở khóa sức mạnh của bạn</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hệ thống cần biết những kỹ năng bạn đang có để đề xuất công việc chính xác. Hãy thêm kỹ năng vào mục "Kinh nghiệm làm việc" hoặc "Nguyện vọng" nhé!
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/worker-profile?step=3')}
                    className="shrink-0"
                  >
                    Bổ sung kỹ năng
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-6">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Tabs */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  {TABS.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                          activeTab === tab.id
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Smart Filter Chip Bar - Chỉ hiển thị khi tab là 'recommended' và có employmentHistory */}
              {activeTab === 'recommended' && formData?.employmentHistory?.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Chip: Toàn bộ hồ sơ */}
                    <button
                      onClick={() => {
                        setSkillFilterMode('all')
                        setSelectedJobIndex(null)
                        setShowCustomDropdown(false)
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        skillFilterMode === 'all'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/50'
                      )}
                    >
                      <Stack className="w-3.5 h-3.5" />
                      <span>Toàn bộ hồ sơ</span>
                    </button>

                    {/* Chip: Nghề gần nhất */}
                    <button
                      onClick={() => {
                        setSkillFilterMode('latest')
                        setSelectedJobIndex(null)
                        setShowCustomDropdown(false)
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        skillFilterMode === 'latest'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/50'
                      )}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Nghề gần nhất: {getJobTitle(latestJob)}</span>
                    </button>

                    {/* Chip: Tùy chỉnh */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (skillFilterMode === 'custom') {
                            setSkillFilterMode('all')
                            setSelectedJobIndex(null)
                            setShowCustomDropdown(false)
                          } else {
                            setSkillFilterMode('custom')
                            setShowCustomDropdown(!showCustomDropdown)
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                          skillFilterMode === 'custom'
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/50'
                        )}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>
                          {skillFilterMode === 'custom' && selectedCustomJob
                            ? `Tùy chỉnh: ${getJobTitle(selectedCustomJob)}`
                            : 'Tùy chỉnh'}
                        </span>
                      </button>

                      {/* Dropdown menu khi chọn custom */}
                      {showCustomDropdown && skillFilterMode === 'custom' && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-background border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {Array.isArray(formData.employmentHistory) ? (
                            <>
                              <div className="p-2 border-b bg-muted/50">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Chọn kinh nghiệm để gợi ý
                                </p>
                              </div>
                              {formData.employmentHistory.map((job, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setSelectedJobIndex(index)
                                    setShowCustomDropdown(false)
                                  }}
                                  className={cn(
                                    'w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2',
                                    selectedJobIndex === index && 'bg-muted font-medium'
                                  )}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                      {getJobTitle(job)}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {job.companyName || 'Không có công ty'} • {job.duration ? Math.floor(job.duration / 12) : 0} năm
                                    </div>
                                  </div>
                                  {selectedJobIndex === index && (
                                    <Check className="w-4 h-4 text-primary shrink-0" />
                                  )}
                                </button>
                              ))}
                            </>
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              Không có kinh nghiệm để chọn
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <Card className="mb-6 border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Warning className="w-5 h-5 text-destructive shrink-0" />
                      <p className="text-destructive">{error}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        className="ml-auto"
                      >
                        Thử lại
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Jobs List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Skeleton className="w-14 h-14 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="flex gap-2 mt-2">
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-6 w-20" />
                            </div>
                          </div>
                          <Skeleton className="w-14 h-14 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : activeTab === 'career' && isProfileCompleted ? (
                <CareerRecommendations userProfile={formData} />
              ) : currentJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {activeTab === 'recommended'
                        ? 'Chưa có công việc phù hợp'
                        : 'Không tìm thấy kết quả'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {activeTab === 'recommended'
                        ? 'Hệ thống đang liên tục cập nhật các vị trí mới. Bổ sung thêm kỹ năng trong hồ sơ sẽ giúp bạn tiếp cận nhiều cơ hội hơn.'
                        : 'Không có công việc nào khớp với tiêu chí của bạn. Hãy thử thay đổi bộ lọc nhé.'}
                    </p>
                    {activeTab === 'recommended' && (
                      <Button variant="outline" onClick={() => navigate('/worker/profile')}>
                        Cập nhật hồ sơ năng lực
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {currentJobs.map((job) => (
                    <JobCard
                      key={job.id || job._id || Math.random()}
                      job={job}
                      userSkills={skillsByFilterMode}
                      targetSalary={formData?.aspirations?.targetSalary}
                      onApply={handleApply}
                      onViewSimilar={handleViewSimilar}
                      onOpenDetail={handleOpenJobDetail}
                      isApplied={appliedJobIds.has(job._id || job.id)}
                    />
                  ))}
                </div>
              )}

              {/* Load More */}
              {currentJobs.length > 0 && currentJobs.length < 20 && (
                <div className="mt-6 text-center">
                  <Button variant="outline" disabled>
                    Không còn việc làm nào
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Detail Modal */}
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            onClose={handleCloseJobDetail}
            onApply={handleApply}
            onReportDeadLink={handleReportDeadLink}
            onSave={handleSaveJob}
          />
        )}
      </MainLayout>
      <Footer />
    </>
  )
}

// Helper function
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default JobsPage
