/**
 * DashboardPage - Trang chủ cho Worker sau khi đăng nhập
 *
 * Features:
 * - Welcome message với progress bar profile completion
 * - AI Recommendations Section
 * - Quick actions (tạo profile, xem việc làm)
 * - Empty state cho user chưa có profile
 */

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  fetchMyProfile,
  selectProfile,
  selectIsCompleted,
  selectCurrentStep
} from '~/redux/profile/profileSlice'
import { selectAIServiceStatus } from '~/redux/ai/aiSlice'
import { selectCurrentUser } from '~/redux/user/userSlice'

import AIRecommendations from '~/components/ai/AIRecommendations'
import SkeletonLoader from '~/components/ai/SkeletonLoader'

const DashboardPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Redux state
  const currentUser = useSelector(selectCurrentUser)
  const profile = useSelector(selectProfile)
  const isCompleted = useSelector(selectIsCompleted)
  const currentStep = useSelector(selectCurrentStep)
  const aiServiceStatus = useSelector(selectAIServiceStatus)

  // Fetch profile on mount
  useEffect(() => {
    dispatch(fetchMyProfile())
  }, [dispatch])

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (isCompleted) return 100
    if (!currentStep) return 0
    return Math.round((currentStep / 4) * 100)
  }

  const completionPercentage = getCompletionPercentage()

  // Đã đi hết 4 bước trên form nhưng backend có thể chưa isCompleted → không hiện banner "3 phút" / Hoàn thành ngay
  const allStepsDone = isCompleted || currentStep >= 4

  // Get display name
  const getDisplayName = () => {
    if (currentUser?.displayName) return currentUser.displayName
    if (currentUser?.username) return currentUser.username
    return 'bạn'
  }

  // Handle create profile
  const handleCreateProfile = () => {
    navigate('/profile/create')
  }

  // Handle view jobs
  const handleViewJobs = () => {
    navigate('/jobs')
  }

  // Handle AI error
  const handleAIRefresh = () => {
    toast.success('Đang tải lại gợi ý việc làm...')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            Xin chào, {getDisplayName()}!
          </h1>
          <p className="text-blue-100 text-lg">
            Chào mừng bạn đến với Restart-35 - Nền tảng hỗ trợ tái hòa nhập và lập nghiệp
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Profile Progress Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Tiến độ hoàn thành hồ sơ
              </h2>
              <p className="text-gray-500">
                {isCompleted
                  ? 'Bạn đã hoàn thành hồ sơ!'
                  : currentStep >= 4
                    ? 'Bạn đã hoàn thành 4/4 bước trên form. Nếu chưa nhấn Hoàn thành ở bước cuối, hãy mở hồ sơ để xác nhận.'
                    : `Bạn đã hoàn thành ${currentStep}/4 bước`}
              </p>
            </div>

            {!allStepsDone && (
              <button
                onClick={handleCreateProfile}
                className="
                  px-4 py-2 bg-blue-600 hover:bg-blue-700
                  text-white text-sm font-medium rounded-lg
                  transition-colors
                "
              >
                {currentStep > 0 ? 'Tiếp tục' : 'Bắt đầu'}
              </button>
            )}
            {!isCompleted && currentStep >= 4 && (
              <button
                type="button"
                onClick={handleCreateProfile}
                className="
                  px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                  text-white text-sm font-medium rounded-lg
                  transition-colors
                "
              >
                Mở hồ sơ để xác nhận
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-500
                  ${completionPercentage === 100
                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }
                `}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-between mt-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${step <= currentStep || isCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {step <= currentStep || isCompleted ? '✓' : step}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {['Thông tin', 'Kinh nghiệm', 'Rào cản', 'Nguyện vọng'][step - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gợi ý hoàn thành hồ sơ — chỉ khi chưa đi hết 4 bước (tránh mâu thuẫn với 4/4 bước) */}
          {!isCompleted && currentStep < 4 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-blue-800 font-medium">
                    Dành 3 phút hoàn thành hồ sơ để nhận gợi ý việc làm phù hợp!
                  </p>
                  <p className="text-blue-600 text-sm">
                    Hệ thống AI sẽ phân tích kỹ năng và đề xuất công việc tốt nhất cho bạn.
                  </p>
                </div>
                <button
                  onClick={handleCreateProfile}
                  className="
                    px-4 py-2 bg-blue-600 hover:bg-blue-700
                    text-white text-sm font-medium rounded-lg
                    whitespace-nowrap
                    transition-colors
                  "
                >
                  Hoàn thành ngay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendations Section */}
        <AIRecommendations
          limit={3}
          showRiskSection={true}
          showViewMore={true}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {/* View Jobs Card */}
          <button
            onClick={handleViewJobs}
            className="
              bg-white rounded-2xl shadow-sm p-6 text-left
              hover:shadow-md hover:border-indigo-200
              border border-transparent transition-all
            "
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">
                  Tìm việc làm
                </h3>
                <p className="text-gray-500 text-sm">
                  Khám phá các công việc phù hợp với kỹ năng và kinh nghiệm của bạn
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>

          {/* Create Profile Card (shown if completed) */}
          {isCompleted && (
            <button
              onClick={handleCreateProfile}
              className="
                bg-white rounded-2xl shadow-sm p-6 text-left
                hover:shadow-md hover:border-green-200
                border border-transparent transition-all
              "
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">
                    Cập nhật hồ sơ
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Thay đổi thông tin để nhận gợi ý chính xác hơn
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* AI Service Status (for debugging) */}
        {aiServiceStatus === 'unhealthy' && (
          <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-amber-800 font-medium">
                  Dịch vụ AI đang bảo trì
                </p>
                <p className="text-amber-600 text-sm">
                  Gợi ý việc làm có thể chưa khả dụng. Vui lòng thử lại sau.
                </p>
              </div>
              <button
                onClick={handleAIRefresh}
                className="px-3 py-1 text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors text-sm"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
