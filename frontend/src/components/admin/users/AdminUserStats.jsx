import { Users, UserCheck, UserPlus, UserX } from 'lucide-react';
import { BezelCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

const statConfig = [
  { label: 'Tổng cộng', icon: Users, iconColor: 'text-[hsl(var(--admin-accent))]', bgGlow: 'from-[hsl(var(--admin-accent))]/10 to-transparent' },
  { label: 'Đang hoạt động', icon: UserCheck, iconColor: 'text-[hsl(var(--admin-success))]', bgGlow: 'from-[hsl(var(--admin-success))]/10 to-transparent' },
  { label: 'Mới tháng này', icon: UserPlus, iconColor: 'text-blue-500', bgGlow: 'from-blue-500/10 to-transparent' },
  { label: 'Không hoạt động', icon: UserX, iconColor: 'text-[hsl(var(--admin-text-muted))]', bgGlow: 'from-[hsl(var(--admin-surface-elevated))]/50 to-transparent' },
];

const AdminUserStats = ({ stats, activeTab, loading }) => {
  const currentStats = stats?.[activeTab] || { total: 0, active: 0, inactive: 0, newThisMonth: 0 };

  const statItems = [
    { label: statConfig[0].label, value: currentStats.total, icon: statConfig[0].icon, iconColor: statConfig[0].iconColor, bgGlow: statConfig[0].bgGlow },
    { label: statConfig[1].label, value: currentStats.active, icon: statConfig[1].icon, iconColor: statConfig[1].iconColor, bgGlow: statConfig[1].bgGlow },
    { label: statConfig[2].label, value: currentStats.newThisMonth, icon: statConfig[2].icon, iconColor: statConfig[2].iconColor, bgGlow: statConfig[2].bgGlow },
    { label: statConfig[3].label, value: currentStats.inactive, icon: statConfig[3].icon, iconColor: statConfig[3].iconColor, bgGlow: statConfig[3].bgGlow },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 animate-pulse">
            <Skeleton className="h-4 w-24 mb-3 bg-[hsl(var(--admin-surface))]" />
            <Skeleton className="h-8 w-16 mb-2 bg-[hsl(var(--admin-surface))]" />
            <Skeleton className="h-3 w-20 bg-[hsl(var(--admin-surface))]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <BezelCard
            key={index}
            outerClassName="hover:border-[hsl(var(--admin-accent))]/30 transition-all duration-300"
            innerClassName="p-5"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${item.bgGlow} rounded-bl-full pointer-events-none opacity-60`} />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{item.label}</span>
              <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))] tabular-nums">{item.value.toLocaleString('vi-VN')}</div>
            </div>
          </BezelCard>
        );
      })}
    </div>
  );
};

export default AdminUserStats;
