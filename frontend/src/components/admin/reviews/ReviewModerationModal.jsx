import { X, User, BookOpen, Flag } from 'lucide-react';
import { Button, SafeImage } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { moderateReview, addReviewResponse } from '@/apis';

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi }); }
  catch { return '-'; }
};

const ratingStars = (rating) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`w-4 h-4 ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

const ReviewModerationModal = ({ review, open, onClose, onModerated }) => {
  const [action, setAction] = useState('pending');
  const [reason, setReason] = useState('');
  const [trainerResponse, setTrainerResponse] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open || !review) return null;

  const handleModerate = async () => {
    if (action === 'reject' && !reason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setLoading(true);
      const response = await moderateReview(review._id || review.id, {
        action,
        reason: action === 'reject' ? reason : undefined,
      });
      if (response.success) {
        toast.success(action === 'approve' ? 'Review đã được duyệt' : 'Review đã bị từ chối');
        onModerated?.();
        onClose();
      } else {
        toast.error(response.message || 'Thao tác thất bại');
      }
    } catch {
      toast.error('Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainerResponse = async () => {
    if (!trainerResponse.trim()) {
      toast.error('Vui lòng nhập phản hồi');
      return;
    }
    try {
      setLoading(true);
      const response = await addReviewResponse(review._id || review.id, { response: trainerResponse });
      if (response.success) {
        toast.success('Phản hồi đã được gửi');
        onModerated?.();
        onClose();
      } else {
        toast.error(response.message || 'Gửi phản hồi thất bại');
      }
    } catch {
      toast.error('Gửi phản hồi thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Kiểm duyệt Review</h2>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{formatDate(review.createdAt || review.submittedAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Worker + Course info */}
          <div className="flex items-start gap-4">
            <SafeImage
              src={review.worker?.avatar || 'https://picsum.photos/seed/user/60/60'}
              alt={review.worker?.fullName || 'User'}
              className="w-12 h-12 rounded-full object-cover bg-[hsl(var(--admin-surface-elevated))] flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-[hsl(var(--admin-text-primary))]">
                  {review.worker?.fullName || 'Anonymous'}
                </p>
                {ratingStars(review.rating || 0)}
              </div>
              {review.course && (
                <div className="flex items-center gap-2 mt-1">
                  <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--admin-text-muted))]" />
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] truncate">
                    {review.course.title || review.courseId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Review content */}
          <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
            <h4 className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mb-2">Nội dung review</h4>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))] leading-relaxed">
              {review.content || '(Không có nội dung)'}
            </p>
          </div>

          {/* Trainer response existing */}
          {review.trainerResponse && (
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <p className="text-xs font-medium text-blue-500 mb-1">Phản hồi của Trainer:</p>
              <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{review.trainerResponse}</p>
            </div>
          )}

          {/* Moderation action */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[hsl(var(--admin-text-primary))]">Hành động kiểm duyệt</h4>
            <div className="flex gap-3">
              <button
                onClick={() => setAction('approve')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  action === 'approve'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                    : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:border-emerald-300'
                }`}
              >
                Duyệt review
              </button>
              <button
                onClick={() => setAction('reject')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  action === 'reject'
                    ? 'border-rose-500 bg-rose-50 text-rose-600'
                    : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:border-rose-300'
                }`}
              >
                Từ chối
              </button>
              <button
                onClick={() => setAction('flag')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  action === 'flag'
                    ? 'border-amber-500 bg-amber-50 text-amber-600'
                    : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:border-amber-300'
                }`}
              >
                Đánh dấu
              </button>
            </div>

            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Lý do từ chối</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nội dung không phù hợp với tiêu chuẩn cộng đồng..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl
                    bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                    placeholder:text-[hsl(var(--admin-text-muted))]
                    focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none text-sm"
                />
              </div>
            )}

            {action === 'flag' && (
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Ghi chú (tùy chọn)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ghi chú cho đội ngũ kiểm duyệt..."
                  rows={2}
                  className="w-full px-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl
                    bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                    placeholder:text-[hsl(var(--admin-text-muted))]
                    focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none text-sm"
                />
              </div>
            )}

            {/* Trainer response input */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">
                Phản hồi từ Trainer (tùy chọn)
              </label>
              <textarea
                value={trainerResponse}
                onChange={(e) => setTrainerResponse(e.target.value)}
                placeholder="Viết phản hồi thay trainer..."
                rows={3}
                className="w-full px-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  placeholder:text-[hsl(var(--admin-text-muted))]
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Đóng
          </Button>
          {trainerResponse.trim() ? (
            <Button onClick={handleTrainerResponse} disabled={loading} className="gap-2 rounded-xl">
              <Flag className="w-4 h-4" />
              {loading ? 'Đang gửi...' : 'Gửi phản hồi'}
            </Button>
          ) : (
            <Button
              onClick={handleModerate}
              disabled={loading || (action === 'reject' && !reason.trim())}
              className={`gap-2 rounded-xl ${
                action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' :
                action === 'reject' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'
              } text-white`}
            >
              {loading ? 'Đang xử lý...' :
                action === 'approve' ? 'Duyệt review' :
                action === 'reject' ? 'Từ chối review' : 'Đánh dấu'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModerationModal;
