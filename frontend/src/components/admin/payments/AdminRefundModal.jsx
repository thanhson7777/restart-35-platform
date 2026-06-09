import { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const AdminRefundModal = ({ payment, open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  if (!open || !payment) return null;

  const isConfirmed = confirmText === 'HOÀN TIỀN';

  const handleSubmit = () => {
    if (!isConfirmed) return;
    onConfirm?.({ reason, amount: payment.amount });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <RotateCcw className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Hoàn tiền</h2>
              <p className="text-xs text-[hsl(var(--admin-text-muted))]">Hoàn tiền cho giao dịch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-500">Hành động không thể hoàn tác</p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                Số tiền sẽ được hoàn về tài khoản của học viên. Hành động này không thể khôi phục.
              </p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[hsl(var(--admin-text-muted))]">Số tiền hoàn</span>
              <span className="text-xl font-bold text-purple-500">{formatCurrency(payment.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--admin-text-muted))]">Mã giao dịch</span>
              <span className="font-mono text-sm text-[hsl(var(--admin-text-primary))]">
                {payment.transactionId || payment._id?.slice(-8)}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Lý do hoàn tiền <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Học viên yêu cầu hủy, khóa học không đúng mô tả..."
              rows={3}
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                placeholder:text-[hsl(var(--admin-text-muted))]
                focus:outline-none focus:ring-2 focus:ring-purple-500/30
                focus:border-purple-500/50 text-sm resize-none"
            />
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Nhập <span className="text-purple-500 font-bold">HOÀN TIỀN</span> để xác nhận
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="HOÀN TIỀN"
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                placeholder:text-[hsl(var(--admin-text-muted))]
                focus:outline-none focus:ring-2 focus:ring-purple-500/30
                focus:border-purple-500/50 text-sm font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!isConfirmed || !reason.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white gap-2 rounded-xl"
          >
            <RotateCcw className="w-4 h-4" />
            Xác nhận hoàn tiền
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminRefundModal;
