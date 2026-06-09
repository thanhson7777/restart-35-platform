import { Skeleton } from '@/components/ui';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
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

const AdminPlacementStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const {
    total = 0,
    successRate = 0,
    avgSalary = 0,
    topIndustries = [],
  } = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Tổng Placements"
        value={total}
        sub="Đã ghi nhận"
        colorClass="text-blue-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
      />
      <StatCard
        label="Tỷ lệ Thành công"
        value={`${successRate}%`}
        sub="Đang làm việc"
        colorClass="text-emerald-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
      />
      <StatCard
        label="Lương TB"
        value={formatCurrency(avgSalary)}
        sub="Mức lương trung bình"
        colorClass="text-purple-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
      />
      <StatCard
        label="Top Ngành"
        value={topIndustries?.[0] || '-'}
        sub={topIndustries?.[1] ? `2. ${topIndustries[1]}` : 'Ngành hàng đầu'}
        colorClass="text-amber-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
      />
    </div>
  );
};

export default AdminPlacementStats;
