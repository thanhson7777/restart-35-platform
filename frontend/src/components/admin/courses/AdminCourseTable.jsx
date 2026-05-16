import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminCourseRow from './AdminCourseRow';

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
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Khóa học
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Hình thức
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Học phí
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Học viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Đánh giá
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-16 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="w-48 h-4 mb-1" />
                        <Skeleton className="w-24 h-3" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-20 h-6 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-24 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-16 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-20 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-16 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-12 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="w-20 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Skeleton className="w-8 h-8 rounded" />
                      <Skeleton className="w-8 h-8 rounded" />
                      <Skeleton className="w-8 h-8 rounded" />
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
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Chưa có khóa học nào
        </h3>
        <p className="text-slate-500">
          Không tìm thấy khóa học nào phù hợp với bộ lọc của bạn.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = pagination.page;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Khóa học
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Danh mục
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Hình thức
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Học phí
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Học viên
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Đánh giá
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Ngày tạo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị {(currentPage - 1) * pagination.limit + 1} -{' '}
            {Math.min(currentPage * pagination.limit, pagination.total)} trong{' '}
            {pagination.total} khóa học
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 
                         disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={`px-3 py-1 text-sm border rounded ${
                    currentPage === pageNum
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 
                         disabled:opacity-50 disabled:cursor-not-allowed"
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
