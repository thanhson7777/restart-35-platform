import React, { useState } from 'react';
import { Star, Send, Clock, CheckCircle2 } from 'lucide-react';
import { Avatar, Badge, Button, Textarea } from '@/components/ui';
import { respondToReview } from '@/apis/courseApi';
import toast from 'react-hot-toast';

const MAX_RESPONSE_LENGTH = 300;

const StarRating = ({ rating, maxStars = 5 }) => {
  const actualRating = typeof rating === 'number' ? rating : (rating?.overall || 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          size={15}
          className={`${
            i < actualRating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-transparent text-slate-600'
          }`}
        />
      ))}
    </div>
  );
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

export const TrainerReviewCard = ({ review, onResponse, loading = false }) => {
  const [responseText, setResponseText] = useState(review.trainerResponse?.text || '');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const hasResponse = !!review.trainerResponse?.text;
  const remainingChars = MAX_RESPONSE_LENGTH - responseText.length;
  const isOverLimit = remainingChars < 0;

  const handleResponse = async () => {
    if (!responseText.trim() || isOverLimit) return;

    setSubmitting(true);
    try {
      await respondToReview(review._id, {
        responseText: responseText.trim(),
        courseId: review.courseId || review.course?._id
      });
      toast.success('Gửi phản hồi thành công!');
      onResponse?.(review._id, responseText.trim());
    } catch (err) {
      console.error('Error responding to review:', err);
      toast.error(
        err.response?.data?.message || 'Không thể gửi phản hồi. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden flex flex-col transition-all duration-200 hover:border-slate-700">
      {/* Card Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Stars + Rating */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <StarRating rating={review.rating || 0} />
              <span className="text-xs font-bold text-yellow-400">
                {(review.rating?.overall || 0).toFixed(1)}/5
              </span>
            </div>

            {/* Course + Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs font-semibold px-2 py-0.5 rounded-md">
                  {review.course?.title || 'Khóa học'}
                </Badge>
                {hasResponse ? (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs font-semibold px-2 py-0.5 rounded-md gap-1">
                    <CheckCircle2 size={11} />
                    Đã phản hồi
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs font-semibold px-2 py-0.5 rounded-md gap-1">
                    <Clock size={11} />
                    Chưa phản hồi
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={12} />
                {formatDate(review.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Text */}
      <div className="px-5 pt-4 pb-3">
        <blockquote className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-blue-500/40 pl-3">
          "{review.content || review.text || 'Không có nội dung đánh giá.'}"
        </blockquote>
      </div>

      {/* Reviewer Info */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Avatar
            src={review.user?.avatar}
            alt={review.user?.displayName}
            fallback={review.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            size="sm"
            className="bg-slate-800 text-slate-300 ring-1 ring-slate-700"
          />
          <div>
            <p className="text-sm font-semibold text-white">
              {review.user?.displayName || 'Học viên'}
            </p>
            {review.user?.email && (
              <p className="text-xs text-slate-500">{review.user.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Trainer Response Section */}
      <div className="border-t border-slate-800 px-5 py-4 bg-slate-900/30">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phản hồi của Trainer</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {hasResponse ? (
            /* Already responded */
            <div className="space-y-2">
              <div className="text-sm text-slate-300 leading-relaxed border-l-2 border-emerald-500/40 pl-3 py-1 bg-emerald-500/5 rounded-r-lg">
                {review.trainerResponse.text}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Phản hồi ngày: {formatDate(review.trainerResponse.createdAt)}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                >
                  Sửa phản hồi
                </button>
              </div>
            </div>
          ) : (
            /* Not responded yet — show form */
            <div className="space-y-2">
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Viết phản hồi của bạn cho đánh giá này..."
                rows={3}
                maxLength={MAX_RESPONSE_LENGTH + 50}
                className="bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-600 resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isOverLimit ? 'text-red-400' : remainingChars < 50 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {remainingChars < 0
                    ? `Vượt quá ${Math.abs(remainingChars)} ký tự`
                    : `${remainingChars} ký tự còn lại`}
                </p>
                <Button
                  size="sm"
                  onClick={handleResponse}
                  disabled={!responseText.trim() || isOverLimit || submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-xs font-semibold gap-1.5 px-3 py-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Gửi phản hồi
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
