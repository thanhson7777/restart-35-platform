import { X, Receipt, User, CreditCard, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi }); }
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
};

const AdminPaymentDetailModal = ({ payment, open, onClose, onApprove, onReject, onRefund }) => {
  if (!open || !payment) return null;

  const statusInfo = statusConfig[payment.status] || { label: payment.status, className: '' };
  const gatewayInfo = gatewayConfig[payment.gateway] || { label: payment.gateway, className: '' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[hsl(var(--admin-accent))]/10 border border-[hsl(var(--admin-accent))]/20">
              <Receipt className="w-5 h-5 text-[hsl(var(--admin-accent))]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Chi tiết thanh toán</h2>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] font-mono">
                #{payment.transactionId || payment._id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-2">Trạng thái</p>
            </div>
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
              <p className="text-2xl font-bold text-[hsl(var(--admin-accent))]">{formatCurrency(payment.amount)}</p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Số tiền</p>
            </div>
          </div>

          {/* Payment Info */}
          <div>
            <h3 className="font-medium text-[hsl(var(--admin-text-secondary))] mb-3 text-sm">Thông tin thanh toán</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                  <span className="text-sm text-[hsl(var(--admin-text-muted))]">Cổng thanh toán</span>
                </div>
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${gatewayInfo.className}`}>
                  {gatewayInfo.label}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                  <span className="text-sm text-[hsl(var(--admin-text-muted))]">Mã giao dịch</span>
                </div>
                <span className="font-mono text-sm text-[hsl(var(--admin-text-primary))]">
                  {payment.transactionId || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                  <span className="text-sm text-[hsl(var(--admin-text-muted))]">Ngày thanh toán</span>
                </div>
                <span className="text-sm text-[hsl(var(--admin-text-primary))]">
                  {formatDate(payment.paidAt || payment.createdAt)}
                </span>
              </div>

              {payment.gateway && payment.gatewayResponse && (
                <div className="flex items-center justify-between p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-[hsl(var(--admin-text-muted))]">Gateway Response</span>
                  </div>
                  <span className="text-sm text-[hsl(var(--admin-text-muted))]">
                    {payment.gatewayResponse || '-'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Worker Info */}
          {payment.workerId && (
            <div>
              <h3 className="font-medium text-[hsl(var(--admin-text-secondary))] mb-3 text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Học viên
              </h3>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                  {payment.workerId.displayName || payment.workerName || '-'}
                </p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                  {payment.workerId.email || payment.workerEmail || ''}
                </p>
                {payment.workerId._id && (
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                    ID: {payment.workerId._id}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Enrollment Info */}
          {payment.enrollmentId && (
            <div>
              <h3 className="font-medium text-[hsl(var(--admin-text-secondary))] mb-3 text-sm">Khóa học đã đăng ký</h3>
              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                  {payment.enrollmentId.courseName || payment.enrollmentId.courseId || `Enrollment #${payment.enrollmentId._id || payment.enrollmentId}`}
                </p>
                {payment.enrollmentId._id && (
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                    Enrollment ID: {payment.enrollmentId._id}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          {payment.status === 'pending' && (
            <>
              <Button
                variant="outline"
                onClick={() => { onReject?.(payment); }}
                className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
              <Button
                onClick={() => { onApprove?.(payment); }}
                className="gap-2 rounded-xl"
              >
                <CheckCircle className="w-4 h-4" />
                Duyệt thanh toán
              </Button>
            </>
          )}
          {payment.status === 'completed' && (
            <Button
              variant="outline"
              onClick={() => { onRefund?.(payment); }}
              className="border-purple-500/30 text-purple-500 hover:bg-purple-500/10 rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Hoàn tiền
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentDetailModal;
