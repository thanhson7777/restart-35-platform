import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Calendar, BookOpen } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Avatar,
  Badge,
  Progress,
  Button
} from '@/components/ui';
import { TrainerRiskAlert } from './TrainerRiskAlert';

export const TrainerStudentTable = ({
  enrollments = [],
  loading = false,
  pagination = null,
  onPageChange = () => {}
}) => {
  const navigate = useNavigate();

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'success';
      case 'completed':
        return 'default';
      case 'suspended':
        return 'warning';
      case 'failed':
      case 'dropped':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'Đang học';
      case 'completed':
        return 'Hoàn thành';
      case 'suspended':
        return 'Tạm ngưng';
      case 'failed':
        return 'Đã trượt';
      case 'dropped':
        return 'Bỏ học';
      default:
        return status || 'N/A';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-16 bg-slate-950 border border-slate-900/60 rounded-xl animate-pulse w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-[#0c101d] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/40 border-b border-slate-800">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-400 font-semibold py-4">Học viên</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Khóa học</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Tiến độ</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Trạng thái</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Nguy cơ bỏ học</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Ngày đăng ký</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-48 text-center text-slate-500 py-8">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BookOpen size={24} className="text-slate-700" />
                    <span>Không tìm thấy học viên nào phù hợp.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((item) => (
                <TableRow
                  key={item._id}
                  className="border-slate-850 hover:bg-slate-900/20 transition-all duration-200"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={item.user?.avatar}
                        alt={item.user?.displayName}
                        fallback={item.user?.displayName?.charAt(0).toUpperCase()}
                        size="default"
                        className="bg-slate-800 text-slate-300 ring-1 ring-slate-800"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">
                          {item.user?.displayName || 'Chưa cập nhật'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {item.user?.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm text-slate-300 max-w-[200px] block truncate">
                      {item.course?.title || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1 w-32">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          {item.progress?.currentLesson || 0}/{item.progress?.totalLessons || 0} bài
                        </span>
                        <span className="font-semibold text-white">
                          {item.progress?.percentage || 0}%
                        </span>
                      </div>
                      <Progress
                        value={item.progress?.percentage || 0}
                        className="h-1.5 bg-slate-800"
                        indicatorClassName="bg-gradient-to-r from-blue-500 to-indigo-500"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant={getStatusBadgeVariant(item.status)} className="px-2.5 py-0.5 rounded-md text-xs font-semibold">
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <TrainerRiskAlert
                      level={item.dropout_risk?.level}
                      score={item.dropout_risk?.score}
                    />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                      <Calendar size={13} className="text-slate-600" />
                      <span>{formatDate(item.enrolledAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trainer/enrollments/${item._id}`)}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 gap-1.5 transition-all duration-200"
                    >
                      <Eye size={14} />
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <p className="text-xs text-slate-400">
            Hiển thị{' '}
            <span className="font-semibold text-white">
              {(pagination.currentPage - 1) * pagination.limit + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-white">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
            </span>{' '}
            trong tổng số{' '}
            <span className="font-semibold text-white">{pagination.totalRecords}</span> học viên
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="border-slate-800 text-slate-400 hover:text-white disabled:opacity-40"
            >
              Trước
            </Button>

            {Array.from({ length: pagination.totalPages }, (_, i) => {
              const pageNum = i + 1;
              const isCurrent = pagination.currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="border-slate-800 text-slate-400 hover:text-white disabled:opacity-40"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
