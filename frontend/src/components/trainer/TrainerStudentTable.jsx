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
  onPageChange = () => {},
  hideCourseColumn = false
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
        <div className="h-10 bg-[hsl(var(--admin-surface-elevated))]/60 rounded-xl border border-[hsl(var(--admin-border))] animate-pulse w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-16 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]/60 rounded-xl animate-pulse w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] overflow-hidden">
        <Table>
          <TableHeader className="bg-[hsl(var(--admin-surface-elevated))]/40 border-b border-[hsl(var(--admin-border))]">
            <TableRow className="hover:bg-transparent border-[hsl(var(--admin-border))]">
              <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold py-4 w-[250px]">Học viên</TableHead>
              {!hideCourseColumn && (
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold py-4">Khóa học</TableHead>
              )}
              <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold py-4 w-[180px]">Tiến độ</TableHead>
              <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold py-4 w-[140px]">Trạng thái</TableHead>
              <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold py-4 w-[160px]">Nguy cơ bỏ học</TableHead>
              <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold py-4 text-right w-[120px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={hideCourseColumn ? 5 : 6} className="h-48 text-center text-[hsl(var(--admin-text-muted))] py-8">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BookOpen size={24} className="text-[hsl(var(--admin-text-muted))]" />
                    <span>Không tìm thấy học viên nào phù hợp.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((item) => (
                <TableRow
                  key={item._id}
                  className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-elevated))]/20 transition-all duration-200"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={item.user?.avatar}
                        alt={item.user?.displayName}
                        fallback={item.user?.displayName?.charAt(0).toUpperCase()}
                        size="default"
                        className="bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] ring-1 ring-[hsl(var(--admin-border))]"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-[hsl(var(--admin-text-primary))] text-sm">
                          {item.user?.displayName || 'Chưa cập nhật'}
                        </span>
                        <span className="text-xs text-[hsl(var(--admin-text-muted))] font-mono">
                          {item.user?.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  {!hideCourseColumn && (
                    <TableCell className="py-4">
                      <span className="text-sm text-[hsl(var(--admin-text-secondary))] max-w-[200px] block truncate">
                        {item.course?.title || 'N/A'}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="py-4">
                    {(() => {
                      const isOffline = item.course?.delivery_type !== 'video';
                      let current = item.progress?.currentLesson || 0;
                      let total = item.progress?.totalLessons || 0;
                      let percentage = item.progress?.percentage || 0;
                      let label = 'bài';
                      
                      if (isOffline && item.attendance && item.attendance.totalSessions > 0) {
                        current = (item.attendance.present || 0) + (item.attendance.late || 0);
                        total = item.attendance.totalSessions;
                        percentage = Math.round((current / total) * 100) || 0;
                        label = 'buổi';
                      }

                      return (
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[hsl(var(--admin-text-muted))]">
                              {current}/{total} {label}
                            </span>
                            <span className="font-semibold text-[hsl(var(--admin-text-primary))]">
                              {percentage}%
                            </span>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-1.5 bg-[hsl(var(--admin-surface-elevated))]"
                            indicatorClassName="bg-gradient-to-r from-blue-500 to-indigo-500"
                          />
                        </div>
                      );
                    })()}
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
                  <TableCell className="py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trainer/enrollments/${item._id}`)}
                      className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-elevated))]/80 gap-1.5 transition-all duration-200"
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
        <div className="flex items-center justify-between mt-4 bg-[hsl(var(--admin-surface-elevated))]/40 p-4 rounded-xl border border-[hsl(var(--admin-border))]">
          <p className="text-xs text-[hsl(var(--admin-text-secondary))]">
            Hiển thị{' '}
            <span className="font-semibold text-[hsl(var(--admin-text-primary))]">
              {(pagination.currentPage - 1) * pagination.limit + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-[hsl(var(--admin-text-primary))]">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
            </span>{' '}
            trong tổng số{' '}
            <span className="font-semibold text-[hsl(var(--admin-text-primary))]">{pagination.totalRecords}</span> học viên
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] disabled:opacity-40"
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
                      ? 'bg-[hsl(var(--admin-accent))] text-white'
                      : 'text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
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
              className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] disabled:opacity-40"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
