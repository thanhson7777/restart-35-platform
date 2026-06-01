/**
 * SkillGapSection Component
 *
 * Displays skill gaps from career analysis with:
 * - Priority classification (essential, important, nice_to_have)
 * - Progress tracking
 * - Learning resource suggestions
 * - Trending skills (from GROQ)
 * - Soft skills (from GROQ)
 *
 * Author: Restart-35
 * Date: 2026-06-01
 */

import { useState, useMemo } from 'react'
import { featureFlags } from '~/config/features'
import { Loader2, TrendingUp, HeartHandshake } from 'lucide-react'

// Priority configuration
const PRIORITY_CONFIG = {
  essential: {
    label: 'Bắt buộc',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    icon: '🔴',
    description: 'Kỹ năng cần thiết cho vị trí mục tiêu'
  },
  important: {
    label: 'Quan trọng',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: '🟡',
    description: 'Kỹ năng nên có để tăng cơ hội'
  },
  nice_to_have: {
    label: 'Nên có',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: '🟢',
    description: 'Kỹ năng bổ sung giá trị'
  }
}

// Skill category icons
const SKILL_ICONS = {
  technical: '💻',
  soft: '🤝',
  management: '📊',
  creative: '🎨',
  language: '🌍',
  finance: '💰',
  health: '🏥',
  other: '📚'
}

/**
 * Categorize skill based on name
 */
const categorizeSkill = (skillName) => {
  const name = skillName.toLowerCase()

  if (/python|java|sql|excel|code|programming|tech|digital|ai|ml/i.test(name)) {
    return 'technical'
  }
  if (/leadership|management|team|communication|presentation|negotiation/i.test(name)) {
    return 'management'
  }
  if (/english|vietnamese|language|toeic|ielts/i.test(name)) {
    return 'language'
  }
  if (/finance|accounting|tax|bookkeeping/i.test(name)) {
    return 'finance'
  }
  if (/health|safety|medical|first aid/i.test(name)) {
    return 'health'
  }
  if (/creative|design|art|writing/i.test(name)) {
    return 'creative'
  }
  if (/teamwork|communication|problem solving|adapt/i.test(name)) {
    return 'soft'
  }

  return 'other'
}

/**
 * SkillGapCard Component
 */
