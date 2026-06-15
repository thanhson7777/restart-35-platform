import { Eye, Check, X, Clock, CheckCircle, XCircle, Archive, Calendar, BookOpen, Star } from 'lucide-react';
import { Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, SafeImage } from '@/components/ui';
import { formatPrice, formatDuration } from '@/utils/formatter';

const STATUS_CONFIG = {
  draft: {
    label: 'Nháp',
    variant: 'secondary',
    bgColor: 'bg-[hsl(var(--admin-surface-elevated))]',
    textColor: 'text-[hsl(var(--admin-text-muted))]',
    borderColor: 'border-[hsl(var(--admin-border))]',
  },
  pending: {
    label: 'Chờ duyệt',
    variant: 'warning',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    icon: Clock,
  },
  approved: {
    label: 'Đã duyệt',
    variant: 'success',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Từ chối',
    variant: 'destructive',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-500',
    borderColor: 'border-rose-500/20',
    icon: XCircle,
  },
  archived: {
    label: 'Lưu trữ',
    variant: 'secondary',
    bgColor: 'bg-[hsl(var(--admin-surface-elevated))]',
    textColor: 'text-[hsl(var(--admin-text-muted))]',
    borderColor: 'border-[hsl(var(--admin-border))]',
  },
};

const DURATION_LABELS = {
  hours: 'giờ',
  weeks: 'tuần',
  months: 'tháng',
  days: 'ngày',
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
    <tr className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-10 rounded-lg overflow-hidden bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] flex-shrink-0">
            {course.thumbnail ? (
              <SafeImage
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[hsl(var(--admin-text-muted))]">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] line-clamp-1">
              {course.title}
            </p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate">
              {course.provider?.displayName || 'Không xác định'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <Badge
          className={`${status.bgColor} ${status.textColor} ${status.borderColor} border font-semibold px-2.5 py-0.5 text-[10px] rounded-full`}
        >
          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1 inline" />}
          {status.label}
        </Badge>
      </td>

      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-[hsl(var(--admin-text-secondary))]">{course.category?.name || '-'}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-[hsl(var(--admin-text-secondary))]">
            {LOCATION_LABELS[course.location?.type] || '-'}
          </p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
            {course.duration ? formatDuration(course.duration) : '-'}
          </p>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
          {course.fundingConfig?.type === 'FREE'
            ? 'Miễn phí'
            : formatPrice(course.fundingConfig?.price || 0)}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="text-sm">
          <span className="font-medium text-[hsl(var(--admin-text-primary))]">{course.currentStudents || 0}</span>
          <span className="text-[hsl(var(--admin-text-muted))]">/{course.maxStudents || '-'} </span>
          <span className="text-xs text-[hsl(var(--admin-text-muted))]">học viên</span>
        </div>
      </td>

      <td className="px-4 py-3">
        {course.rating?.average ? (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
            </span>
            <span className="font-medium text-[hsl(var(--admin-text-primary))]">{course.rating.average.toFixed(1)}</span>
            <span className="text-[hsl(var(--admin-text-muted))]">({course.rating.count})</span>
          </div>
        ) : (
          <span className="text-sm text-[hsl(var(--admin-text-muted))]">-</span>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-[hsl(var(--admin-text-secondary))]">{formatDate(course.createdAt)}</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngày tạo</p>
        </div>
      </td>

      <td className="px-4 py-4">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(course)}
                  className="h-10 w-10 p-0 rounded-lg hover:bg-[hsl(var(--admin-surface-elevated))]"
                >
                  <Eye className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
                Xem chi tiết
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
                      className="h-10 w-10 p-0 rounded-lg text-emerald-500 hover:bg-emerald-500/10"
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-emerald-500">
                    Duyệt khóa học
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReject(course)}
                      className="h-10 w-10 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-rose-500">
                    Từ chối
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
