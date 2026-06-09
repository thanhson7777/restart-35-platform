import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return new Date(date).toLocaleDateString('vi-VN'); }
  catch { return '-'; }
};

const statusConfig = {
  active: { label: 'Đang làm', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  resigned: { label: 'Đã nghỉ', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  promoted: { label: 'Được thăng', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const AdminPlacementRow = ({ placement, onView }) => {
  const statusInfo = statusConfig[placement.status] || { label: placement.status, className: '' };

  return (
    <tr className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[160px]">
            {placement.worker?.fullName || '-'}
          </p>
          <span className="text-xs text-[hsl(var(--admin-text-muted))]">
            {placement.worker?.email || '-'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[160px]">
            {placement.companyName || '-'}
          </p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">{placement.jobTitle || '-'}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
          {placement.salary ? formatCurrency(placement.salary) : '-'}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-[hsl(var(--admin-text-muted))]">{placement.industry || '-'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-[hsl(var(--admin-text-muted))]">{placement.location || '-'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-[hsl(var(--admin-text-secondary))]">{formatDate(placement.startDate)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onView?.(placement)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors" title="Xem chi tiết">
          <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        </button>
      </td>
    </tr>
  );
};

const AdminPlacementTable = ({ placements, loading, pagination, onPageChange, onView }) => {
  const { currentPage = 1, totalPages = 1 } = pagination || {};

  if (!loading && placements.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-[hsl(var(--admin-text-muted))] opacity-30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có placement nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
              {['Worker', 'Công ty / Vị trí', 'Lương', 'Ngành', 'Địa điểm', 'Bắt đầu', 'Trạng thái', 'Hành động'].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))
            ) : (
              placements.map((p) => (
                <AdminPlacementRow key={p._id || p.id} placement={p} onView={onView} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <button onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] disabled:opacity-40 hover:bg-[hsl(var(--admin-surface-elevated))] transition-colors disabled:cursor-not-allowed">
            ← Trước
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page = i + 1;
            if (totalPages > 5 && currentPage > 3) page = currentPage - 2 + i;
            if (totalPages > 5 && currentPage > totalPages - 2) page = totalPages - 4 + i;
            return (
              <button key={page} onClick={() => onPageChange?.(page)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  currentPage === page
                    ? 'bg-[hsl(var(--admin-accent))] text-white border-[hsl(var(--admin-accent))]'
                    : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                }`}>
                {page}
              </button>
            );
          })}
          <button onClick={() => onPageChange?.(currentPage + 1)} disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] disabled:opacity-40 hover:bg-[hsl(var(--admin-surface-elevated))] transition-colors disabled:cursor-not-allowed">
            Sau →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPlacementTable;
