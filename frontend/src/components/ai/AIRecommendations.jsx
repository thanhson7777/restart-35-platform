/**
 * AIRecommendations - Component chính hiển thị gợi ý việc làm
 *
 * Features:
 * - Hiển thị Risk Badge với message
 * - Hiển thị danh sách JobCards
 * - Lazy loading khi mounted
 * - Empty state khi chưa có profile
 */

import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  fetchJobRecommendations,
  predictRisk,
  selectRecommendations,
  selectRecommendationsLoading,
  selectRecommendationsError,
  selectUserRiskLevel,
  selectUserRiskScore
} from '~/redux/ai/aiSlice'
import {
  selectFormData,
  selectIsCompleted,
  selectCurrentStep
} from '~/redux/profile/profileSlice'
import {
  selectCurrentUser as selectAuthUser
} from '~/redux/user/userSlice'

import RiskBadge, { RISK_MESSAGES, RISK_SOLUTIONS } from './RiskBadge'
import JobCard from './JobCard'
import SkeletonLoader from './SkeletonLoader'
import EmptyState from './EmptyState'

function computeExperienceYears(employmentHistory) {
  if (!employmentHistory || employmentHistory.length === 0) return 0
  return employmentHistory.reduce((total, job) => {
    return total + (job.duration || 0) / 12
  }, 0)
}

