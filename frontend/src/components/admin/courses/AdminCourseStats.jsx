import { TrendingUp, TrendingDown, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { BezelCard } from '@/components/ui';

const statusConfig = {
  total: {
    icon: BookOpen,
    iconColor: 'text-[hsl(var(--admin-accent))]',
    bgGlow: 'from-[hsl(var(--admin-accent))]/10 to-transparent',
  },
  pending: {
    icon: Clock,
    iconColor: 'text-amber-500',
    bgGlow: 'from-amber-500/10 to-transparent',
  },
  approved: {
    icon: BookOpen,
    iconColor: 'text-[hsl(var(--admin-success))]',
    bgGlow: 'from-[hsl(var(--admin-success))]/10 to-transparent',
  },
  rejected: {
    icon: AlertCircle,
    iconColor: 'text-rose-500',
    bgGlow: 'from-rose-500/10 to-transparent',
  },
};

const AdminCourseStats = ({ stats, loading }) => {
  const statItems = [
    { key: 'total', label: 'Tổng khóa học', value: stats?.total || 0 },
    { key: 'pending', label: 'Chờ duyệt', value: stats?.pending || 0, urgent: true },
    { key: 'approved', label: 'Đã duyệt', value: stats?.approved || 0 },
    { key: 'rejected', label: 'Từ chối', value: stats?.rejected || 0 },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-[hsl(var(--admin-surface))] rounded-lg" />
              <div className="w-16 h-5 bg-[hsl(var(--admin-surface))] rounded" />
            </div>
            <div className="mt-4">
              <div className="w-20 h-8 bg-[hsl(var(--admin-surface))] rounded" />
              <div className="w-28 h-4 bg-[hsl(var(--admin-surface))] rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => {
        const config = statusConfig[item.key];
        const Icon = config.icon;

        return (
          <BezelCard
            key={item.key}
            outerClassName={`${item.urgent && item.value > 0 ? 'hover:border-amber-500/30' : 'hover:border-[hsl(var(--admin-accent))]/30'}`}
            innerClassName="p-6"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${config.bgGlow} rounded-bl-full pointer-events-none opacity-70`} />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={`p-2.5 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              {item.urgent && item.value > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  Cần xử lý
                </span>
              )}
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))] tabular-nums">
                {item.value.toLocaleString('vi-VN')}
              </p>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">{item.label}</p>
            </div>
            {item.urgent && item.value > 0 && (
              <div className="mt-3 pt-3 border-t border-[hsl(var(--admin-border))] relative z-10">
                <p className="text-amber-500 text-xs">
                  {item.value} khóa học đang chờ bạn duyệt
                </p>
              </div>
            )}
          </BezelCard>
        );
      })}
    </div>
  );
};

export default AdminCourseStats;
