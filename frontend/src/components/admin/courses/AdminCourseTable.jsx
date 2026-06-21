import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminCourseRow from './AdminCourseRow';
import { Inbox } from 'lucide-react';

const AdminCourseTable = ({
  courses,
  loading,
  pagination,
  onPageChange,
  onView,
  onApprove,
  onReject,
}) => {
  if (loading) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
              <tr>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Khóa học</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Danh mục</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Hình thức</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học phí</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Số lượng</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày tạo</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-16 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="w-48 h-4 mb-1 bg-[hsl(var(--admin-surface-elevated))]" />
                        <Skeleton className="w-24 h-3 bg-[hsl(var(--admin-surface-elevated))]" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Skeleton className="w-20 h-6 rounded-full bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-24 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-16 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-20 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-16 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3"><Skeleton className="w-20 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Skeleton className="w-8 h-8 rounded bg-[hsl(var(--admin-surface-elevated))]" />
                      <Skeleton className="w-8 h-8 rounded bg-[hsl(var(--admin-surface-elevated))]" />
                      <Skeleton className="w-8 h-8 rounded bg-[hsl(var(--admin-surface-elevated))]" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
        <Inbox className="w-12 h-12 mx-auto text-[hsl(var(--admin-text-muted))] mb-4 opacity-60" />
        <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có khóa học nào</h3>
        <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = pagination.page;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
            <tr>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Khóa học</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Danh mục</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Hình thức</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học phí</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Số lượng</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày tạo</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {courses.map((course) => (
              <AdminCourseRow
                key={course._id}
                course={course}
                onView={onView}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[hsl(var(--admin-border))] flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">
            Hiển thị {(currentPage - 1) * pagination.limit + 1} -{' '}
            {Math.min(currentPage * pagination.limit, pagination.total)} trong{' '}
            {pagination.total} khóa học
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-[hsl(var(--admin-border))] rounded-lg text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm border rounded-lg ${
                    currentPage === pageNum
                      ? 'bg-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))] text-white'
                      : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-[hsl(var(--admin-border))] rounded-lg text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseTable;
