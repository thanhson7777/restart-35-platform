import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminEnrollmentRow from './AdminEnrollmentRow';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

const AdminEnrollmentTable = ({
  enrollments,
  loading,
  pagination,
  onPageChange,
  onView,
  onUpdateProgress,
  onUpdateStatus
}) => {
  if (loading) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))] text-left">
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học viên</th>
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Khóa học</th>
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Tiến độ</th>
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học phí</th>
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày đăng ký</th>
                <th className="px-5 py-4 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-full bg-[hsl(var(--admin-surface-elevated))]" />
                      <div className="space-y-1">
                        <Skeleton className="w-24 h-4 bg-[hsl(var(--admin-surface-elevated))]" />
                        <Skeleton className="w-32 h-3 bg-[hsl(var(--admin-surface-elevated))]" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Skeleton className="w-36 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-24 h-6 bg-[hsl(var(--admin-surface-elevated))] rounded-full" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-20 h-5 bg-[hsl(var(--admin-surface-elevated))] rounded-full" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-16 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-20 h-4 bg-[hsl(var(--admin-surface-elevated))]" /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <Skeleton className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface-elevated))]" />
                      <Skeleton className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface-elevated))]" />
                      <Skeleton className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface-elevated))]" />
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

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-16 text-center">
        <Inbox className="w-12 h-12 mx-auto text-[hsl(var(--admin-text-muted))] mb-4 opacity-60" />
        <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có đăng ký nào</h3>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm max-w-sm mx-auto">
          Không tìm thấy lượt ghi danh học tập nào phù hợp với bộ lọc hiện tại của bạn.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = pagination.page;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))] text-left">
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học viên</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Khóa học</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Tiến độ</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Học phí</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày đăng ký</th>
              <th className="px-5 py-3.5 text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]/60">
            {enrollments.map((enrollment) => (
              <AdminEnrollmentRow
                key={enrollment._id}
                enrollment={enrollment}
                onView={onView}
                onUpdateProgress={onUpdateProgress}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs font-medium text-[hsl(var(--admin-text-muted))]">
            Hiển thị <span className="text-[hsl(var(--admin-text-primary))]">{(currentPage - 1) * pagination.limit + 1}</span> -{' '}
            <span className="text-[hsl(var(--admin-text-primary))]">{Math.min(currentPage * pagination.limit, pagination.total)}</span> trong{' '}
            <span className="text-[hsl(var(--admin-text-primary))]">{pagination.total}</span> đăng ký
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] rounded-full hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  className={`w-8 h-8 text-xs font-extrabold rounded-full flex items-center justify-center border transition-all ${
                    currentPage === pageNum
                      ? 'bg-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))] text-white shadow-[0_0_12px_rgba(var(--admin-accent),0.4)]'
                      : 'bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] rounded-full hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEnrollmentTable;
