import { Building2, Users, Activity, TrendingUp } from 'lucide-react';
import { BezelCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

const AdminOrganizationStats = ({ stats, loading }) => {
  const statItems = [
    {
      key: 'total',
      label: 'Tổng đối tác',
      value: stats?.total || 0,
      icon: Building2,
      iconColor: 'text-[hsl(var(--admin-accent))]',
      bgGlow: 'from-[hsl(var(--admin-accent))]/10 to-transparent',
    },
    {
      key: 'enterprise',
      label: 'Doanh nghiệp',
      value: stats?.byType?.enterprise || 0,
      icon: Building2,
      iconColor: 'text-blue-500',
      bgGlow: 'from-blue-500/10 to-transparent',
    },
    {
      key: 'ngo',
      label: 'Tổ chức NGO',
      value: stats?.byType?.ngo || 0,
      icon: Activity,
      iconColor: 'text-purple-500',
      bgGlow: 'from-purple-500/10 to-transparent',
    },
    {
      key: 'quotaUsage',
      label: 'Sử dụng quota',
      value: stats?.quotaUsage || 0,
      suffix: '%',
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      bgGlow: 'from-emerald-500/10 to-transparent',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <BezelCard key={item.key} innerClassName="p-5">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${item.bgGlow} rounded-bl-full pointer-events-none opacity-60`} />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">
                {item.label}
              </span>
              <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))] tabular-nums">
                {item.value?.toLocaleString('vi-VN')}{item.suffix || ''}
              </p>
              {item.key === 'quotaUsage' && (
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                  {stats?.usedQuota || 0} / {stats?.totalQuota || 0} học viên
                </p>
              )}
            </div>
          </BezelCard>
        );
      })}
    </div>
  );
};

export default AdminOrganizationStats;
