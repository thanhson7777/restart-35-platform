import { Eye, Edit2, CheckCircle, XCircle, Clock, AlertCircle, Archive, BookOpen, X } from 'lucide-react';
import { Badge, Avatar } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { Progress } from '@/components/ui/Progress';
import { formatPrice } from '@/utils/formatter';

const STATUS_CONFIG = {
  enrolled: {
    label: 'Đã đăng ký',
    variant: 'default',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: BookOpen,
  },
  in_progress: {
    label: 'Đang học',
    variant: 'default',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: Clock,
  },
  completed: {
    label: 'Hoàn thành',
    variant: 'success',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircle,
  },
  waitlist: {
    label: 'Chờ xếp lớp',
    variant: 'warning',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: Clock,
  },
  dropped: {
    label: 'Đã bỏ cuộc',
    variant: 'destructive',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Đã hủy',
    variant: 'secondary',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
    icon: X,
  }
};

const AdminEnrollmentRow = ({ enrollment, onView, onUpdateProgress, onUpdateStatus }) => {
  const status = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.enrolled;
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

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* User Info */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={enrollment.user?.avatar}
            name={enrollment.user?.displayName}
            size="sm"
          />
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground line-clamp-1">
              {enrollment.user?.displayName || 'N/A'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {enrollment.user?.email || '-'}
            </p>
          </div>
        </div>
      </td>

      {/* Course */}
      <td className="px-4 py-4">
        <p className="text-sm text-slate-700 line-clamp-1 max-w-[200px]">
          {enrollment.course?.title || enrollment.courseTitle || 'N/A'}
        </p>
      </td>

      {/* Progress */}
      <td className="px-4 py-4">
        <div className="w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">
              {enrollment.progress?.percentage || 0}%
            </span>
            <span className="text-xs text-slate-400">
              {enrollment.progress?.currentLesson || 0}/{enrollment.progress?.totalLessons || 0}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(enrollment.progress?.percentage || 0)}`}
              style={{ width: `${enrollment.progress?.percentage || 0}%` }}
            />
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <Badge
          variant={status.variant}
          className={`${status.bgColor} ${status.textColor} border-0`}
        >
          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
          {status.label}
        </Badge>
      </td>

      {/* Fee */}
      <td className="px-4 py-4">
        <div className="text-sm">
          <p className="font-medium">
            {formatPrice(enrollment.fee?.total || 0)}
          </p>
          {enrollment.fee?.paid > 0 && (
            <p className="text-xs text-green-600">
              Đã thanh toán: {formatPrice(enrollment.fee?.paid || 0)}
            </p>
          )}
          {enrollment.fee?.pending > 0 && (
            <p className="text-xs text-amber-600">
              Còn nợ: {formatPrice(enrollment.fee?.pending || 0)}
            </p>
          )}
        </div>
      </td>

      {/* Enrolled Date */}
      <td className="px-4 py-4">
        <div className="text-sm">
          <p className="text-slate-600">{formatDate(enrollment.enrolledAt)}</p>
          {enrollment.completedAt && (
            <p className="text-xs text-green-600 mt-1">
              Hoàn thành: {formatDate(enrollment.completedAt)}
            </p>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onView(enrollment)}
                  className="h-10 w-10 p-0 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <Eye className="w-5 h-5 text-slate-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Xem chi tiết</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUpdateProgress(enrollment)}
                  className="h-10 w-10 p-0 rounded-lg hover:bg-purple-50 flex items-center justify-center transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-purple-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-purple-600">
                <p>Cập nhật tiến độ</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUpdateStatus(enrollment)}
                  className="h-10 w-10 p-0 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors"
                >
                  <Clock className="w-5 h-5 text-blue-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-blue-600">
                <p>Thay đổi trạng thái</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </td>
    </tr>
  );
};

export default AdminEnrollmentRow;
