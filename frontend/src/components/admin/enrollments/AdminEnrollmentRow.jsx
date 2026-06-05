import React from 'react';
import { Eye, Edit2, CheckCircle, XCircle, Clock, AlertCircle, BookOpen, X, RefreshCw } from 'lucide-react';
import { Badge, Avatar } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { formatPrice } from '@/utils/formatter';

const STATUS_CONFIG = {
  enrolled: {
    label: 'Đã đăng ký',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    icon: BookOpen,
  },
  in_progress: {
    label: 'Đang học',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    icon: Clock,
  },
  completed: {
    label: 'Hoàn thành',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle,
  },
  waitlist: {
    label: 'Chờ xếp lớp',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    icon: Clock,
  },
  dropped: {
    label: 'Đã bỏ cuộc',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Đã hủy',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/20',
    icon: X,
  }
};

const AdminEnrollmentRow = ({ enrollment, onView, onUpdateProgress, onUpdateStatus }) => {
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
    if (percentage >= 80) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
    if (percentage >= 50) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
    if (percentage >= 25) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    return 'bg-slate-500';
  };

  return (
    <tr className="border-b border-slate-900/60 hover:bg-slate-900/30 transition-colors bg-slate-950/5">
      {/* User Info */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={enrollment.user?.avatar}
            fallback={enrollment.user?.displayName?.charAt(0) || 'U'}
            className="w-9 h-9 border border-slate-800 shadow-sm"
          />
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-100 line-clamp-1 group-hover:text-blue-400 transition-colors">
              {enrollment.user?.displayName || 'N/A'}
            </p>
            <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
              {enrollment.user?.email || '-'}
            </p>
          </div>
        </div>
      </td>

      {/* Course */}
      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-slate-200 line-clamp-2 max-w-[220px]">
          {enrollment.course?.title || enrollment.courseTitle || 'N/A'}
        </p>
      </td>

      {/* Progress */}
      <td className="px-5 py-4">
        <div className="w-32">
          <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] font-bold">
            <span className="text-white">
              {enrollment.progress?.percentage || 0}%
            </span>
            <span className="text-slate-400">
              {enrollment.progress?.currentLesson || 0}/{enrollment.progress?.totalLessons || 0}
            </span>
          </div>
          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(enrollment.progress?.percentage || 0)}`}
              style={{ width: `${enrollment.progress?.percentage || 0}%` }}
            />
          </div>
        </div>
      </td>

      {/* Status & Dropout Risk */}
      <td className="px-5 py-4">
        <div className="flex flex-col gap-1.5 items-start">
          <Badge
            className={`${status.bgColor} ${status.textColor} ${status.borderColor} border font-semibold px-2.5 py-0.5 text-[10px] rounded-full`}
          >
            {StatusIcon && <StatusIcon className="w-3 h-3 mr-1 shrink-0" />}
            {status.label}
          </Badge>
          
          {enrollment.dropout_risk && enrollment.dropout_risk.level && enrollment.dropout_risk.level !== 'low' && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono border flex items-center gap-1 shrink-0 ${
              enrollment.dropout_risk.level === 'high'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)] animate-pulse'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              <AlertCircle className="w-2.5 h-2.5" />
              <span>RISK: {enrollment.dropout_risk.score}%</span>
            </span>
          )}
        </div>
      </td>

      {/* Fee */}
      <td className="px-5 py-4">
        <div className="text-xs space-y-1 font-mono">
          <p className="font-extrabold text-slate-100">
            {formatPrice(enrollment.fee?.total || 0)}
          </p>
          {enrollment.fee?.paid > 0 && (
            <p className="text-emerald-400 font-semibold">
              Paid: {formatPrice(enrollment.fee?.paid || 0)}
            </p>
          )}
          {enrollment.fee?.pending > 0 && (
            <p className="text-amber-400 font-semibold">
              Due: {formatPrice(enrollment.fee?.pending || 0)}
            </p>
          )}
        </div>
      </td>

      {/* Enrolled Date */}
      <td className="px-5 py-4">
        <div className="text-xs space-y-1 font-mono">
          <p className="text-slate-300">{formatDate(enrollment.enrolledAt)}</p>
          {enrollment.completedAt && (
            <p className="text-emerald-450 font-bold">
              Done: {formatDate(enrollment.completedAt)}
            </p>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onView(enrollment)}
                  className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-850 flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-950 border-slate-800 text-slate-200 text-xs">
                <p>Xem chi tiết</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUpdateProgress(enrollment)}
                  className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-purple-400 hover:text-purple-300 hover:border-purple-500/40 hover:bg-purple-950/20 flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-950 border-slate-800 text-purple-300 text-xs">
                <p>Cập nhật tiến độ</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUpdateStatus(enrollment)}
                  className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 hover:text-blue-300 hover:border-blue-500/40 hover:bg-blue-950/20 flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-950 border-slate-800 text-blue-300 text-xs">
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
