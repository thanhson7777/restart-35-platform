import { Card, Badge, Button } from '@/components/ui';
import { ApplicationStatus } from '@/components/shared/ApplicationStatus';
import { formatDate, formatPrice } from '@/utils/formatter';
import { FileText, CheckCircle2, XCircle, BookOpen, Send, Trash2, Eye } from 'lucide-react';

const VERIFIED_DOC_LABELS = {
  verified: 'Đã xác minh',
  pending: 'Chưa xác minh',
};

export const ApplicationCard = ({
  application,
  onView,
  onCancel,
  onSubmit,
}) => {
  if (!application) return null;

  const {
    scholarship,
    course,
    status,
    motivationLetter,
    documents,
    approvedAmount,
    submittedAt,
    createdAt,
  } = application;

  const isDraft = status === 'draft';
  const isCancellable = ['draft'].includes(status);
  const canSubmit = isDraft;

  const verifiedCount = documents?.filter((d) => d.verified)?.length || 0;
  const totalDocs = documents?.length || 0;

  return (
    <Card
      variant="interactive"
      className="overflow-hidden"
      onClick={onView}
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
            <div className="min-w-0">
              {/* Course title */}
              <h3 className="font-semibold text-sm line-clamp-1">
                {course?.title || 'Khóa học'}
              </h3>
              {/* Scholarship title */}
              {scholarship?.title && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/40" />
                  {scholarship.title}
                </p>
              )}
            </div>
            <ApplicationStatus status={status} />
          </div>

          {/* Approved amount */}
          {approvedAmount && status === 'approved' && (
            <div className="mb-2">
              <span className="text-sm font-medium text-green-600">
                Được tài trợ: {formatPrice(approvedAmount)}
              </span>
            </div>
          )}

          {/* Motivation preview */}
          {motivationLetter && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              "{motivationLetter}"
            </p>
          )}

          {/* Documents checklist */}
          {totalDocs > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {totalDocs} tài liệu
              </span>
              {verifiedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {verifiedCount} đã xác minh
                </span>
              )}
              {verifiedCount < totalDocs && (
                <span className="flex items-center gap-1 text-amber-600">
                  <XCircle className="w-3.5 h-3.5" />
                  {totalDocs - verifiedCount} chưa xác minh
                </span>
              )}
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-muted-foreground mb-3">
            {submittedAt
              ? `Đã nộp: ${formatDate(submittedAt)}`
              : `Tạo: ${formatDate(createdAt)}`}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onView?.(application); }}
              className="gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              Chi tiết
            </Button>
            {canSubmit && onSubmit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onSubmit?.(application); }}
                className="gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Nộp đơn
              </Button>
            )}
            {isCancellable && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onCancel?.(application); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa đơn
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
