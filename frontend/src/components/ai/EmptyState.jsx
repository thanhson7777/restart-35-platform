/**
 * EmptyState - Trạng thái khi user chưa hoàn thành profile
 *
 * Hiển thị thông báo kèm CTA để tạo profile
 */

import { useNavigate } from 'react-router-dom'

const EmptyState = ({
  title = 'Tính năng đang bị khóa',
  subtitle = 'Hãy hoàn thành hồ sơ để mở khóa gợi ý việc làm phù hợp nhất!',
  actionLabel = 'Tạo hồ sơ ngay',
  icon = 'lock',
  onAction
}) => {
  const navigate = useNavigate()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else {
      navigate('/profile/create')
    }
  }

  // Icon variants
  const icons = {
    lock: (
      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    sparkles: (
      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
    ),
    briefcase: (
      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    search: (
      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    checkCircle: (
      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Icon with background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gray-100 rounded-full blur-xl opacity-50" />
        <div className="relative bg-gray-50 rounded-full p-6">
          {icons[icon] || icons.lock}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        {title}
      </h3>

      {/* Subtitle */}
      <p className="text-gray-500 mb-6 max-w-sm">
        {subtitle}
      </p>

      {/* CTA Button */}
      <button
        onClick={handleAction}
        className="
          inline-flex items-center gap-2 px-6 py-3
          bg-blue-600 hover:bg-blue-700
          text-white font-medium rounded-xl
          shadow-lg shadow-blue-200
          transform hover:scale-105
          transition-all duration-200
        "
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        {actionLabel}
      </button>

      {/* Decorative element */}
      <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Chỉ mất 3 phút để hoàn thành</span>
      </div>
    </div>
  )
}

export default EmptyState
