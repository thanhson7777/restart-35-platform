/**
 * SkillPlanTimeline Component
 * Hiển thị kế hoạch phát triển kỹ năng theo timeline
 */

import React from 'react'

const PERIOD_LABELS = {
  month_1_3: 'Tháng 1-3',
  month_4_6: 'Tháng 4-6',
  month_7_12: 'Tháng 7-12'
}

const PERIOD_COLORS = {
  month_1_3: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-800',
    icon: '🚀'
  },
  month_4_6: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800',
    icon: '📈'
  },
  month_7_12: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-800',
    icon: '🎯'
  }
}

const PRIORITY_LABELS = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp'
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200'
}

const SkillPlanTimeline = ({ skillPlan, compact = false }) => {
  if (!skillPlan || Object.keys(skillPlan).length === 0) {
    return null
  }

  const periods = ['month_1_3', 'month_4_6', 'month_7_12'].filter(
    period => skillPlan[period] && Object.keys(skillPlan[period]).length > 0
  )

  if (periods.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Kế hoạch phát triển kỹ năng
        </h3>
        <span className="text-sm text-gray-500">
          {periods.length} giai đoạn
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-blue-500 to-purple-500" />

        {/* Periods */}
        <div className="space-y-6">
          {periods.map((period, index) => {
            const plan = skillPlan[period]
            const colors = PERIOD_COLORS[period]
            const label = PERIOD_LABELS[period]
            const skills = plan.skills_to_add || []
            const focus = plan.focus || ''
            const action = plan.action || ''

            return (
              <div key={period} className="relative pl-12">
                {/* Timeline Node */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
                  style={{ top: compact ? '4px' : '12px' }}
                >
                  <span className="text-xs">{colors.icon}</span>
                </div>

                {/* Period Card */}
                <div className={`rounded-xl p-4 ${colors.bg} ${compact ? '' : 'p-5'}`}>
                  {/* Period Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
                        {label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {skills.length} kỹ năng
                    </span>
                  </div>

                  {/* Focus */}
                  {focus && (
                    <div className="mb-3">
                      <div className={`text-sm font-medium ${colors.text}`}>
                        {focus}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Kỹ năng cần học
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, skillIndex) => (
                          <div
                            key={skillIndex}
                            className={`
                              flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm
                              ${PRIORITY_COLORS[skill.priority] || PRIORITY_COLORS.medium}
                            `}
                          >
                            <span className="font-medium">
                              {skill.skill}
                            </span>
                            <span className="text-xs opacity-75">
                              {skill.learning_time_months
                                ? `~${skill.learning_time_months} tháng`
                                : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  {action && (
                    <div className={`mt-3 pt-3 border-t border-${colors.text.split('-')[1]}-200`}>
                      <div className="flex items-start gap-2">
                        <svg className={`w-4 h-4 ${colors.text} mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className={`text-sm ${colors.text}`}>
                          {action}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 rounded-xl p-4 mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tổng kết
        </h4>
        <div className="text-sm text-gray-600">
          <p>
            Bạn cần phát triển{' '}
            <span className="font-semibold text-gray-900">
              {periods.reduce((total, period) => total + (skillPlan[period]?.skills_to_add?.length || 0), 0)}
            </span>{' '}
            kỹ năng trong{' '}
            <span className="font-semibold text-gray-900">
              {periods.length}
            </span>{' '}
            giai đoạn để đạt được lộ trình nghề nghiệp mong muốn.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SkillPlanTimeline
