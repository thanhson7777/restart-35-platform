import { Eye } from 'lucide-react';
import { Progress, SafeImage } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'Chờ kích hoạt', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  active: { label: 'Đang hoạt động', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  completed: { label: 'Đã hoàn thành', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  default: { label: 'Vi phạm', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatPercent = (value) => {
  if (!value && value !== 0) return '0%';
  return `${value}%`;
};

const AdminIsaRow = ({ isa, onView }) => {
  const statusInfo = statusConfig[isa.status] || { label: isa.status, className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' };
  const paidPercent = isa.totalAmount > 0 ? Math.round((isa.totalPaid / isa.totalAmount) * 100) : 0;
  const paidRecords = isa.monthlyRecords?.filter((r) => r.status === 'paid').length || 0;
  const totalMonths = isa.monthlyRecords?.length || 0;

  return (
    <tr className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <SafeImage
            src={isa.worker?.avatar || 'https://picsum.photos/seed/worker/60/60'}
            alt={isa.worker?.fullName || 'Worker'}
            className="w-10 h-10 rounded-full object-cover bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]"
          />
          <div className="min-w-0">
            <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[180px]">
              {isa.worker?.fullName || '-'}
            </p>
            <span className="text-xs text-[hsl(var(--admin-text-muted))]">
              {isa.worker?.email || isa.worker?.phone || '-'}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="min-w-[140px]">
          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formatCurrency(isa.totalAmount)}</p>
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--admin-text-muted))] mb-1">
              <span>Đã trả</span><span>{paidPercent}%</span>
            </div>
            <Progress value={paidPercent} className="h-1.5" />
          </div>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
            Còn: {formatCurrency(isa.totalAmount - isa.totalPaid)}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
          {formatPercent(isa.percentage)}%
        </div>
        <p className="text-xs text-[hsl(var(--admin-text-muted))]">
          Ngưỡng: {formatCurrency(isa.incomeThreshold)}/tháng
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-[hsl(var(--admin-text-primary))]">
            {totalMonths > 0 ? `${paidRecords}/${totalMonths} tháng` : '-'}
          </p>
          {totalMonths > 0 && (
            <div className="mt-1">
              <Progress value={Math.round((paidRecords / totalMonths) * 100)} className="h-1.5" />
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[hsl(var(--admin-text-secondary))]">
        {isa.startDate ? format(new Date(isa.startDate), 'dd/MM/yyyy', { locale: vi }) : '-'}
        {isa.endDate && <span className="text-xs text-[hsl(var(--admin-text-muted))]"> → {format(new Date(isa.endDate), 'dd/MM/yyyy', { locale: vi })}</span>}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView?.(isa)}
          className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        </button>
      </td>
    </tr>
  );
};

export default AdminIsaRow;
