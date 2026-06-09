import { Skeleton } from '@/components/ui';

const DonutBar = ({ label, value, total, colorClass }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--admin-text-muted))]">{label}</span>
        <span className="font-medium text-[hsl(var(--admin-text-primary))]">{pct}%</span>
      </div>
      <div className="w-full bg-[hsl(var(--admin-border))] rounded-full h-3">
        <div
          className={`h-3 rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const AdminUserEngagement = ({ data, loading }) => {
  const engagement = data || {};

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const newUsers = engagement.newUsers || 0;
  const returningUsers = engagement.returningUsers || 0;
  const totalUsers = newUsers + returningUsers;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl text-center">
          <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
            {(engagement.avgSessionDuration || 0).toFixed(0)}s
          </p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">TB thời gian session</p>
        </div>
        <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl text-center">
          <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
            {(engagement.avgEngagementScore || 0).toFixed(1)}/10
          </p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Điểm engagement TB</p>
        </div>
        <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl text-center">
          <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
            {totalUsers.toLocaleString('vi-VN')}
          </p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tổng users</p>
        </div>
      </div>

      {/* New vs returning breakdown */}
      <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
        <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">New vs Returning Users</h4>
        <div className="space-y-3">
          <DonutBar
            label="New Users"
            value={newUsers}
            total={totalUsers}
            colorClass="bg-blue-500"
          />
          <DonutBar
            label="Returning Users"
            value={returningUsers}
            total={totalUsers}
            colorClass="bg-emerald-500"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <span className="text-xs text-[hsl(var(--admin-text-muted))]">
              New: {newUsers.toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs text-[hsl(var(--admin-text-muted))]">
              Returning: {returningUsers.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserEngagement;
