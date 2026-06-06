import React from 'react';
import { Briefcase, GraduationCap, TrendingUp, Users } from 'lucide-react';

const TrainerPartnershipStats = ({ summary = {} }) => {
  const stats = [
    { label: 'Tổng học viên', value: summary.totalLearners ?? 0, icon: Users, color: 'text-[hsl(var(--admin-accent))]' },
    { label: 'Đang học', value: summary.pendingLearners ?? 0, icon: Briefcase, color: 'text-[hsl(var(--admin-warning))]' },
    { label: 'Đã tốt nghiệp', value: summary.totalGraduates ?? 0, icon: GraduationCap, color: 'text-[hsl(var(--admin-success))]' },
    { label: 'Đã hoàn thành', value: summary.completedLearners ?? 0, icon: TrendingUp, color: 'text-purple-400' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))]">
              <Icon size={16} className={color} />
            </div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] font-medium">{label}</p>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{value}</p>
        </div>
      ))}
    </div>
  );
};

export default TrainerPartnershipStats;
