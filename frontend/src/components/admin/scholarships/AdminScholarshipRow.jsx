import { Eye, Pause, Play, Archive } from 'lucide-react';
import { Badge, Progress, Avatar } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  draft: {
    label: 'Nháp',
    variant: 'secondary',
    className: 'bg-slate-100 text-slate-700',
  },
  active: {
    label: 'Đang hoạt động',
    variant: 'success',
    className: 'bg-green-100 text-green-700',
  },
  paused: {
    label: 'Tạm dừng',
    variant: 'warning',
    className: 'bg-amber-100 text-amber-700',
  },
  exhausted: {
    label: 'Đã hết ngân sách',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700',
  },
  expired: {
    label: 'Hết hạn',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700',
  },
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '-';
  }
};

const AdminScholarshipRow = ({ scholarship, onView }) => {
  const statusInfo = statusConfig[scholarship.status] || statusConfig.draft;
  const budgetPercentage = scholarship.budget > 0
    ? Math.round((scholarship.spent / scholarship.budget) * 100)
    : 0;
  const recipientPercentage = scholarship.maxRecipients > 0
    ? Math.round((scholarship.currentRecipients / scholarship.maxRecipients) * 100)
    : 0;

  const applicationStats = scholarship.applicationStats?.byStatus || {};
  const totalApplications = Object.values(applicationStats).reduce((sum, count) => sum + count, 0) || 0;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* Scholarship Info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={scholarship.thumbnail || 'https://via.placeholder.com/60x40?text=Học+bổng'}
            alt={scholarship.title}
            className="w-14 h-10 rounded-lg object-cover bg-slate-100"
          />
          <div className="min-w-0">
            <p className="font-medium text-sm text-slate-900 truncate max-w-[200px]">
              {scholarship.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {scholarship.ngo ? (
                <>
                  <Avatar
                    src={scholarship.ngo.avatar}
                    fallback={scholarship.ngo.displayName?.charAt(0) || 'N'}
                    size="xs"
                  />
                  <span className="text-xs text-slate-500 truncate max-w-[120px]">
                    {scholarship.ngo.displayName}
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Budget */}
      <td className="px-4 py-3">
        <div className="min-w-[140px]">
          <p className="text-sm font-medium text-slate-900">
            {formatCurrency(scholarship.budget)}
          </p>
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Đã dùng</span>
              <span>{budgetPercentage}%</span>
            </div>
            <Progress value={budgetPercentage} className="h-1.5" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Còn: {formatCurrency(scholarship.remaining)}
          </p>
        </div>
      </td>

      {/* Recipients */}
      <td className="px-4 py-3">
        <div className="min-w-[100px]">
          <p className="text-sm font-medium text-slate-900">
            {scholarship.currentRecipients || 0} / {scholarship.maxRecipients}
          </p>
          <div className="mt-1.5">
            <Progress
              value={recipientPercentage}
              className="h-1.5"
              variant={recipientPercentage >= 100 ? 'destructive' : 'default'}
            />
          </div>
        </div>
      </td>

      {/* Application Period */}
      <td className="px-4 py-3">
        <div className="text-sm text-slate-600">
          <p>{formatDate(scholarship.applicationPeriod?.startDate)}</p>
          <p className="text-xs text-slate-400">
            đến {formatDate(scholarship.applicationPeriod?.endDate)}
          </p>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>

      {/* Applications */}
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="font-medium text-slate-900">{totalApplications}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {applicationStats.submitted > 0 && (
              <span className="text-xs text-amber-600">
                {applicationStats.submitted} chờ
              </span>
            )}
            {applicationStats.approved > 0 && (
              <span className="text-xs text-green-600">
                {applicationStats.approved} duyệt
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Created At */}
      <td className="px-4 py-3">
        <p className="text-sm text-slate-500">
          {formatDate(scholarship.createdAt)}
        </p>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView?.(scholarship)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AdminScholarshipRow;
