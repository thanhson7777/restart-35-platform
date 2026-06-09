import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge, Progress } from '@/components/ui';

const typeConfig = {
  enterprise: {
    label: 'Doanh nghiệp',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  ngo: {
    label: 'NGO',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
};

const statusConfig = {
  active: {
    label: 'Hoạt động',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  inactive: {
    label: 'Không hoạt động',
    className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]',
  },
  suspended: {
    label: 'Tạm ngưng',
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  },
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('vi-VN');
  } catch {
    return '-';
  }
};

const AdminOrganizationRow = ({ organization, onView, onEdit, onDelete }) => {
  const typeInfo = typeConfig[organization.type] || { label: organization.type, className: '' };
  const statusInfo = statusConfig[organization.status] || statusConfig.inactive;
  const quota = organization.quota || {};
  const quotaUsed = quota.used || 0;
  const quotaTotal = quota.total || 0;
  const quotaPercent = quotaTotal > 0 ? Math.round((quotaUsed / quotaTotal) * 100) : 0;

  return (
    <tr className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-[hsl(var(--admin-text-primary))] text-sm">{organization.name}</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">{organization.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${typeInfo.className}`}>
          {typeInfo.label}
        </span>
      </td>
      <td className="px-4 py-3 min-w-[140px]">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[hsl(var(--admin-text-muted))]">
              {quotaUsed} / {quotaTotal}
            </span>
            <span className="text-[hsl(var(--admin-text-muted))]">{quotaPercent}%</span>
          </div>
          <Progress value={quotaPercent} className="h-1.5" />
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
            Còn lại: {Math.max(0, quotaTotal - quotaUsed)} học viên
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-[hsl(var(--admin-text-secondary))]">
          {organization.memberCount || organization.members?.length || 0}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-[hsl(var(--admin-text-muted))]">{formatDate(organization.createdAt)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView?.(organization)}
            className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          </button>
          <button
            onClick={() => onEdit?.(organization)}
            className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Pencil className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          </button>
          <button
            onClick={() => onDelete?.(organization)}
            className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AdminOrganizationRow;
