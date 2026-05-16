import { useState } from 'react';
import { X, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui';

const REJECTION_SUGGESTIONS = [
  'Nội dung giáo trình chưa đầy đủ',
  'Học phí không phù hợp với chất lượng',
  'Thiếu thông tin về giảng viên',
  'Mô tả khóa học chưa rõ ràng',
  'Hình thức tổ chức chưa phù hợp',
  'Thiếu yêu cầu đầu vào',
  'Chất lượng thumbnail không đạt yêu cầu',
];

const AdminCourseRejectModal = ({ course, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const handleSubmit = () => {
    if (reason.trim().length < 10) {
      return;
    }
    onConfirm({
      status: 'rejected',
      rejectionReason: reason,
      sendEmail,
    });
  };

  const isValid = reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Từ chối khóa học
              </h2>
              <p className="text-sm text-slate-500">
                Vui lòng nhập lý do từ chối
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Course Info */}
          {course && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-foreground line-clamp-2">
                {course.title}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {course.provider?.displayName || 'Không xác định'}
              </p>
            </div>
          )}

          {/* Rejection Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do từ chối khóa học (tối thiểu 10 ký tự)..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                         resize-none text-sm"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">
                {reason.length}/500 ký tự
              </p>
              {reason.length < 10 && reason.length > 0 && (
                <p className="text-xs text-red-500">
                  Cần tối thiểu 10 ký tự
                </p>
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Gợi ý:</p>
            <div className="flex flex-wrap gap-2">
              {REJECTION_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setReason(suggestion)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 
                             text-slate-600 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Send Email Option */}
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-foreground">
                Gửi email thông báo cho Trung tâm đào tạo
              </span>
            </div>
          </label>

          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Lưu ý:</strong> Sau khi từ chối, Trung tâm có thể chỉnh sửa 
              và gửi khóa học để duyệt lại.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            loading={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400"
          >
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseRejectModal;
