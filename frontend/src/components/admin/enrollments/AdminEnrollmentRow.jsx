import React from 'react';
import { Eye, Edit2, CheckCircle, Clock, AlertCircle, BookOpen, X } from 'lucide-react';
import { Badge, Avatar } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { formatCurrency, formatDate } from '@/utils/formatter';

const STATUS_CONFIG = {
  enrolled: {
    label: 'Đã đăng ký',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    icon: BookOpen,
  },
  in_progress: {
    label: 'Đang học',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/20',
    icon: Clock,
  },
  completed: {
    label: 'Hoàn thành',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle,
  },
  waitlist: {
    label: 'Chờ xếp lớp',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    icon: Clock,
  },
  dropped: {
    label: 'Đã bỏ cuộc',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-500',
    borderColor: 'border-rose-500/20',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Đã hủy',
    bgColor: 'bg-[hsl(var(--admin-surface-elevated))]',
    textColor: 'text-[hsl(var(--admin-text-muted))]',
    borderColor: 'border-[hsl(var(--admin-border))]',
    icon: X,
  }
};

const AdminEnrollmentRow = ({ enrollment, onView }) => {
  const status = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.enrolled;
  const StatusIcon = status.icon;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return '-';
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-[hsl(var(--admin-accent))]';
    if (percentage >= 25) return 'bg-amber-500';
    return 'bg-[hsl(var(--admin-text-muted))]';
  };

  return (
    <tr className="border-b border-[hsl(var(--admin-border))]/60 hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={enrollment.user?.avatar}
            fallback={enrollment.user?.displayName?.charAt(0) || 'U'}
            className="w-9 h-9 border border-[hsl(var(--admin-border))] shadow-sm"
          />
          <div className="min-w-0">
            <p className="font-bold text-sm text-[hsl(var(--admin-text-primary))] line-clamp-1">
              {enrollment.user?.displayName || 'N/A'}
            </p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate mt-0.5 tabular-nums">
              {enrollment.user?.email || '-'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] line-clamp-2 max-w-[220px]">
          {enrollment.course?.title || enrollment.courseTitle || 'N/A'}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="w-32">
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold tabular-nums">
            <span className="text-[hsl(var(--admin-text-primary))]">{enrollment.progress?.percentage || 0}%</span>
            <span className="text-[hsl(var(--admin-text-muted))]">
              {enrollment.progress?.currentLesson || 0}/{enrollment.progress?.totalLessons || 0}
            </span>
          </div>
          <div className="h-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-full overflow-hidden border border-[hsl(var(--admin-border))]/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(enrollment.progress?.percentage || 0)}`}
              style={{ width: `${enrollment.progress?.percentage || 0}%` }}
            />
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col gap-1.5 items-start">
          <Badge className={`${status.bgColor} ${status.textColor} ${status.borderColor} border font-semibold px-2.5 py-0.5 text-[10px] rounded-full`}>
            {StatusIcon && <StatusIcon className="w-3 h-3 mr-1 shrink-0" />}
            {status.label}
          </Badge>

          {enrollment.dropout_risk && enrollment.dropout_risk.level && enrollment.dropout_risk.level !== 'low' && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border flex items-center gap-1 shrink-0 ${
              enrollment.dropout_risk.level === 'high'
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
            }`}>
              <AlertCircle className="w-2.5 h-2.5" />
              RISK: {enrollment.dropout_risk.score}%
            </span>
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="text-xs space-y-1 tabular-nums">
          <p className="font-extrabold text-[hsl(var(--admin-text-primary))]">
            {formatCurrency(enrollment.fee?.total || enrollment.course?.fee || 0)}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="text-xs space-y-1 tabular-nums">
          <p className="text-[hsl(var(--admin-text-secondary))]">{formatDate(enrollment.enrolledAt)}</p>
        </div>
      </td>

      <td className="px-5 py-4">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onView(enrollment)}
                  className="h-8 w-8 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:border-[hsl(var(--admin-accent))]/30 hover:bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] text-xs">
                Xem chi tiết
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </td>
    </tr>
  );
};

export default AdminEnrollmentRow;
