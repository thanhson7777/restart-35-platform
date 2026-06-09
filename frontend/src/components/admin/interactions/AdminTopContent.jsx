import { Skeleton } from '@/components/ui';

const RankBadge = ({ rank }) => {
  const colors = {
    1: 'bg-amber-500 text-white',
    2: 'bg-slate-400 text-white',
    3: 'bg-orange-400 text-white',
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${colors[rank] || 'bg-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))]'}`}>
      {rank}
    </span>
  );
};

const ContentList = ({ title, items, type }) => {
  const list = items || [];
  const maxCount = list.length > 0 ? Math.max(...list.map((i) => i.interactionCount || i.count || 0)) : 1;

  return (
    <div className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
      <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">{title}</h4>
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">Chưa có dữ liệu.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.slice(0, 10).map((item, i) => {
            const count = item.interactionCount || item.count || 0;
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            const name = item.name || item.title || item.courseName || item.jobTitle || '—';
            return (
              <div key={item._id || i} className="flex items-center gap-3">
                <RankBadge rank={i + 1} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[hsl(var(--admin-text-primary))] truncate">{name}</p>
                  <div className="w-full bg-[hsl(var(--admin-border))] rounded-full h-1 mt-1">
                    <div
                      className="h-1 rounded-full bg-blue-500/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-[hsl(var(--admin-text-muted))] shrink-0">
                  {count.toLocaleString('vi-VN')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminTopContent = ({ data, loading }) => {
  const topCourses = data?.topCourses || [];
  const topJobs = data?.topJobs || [];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => <Skeleton key={j} className="h-6 w-full" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <ContentList title="Top Khóa học" items={topCourses} />
      <ContentList title="Top Việc làm" items={topJobs} />
    </div>
  );
};

export default AdminTopContent;
