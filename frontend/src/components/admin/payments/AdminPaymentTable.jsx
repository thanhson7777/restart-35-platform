import { ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try { 
    let d = date;
    if (typeof d === 'string' && /^\d+$/.test(d)) {
      d = parseInt(d, 10);
    }
    return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: vi }); 
  }
  catch { return '-'; }
};

const statusConfig = {
  pending: { label: 'Đang chờ', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  completed: { label: 'Hoàn thành', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  failed: { label: 'Thất bại', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  refunded: { label: 'Đã hoàn', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

const gatewayConfig = {
  vnpay: { label: 'VNPay', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  momo: { label: 'MoMo', className: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  bank_transfer: { label: 'Chuyển khoản', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  wallet: { label: 'Ví nội bộ', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

const AdminPaymentTable = ({
  payments,
  loading,
  pagination,
  onPageChange,
  onView,
  onApprove,
  onReject,
  onRefund,
}) => {
  if (loading) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-full h-12 bg-[hsl(var(--admin-surface-elevated))]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
        <Inbox className="w-12 h-12 mx-auto text-[hsl(var(--admin-text-muted))] mb-4 opacity-60" />
        <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có giao dịch nào</h3>
        <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.</p>
      </div>
    );
  }

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.currentPage || 1;
  const totalRecords = pagination?.totalRecords || 0;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
            <tr>
              {['Mã GD', 'Tổng tiền', 'Admin (20%)', 'Trainer (80%)', 'Trạng thái', 'Ngày', 'Thao tác'].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {payments.map((payment) => {
              const statusInfo = statusConfig[payment.status] || { label: payment.status, className: '' };
              const methodOrGateway = payment.method || payment.gateway;
              const gatewayInfo = gatewayConfig[methodOrGateway] || { label: methodOrGateway, className: '' };
              const isPackage = payment.referenceModel === 'ServicePackage' || !payment.courseId;
              const adminRevenue = isPackage ? payment.amount : Math.round(payment.amount * 0.2);
              const trainerRevenue = isPackage ? 0 : payment.amount - adminRevenue;
              const isAutoGateway = ['vnpay', 'momo', 'payos', 'zalopay', 'wallet'].includes(methodOrGateway);
              return (
                <tr key={payment._id} className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[hsl(var(--admin-text-muted))]">
                      {payment.transactionId || payment._id?.slice(-8)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-[hsl(var(--admin-text-primary))]">
                      {formatCurrency(payment.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-[hsl(var(--admin-accent))]">
                      +{formatCurrency(adminRevenue)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-emerald-500">
                      +{formatCurrency(trainerRevenue)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[hsl(var(--admin-text-muted))]">{formatDate(payment.paidAt || payment.completedAt || payment.createdAt || payment.updatedAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onView?.(payment)} className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors" title="Xem chi tiết">
                        <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                      </button>
                      {payment.status === 'pending' && !isAutoGateway && (
                        <>
                          <button onClick={() => onApprove?.(payment)} className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Duyệt">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          </button>
                          <button onClick={() => onReject?.(payment)} className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors" title="Từ chối">
                            <XCircle className="w-4 h-4 text-rose-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[hsl(var(--admin-border))] flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">
            Hiển thị {(currentPage - 1) * (pagination?.limit || 10) + 1} -{' '}
            {Math.min(currentPage * (pagination?.limit || 10), totalRecords)} trong {totalRecords} giao dịch
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
              className="gap-1 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]">
              <ChevronLeft className="w-4 h-4" /> Trước
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) { pageNum = i + 1; }
              else if (currentPage <= 3) { pageNum = i + 1; }
              else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
              else { pageNum = currentPage - 2 + i; }
              return (
                <button key={pageNum} onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[hsl(var(--admin-accent))] text-white'
                      : 'border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
              className="gap-1 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]">
              Sau <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentTable;
