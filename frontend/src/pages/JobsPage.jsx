import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { JobCard } from '@/components/jobs'
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
  selectSavedJobs
} from '@/redux/job/jobSlice'
import {
  selectProfile,
  selectFormData,
  selectIsCompleted,
  fetchMyProfile
} from '@/redux/profile/profileSlice'
import toast from 'react-hot-toast'

// Icons
const SparklesIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
)

const AlertCircleIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
)

const RefreshCwIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const BriefcaseIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>
)

const BookmarkIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const UserIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const ArrowRightIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" x2="19" y1="12" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const ChevronLeftIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

// Tab options
const TABS = [
  { id: 'recommended', label: 'Gợi ý cho bạn', icon: SparklesIcon },
  { id: 'all', label: 'Tất cả việc làm', icon: BriefcaseIcon },
  { id: 'saved', label: 'Đã lưu', icon: BookmarkIcon }
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

  // State
  const [activeTab, setActiveTab] = useState('recommended')

  // Selectors
  const profile = useSelector(selectProfile)
  const formData = useSelector(selectFormData)
  const isProfileCompleted = useSelector(selectIsCompleted)
  const recommendedJobs = useSelector(selectRecommendedJobs)
  const allJobs = useSelector(selectAllJobs)
  const savedJobs = useSelector(selectSavedJobs)
  const similarJobs = useSelector(selectSimilarJobs)
  const recommendedLoading = useSelector(selectRecommendedLoading)
  const jobsLoading = useSelector(selectJobsLoading)
  const error = useSelector(selectJobsError)
  const filters = useSelector(selectJobFilters)

  // Refs to prevent infinite loops
  const hasFetchedRecommended = useRef(false)
  const hasFetchedAll = useRef(false)

  // Check if profile has required data for recommendations
  const hasProfileForRecommendations = useMemo(() => {
    return formData?.aspirations?.skills?.length > 0
  }, [formData])

  // Calculate experience from employment history
  const totalExperience = useMemo(() => {
    if (!formData?.employmentHistory || formData.employmentHistory.length === 0) {
      return 0
    }
    return formData.employmentHistory.reduce((sum, job) => sum + (job.duration || 0), 0)
  }, [formData])

  // Fetch worker profile on mount if not already loaded
  useEffect(() => {
    if (!profile && !isProfileCompleted) {
      dispatch(fetchMyProfile())
    }
  }, [dispatch, profile, isProfileCompleted])

  // Fetch jobs based on active tab
  useEffect(() => {
    // console.log('=== DEBUG useEffect ===', {
    //   activeTab,
    //   hasProfileForRecommendations,
    //   hasFetchedRecommended: hasFetchedRecommended.current,
    //   recommendedLoading,
    //   skills: formData?.aspirations?.skills
    // })

    // Only fetch recommended jobs once when tab is 'recommended' and profile is ready
    if (activeTab === 'recommended' && hasProfileForRecommendations && !recommendedLoading) {
      if (!hasFetchedRecommended.current) {
        hasFetchedRecommended.current = true
        dispatch(fetchRecommendedJobs({
          skills: formData.aspirations.skills,
          experience: totalExperience,
          location: formData.basicInfo?.province,
          targetJob: formData.aspirations?.targetJob,
          targetSalary: formData.aspirations?.targetSalary,
          preferredJobType: formData.aspirations?.preferredJobType,
          limit: 20
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
    }
    // saved tab doesn't need fetching - uses local state
  }, [
    activeTab,
    hasProfileForRecommendations,
    formData?.aspirations?.skills,
    formData?.aspirations?.targetJob,
    formData?.aspirations?.targetSalary,
    formData?.aspirations?.preferredJobType,
    formData?.basicInfo?.province,
    totalExperience,
    filters,
    recommendedLoading,
    jobsLoading,
    dispatch
  ])

  // Handle refresh
  const handleRefresh = () => {
    if (activeTab === 'recommended') {
      hasFetchedRecommended.current = false // Reset to allow refetch
      dispatch(fetchRecommendedJobs({
        skills: formData.aspirations.skills,
        experience: totalExperience,
        location: formData.basicInfo?.province,
        targetJob: formData.aspirations?.targetJob,
        targetSalary: formData.aspirations?.targetSalary,
        preferredJobType: formData.aspirations?.preferredJobType,
        limit: 20
      }))
    } else {
      hasFetchedAll.current = false // Reset to allow refetch
      dispatch(fetchAllJobs({
        limit: 50,
        ...filters
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
  const handleApply = (job) => {
    toast.success(`Đã nộp đơn ứng tuyển: ${job.title}`)
    // TODO: Call apply API
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border">
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 text-primary" />
                Việc làm gợi ý cho bạn
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Dựa trên kỹ năng và hồ sơ của bạn
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isProfileCompleted && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/worker-profile')}
                  className="shrink-0"
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  Cập nhật hồ sơ
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="shrink-0"
              >
                <RefreshCwIcon className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
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
                <AlertCircleIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Hồ sơ chưa hoàn thiện</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Để nhận gợi ý chính xác hơn, vui lòng cập nhật đầy đủ thông tin hồ sơ của bạn.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/worker-profile')}
                  className="shrink-0"
                >
                  Cập nhật hồ sơ
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Skills Banner */}
        {activeTab === 'recommended' && !hasProfileForRecommendations && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Chưa có kỹ năng trong hồ sơ</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vui lòng thêm kỹ năng trong bước "Nguyện vọng" để nhận gợi ý việc làm phù hợp.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/worker-profile?step=4')}
                  className="shrink-0"
                >
                  Thêm kỹ năng
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
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
                      onClick={() => setActiveTab(tab.id)}
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

              {/* Results count */}
              <p className="text-sm text-muted-foreground hidden sm:block">
                {isLoading ? 'Đang tải...' : `${currentJobs.length} việc làm`}
              </p>
            </div>

            {/* Error State */}
            {error && (
              <Card className="mb-6 border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircleIcon className="w-5 h-5 text-destructive shrink-0" />
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
            ) : currentJobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BriefcaseIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {activeTab === 'recommended'
                      ? 'Không có việc làm gợi ý'
                      : activeTab === 'saved'
                        ? 'Chưa có việc làm đã lưu'
                        : 'Không tìm thấy việc làm'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'recommended'
                      ? 'Hãy cập nhật hồ sơ để nhận gợi ý phù hợp hơn.'
                      : 'Thử thay đổi bộ lọc hoặc quay lại sau.'}
                  </p>
                  {activeTab === 'recommended' && (
                    <Button onClick={() => navigate('/worker-profile')}>
                      Cập nhật hồ sơ
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
                    userSkills={formData?.aspirations?.skills || []}
                    targetSalary={formData?.aspirations?.targetSalary}
                    onApply={handleApply}
                    onViewSimilar={handleViewSimilar}
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
    </div>
  )
}

// Helper function
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default JobsPage
