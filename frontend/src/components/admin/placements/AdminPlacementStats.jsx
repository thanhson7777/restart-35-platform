import { Skeleton } from '@/components/ui';
import { Briefcase, Users, Building, Percent } from 'lucide-react';

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
    totalPartnerships = 0,
    totalLearners = 0,
    placementRate = 0,
    totalPlaced = 0,
  } = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Dự án Hợp tác"
        value={totalPartnerships}
        sub="Doanh nghiệp & Giảng viên"
        colorClass="text-blue-500"
        icon={Building}
      />
      <StatCard
        label="Tổng học viên"
        value={totalLearners}
        sub="Đang & đã tham gia"
        colorClass="text-purple-500"
        icon={Users}
      />
      <StatCard
        label="Đã nhận việc"
        value={totalPlaced}
        sub="Học viên có việc làm"
        colorClass="text-amber-500"
        icon={Briefcase}
      />
      <StatCard
        label="Tỷ lệ thành công"
        value={`${placementRate}%`}
        sub="Placement Rate"
        colorClass="text-emerald-500"
        icon={Percent}
      />
    </div>
  );
};

export default AdminPlacementStats;
