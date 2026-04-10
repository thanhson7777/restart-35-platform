/**
 * RiskBadge - Hiển thị mức độ ổn định công việc
 *
 * Sử dụng tên tích cực thay vì "rủi ro" để tạo cảm giác tích cực
 */

import { RISK_LEVELS, RISK_CONFIG } from '~/redux/ai/aiSlice'

const RiskBadge = ({ riskLevel, riskScore, message, size = 'md', showMessage = true }) => {
  // Default configuration
  const defaultConfig = {
    label: 'Chưa đánh giá',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
    icon: '?'
  }

  // Get config based on risk level
  const config = RISK_CONFIG[riskLevel] || defaultConfig

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  // Icon sizes
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="space-y-2">
      {/* Badge */}
      <div
        className={`
          inline-flex items-center gap-2 rounded-full border font-medium
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${sizeClasses[size]}
        `}
      >
        {/* Icon */}
        <span className={`${iconSizes[size]} flex items-center justify-center font-bold`}>
          {config.icon}
        </span>

        {/* Label */}
        <span className="font-semibold">
          {config.label}
        </span>

        {/* Score (optional) */}
        {riskScore !== null && riskScore !== undefined && (
          <span className="opacity-75">
            ({Math.round(riskScore * 100)}%)
          </span>
        )}
      </div>

      {/* Message (optional) */}
      {showMessage && message && (
        <p className={`text-sm ${config.textColor} opacity-80`}>
          {message}
        </p>
      )}
    </div>
  )
}

// Pre-configured messages for each risk level
export const RISK_MESSAGES = {
  [RISK_LEVELS.LOW]: 'Công việc của bạn đang có nhu cầu cao trên thị trường.',
  [RISK_LEVELS.MEDIUM]: 'Công việc hiện tại đang có xu hướng giảm nhu cầu. Bạn nên xem qua các khóa học ngắn hạn dưới đây.',
  [RISK_LEVELS.HIGH]: 'Ngành nghề này đang bị thay thế cao. Hệ thống đã tìm thấy các ngành nghề mới cực kỳ phù hợp với kỹ năng cũ của bạn!'
}

// Pre-configured solutions for each risk level
export const RISK_SOLUTIONS = {
  [RISK_LEVELS.LOW]: [
    'Tiếp tục cập nhật kỹ năng chuyên môn',
    'Mở rộng network trong ngành',
    'Tìm hiểu các xu hướng mới'
  ],
  [RISK_LEVELS.MEDIUM]: [
    'Tham gia khóa học nâng cao kỹ năng',
    'Tìm hiểu các ngành liên quan để đa dạng hóa',
    'Xây dựng hồ sơ trên các nền tảng tuyển dụng'
  ],
  [RISK_LEVELS.HIGH]: [
    'Khám phá các ngành nghề mới đang phát triển',
    'Học kỹ năng chuyển đổi (transferable skills)',
    'Liên hệ các trung tâm hỗ trợ việc làm'
  ]
}

export default RiskBadge