const SkillGapCard = ({ skillGap, onSelect, isSelected }) => {
  const priority = skillGap.priority || 'nice_to_have'
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.nice_to_have
  const category = categorizeSkill(skillGap.skill_name)
  const icon = SKILL_ICONS[category] || SKILL_ICONS.other

  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all cursor-pointer
        ${isSelected
          ? `${config.borderColor} ${config.bgColor} shadow-md`
          : `border-gray-200 hover:border-gray-300 hover:shadow-sm`
        }
      `}
      onClick={() => onSelect?.(skillGap)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0">{icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate">
              {skillGap.skill_name}
            </h4>
            <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
              {config.icon} {config.label}
            </span>
          </div>

          {skillGap.reason && (
            <p className="text-sm text-gray-600 mb-2">
              {skillGap.reason}
            </p>
          )}

          {/* Score indicator if available */}
          {skillGap.score !== undefined && skillGap.score > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Ưu tiên:</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.bgColor.replace('50', '500')}`}
                  style={{ width: `${Math.min(100, skillGap.score * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * SkillGapDetail Component
 */
const SkillGapDetail = ({ skillGap, onClose }) => {
  const priority = skillGap.priority || 'nice_to_have'
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.nice_to_have

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-4 ${config.bgColor} border-b ${config.borderColor}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{skillGap.skill_name}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-black/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <span className={`inline-block mt-2 text-sm ${config.textColor}`}>
            {config.icon} {config.label} - {config.description}
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {skillGap.reason && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Lý do cần thiết</h4>
              <p className="text-gray-600">{skillGap.reason}</p>
            </div>
          )}

          {skillGap.learning_resources && skillGap.learning_resources.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Nguồn học tập</h4>
              <ul className="space-y-2">
                {skillGap.learning_resources.map((resource, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span className="text-gray-600">{resource}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skillGap.estimated_time && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Thời gian ước tính: {skillGap.estimated_time}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * SkillGapSection Component
 */
const SkillGapSection = ({
  occupation = null,
  result = null,
  onSkillSelect = null,
  showFilters = true,
  showTrending = true,
  showSoftSkills = true
}) => {
  // Backward compat: if result is null, treat skillGaps prop as direct array
  const skillGaps = result?.skill_gaps || []
  const trendingSkills = result?.trending_skills || []
  const softSkills = result?.soft_skills || []
  const groqEnhanced = result?.groq_enhanced || false
  const stats = result?.stats || {}

  const [activePriority, setActivePriority] = useState('all')
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Filter skill gaps by priority
  const filteredGaps = useMemo(() => {
    if (activePriority === 'all') return skillGaps
    return skillGaps.filter(gap => gap.priority === activePriority)
  }, [skillGaps, activePriority])

  // Group by priority
  const groupedGaps = useMemo(() => {
    const groups = {
      essential: [],
      important: [],
      nice_to_have: []
    }

    skillGaps.forEach(gap => {
      const priority = gap.priority || 'nice_to_have'
      if (groups[priority]) {
        groups[priority].push(gap)
      }
    })

    return groups
  }, [skillGaps])

  // Priority tabs
  const priorityTabs = [
    { key: 'all', label: 'Tất cả', count: skillGaps.length },
    { key: 'essential', label: 'Bắt buộc', count: groupedGaps.essential.length },
    { key: 'important', label: 'Quan trọng', count: groupedGaps.important.length },
    { key: 'nice_to_have', label: 'Nên có', count: groupedGaps.nice_to_have.length }
  ]

  const hasAnyData = skillGaps.length > 0 || trendingSkills.length > 0 || softSkills.length > 0

  if (!hasAnyData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-4xl mb-2 block">📚</span>
        <p>Chưa có thông tin kỹ năng cần phát triển</p>
      </div>
    )
  }

  return (
    <div className="skill-gap-section">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Kỹ năng cần phát triển
        </h3>
        {occupation && (
          <p className="text-sm text-gray-500">
            Cho vị trí: <span className="font-medium">{occupation}</span>
            {groqEnhanced && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                AI-enhanced
              </span>
            )}
          </p>
        )}
      </div>

      {/* Priority Tabs */}
      {showFilters && skillGaps.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {priorityTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActivePriority(tab.key)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${activePriority === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {/* Progress Summary */}
      {skillGaps.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <div
              key={key}
              className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{config.icon}</span>
                <span className={`text-sm font-medium ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {groupedGaps[key]?.length || 0}
              </div>
              <div className="text-xs text-gray-500">kỹ năng</div>
            </div>
          ))}
        </div>
      )}

      {/* Skill Gap List */}
      {skillGaps.length > 0 && (
        <div className="space-y-3 mb-6">
          {filteredGaps.map((gap, index) => (
            <div key={gap.skill_name + index} className="relative">
              <SkillGapCard
                skillGap={gap}
                isSelected={expandedId === gap.skill_name + index}
                onSelect={() => setExpandedId(
                  expandedId === gap.skill_name + index ? null : gap.skill_name + index
                )}
              />

              {/* Expanded Detail */}
              {expandedId === gap.skill_name + index && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {gap.reason && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Lý do: </span>
                      {gap.reason}
                    </p>
                  )}
                  {gap.learning_resources && gap.learning_resources.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Nguồn học tập: </span>
                      <ul className="mt-1 space-y-1">
                        {gap.learning_resources.map((resource, idx) => (
                          <li key={idx} className="text-blue-600 hover:underline">
                            {resource}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trending Skills Section */}
      {showTrending && trendingSkills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-500" />
            Xu hướng kỹ năng (2025-2026)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trendingSkills.map((skill, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-orange-500 mt-0.5 flex-shrink-0">
                  <TrendingUp size={14} />
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-gray-900 text-sm">{skill.name}</span>
                  {skill.reason && (
                    <p className="text-xs text-gray-500 mt-0.5">{skill.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Soft Skills Section */}
      {showSoftSkills && softSkills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <HeartHandshake size={16} className="text-purple-500" />
            Kỹ năng mềm cần thiết
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {softSkills.map((skill, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-purple-500 mt-0.5 flex-shrink-0">
                  <HeartHandshake size={14} />
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-gray-900 text-sm">{skill.name}</span>
                  {skill.reason && (
                    <p className="text-xs text-gray-500 mt-0.5">{skill.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSkill && (
        <SkillGapDetail
          skillGap={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  )
}

export default SkillGapSection
