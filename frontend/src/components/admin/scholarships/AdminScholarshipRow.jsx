import { Eye } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  draft: { label: 'Nháp', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
  active: { label: 'Đang hoạt động', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  paused: { label: 'Tạm dừng', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  exhausted: { label: 'Đã hết ngân sách', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  expired: { label: 'Hết hạn', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const AdminScholarshipRow = ({ scholarship, onView }) => {
  const statusInfo = statusConfig[scholarship.status] || statusConfig.draft;
  const budgetPercentage = scholarship.budget > 0 ? Math.round((scholarship.spent / scholarship.budget) * 100) : 0;
  const recipientPercentage = scholarship.maxRecipients > 0 ? Math.round((scholarship.currentRecipients / scholarship.maxRecipients) * 100) : 0;
  const applicationStats = scholarship.applicationStats?.byStatus || {};
  const totalApplications = Object.values(applicationStats).reduce((sum, count) => sum + count, 0) || 0;

  return (
    <tr className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={scholarship.thumbnail || 'https://picsum.photos/seed/sch/60/40'} alt={scholarship.title}
            className="w-14 h-10 rounded-lg object-cover bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]" />
          <div className="min-w-0">
            <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[200px]">{scholarship.title}</p>
            <span className="text-xs text-[hsl(var(--admin-text-muted))]">{scholarship.ngo?.displayName || '-'}</span>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[140px]">
          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formatCurrency(scholarship.budget)}</p>
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--admin-text-muted))] mb-1">
              <span>Đã dùng</span><span>{budgetPercentage}%</span>
            </div>
            <Progress value={budgetPercentage} className="h-1.5" />
          </div>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Còn: {formatCurrency(scholarship.remaining)}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[100px]">
          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{scholarship.currentRecipients || 0} / {scholarship.maxRecipients}</p>
          <div className="mt-1.5"><Progress value={recipientPercentage} className="h-1.5" /></div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="text-sm text-[hsl(var(--admin-text-secondary))]">
          <p>{formatDate(scholarship.applicationPeriod?.startDate)}</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">đến {formatDate(scholarship.applicationPeriod?.endDate)}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="font-medium text-[hsl(var(--admin-text-primary))]">{totalApplications}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {applicationStats.submitted > 0 && <span className="text-xs text-amber-500">{applicationStats.submitted} chờ</span>}
            {applicationStats.approved > 0 && <span className="text-xs text-emerald-500">{applicationStats.approved} duyệt</span>}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-[hsl(var(--admin-text-secondary))]">{formatDate(scholarship.createdAt)}</td>

      <td className="px-4 py-3">
        <button onClick={() => onView?.(scholarship)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors" title="Xem chi tiết">
          <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        </button>
      </td>
    </tr>
  );
};

export default AdminScholarshipRow;