const AIRecommendations = ({
  userSkills = [],
  limit = 3,
  showRiskSection = true,
  showViewMore = true,
  onJobClick
}) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Ref: chỉ gọi API 1 lần khi profile hoàn thành, tránh lặp vô hạn
  const hasFetchedRef = useRef(false)

  // Redux state
  const recommendations = useSelector(selectRecommendations)
  const isLoading = useSelector(selectRecommendationsLoading)
  const error = useSelector(selectRecommendationsError)
  const userRiskLevel = useSelector(selectUserRiskLevel)
  const userRiskScore = useSelector(selectUserRiskScore)
  const isProfileCompleted = useSelector(selectIsCompleted)
  const currentStep = useSelector(selectCurrentStep)
  const formData = useSelector(selectFormData)
  const authUser = useSelector(selectAuthUser)

  // Get userId for interaction tracking
  const userId = authUser?._id || authUser?.id || null

  // Deduplicate jobs by title + company + location
  const uniqueRecommendations = recommendations.reduce((acc, job) => {
    const key = `${job.title}|${job.company}|${job.location}`
    if (!acc.seen.has(key)) {
      acc.seen.add(key)
      acc.jobs.push(job)
    }
    return acc
  }, { seen: new Set(), jobs: [] }).jobs

  const aspirations = formData?.aspirations || {}
  const skillsList = aspirations.skills || userSkills || []
  // Mở AI khi đã hoàn thành chính thức HOẶC đã qua bước 4 và có kỹ năng (tránh lệch isCompleted với DB)
  const canUseAI =
    isProfileCompleted ||
    (currentStep >= 4 && Array.isArray(skillsList) && skillsList.length > 0)

  // Trigger AI recommendations: gọi 1 lần khi đủ điều kiện + có skills
  useEffect(() => {
    if (!canUseAI || hasFetchedRef.current) return

    const skills = aspirations.skills || userSkills || []
    if (skills.length === 0) {
      console.log('[AIRecommendations] No skills available, skipping AI calls')
      hasFetchedRef.current = true
      return
    }

    // Kiểm tra dữ liệu trước khi gọi API
    const age = formData?.basicInfo?.age || 45
    const gender = formData?.basicInfo?.gender || 'other'
    const experienceYears = computeExperienceYears(formData?.employmentHistory || [])

    console.log('[AIRecommendations] Calling AI with:', {
      age,
      gender,
      skills: skills.slice(0, 3), // Log first 3 skills
      skillsCount: skills.length,
      experienceYears,
      hasBasicInfo: !!formData?.basicInfo
    })

    hasFetchedRef.current = true

    // Chỉ gửi các fields có giá trị (loại bỏ null/undefined)
    const riskPayload = {
      age,
      gender,
      skills,
      experience_years: experienceYears
    }

    // Chỉ thêm optional fields nếu có giá trị
    if (formData?.basicInfo?.education) riskPayload.education = formData.basicInfo.education
    if (formData?.basicInfo?.employmentStatus) riskPayload.employment_status = formData.basicInfo.employmentStatus
    if (formData?.basicInfo?.maritalStatus) riskPayload.marital_status = formData.basicInfo.maritalStatus
    if (aspirations.targetProvince || formData?.basicInfo?.province) {
      riskPayload.region = aspirations.targetProvince || formData.basicInfo.province
    }
    if (aspirations.targetJob) riskPayload.target_job = aspirations.targetJob

    console.log('[AIRecommendations] Risk payload:', riskPayload)

    // Gọi predictRisk để lấy đánh giá rủi ro thất nghiệp
    dispatch(predictRisk(riskPayload))

    // Gọi fetchJobRecommendations để lấy gợi ý việc làm
    dispatch(
      fetchJobRecommendations({
        skills,
        experience: experienceYears,
        location: aspirations.targetProvince || formData?.basicInfo?.province || null,
        targetJob: aspirations.targetJob || null,
        limit
      })
    )
  }, [dispatch, canUseAI, limit, aspirations, userSkills, formData])

  // Handle view more
  const handleViewMore = () => {
    navigate('/jobs?filter=ai')
  }

  // Handle job apply
  const handleApply = (job) => {
    if (onJobClick) {
      onJobClick(job)
    }
  }

  // Empty state - chưa đủ điều kiện (chưa bước 4 hoặc chưa có kỹ năng)
  if (!canUseAI) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <EmptyState
          title="Tính năng đang bị khóa"
          subtitle="Hãy hoàn thành hồ sơ để nhận gợi ý việc làm phù hợp nhất với bạn!"
          actionLabel="Tạo hồ sơ ngay"
          icon="sparkles"
        />
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <SkeletonLoader type="section" count={limit} />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Không thể tải gợi ã việc làm
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // Get risk message and solutions
  const riskMessage = RISK_MESSAGES[userRiskLevel] || RISK_MESSAGES.medium
  const riskSolutions = RISK_SOLUTIONS[userRiskLevel] || RISK_SOLUTIONS.medium

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Gợi ý việc làm cho bạn
            </h2>
            <p className="text-sm text-gray-500">
              Dựa trên kỹ năng và kinh nghiệm của bạn
            </p>
          </div>
        </div>

        {/* View more link */}
        {showViewMore && uniqueRecommendations.length > 0 && (
          <button
            onClick={handleViewMore}
            className="
              flex items-center gap-1 text-blue-600 hover:text-blue-700
              text-sm font-medium transition-colors
            "
          >
            Xem thêm
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Risk Section */}
      {showRiskSection && userRiskLevel && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-100">
          <div className="flex items-start gap-3">
            <RiskBadge
              riskLevel={userRiskLevel}
              riskScore={userRiskScore}
              size="md"
              showMessage={true}
            />
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mt-2">
            {riskMessage}
          </p>

          {/* Solutions */}
          {riskSolutions.length > 0 && (
            <div className="mt-3 space-y-1">
              {riskSolutions.map((solution, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{solution}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Recommendations */}
      {uniqueRecommendations.length > 0 ? (
        <div className="space-y-4">
          {uniqueRecommendations.slice(0, limit).map((job, index) => (
            <JobCard
              key={job.id || index}
              job={job}
              userSkills={userSkills}
              onApply={handleApply}
              size="md"
              userId={userId}
              position={index + 1}     // Vị trí trong danh sách (ML feature)
              method="hybrid"           // AI hybrid recommendation (ML feature)
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy việc làm phù hợp"
          subtitle="Hãy thử cập nhật thêm kỹ năng hoặc điều chỉnh nguyện vọng của bạn"
          actionLabel="Cập nhật hồ sơ"
          icon="search"
          onAction={() => navigate('/profile/create')}
        />
      )}
    </div>
  )
}

export default AIRecommendations
