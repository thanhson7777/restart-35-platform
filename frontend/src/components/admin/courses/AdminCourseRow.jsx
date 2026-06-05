import { Eye, Check, X, Clock, CheckCircle, XCircle, Archive, Calendar } from 'lucide-react';
import { Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { formatPrice, formatDuration } from '@/utils/formatter';

const STATUS_CONFIG = {
  draft: {
    label: 'Nháp',
    variant: 'secondary',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    icon: null,
  },
  pending: {
    label: 'Chờ duyệt',
    variant: 'warning',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: Clock,
  },
  approved: {
    label: 'Đã duyệt',
    variant: 'success',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Từ chối',
    variant: 'destructive',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircle,
  },
  archived: {
    label: 'Lưu trữ',
    variant: 'secondary',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
    icon: Archive,
  },
};

const LEVEL_LABELS = {
  beginner: 'Người mới bắt đầu',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

const LOCATION_LABELS = {
  online: 'Trực tuyến',
  offline: 'Tại lớp',
  hybrid: 'Kết hợp',
};

const AdminCourseRow = ({ course, onView, onApprove, onReject }) => {
  const status = STATUS_CONFIG[course.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* Thumbnail & Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                📚
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground line-clamp-1">
              {course.title}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {course.provider?.displayName || 'Không xác định'}
            </p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge
          variant={status.variant}
          className={`${status.bgColor} ${status.textColor} border-0`}
        >
          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
          {status.label}
        </Badge>
      </td>

      {/* Category & Level */}
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-slate-600">{course.category?.name || '-'}</p>
          <p className="text-xs text-slate-400">
            {LEVEL_LABELS[course.level] || course.level || '-'}
          </p>
        </div>
      </td>

      {/* Location & Duration */}
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-slate-600">
            {LOCATION_LABELS[course.location?.type] || '-'}
          </p>
          <p className="text-xs text-slate-400">
            {course.duration ? formatDuration(course.duration) : '-'}
          </p>
        </div>
      </td>

      {/* Fee */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium">
          {course.isFree || course.fee === 0
            ? 'Miễn phí'
            : formatPrice(course.fee)}
        </span>
      </td>

      {/* Students */}
      <td className="px-4 py-3">
        <div className="text-sm">
          <span className="font-medium">{course.currentStudents || 0}</span>
          <span className="text-slate-400">/{course.maxStudents || '-'} </span>
          <span className="text-xs text-slate-400">học viên</span>
        </div>
      </td>

      {/* Rating */}
      <td className="px-4 py-3">
        {course.rating?.average ? (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-500">⭐</span>
            <span className="font-medium">{course.rating.average.toFixed(1)}</span>
            <span className="text-slate-400">({course.rating.count})</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>

      {/* Date */}
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-slate-600">{formatDate(course.createdAt)}</p>
          <p className="text-xs text-slate-400">Ngày tạo</p>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(course)}
                  className="h-10 w-10 p-0 rounded-lg hover:bg-slate-100"
                >
                  <Eye className="w-5 h-5 text-slate-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Xem chi tiết</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = `/admin/courses/${course._id}/schedule`}
                  className="h-10 w-10 p-0 rounded-lg hover:bg-slate-100"
                >
                  <Calendar className="w-5 h-5 text-slate-650" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lập lịch học</p>
              </TooltipContent>
            </Tooltip>

            {course.status === 'pending' && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onApprove(course)}
                      className="h-10 w-10 p-0 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-green-600">
                    <p>Duyệt khóa học</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReject(course)}
                      className="h-10 w-10 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-red-600">
                    <p>Từ chối</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>
      </td>
    </tr>
  );
};

export default AdminCourseRow;
