import { Card, Button } from '@/components/ui';
import { EnrollmentStatus } from '@/components/shared/EnrollmentStatus';
import { ProgressBar } from '@/components/enrollment/ProgressBar';
import { formatDate, formatPrice } from '@/utils/formatter';
import { Calendar, Clock, MapPin, BookOpen } from 'lucide-react';

export const EnrollmentCard = ({
  enrollment,
  onCancel,
  onViewProgress,
  onViewDetail,
}) => {
  const {
    _id,
    course,
    status,
    progress,
    fee,
    scholarship,
    enrolledAt,
    startDate,
  } = enrollment;

  const isActive = ['enrolled', 'in_progress'].includes(status);
  const isCancellable = ['enrolled', 'pending', 'waitlist'].includes(status);

  return (
    <Card
      variant="interactive"
      className="overflow-hidden"
      onClick={onViewDetail}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Thumbnail */}
        <div className="sm:w-40 sm:h-28 shrink-0">
          {course?.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-32 sm:h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-32 sm:h-full bg-muted rounded-lg flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base line-clamp-1">
              {course?.title || 'Khóa học'}
            </h3>
            <EnrollmentStatus status={status} />
          </div>

          {course?.provider && (
            <p className="text-sm text-muted-foreground mb-2">
              {course.provider.displayName}
            </p>
          )}

          {/* Progress bar (for in_progress/completed) */}
          {progress && ['in_progress', 'completed'].includes(status) && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Tiến độ</span>
                <span>{progress.percentage || 0}%</span>
              </div>
              <ProgressBar percentage={progress.percentage || 0} size="sm" />
              {progress.currentLesson && progress.totalLessons && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bài {progress.currentLesson}/{progress.totalLessons}
                </p>
              )}
            </div>
          )}

          {/* Info row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
            {enrolledAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(enrolledAt)}
              </span>
            )}
            {course?.location?.type && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {course.location.type === 'online'
                  ? 'Trực tuyến'
                  : course.location.type === 'offline'
                  ? 'Tại lớp'
                  : 'Kết hợp'}
              </span>
            )}
          </div>

          {/* Fee & Scholarship */}
          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
            {fee && (
              <span className="font-medium">
                {formatPrice(fee.total)}
              </span>
            )}
            {scholarship?.coverage && scholarship.coverage !== 'none' && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                Học bổng {scholarship.coverage === 'full' ? '100%' : '50%'}
              </span>
            )}
            {scholarship?.fundedAmount > 0 && (
              <span className="text-xs text-green-600">
                Đã tài trợ: {formatPrice(scholarship.fundedAmount)}
              </span>
            )}
          </div>

          {/* Actions */}
          {isActive && onViewProgress && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewProgress(enrollment);
              }}
            >
              Xem tiến độ
            </Button>
          )}
          {isCancellable && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive ml-2"
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
    </Card>
  );
};
