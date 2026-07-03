import { useState } from 'react';
import { X, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui';

const REJECTION_SUGGESTIONS = [
  'Nội dung giáo trình chưa đầy đủ',
  'Học phí không phù hợp với chất lượng',
  'Thiếu thông tin về Trung tâm đào tạo',
  'Mô tả khóa học chưa rõ ràng',
  'Hình thức tổ chức chưa phù hợp',
  'Thiếu yêu cầu đầu vào',
  'Chất lượng thumbnail không đạt yêu cầu',
];

const AdminCourseRejectModal = ({ course, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const handleSubmit = () => {
    if (reason.trim().length < 10) return;
    onConfirm({ status: 'rejected', rejectionReason: reason, sendEmail });
  };

  const isValid = reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Từ chối khóa học</h2>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">Vui lòng nhập lý do từ chối</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {course && (
            <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
              <p className="font-medium text-[hsl(var(--admin-text-primary))] line-clamp-2">{course.title}</p>
              <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1">{course.provider?.displayName || 'Không xác định'}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do từ chối khóa học (tối thiểu 10 ký tự)..."
              rows={4}
              className="w-full px-4 py-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl text-[hsl(var(--admin-text-primary))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/30 focus:border-[hsl(var(--admin-accent))]/50 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-[hsl(var(--admin-text-muted))]">{reason.length}/500 ký tự</p>
              {reason.length < 10 && reason.length > 0 && (
                <p className="text-xs text-rose-500">Cần tối thiểu 10 ký tự</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Gợi ý:</p>
            <div className="flex flex-wrap gap-2">
              {REJECTION_SUGGESTIONS.map((suggestion, index) => (
                <button key={index} onClick={() => setReason(suggestion)}
                  className="px-3 py-1.5 text-xs bg-[hsl(var(--admin-surface-elevated))] hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))] rounded-full transition-colors">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-border))] rounded focus:ring-[hsl(var(--admin-accent))]/30 bg-[hsl(var(--admin-surface-elevated))]"
            />
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
              <span className="text-sm text-[hsl(var(--admin-text-secondary))]">Gửi email thông báo cho Trung tâm đào tạo</span>
            </div>
          </label>

          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-sm text-amber-500">
              <strong>Lưu ý:</strong> Sau khi từ chối, Trung tâm có thể chỉnh sửa và gửi khóa học để duyệt lại.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className="border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Hủy bỏ
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading}
            className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 rounded-xl">
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseRejectModal;
