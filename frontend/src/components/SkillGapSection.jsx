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
import { CircleNotch, TrendUp, Handshake, Star, Heart, Code, ChartBar, Palette, Globe, CurrencyDollar, FirstAid, BookOpenText, X, Clock, Lightbulb, ArrowSquareOut } from '@phosphor-icons/react'
import { cn } from '~/lib/utils'

// Priority configuration
const PRIORITY_CONFIG = {
  essential: {
    label: 'Bắt buộc',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    iconWeight: 'fill',
    description: 'Kỹ năng cần thiết cho vị trí mục tiêu'
  },
  important: {
    label: 'Quan trọng',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    iconWeight: 'fill',
    description: 'Kỹ năng nên có để tăng cơ hội'
  },
  nice_to_have: {
    label: 'Nên có',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    iconWeight: 'regular',
    description: 'Kỹ năng bổ sung giá trị'
  }
}

// Icon components for priority levels (rendered dynamically)
const PriorityIcons = {
  essential: TrendUp,
  important: Star,
  nice_to_have: Heart
}

// Skill category icon components
const CategoryIcons = {
  technical: Code,
  soft: Handshake,
  management: ChartBar,
  creative: Palette,
  language: Globe,
  finance: CurrencyDollar,
  health: FirstAid,
  other: BookOpenText
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
  const CategoryIcon = CategoryIcons[category] || CategoryIcons.other
  const PriorityIcon = PriorityIcons[priority]

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 transition-all cursor-pointer',
        isSelected
          ? `${config.borderColor} ${config.bgColor} shadow-md`
          : 'border-border hover:border-muted-foreground/30 hover:shadow-sm'
      )}
      onClick={() => onSelect?.(skillGap)}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          config.iconBg
        )}>
          <CategoryIcon size={18} className={config.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-foreground truncate">
              {skillGap.skill_name}
            </h4>
            <span className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
              config.bgColor, config.textColor
            )}>
              <PriorityIcon size={10} weight={config.iconWeight} />
              {config.label}
            </span>
          </div>

          {skillGap.reason && (
            <p className="text-sm text-muted-foreground mb-2">
              {skillGap.reason}
            </p>
          )}

          {/* Score indicator if available */}
          {skillGap.score !== undefined && skillGap.score > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ưu tiên:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, skillGap.score * 100)}%`,
                    backgroundColor: priority === 'essential' ? '#dc2626'
                      : priority === 'important' ? '#d97706'
                      : '#16a34a'
                  }}
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
  const PriorityIcon = PriorityIcons[priority]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={cn('shrink-0 p-4 border-b', config.bgColor, config.borderColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.iconBg)}>
                <PriorityIcon size={16} weight={config.iconWeight} className={config.iconColor} />
              </div>
              <h3 className="font-semibold text-lg text-foreground">{skillGap.skill_name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
            >
              <X size={18} weight="bold" className="text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <PriorityIcon size={12} weight={config.iconWeight} className={config.iconColor} />
            <span className={cn('text-sm font-medium', config.textColor)}>
              {config.label} — {config.description}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {skillGap.reason && (
            <div>
              <h4 className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Lightbulb size={14} className="text-amber-500 shrink-0" />
                Lý do cần thiết
              </h4>
              <p className="text-muted-foreground">{skillGap.reason}</p>
            </div>
          )}

          {skillGap.learning_resources && skillGap.learning_resources.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-1.5">
                <BookOpenText size={14} className="text-blue-500 shrink-0" />
                Nguồn học tập
              </h4>
              <ul className="space-y-2">
                {skillGap.learning_resources.map((resource, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <ArrowSquareOut size={13} className="text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {resource}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skillGap.estimated_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={15} className="shrink-0" />
              <span>Thời gian ước tính: <span className="font-medium text-foreground">{skillGap.estimated_time}</span></span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t bg-muted/30 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpenText size={40} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Chưa có thông tin kỹ năng cần phát triển</p>
      </div>
    )
  }

  return (
    <div className="skill-gap-section">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Kỹ năng cần phát triển
        </h3>
        {occupation && (
          <p className="text-sm text-muted-foreground">
            Cho vị trí: <span className="font-medium text-foreground">{occupation}</span>
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
          {priorityTabs.map(tab => {
            const isActive = activePriority === tab.key
            const tabConfig = tab.key !== 'all' ? PRIORITY_CONFIG[tab.key] : null
            return (
              <button
                key={tab.key}
                onClick={() => setActivePriority(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  isActive && tabConfig
                    ? `${tabConfig.bgColor} ${tabConfig.textColor} shadow-sm`
                    : isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab.label} ({tab.count})
              </button>
            )
          })}
        </div>
      )}

      {/* Progress Summary */}
      {skillGaps.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
            const Icon = PriorityIcons[key]
            return (
              <div
                key={key}
                className={cn('p-3 rounded-lg', config.bgColor, 'border', config.borderColor)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} weight={config.iconWeight} className={config.textColor} />
                  <span className={cn('text-sm font-medium', config.textColor)}>
                    {config.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {groupedGaps[key]?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">kỹ năng</div>
              </div>
            )
          })}
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
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                  {gap.reason && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">Lý do: </span>
                      {gap.reason}
                    </p>
                  )}
                  {gap.learning_resources && gap.learning_resources.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-foreground">Nguồn học tập: </span>
                      <ul className="mt-1 space-y-1">
                        {gap.learning_resources.map((resource, idx) => (
                          <li key={idx} className="text-blue-600 hover:underline cursor-pointer">
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
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendUp size={16} className="text-orange-500" />
            Xu hướng kỹ năng (2025-2026)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trendingSkills.map((skill, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-orange-500 mt-0.5 flex-shrink-0">
                  <TrendUp size={14} />
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-foreground text-sm">{skill.name}</span>
                  {skill.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{skill.reason}</p>
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
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Handshake size={16} className="text-purple-500" />
            Kỹ năng mềm cần thiết
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {softSkills.map((skill, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-purple-500 mt-0.5 flex-shrink-0">
                  <Handshake size={14} />
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-foreground text-sm">{skill.name}</span>
                  {skill.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{skill.reason}</p>
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
