import { Card, CardContent } from '@/components/ui'
import { cn } from '~/lib/utils'
import { ArrowUpRight, ArrowDownRight, BookOpen } from 'lucide-react'

export const StatsCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue:   'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
    amber:  'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value != null ? value : 0}</p>
            {change && (
              <p className={cn(
                'text-xs mt-1.5 flex items-center gap-0.5',
                changeType === 'positive' ? 'text-green-600 dark:text-green-400' :
                changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
                'text-muted-foreground'
              )}>
                {changeType === 'positive' && <ArrowUpRight className="w-3 h-3 shrink-0" />}
                {changeType === 'negative' && <ArrowDownRight className="w-3 h-3 shrink-0" />}
                {change}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2 rounded-lg shrink-0', colorMap[color] ?? colorMap.blue)}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const CourseProgressCard = ({
  title,
  category,
  progress = 0,
  thumbnail,
  instructor,
  lessonsCompleted = 0,
  totalLessons = 0,
  onClick,
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    className={cn(
      'flex gap-3 p-3 rounded-xl border border-border',
      'hover:border-primary/50 hover:bg-muted/40',
      'transition-colors duration-150',
      onClick && 'cursor-pointer'
    )}
  >
    {thumbnail ? (
      <img
        src={thumbnail}
        alt={title}
        className="w-16 h-16 rounded-lg object-cover shrink-0 bg-muted"
        loading="lazy"
      />
    ) : (
      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <BookOpen className="w-6 h-6 text-primary/60" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{title}</p>
      {category && <p className="text-xs text-muted-foreground mt-0.5">{category}</p>}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{progress}%</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {lessonsCompleted}/{totalLessons} bài hoàn thành
      </p>
    </div>
  </div>
)

export const ActivityItem = ({ type, title, description, time, icon: Icon }) => {
  const typeColors = {
    course:      'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    certificate: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    job:         'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    scholarship:  'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className={cn(
        'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        typeColors[type] ?? 'bg-zinc-100 dark:bg-zinc-800 text-muted-foreground'
      )}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
        {time && <p className="text-xs text-muted-foreground/70 mt-0.5">{time}</p>}
      </div>
    </div>
  )
}

export const QuickAction = ({ icon: Icon, label, href }) => (
  <a
    href={href}
    className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-xl',
      'border border-border',
      'hover:border-primary/50 hover:bg-primary/5',
      'transition-colors duration-150',
      'text-center'
    )}
  >
    <Icon className="w-5 h-5 text-primary" />
    <span className="text-xs font-medium leading-tight">{label}</span>
  </a>
)

export const SkillBadge = ({ name, level }) => {
  const levelMap = {
    beginner:     'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    advanced:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      levelMap[level] ?? levelMap.beginner
    )}>
      {name}
    </span>
  )
}

// JobCard remains as null placeholder (existing jobs already use the real component)
export const JobCard = () => null
