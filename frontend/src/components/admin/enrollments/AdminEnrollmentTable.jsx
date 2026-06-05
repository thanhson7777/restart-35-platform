import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminEnrollmentRow from './AdminEnrollmentRow';
import { motion } from 'framer-motion';

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
      <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800/80 text-left">
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Học viên</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Khóa học</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Tiến độ</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Trạng thái</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Học phí</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Ngày đăng ký</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-slate-900/60 bg-slate-900/10">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-full bg-slate-800" />
                      <div className="space-y-1">
                        <Skeleton className="w-24 h-4 bg-slate-800" />
                        <Skeleton className="w-32 h-3 bg-slate-800" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Skeleton className="w-36 h-4 bg-slate-800" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-24 h-6 bg-slate-800 rounded-full" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-20 h-5 bg-slate-800 rounded-full" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-16 h-4 bg-slate-800" /></td>
                  <td className="px-5 py-4"><Skeleton className="w-20 h-4 bg-slate-800" /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <Skeleton className="w-8 h-8 rounded-lg bg-slate-800" />
                      <Skeleton className="w-8 h-8 rounded-lg bg-slate-800" />
                      <Skeleton className="w-8 h-8 rounded-lg bg-slate-800" />
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
      <div className="bg-slate-950/20 border border-slate-900 rounded-2xl p-16 text-center backdrop-blur-md">
        <div className="text-5xl mb-4 opacity-60">📋</div>
        <h3 className="text-base font-bold text-white mb-2">Chưa có đăng ký nào</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Không tìm thấy lượt ghi danh học tập nào phù hợp với bộ lọc hiện tại của bạn.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = pagination.page;

  return (
    <div className="bg-slate-950/20 border border-slate-900/60 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-950/40 border-b border-slate-850 text-left">
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Học viên</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Khóa học</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Tiến độ</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Trạng thái</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Học phí</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Ngày đăng ký</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
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
        <div className="px-5 py-4 border-t border-slate-850 bg-slate-950/25 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs font-medium text-slate-400 font-mono">
            Hiển thị <span className="text-white">{(currentPage - 1) * pagination.limit + 1}</span> -{' '}
            <span className="text-white">{Math.min(currentPage * pagination.limit, pagination.total)}</span> trong{' '}
            <span className="text-white">{pagination.total}</span> đăng ký
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 rounded-full hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                      ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 rounded-full hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
