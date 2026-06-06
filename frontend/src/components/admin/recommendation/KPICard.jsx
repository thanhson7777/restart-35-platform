/**
 * KPI Card — Recommendation Analytics
 * Light admin theme
 */
import React from 'react'
import { motion } from 'framer-motion'
import { BezelCard } from '@/components/ui'
import { BarChart2, TrendingUp, Target, Star, AlertTriangle } from 'lucide-react'

const COLOR_CONFIG = {
  blue: {
    icon: BarChart2,
    bgGlow: 'from-blue-500/8 to-transparent',
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    iconColor: 'text-blue-500',
  },
  green: {
    icon: TrendingUp,
    bgGlow: 'from-emerald-500/8 to-transparent',
    iconBg: 'bg-emerald-500/10 border border-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  purple: {
    icon: Target,
    bgGlow: 'from-violet-500/8 to-transparent',
    iconBg: 'bg-violet-500/10 border border-violet-500/20',
    iconColor: 'text-violet-500',
  },
  amber: {
    icon: Star,
    bgGlow: 'from-amber-500/8 to-transparent',
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
    iconColor: 'text-amber-500',
  },
  red: {
    icon: AlertTriangle,
    bgGlow: 'from-red-500/8 to-transparent',
    iconBg: 'bg-red-500/10 border border-red-500/20',
    iconColor: 'text-red-500',
  },
}

export const KPICard = ({ label, value, sub, color = 'blue' }) => {
  const config = COLOR_CONFIG[color] || COLOR_CONFIG.blue
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard outerClassName="group cursor-pointer" innerClassName="flex flex-col justify-between p-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGlow} rounded-xl pointer-events-none`} />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[hsl(var(--admin-text-muted))]">
            {label}
          </span>
          <div className={`p-2 rounded-xl ${config.iconBg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-4 h-4 ${config.iconColor}`} />
          </div>
        </div>

        <div className="relative z-10">
          <h3 className="text-[22px] font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] tabular-nums">
            {value}
          </h3>
          {sub && (
            <p className="text-[11px] text-[hsl(var(--admin-text-muted))] mt-1.5">{sub}</p>
          )}
        </div>
      </BezelCard>
    </motion.div>
  )
}
