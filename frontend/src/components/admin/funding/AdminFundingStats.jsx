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

const AdminFundingStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const {
    totalConfigs = 0,
    activeConfigs = 0,
    isaCount = 0,
    incomeBasedCount = 0,
    avgPercentage = 0,
  } = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Tổng Configs"
        value={totalConfigs}
        sub={`${activeConfigs} đang hoạt động`}
        colorClass="text-blue-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>}
      />
      <StatCard
        label="ISA Type"
        value={isaCount}
        sub="Income Share Agreement"
        colorClass="text-purple-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>}
      />
      <StatCard
        label="Income Based"
        value={incomeBasedCount}
        sub="Thu nhập theo tỷ lệ"
        colorClass="text-emerald-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>}
      />
      <StatCard
        label="Tỷ lệ TB"
        value={`${avgPercentage}%`}
        sub="Phần trăm trả trung bình"
        colorClass="text-amber-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
      />
    </div>
  );
};

export default AdminFundingStats;
