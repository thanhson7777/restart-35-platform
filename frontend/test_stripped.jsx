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
import {
  fetchPublishedJobs,
  selectJobs as selectRecruitmentJobs,
  selectJobsLoading as selectRecruitmentLoading
} from '@/redux/recruitment/recruitmentSlice'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

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
  { id: 'recruitment', label: 'Tin tuyển dụng', icon: Briefcase },
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
  // #region agent debug
  fetch('http://127.0.0.1:7657/ingest/50723660-d880-4eec-a288-d8347939a202', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '027b7a' }, body: JSON.stringify({ sessionId: '027b7a', location: 'JobsPage.jsx:86', message: 'JobsPage component START', data: { line: 86 }, timestamp: Date.now() }) }).catch(() => { });
  // #endregion
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
  const recruitmentJobs = useSelector(selectRecruitmentJobs)
  const recruitmentLoading = useSelector(selectRecruitmentLoading)

  // Refs to prevent infinite loops
  const hasFetchedRecommended = useRef(false)
  const hasFetchedAll = useRef(false)
  const hasFetchedCareer = useRef(false)
  const hasFetchedRecruitment = useRef(false)

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
    if (activeTab === 'recruitment') {
      hasFetchedRecruitment.current = false
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
    } else if (activeTab === 'recruitment' && !recruitmentLoading) {
      if (!hasFetchedRecruitment.current) {
        hasFetchedRecruitment.current = true
        dispatch(fetchPublishedJobs({ status: 'published', limit: 50 }))
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
    } else if (activeTab === 'recruitment') {
      hasFetchedRecruitment.current = false
      dispatch(fetchPublishedJobs({ status: 'published', limit: 50 }))
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
        case 'recruitment':
          return recruitmentJobs
        default:
          return []
      }
    }, [activeTab, recommendedJobs, allJobs, savedJobs, recruitmentJobs, filters]);

    const isLoading = activeTab === 'recommended' ? recommendedLoading : activeTab === 'recruitment' ? recruitmentLoading : jobsLoading

    return (
      <>
        __JSX__
                  __JSX__
                </div>
                __JSX__
                  )}
                  __JSX__
                </div>
              </div>
            </div>
          </div>

          __JSX__
                      __JSX__
                    </div>
                    __JSX__
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Career Path Banner - Profile Not Completed */}
            {activeTab === 'career' && !isProfileCompleted && (
              __JSX__
                      __JSX__
                    </div>
                    __JSX__
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missing Skills Banner - Chỉ hiển thị khi thực sự không có skills */}
            {activeTab === 'recommended' && !hasProfileForRecommendations && (
              __JSX__
                      __JSX__
                    </div>
                    __JSX__
                  </div>
                </CardContent>
              </Card>
            )}

            __JSX__
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Smart Filter Chip Bar - Chỉ hiển thị khi tab là 'recommended' và có employmentHistory */}
                {activeTab === 'recommended' && formData?.employmentHistory?.length > 0 && (
                  __JSX__
                      </button>

                      {/* Chip: Nghề gần nhất */}
                      __JSX__
                      </button>

                      {/* Chip: Tùy chỉnh */}
                      __JSX__
                        </button>

                        {/* Dropdown menu khi chọn custom */}
                        {showCustomDropdown && skillFilterMode === 'custom' && (
                          __JSX__
                                </div>
                                {formData.employmentHistory.map((job, index) => (
                                  __JSX__
                                      __JSX__
                                    </div>
                                    {selectedJobIndex === index && (
                                      __JSX__
                                ))}
                              </>
                            ) : (
                              __JSX__
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  __JSX__
                        __JSX__
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Jobs List */}
                {isLoading ? (
                  __JSX__
                            </div>
                            __JSX__
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : activeTab === 'career' && isProfileCompleted ? (
                  __JSX__
                      __JSX__
                      {activeTab === 'recommended' && (
                        __JSX__
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  __JSX__
                )}

                {/* Load More */}
                {currentJobs.length > 0 && currentJobs.length < 20 && (
                  __JSX__
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Job Detail Modal */}
          {selectedJob && (
            __JSX__
        __SELF_CLOSE__
      </>
    )
  }

  export default JobsPage
