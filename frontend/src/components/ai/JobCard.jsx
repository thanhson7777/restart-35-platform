/**
 * JobCard - Card hiển thị thông tin việc làm với AI matching score
 *
 * Features:
 * - Hiển thị score matching (badge: "Rất phù hợp" / "Phù hợp")
 * - Highlight skills trùng khớp với user profile
 * - Format salary và location
 */

import { useNavigate } from 'react-router-dom'

const JobCard = ({
  job,
  userSkills = [],
  onApply,
  showMatchDetails = true,
  size = 'md'
}) => {
  const navigate = useNavigate()

  if (!job) return null

  const {
    id,
    title,
    company,
    location,
    salary_min,
    salary_max,
    type,
    skills = [],
    score,
    match_details
  } = job

  // Calculate match badge
  const getMatchBadge = (score) => {
    if (score >= 0.8) {
      return {
        label: 'Rất phù hợp',
        icon: '🔥',
        bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        textColor: 'text-white'
      }
    } else if (score >= 0.6) {
      return {
        label: 'Phù hợp',
        icon: '👍',
        bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        textColor: 'text-white'
      }
    } else {
      return {
        label: 'Có thể bạn quan tâm',
        icon: '💡',
        bgColor: 'bg-gradient-to-r from-gray-400 to-gray-500',
        textColor: 'text-white'
      }
    }
  }

  // Find matching skills
  const getMatchingSkills = () => {
    if (!userSkills || userSkills.length === 0) return []

    const userSkillsLower = userSkills.map(s => s.toLowerCase())
    return skills.filter(skill => {
      const skillLower = skill.toLowerCase()
      return userSkillsLower.some(userSkill =>
        skillLower.includes(userSkill) || userSkill.includes(skillLower)
      )
    })
  }

  // Find non-matching skills
  const getOtherSkills = () => {
    const matching = getMatchingSkills()
    return skills.filter(skill => !matching.includes(skill))
  }

  // Format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thương lượng'

    const format = (num) => {
      if (!num) return ''
      return new Intl.NumberFormat('vi-VN').format(num) + ' triệu'
    }

    if (min && max) {
      return `${format(min)} - ${format(max)}`
    }
    return min ? `Từ ${format(min)}` : `Đến ${format(max)}`
  }

  // Job type label
  const jobTypeLabels = {
    'full-time': 'Toàn thời gian',
    'part-time': 'Bán thời gian',
    'temporary': 'Thời vụ',
    'freelance': 'Freelance'
  }

  const matchBadge = getMatchBadge(score)
  const matchingSkills = getMatchingSkills()
  const otherSkills = getOtherSkills()

  // Size variants
  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-5 text-lg'
  }

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-100
        hover:shadow-md hover:border-blue-200
        transition-all duration-200 cursor-pointer
        ${sizeClasses[size]}
      `}
      onClick={() => navigate(`/jobs/${id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-bold text-gray-900 truncate pr-4">
            {title}
          </h3>

          {/* Company */}
          {company && (
            <p className="text-gray-500 text-sm mt-0.5">
              {company}
            </p>
          )}
        </div>

        {/* Match Badge */}
        {score !== undefined && score !== null && (
          <div
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
              ${matchBadge.bgColor} ${matchBadge.textColor}
              whitespace-nowrap
            `}
          >
            <span>{matchBadge.icon}</span>
            <span>{matchBadge.label}</span>
          </div>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-gray-600">
        {/* Location */}
        {location && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{location}</span>
          </div>
        )}

        {/* Salary */}
        {(salary_min || salary_max) && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium text-green-600">
              {formatSalary(salary_min, salary_max)}
            </span>
          </div>
        )}

        {/* Job Type */}
        {type && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{jobTypeLabels[type] || type}</span>
          </div>
        )}
      </div>

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {/* Matching skills (highlighted) */}
            {matchingSkills.map((skill, index) => (
              <span
                key={`match-${index}`}
                className="
                  px-2.5 py-1 text-xs font-medium rounded-full
                  bg-green-100 text-green-700 border border-green-200
                  font-semibold
                "
              >
                {skill}
              </span>
            ))}

            {/* Other skills (normal) */}
            {otherSkills.map((skill, index) => (
              <span
                key={`other-${index}`}
                className="
                  px-2.5 py-1 text-xs font-medium rounded-full
                  bg-gray-100 text-gray-600
                "
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Match explanation */}
          {showMatchDetails && matchingSkills.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              AI nhận thấy bạn có {matchingSkills.length} kỹ năng phù hợp với công việc này
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        {/* Score detail */}
        {score !== undefined && score !== null && (
          <div className="text-xs text-gray-400">
            Độ phù hợp: <span className="font-medium">{Math.round(score * 100)}%</span>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onApply) onApply(job)
          }}
          className="
            px-4 py-2 bg-blue-600 hover:bg-blue-700
            text-white text-sm font-medium rounded-lg
            transition-colors duration-150
          "
        >
          Ứng tuyển ngay
        </button>
      </div>
    </div>
  )
}

export default JobCard
