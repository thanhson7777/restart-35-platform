import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { revokeCertificate } from '@/apis';

const AdminRevokeModal = ({ certificate, open, onClose, onRevoked }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open || !certificate) return null;

  const handleRevoke = async () => {
    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do thu hồi');
      return;
    }
    try {
      setLoading(true);
      const response = await revokeCertificate(certificate._id || certificate.id, reason);
      if (response.success) {
        toast.success('Chứng chỉ đã được thu hồi');
        onRevoked?.();
        onClose();
      } else {
        toast.error(response.message || 'Thu hồi thất bại');
      }
    } catch {
      toast.error('Thu hồi thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Thu hồi chứng chỉ</h2>
              <p className="text-xs text-[hsl(var(--admin-text-muted))]">Hành động này không thể hoàn tác</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
              Bạn sắp thu hồi chứng chỉ của <strong>{certificate.worker?.fullName || 'Worker'}</strong>.
              Chứng chỉ sẽ không còn hợp lệ và không thể khôi phục.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Lý do thu hồi</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Phát hiện gian lận trong quá trình học..."
              rows={3}
              className="w-full px-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                placeholder:text-[hsl(var(--admin-text-muted))]
                focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Hủy
          </Button>
          <Button
            onClick={handleRevoke}
            disabled={loading || !reason.trim()}
            className="bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 gap-2 rounded-xl"
          >
            {loading ? 'Đang thu hồi...' : 'Thu hồi chứng chỉ'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminRevokeModal;
