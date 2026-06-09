import { Skeleton } from '@/components/ui';

const formatPercent = (value) => {
  if (!value && value !== 0) return '0%';
  return `${value}%`;
};

const StatCard = ({ label, value, sub, colorClass, icon: Icon }) => (
  <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
      <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--admin-text-muted))]">{label}</span>
    </div>
    <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{value}</p>
    {sub && <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{sub}</p>}
  </div>
);

const SkeletonCard = () => (
  <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
    <Skeleton className="h-4 w-24 mb-3" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-16 mt-2" />
  </div>
);

const AdminLearningStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const {
    totalRecords = 0,
    avgCompletionRate = 0,
    atRiskCount = 0,
    dropoutRate = 0,
  } = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Tổng Records"
        value={totalRecords}
        sub="Learning records"
        colorClass="text-blue-500"
        icon={({ className }) => (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )}
      />
      <StatCard
        label="Tỷ lệ Hoàn thành"
        value={formatPercent(avgCompletionRate)}
        sub="Trung bình"
        colorClass="text-emerald-500"
        icon={({ className }) => (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )}
      />
      <StatCard
        label="Nguy cơ Bỏ học"
        value={atRiskCount}
        sub="Cần can thiệp"
        colorClass={atRiskCount > 0 ? 'text-amber-500' : 'text-emerald-500'}
        icon={({ className }) => (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      />
      <StatCard
        label="Tỷ lệ Bỏ học"
        value={formatPercent(dropoutRate)}
        sub="Trong 30 ngày"
        colorClass={dropoutRate > 10 ? 'text-rose-500' : 'text-blue-500'}
        icon={({ className }) => (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        )}
      />
    </div>
  );
};

export default AdminLearningStats;
