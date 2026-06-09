import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { format } from 'date-fns';

const riskBadge = (level) => {
  const map = {
    low:      { label: 'Thấp',       cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    medium:   { label: 'TB',          cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    high:     { label: 'Cao',         cls: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    critical: { label: 'Nguy cấp',   cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  };
  const cfg = map[level] || { label: level, cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const ProgressBar = ({ value }) => {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="w-full bg-[hsl(var(--admin-border))] rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy'); } catch { return '-'; }
};

const SkeletonRow = () => (
  <tr>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
    ))}
  </tr>
);

const AdminLearningTable = ({ records, loading, onViewDetail }) => {
  if (loading) {
    return (
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--admin-border))]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]">
              {['Worker', 'Khóa học', 'Tiến độ', 'Hoàn thành', 'Hoạt động cuối', 'Rủi ro'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-[hsl(var(--admin-text-muted))]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="w-12 h-12 text-[hsl(var(--admin-text-muted))] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <p className="text-sm text-[hsl(var(--admin-text-muted))]">Chưa có learning records nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[hsl(var(--admin-border))]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]">
            {['Worker', 'Khóa học', 'Tiến độ', 'Tỷ lệ HT', 'Hoạt động cuối', 'Rủi ro', 'Hành động'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-[hsl(var(--admin-text-muted))]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--admin-border))]">
          {records.map((record) => {
            const progress = record.progress || 0;
            const completionRate = record.completionRate || 0;
            return (
              <tr key={record._id} className="hover:bg-[hsl(var(--admin-surface))] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{record.workerName || '—'}</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">{record.workerEmail || ''}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-[hsl(var(--admin-text-primary))] max-w-[180px] truncate">{record.courseName || '—'}</p>
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <div className="mb-1">
                    <span className="text-xs font-medium text-[hsl(var(--admin-text-primary))]">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[hsl(var(--admin-text-primary))]">{completionRate}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDate(record.lastActive)}</span>
                </td>
                <td className="px-4 py-3">
                  {riskBadge(record.riskLevel)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewDetail && onViewDetail(record)}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--admin-surface-elevated))] transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminLearningTable;
