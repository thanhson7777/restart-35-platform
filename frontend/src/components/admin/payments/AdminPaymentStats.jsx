import { Receipt, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { BezelCard } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const AdminPaymentStats = ({ stats, loading }) => {
  const statItems = [
    {
      key: 'revenue',
      label: 'Tổng tiền giao dịch',
      value: stats?.totalRevenue || 0,
      icon: Receipt,
      iconColor: 'text-[hsl(var(--admin-text-secondary))]',
      bgGlow: 'from-[hsl(var(--admin-border))] to-transparent',
      isMoney: true,
    },
    {
      key: 'adminRevenue',
      label: 'Doanh thu Admin (20%)',
      value: stats?.adminRevenue || 0,
      icon: Receipt,
      iconColor: 'text-[hsl(var(--admin-accent))]',
      bgGlow: 'from-[hsl(var(--admin-accent))]/10 to-transparent',
      isMoney: true,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1, 2].map((i) => (
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
    <div className="grid grid-cols-2 gap-4 mb-6">
      {statItems.map((item) => {
        const Icon = item.icon;
        const displayValue = item.isMoney
          ? formatCurrency(item.value)
          : item.value?.toLocaleString('vi-VN') || '0';
        return (
          <BezelCard key={item.key} innerClassName="p-5">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${item.bgGlow} rounded-bl-full pointer-events-none opacity-60`} />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">
                {item.label}
              </span>
              <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]">
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))] tabular-nums">
                {displayValue}
              </p>
              {item.urgent && (
                <p className="text-amber-500 text-xs mt-1">{item.value} giao dịch đang chờ</p>
              )}
            </div>
          </BezelCard>
        );
      })}
    </div>
  );
};

export default AdminPaymentStats;
