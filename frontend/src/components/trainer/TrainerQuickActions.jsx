import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Calendar, AlertTriangle } from 'lucide-react';
import { BezelCard } from '@/components/ui';

export const TrainerQuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Tạo khóa học mới',
      icon: Plus,
      onClick: () => navigate('/trainer/courses/new'),
      colorClass: 'from-[hsl(var(--admin-accent))]/20 to-cyan-600/10 hover:from-[hsl(var(--admin-accent))]/30 hover:to-cyan-600/20 border-[hsl(var(--admin-accent))]/20 hover:border-[hsl(var(--admin-accent))]/40 text-[hsl(var(--admin-accent))]',
      iconColor: '#60A5FA',
    },
    {
      label: 'Xem lịch dạy của tôi',
      icon: Calendar,
      onClick: () => navigate('/trainer/schedule'),
      colorClass: 'from-purple-600/20 to-indigo-600/10 hover:from-purple-600/30 hover:to-indigo-600/20 border-purple-500/20 hover:border-purple-500/40 text-purple-300',
      iconColor: '#C084FC',
    },
    {
      label: 'Học viên có nguy cơ',
      icon: AlertTriangle,
      onClick: () => navigate('/trainer/enrollments?risk=high'),
      colorClass: 'from-[hsl(var(--admin-danger))]/20 to-orange-600/10 hover:from-[hsl(var(--admin-danger))]/30 hover:to-orange-600/20 border-[hsl(var(--admin-danger))]/20 hover:border-[hsl(var(--admin-danger))]/40 text-[hsl(var(--admin-danger))]',
      iconColor: '#F87171',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard className="w-full" padding="default">
        <h3 className="text-sm font-bold text-[hsl(var(--admin-text-primary))] tracking-tight uppercase mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {actions.map((action, idx) => {
            const IconComponent = action.icon;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                className={`flex items-center gap-3 p-4 rounded-2xl border bg-gradient-to-br ${action.colorClass} transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] outline-none text-left`}
              >
                <div className="p-2.5 rounded-xl bg-[hsl(var(--admin-surface))]/60 border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
                  <IconComponent size={20} color={action.iconColor} />
                </div>
                <span className="text-sm font-semibold tracking-tight text-[hsl(var(--admin-text-primary))] group-hover:text-[hsl(var(--admin-text-primary))]">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </BezelCard>
    </motion.div>
  );
};
