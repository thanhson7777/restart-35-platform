import { Skeleton } from '@/components/ui';

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

const AdminCertificateStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const {
    total = 0,
    active = 0,
    revoked = 0,
    byCourse = 0,
  } = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Tổng Chứng chỉ"
        value={total}
        sub="Đã cấp phát"
        colorClass="text-blue-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>}
      />
      <StatCard
        label="Đang Active"
        value={active}
        sub="Còn hiệu lực"
        colorClass="text-emerald-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
      />
      <StatCard
        label="Đã Thu hồi"
        value={revoked}
        sub="Không còn hiệu lực"
        colorClass="text-rose-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
      />
      <StatCard
        label="Theo Khóa học"
        value={byCourse}
        sub="Khóa có cert"
        colorClass="text-purple-500"
        icon={({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
      />
    </div>
  );
};

export default AdminCertificateStats;
