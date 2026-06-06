import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminScholarshipRow from './AdminScholarshipRow';
import { Inbox } from 'lucide-react';

const AdminScholarshipTable = ({ scholarships, loading, pagination, onPageChange, onView }) => {
  if (loading) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
              <tr>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học bổng</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngân sách</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Người nhận</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thời hạn</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Đơn đăng ký</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày tạo</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  <td className="px-4 py-3"><Skeleton className="w-14 h-10 rounded-lg" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-28 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-16 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-20 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-24 h-6 bg-[hsl(var(--admin-surface-elevated))] rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-12 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-20 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-8 h-8 bg-[hsl(var(--admin-surface-elevated))] rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!scholarships || scholarships.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
        <Inbox className="w-12 h-12 mx-auto text-[hsl(var(--admin-text-muted))] mb-4 opacity-60" />
        <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có học bổng nào</h3>
        <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy học bổng nào phù hợp với bộ lọc hiện tại.</p>
      </div>
    );
  }

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.currentPage || 1;
  const totalRecords = pagination?.totalRecords || 0;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
            <tr>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học bổng</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngân sách</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Người nhận</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thời hạn</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Đơn đăng ký</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày tạo</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {scholarships.map((scholarship) => (
              <AdminScholarshipRow key={scholarship._id} scholarship={scholarship} onView={onView} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[hsl(var(--admin-border))] flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">
            Hiển thị {(currentPage - 1) * (pagination?.limit || 10) + 1} -{' '}
            {Math.min(currentPage * (pagination?.limit || 10), totalRecords)} trong {totalRecords} học bổng
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]">
              <ChevronLeft className="w-4 h-4" />
              Trước
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) { pageNum = i + 1; }
              else if (currentPage <= 3) { pageNum = i + 1; }
              else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
              else { pageNum = currentPage - 2 + i; }
              return (
                <button key={pageNum} onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[hsl(var(--admin-accent))] text-white'
                      : 'border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]">
              Sau
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScholarshipTable;
