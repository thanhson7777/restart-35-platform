import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { EnrollmentStatus } from '@/components/shared/EnrollmentStatus';
import { formatDate, formatPrice } from '@/utils/formatter';
import { Calendar, MapPin, BookOpen, PlayCircle, ShieldAlert, Award } from 'lucide-react';
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';
import { DropoutRiskBadge } from './DropoutRiskBadge';
import { PaymentTracker } from './PaymentTracker';
import { VideoProgressDetail } from './VideoProgressDetail';
import { LiveProgressDetail } from './LiveProgressDetail';
import { OfflineProgressDetail } from './OfflineProgressDetail';
import { BlendedProgressDetail } from './BlendedProgressDetail';

export const EnrollmentCard = ({
  enrollment,
  onCancel,
  onViewProgress,
  onViewDetail,
}) => {
  const navigate = useNavigate();
  const {
    _id,
    course,
    status,
    progress,
    fee,
    scholarship,
    enrolledAt,
    startDate,
    dropoutRisk = 'low', // Default fallback
    installments = [],
  } = enrollment;

  const isActive = ['enrolled', 'in_progress'].includes(status);
  const isCancellable = ['enrolled', 'pending', 'waitlist'].includes(status);
  
  const deliveryType = course?.delivery_type || 'video';
  const fundingModel = course?.funding_model || 'free';

  // Render type-specific progress panel
  const renderProgressDetail = () => {
    if (!progress || !['in_progress', 'completed'].includes(status)) return null;

    switch (deliveryType) {
      case 'video':
        return <VideoProgressDetail enrollment={enrollment} />;
      case 'live':
        return <LiveProgressDetail enrollment={enrollment} />;
      case 'offline':
        return <OfflineProgressDetail enrollment={enrollment} />;
      case 'blended':
        return <BlendedProgressDetail enrollment={enrollment} />;
      default:
        return <VideoProgressDetail enrollment={enrollment} />;
    }
  };

  return (
    // Double-Bezel nested hardware shell wrapper
    <div className="group p-1.5 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/85 transition-all duration-300 hover:shadow-md">
      <Card
        variant="interactive"
        className="rounded-[18px] bg-white dark:bg-zinc-950 overflow-hidden border border-zinc-150/60 dark:border-zinc-900 shadow-sm flex flex-col md:flex-row gap-5 p-5"
        onClick={onViewDetail}
      >
        {/* Course Thumbnail */}
        <div className="md:w-48 aspect-[16/10] shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 relative">
          {course?.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <BookOpen className="w-10 h-10 stroke-[1.5]" />
            </div>
          )}
          
          {/* Risk Badge overlayed on image */}
          {status === 'in_progress' && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <DropoutRiskBadge risk={dropoutRisk} />
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3.5">
          <div>
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {deliveryType && (
                <DeliveryTypeBadge deliveryType={deliveryType} size="sm" />
              )}
              {fundingModel && (
                <FundingModelChip fundingModel={fundingModel} size="sm" />
              )}
              <div className="ml-auto shrink-0">
                <EnrollmentStatus status={status} />
              </div>
            </div>

            {/* Course Title */}
            <h3 className="font-bold text-base text-zinc-900 dark:text-white line-clamp-1 leading-snug group-hover:text-primary transition-colors">
              {course?.title || 'Khóa học chưa đặt tên'}
            </h3>

            {/* Instructor / Provider */}
            {course?.provider && (
              <p className="text-xs text-zinc-450 dark:text-zinc-500 font-semibold mt-1">
                Đơn vị đào tạo: {course.provider.displayName}
              </p>
            )}
          </div>

          {/* Progress Section */}
          <div className="pt-1">
            {renderProgressDetail()}
          </div>

          {/* Payment Tracker Section (only for learner_paid and if installments exist) */}
          {fundingModel === 'learner_paid' && installments?.length > 0 && (
            <PaymentTracker
              installments={installments}
              enrollmentId={_id}
              courseId={course?._id || enrollment.courseId}
              onPaymentSuccess={() => window.location.reload()}
            />
          )}

          {/* Info row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-xs text-zinc-450 dark:text-zinc-500 font-medium">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {enrolledAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Ghi danh: {formatDate(enrolledAt)}
                </span>
              )}
              {course?.location?.type && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {course.location.type === 'online'
                    ? 'Lớp trực tuyến'
                    : course.location.type === 'offline'
                    ? 'Lớp tại cơ sở'
                    : 'Kết hợp Hybrid'}
                </span>
              )}
            </div>

            {/* Actions panel */}
            <div className="flex items-center gap-2">
              {isActive && onViewProgress && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs font-bold rounded-xl px-4 py-2 shadow-sm gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProgress(enrollment);
                  }}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Xem tiến độ học
                </Button>
              )}
              {status === 'completed' && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs font-bold rounded-xl px-4 py-2 shadow-sm gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/my-enrollments/${_id}/certificate`);
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  Xem chứng chỉ
                </Button>
              )}
              {isCancellable && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(enrollment);
                  }}
                >
                  Hủy đăng ký
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
