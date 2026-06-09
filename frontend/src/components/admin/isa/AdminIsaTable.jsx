import { Skeleton } from '@/components/ui';
import { AdminIsaRow } from './index';

const SkeletonRow = () => (
  <tr className="border-b border-[hsl(var(--admin-border))]">
    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

const AdminIsaTable = ({ isaList, loading, pagination, onPageChange, onView }) => {
  const { currentPage = 1, totalPages = 1 } = pagination || {};

  if (!loading && isaList.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-[hsl(var(--admin-text-muted))] opacity-40 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M2 12h20" />
          </svg>
          <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có ISA nào</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Danh sách sẽ xuất hiện khi có ISA được tạo</p>
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
              {['Worker', 'Số tiền', 'Tỷ lệ', 'Tiến độ', 'Trạng thái', 'Thời gian', 'Hành động'].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : (
              isaList.map((isa) => (
                <AdminIsaRow key={isa._id || isa.id} isa={isa} onView={onView} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] disabled:opacity-40 hover:bg-[hsl(var(--admin-surface-elevated))] transition-colors disabled:cursor-not-allowed"
          >
            ← Trước
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) page = currentPage - 2 + i;
              if (currentPage > totalPages - 2) page = totalPages - 4 + i;
            }
            return (
              <button
                key={page}
                onClick={() => onPageChange?.(page)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  currentPage === page
                    ? 'bg-[hsl(var(--admin-accent))] text-white border-[hsl(var(--admin-accent))]'
                    : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                }`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] disabled:opacity-40 hover:bg-[hsl(var(--admin-surface-elevated))] transition-colors disabled:cursor-not-allowed"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminIsaTable;
