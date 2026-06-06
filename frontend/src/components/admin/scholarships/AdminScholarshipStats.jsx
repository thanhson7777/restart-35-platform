import { Award, CheckCircle, Clock, Wallet } from 'lucide-react';
import { BezelCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

const formatCurrency = (value) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value?.toLocaleString('vi-VN') || '0';
};

const configMap = {
  total: { icon: Award, iconColor: 'text-[hsl(var(--admin-accent))]', bgGlow: 'from-[hsl(var(--admin-accent))]/10 to-transparent' },
  active: { icon: CheckCircle, iconColor: 'text-[hsl(var(--admin-success))]', bgGlow: 'from-[hsl(var(--admin-success))]/10 to-transparent' },
  pending: { icon: Clock, iconColor: 'text-amber-500', bgGlow: 'from-amber-500/10 to-transparent' },
  budget: { icon: Wallet, iconColor: 'text-purple-500', bgGlow: 'from-purple-500/10 to-transparent' },
};

const AdminScholarshipStats = ({ stats, loading }) => {
  const statItems = [
    { key: 'total', label: 'Tổng học bổng', value: stats?.scholarships?.total || 0, isMoney: false },
    { key: 'active', label: 'Đang hoạt động', value: stats?.scholarships?.active || 0, isMoney: false },
    { key: 'pending', label: 'Đơn chờ duyệt', value: stats?.applications?.pending || 0, isMoney: false, urgent: true },
    { key: 'budget', label: 'Tổng ngân sách', value: stats?.scholarships?.totalBudget || 0, isMoney: true, format: formatCurrency },
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
        const config = configMap[item.key];
        const Icon = config.icon;
        const displayValue = item.isMoney && item.format ? item.format(item.value) : item.value?.toLocaleString('vi-VN') || '0';
        return (
          <BezelCard key={item.key} outerClassName={`hover:border-${item.urgent ? 'amber' : '[hsl(var(--admin-accent))]'}/30 transition-all duration-300`} innerClassName="p-5">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${config.bgGlow} rounded-bl-full pointer-events-none opacity-60`} />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{item.label}</span>
              <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))] tabular-nums">{displayValue}</p>
              {item.urgent && item.value > 0 && (
                <p className="text-amber-500 text-xs mt-1">{item.value} đơn đang chờ bạn duyệt</p>
              )}
            </div>
          </BezelCard>
        );
      })}
    </div>
  );
};

export default AdminScholarshipStats;
