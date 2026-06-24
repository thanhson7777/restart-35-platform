import { Eye, Trash2, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge, Progress } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const typeConfig = {
  enterprise: {
    label: 'Doanh nghiệp',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  ngo: {
    label: 'NGO',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  training_center: {
    label: 'Trung tâm đào tạo',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
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
  pending: {
    label: 'Chờ duyệt',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  suspended: {
    label: 'Tạm ngưng',
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  },
};

const formatDate = (org) => {
  let dateVal = org.createdAt;
  if (!dateVal && org._id && typeof org._id === 'string' && org._id.length === 24) {
    // Extract timestamp from MongoDB ObjectId
    dateVal = parseInt(org._id.substring(0, 8), 16) * 1000;
  }
  
  if (!dateVal) return '-';
  try {
    return format(new Date(dateVal), 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '-';
  }
};

const AdminOrganizationRow = ({ organization, onView, onToggleStatus, onApprove, onReject }) => {
  const typeInfo = typeConfig[organization.type] || { label: organization.type, className: '' };
  
  // Organization model doesn't have a direct status field yet, default to active or based on adminApprovalStatus if joined
  const statusInfo = statusConfig[organization.status || 'active'] || statusConfig.inactive;
  
  // Quota is a number in DB, usedQuota might be another number
  const quotaTotal = typeof organization.quota === 'object' ? (organization.quota?.total || 0) : (organization.quota || 0);
  const quotaUsed = typeof organization.quota === 'object' ? (organization.quota?.used || 0) : (organization.usedQuota || 0);
  const quotaPercent = quotaTotal > 0 ? Math.round((quotaUsed / quotaTotal) * 100) : 0;

  return (
    <tr className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-[hsl(var(--admin-text-primary))] text-sm">{organization.name}</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">{organization.ownerEmail || organization.contactEmail || organization.email || '-'}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${typeInfo.className}`}>
          {typeInfo.label}
        </span>
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
        <span className="text-sm text-[hsl(var(--admin-text-muted))]">{formatDate(organization)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {organization.status === 'pending' && (
            <button
              onClick={() => onApprove?.(organization)}
              className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Phê duyệt đối tác"
            >
              <CheckCircle className="w-4 h-4 text-blue-500" />
            </button>
          )}
          {organization.status === 'pending' && (
            <button
              onClick={() => onReject?.(organization)}
              className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Từ chối đối tác"
            >
              <XCircle className="w-4 h-4 text-rose-500" />
            </button>
          )}
          <button
            onClick={() => onView?.(organization)}
            className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          </button>
          {organization.status !== 'pending' && (
            <button
              onClick={() => onToggleStatus?.(organization)}
              className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
              title={organization.status === 'active' ? "Vô hiệu hóa" : "Kích hoạt"}
            >
              {organization.status === 'active' ? (
                <ToggleRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default AdminOrganizationRow;
