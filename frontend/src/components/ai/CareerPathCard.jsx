/**
 * CareerPathCard Component
 * Hiển thị một career path với đầy đủ thông tin
 */

import React from 'react'
import { useSelector } from 'react-redux'
import { selectPriority } from '~/redux/ai/aiSlice'
import { PRIORITY_CONFIG, PRIORITY_LEVELS } from '~/redux/ai/aiSlice'

const PATH_TYPE_LABELS = {
  management: 'Quản lý',
  age_transition: 'Chuyển đổi nghề',
  skill_upgrade: 'Nâng cấp kỹ năng',
  management_track: 'Lộ trình quản lý',
  default: 'Lộ trình nghề nghiệp'
}

const PATH_TYPE_COLORS = {
  management: 'bg-blue-100 text-blue-800',
  age_transition: 'bg-purple-100 text-purple-800',
  skill_upgrade: 'bg-green-100 text-green-800',
  management_track: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-800'
}

const CareerPathCard = ({ path, isPrimary = false, compact = false, onActionClick }) => {
  const priority = useSelector(selectPriority)

  if (!path) return null

  const priorityLevel = priority?.level || 'medium'
  const priorityConfig = PRIORITY_CONFIG[priorityLevel] || PRIORITY_CONFIG[PRIORITY_LEVELS.MEDIUM]

  const pathType = path.path_type || path.path_category || 'default'
  const pathTypeLabel = PATH_TYPE_LABELS[pathType] || PATH_TYPE_LABELS.default
  const pathTypeColor = PATH_TYPE_COLORS[pathType] || PATH_TYPE_COLORS.default

  const matchScore = Math.round((path.match_score || path.score || 0) * 100)
  const finalScore = Math.round((path.final_score || path.match_score || path.score || 0) * 100)

  const salaryMin = path.salary_min || path.salary_range?.min || 0
  const salaryMax = path.salary_max || path.salary_range?.max || 0

  const formatSalary = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(0)}M`
    }
    return `${amount.toLocaleString('vi-VN')}`
  }

  return (
    <div
      className={`
        rounded-xl p-5 transition-all duration-200
        ${isPrimary
          ? 'border-2 border-blue-500 bg-blue-50 shadow-md'
          : 'border border-gray-200 bg-white hover:shadow-md'
        }
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${pathTypeColor}`}>
              {pathTypeLabel}
            </span>
            {isPrimary && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white">
                Đề xuất chính
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {path.title}
          </h3>
          {path.description && (
            <p className="text-sm text-gray-600 mt-1">{path.description}</p>
          )}
        </div>

        {/* Score Badge */}
        <div className="text-right ml-4">
          <div className={`text-2xl font-bold ${matchScore >= 80 ? 'text-green-600' : matchScore >= 60 ? 'text-amber-600' : 'text-gray-600'}`}>
            {finalScore}%
          </div>
          <div className="text-xs text-gray-500">Phù hợp</div>
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Thời gian</div>
          <div className="font-medium text-gray-900">
            {path.timeline_months || 6} tháng
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Mức lương</div>
          <div className="font-medium text-gray-900">
            {salaryMin > 0 ? `${formatSalary(salaryMin)} - ${formatSalary(salaryMax)}` : 'Thỏa thuận'}
          </div>
        </div>
      </div>

      {/* Missing Skills */}
      {path.missing_skills && path.missing_skills.length > 0 && !compact && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Kỹ năng cần thêm
          </h4>
          <div className="flex flex-wrap gap-2">
            {path.missing_skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-yellow-50 text-yellow-800 rounded text-xs border border-yellow-200"
              >
                {skill}
              </span>
            ))}
            {path.missing_skills.length > 5 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{path.missing_skills.length - 5} khác
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {path.reasoning && path.reasoning.length > 0 && !compact && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Lý do gợi ý
          </h4>
          <ul className="space-y-1">
            {path.reasoning.slice(0, 3).map((reason, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pros & Cons */}
      {(!compact) && (path.pros && path.pros.length > 0 || path.cons && path.cons.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {path.pros && path.pros.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-green-800 mb-1">Ưu điểm</h4>
              <ul className="space-y-1">
                {path.pros.slice(0, 2).map((pro, index) => (
                  <li key={index} className="text-xs text-green-700 flex items-start gap-1">
                    <span className="text-green-500">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {path.cons && path.cons.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-amber-800 mb-1">Lưu ý</h4>
              <ul className="space-y-1">
                {path.cons.slice(0, 2).map((con, index) => (
                  <li key={index} className="text-xs text-amber-700 flex items-start gap-1">
                    <span className="text-amber-500">!</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Immediate Action */}
      {path.immediate_action && !compact && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Hành động ngay</h4>
              <p className="text-sm text-blue-700 mt-1">{path.immediate_action}</p>
            </div>
          </div>
        </div>
      )}

      {/* Barrier Notes */}
      {path.barrier_notes && path.barrier_notes.length > 0 && !compact && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          {path.barrier_notes.map((note, index) => (
            <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {note}
            </div>
          ))}
        </div>
      )}

      {/* Action Button */}
      {onActionClick && (
        <button
          onClick={() => onActionClick(path)}
          className={`
            w-full mt-4 py-2 px-4 rounded-lg font-medium transition-colors
            ${isPrimary
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          Xem chi tiết lộ trình
        </button>
      )}
    </div>
  )
}

export default CareerPathCard
