import { Eye } from 'lucide-react';
import { Skeleton, SafeImage } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const ratingStars = (rating) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};

const PendingReviewCard = ({ review, onModerate }) => {
  if (!review) return null;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 border-b border-[hsl(var(--admin-border))]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <SafeImage
              src={review.worker?.avatar || 'https://picsum.photos/seed/user/60/60'}
              alt={review.worker?.fullName || 'User'}
              className="w-10 h-10 rounded-full object-cover bg-[hsl(var(--admin-surface-elevated))]"
            />
            <div>
              <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))]">
                {review.worker?.fullName || 'Anonymous'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {ratingStars(review.rating || 0)}
                <span className="text-xs text-[hsl(var(--admin-text-muted))]">
                  {formatDate(review.createdAt || review.submittedAt)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onModerate?.(review)}
            className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
            title="Xem và duyệt"
          >
            <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {review.course && (
          <div className="flex items-center gap-2 mb-3">
            <SafeImage
              src={review.course.thumbnail || 'https://picsum.photos/seed/course/60/40'}
              alt={review.course.title}
              className="w-10 h-7 rounded object-cover bg-[hsl(var(--admin-surface-elevated))]"
            />
            <p className="text-sm text-[hsl(var(--admin-text-secondary))] truncate max-w-[200px]">
              {review.course.title || review.courseId}
            </p>
          </div>
        )}

        {review.content && (
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] line-clamp-3 leading-relaxed">
            {review.content}
          </p>
        )}

        {review.trainerResponse && (
          <div className="mt-3 p-3 bg-[hsl(var(--admin-surface-elevated))] rounded-xl">
            <p className="text-xs font-medium text-[hsl(var(--admin-text-muted))] mb-1">Phản hồi từ Trainer:</p>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{review.trainerResponse}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-end gap-2">
        <button
          onClick={() => onModerate?.(review, 'reject')}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
        >
          Từ chối
        </button>
        <button
          onClick={() => onModerate?.(review, 'approve')}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
        >
          Duyệt
        </button>
      </div>
    </div>
  );
};

const AdminReviewModerationList = ({ reviews, loading, onModerate }) => {
  if (!loading && reviews.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
        <svg className="w-12 h-12 text-[hsl(var(--admin-text-muted))] opacity-30 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-[hsl(var(--admin-text-muted))] font-medium">Không có review nào chờ duyệt</p>
        <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tất cả reviews đã được kiểm duyệt</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden p-5">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reviews.map((review) => (
        <PendingReviewCard
          key={review._id || review.id}
          review={review}
          onModerate={onModerate}
        />
      ))}
    </div>
  );
};

export default AdminReviewModerationList;
