import { Skeleton } from '@/components/ui';

const ACTION_COLORS = {
  view:      'bg-blue-500',
  click:     'bg-emerald-500',
  apply:     'bg-violet-500',
  bookmark:  'bg-amber-500',
  skip:      'bg-rose-500',
  save:      'bg-cyan-500',
};

const AdminInteractionChart = ({ data, loading }) => {
  const dailyData = data?.dailyData || [];
  const maxValue = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.total || 0)) : 1;

  if (loading) {
    return (
      <div className="p-6 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="p-6 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
        <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Interactions theo Ngày</h4>
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <svg className="w-10 h-10 text-[hsl(var(--admin-text-muted))] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">Chưa có dữ liệu interactions.</p>
        </div>
      </div>
    );
  }

  const actionBreakdown = data?.byAction || {};
  const totalActions = Object.values(actionBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div className="p-6 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
        <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Interactions theo Ngày</h4>
        <div className="flex items-end gap-1 h-48">
          {dailyData.slice(-14).map((day, i) => {
            const height = maxValue > 0 ? Math.max(4, (day.total / maxValue) * 100) : 4;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-blue-500/70 hover:bg-blue-500 rounded-sm transition-all cursor-default relative"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.total} interactions`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded px-2 py-1 text-xs text-[hsl(var(--admin-text-primary))] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {day.date}: {day.total}
                  </div>
                </div>
                <span className="text-[10px] text-[hsl(var(--admin-text-muted))]">
                  {day.date?.slice(-2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action breakdown */}
      <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
        <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Phân bổ theo Action</h4>
        <div className="space-y-3">
          {Object.entries(actionBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([action, count]) => {
              const pct = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0;
              const color = ACTION_COLORS[action] || 'bg-blue-500';
              return (
                <div key={action} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--admin-text-muted))] capitalize">{action}</span>
                    <span className="font-medium text-[hsl(var(--admin-text-primary))]">
                      {count.toLocaleString('vi-VN')} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-[hsl(var(--admin-border))] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default AdminInteractionChart;
