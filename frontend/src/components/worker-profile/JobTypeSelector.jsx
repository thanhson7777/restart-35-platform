import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Briefcase, Clock, Calendar, Zap } from 'lucide-react'

/**
 * JobTypeSelector Component
 * - Radio group (single select) với layout 2x2 grid
 * - 4 options: Toàn thời gian, Bán thời gian, Thời vụ, Làm tự do
 * - Icons: Briefcase, Clock, Calendar, Zap
 */
function JobTypeSelector({
  value,
  onChange,
  label = 'Loại công việc',
  error,
  required,
  id = 'preferredJobType'
}) {
  const JOB_TYPES = [
    {
      value: 'full-time',
      label: 'Toàn thời gian',
      sublabel: 'Full-time',
      Icon: Briefcase
    },
    {
      value: 'part-time',
      label: 'Bán thời gian',
      sublabel: 'Part-time',
      Icon: Clock
    },
    {
      value: 'temporary',
      label: 'Thời vụ',
      sublabel: 'Seasonal',
      Icon: Calendar
    },
    {
      value: 'freelance',
      label: 'Làm tự do',
      sublabel: 'Freelance',
      Icon: Zap
    }
  ]

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}

      {/* 2x2 Grid of job type cards */}
      <div className="grid grid-cols-2 gap-3">
        {JOB_TYPES.map((type, index) => {
          const isSelected = value === type.value
          const { Icon } = type

          return (
            <motion.button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChange?.(type.value)}
              onKeyDown={(e) => {
                // Keyboard support: Enter/Space to select
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange?.(type.value)
                }
              }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2 p-4',
                'rounded-xl border-2 transition-all duration-200',
                'cursor-pointer select-none',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  'transition-colors duration-200',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon size={22} strokeWidth={1.75} />
              </div>

              {/* Label */}
              <span className="text-sm font-medium text-center leading-tight">
                {type.label}
              </span>

              {/* Sublabel */}
              <span className={cn(
                'text-xs transition-colors duration-200',
                isSelected ? 'text-primary/70' : 'text-muted-foreground/70'
              )}>
                {type.sublabel}
              </span>

              {/* Selected indicator (checkmark) */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm"
                >
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}

export default JobTypeSelector
