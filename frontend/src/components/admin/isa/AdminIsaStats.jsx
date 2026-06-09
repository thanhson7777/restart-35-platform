import { Skeleton } from '@/components/ui';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

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
    <p className={`text-2xl font-bold text-[hsl(var(--admin-text-primary))]`}>{value}</p>
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

const AdminIsaStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const {
    totalActive = 0,
    totalCollected = 0,
    totalPending = 0,
    defaultRate = 0,
    totalISA = 0,
    totalCompleted = 0,
  } = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="ISA Đang hoạt động"
        value={totalActive}
        sub={`${totalISA} tổng ISA`}
        colorClass="text-emerald-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>}
      />
      <StatCard
        label="Đã thu"
        value={formatCurrency(totalCollected)}
        sub="Tổng tiền đã thu"
        colorClass="text-blue-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>}
      />
      <StatCard
        label="Đang chờ"
        value={formatCurrency(totalPending)}
        sub="Chưa thanh toán"
        colorClass="text-amber-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
      />
      <StatCard
        label="Tỷ lệ Default"
        value={formatPercent(defaultRate)}
        sub={`${totalCompleted} đã hoàn thành`}
        colorClass={defaultRate > 10 ? 'text-rose-500' : 'text-emerald-500'}
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
      />
    </div>
  );
};

export default AdminIsaStats;
