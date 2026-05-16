import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Textarea, Badge } from '@/components/ui';
import { DocumentUpload } from './DocumentUpload';
import { formatDeadline, formatScholarshipAmount } from '@/utils/formatter';
import { SCHOLARSHIP_COVERAGE } from '@/utils/constants';
import {
  AlertCircle, CheckCircle2, Award, BookOpen, Calendar, ChevronDown
} from 'lucide-react';

const STEP_LABELS = {
  full: 'Miễn phí 100%',
  partial: 'Tài trợ một phần',
  none: 'Tự chi trả',
};

const STEP_COLORS = {
  full: 'bg-green-100 text-green-700',
  partial: 'bg-blue-100 text-blue-700',
  none: 'bg-gray-100 text-gray-600',
};

export const ApplicationForm = ({
  scholarship,
  existingApplication,
  onSaveDraft,
  onSubmit,
  onUploadDocument,
  onRemoveDocument,
  onDelete,
  isSaving = false,
  isSubmitting = false,
}) => {
  const [motivationLetter, setMotivationLetter] = useState(
    existingApplication?.motivationLetter || ''
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    existingApplication?.courseId || ''
  );
  const [documents, setDocuments] = useState(
    existingApplication?.documents || []
  );
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const isDraft = existingApplication?.status === 'draft';
  const isEditable = isDraft;
  const alreadySubmitted = !isDraft && !!existingApplication;

  const linkedCourses = scholarship?.linkedCourses || [];
  const hasMultipleCourses = linkedCourses.length > 1;
  const selectedCourse = linkedCourses.find(
    (c) => c.courseId?.toString() === selectedCourseId?.toString()
  );

  useEffect(() => {
    if (existingApplication?.courseId) {
      setSelectedCourseId(existingApplication.courseId);
    } else if (linkedCourses.length === 1) {
      setSelectedCourseId(linkedCourses[0].courseId);
    }
  }, [existingApplication, linkedCourses]);

  const handleUpload = async (file) => {
    const result = await onUploadDocument?.(file);
    if (result) {
      setDocuments((prev) => [...prev, result]);
    }
    return result;
  };

  const handleRemove = (doc) => {
    setDocuments((prev) => prev.filter(
      (d) => (d._id || d.id) !== (doc._id || doc.id)
    ));
    onRemoveDocument?.(doc);
  };

  const handleSaveDraft = () => {
    onSaveDraft?.({
      scholarshipId: scholarship._id,
      courseId: selectedCourseId,
      motivationLetter,
    });
  };

  const handleSubmit = () => {
    onSubmit?.();
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary/5 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Nộp đơn xin học bổng
        </h3>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Scholarship summary */}
        {scholarship && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <p className="font-semibold text-sm">{scholarship.title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                {formatScholarshipAmount(scholarship.amountPerRecipient)}/người
              </span>
              {scholarship.applicationPeriod?.endDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Hạn: {formatDeadline(scholarship.applicationPeriod.endDate)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Already submitted notice */}
        {alreadySubmitted && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700">Đơn đã được nộp</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Bạn không thể chỉnh sửa đơn sau khi nộp.
              </p>
            </div>
          </div>
        )}

        {/* Course selection */}
        {hasMultipleCourses && (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Chọn khóa học <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => isEditable && setShowCourseDropdown(!showCourseDropdown)}
                disabled={!isEditable}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background text-sm text-left disabled:opacity-50"
              >
                <span>
                  {selectedCourse
                    ? `Khóa học đã chọn`
                    : '— Chọn khóa học —'}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {showCourseDropdown && isEditable && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  {linkedCourses.map((lc) => {
                    const cov = lc.coverage || SCHOLARSHIP_COVERAGE.PARTIAL;
                    return (
                      <button
                        key={lc.courseId}
                        onClick={() => {
                          setSelectedCourseId(lc.courseId);
                          setShowCourseDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-muted ${
                          selectedCourseId === lc.courseId ? 'bg-primary/5 text-primary font-medium' : ''
                        }`}
                      >
                        <span>{lc.courseId}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${STEP_COLORS[cov]}`}>
                          {STEP_LABELS[cov]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Motivation letter */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Thư xin học bổng
            <span className="text-muted-foreground font-normal ml-1">(tối đa 1000 ký tự)</span>
          </label>
          <Textarea
            value={motivationLetter}
            onChange={(e) => setMotivationLetter(e.target.value)}
            disabled={!isEditable}
            placeholder="Giới thiệu bản thân và lý do bạn xứng đáng nhận học bổng này..."
            rows={5}
            maxLength={1000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {motivationLetter.length}/1000
          </p>
        </div>

        {/* Document upload */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Tài liệu đính kèm
          </label>
          <DocumentUpload
            documents={documents}
            onUpload={handleUpload}
            onRemove={handleRemove}
            readOnly={!isEditable}
          />
          {documents.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Chưa có tài liệu nào. Nên có: CMND/CCCD, giấy tờ chứng minh thu nhập.
            </p>
          )}
        </div>

        {/* Actions */}
        {isEditable && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            {onSubmit && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedCourseId}
                className="w-full gap-1"
              >
                {isSubmitting ? 'Đang nộp...' : 'Nộp đơn'}
              </Button>
            )}
            {onSaveDraft && (
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                onClick={onDelete}
                disabled={isSaving || isSubmitting}
                className="w-full text-destructive hover:text-destructive"
              >
                Xóa đơn
              </Button>
            )}
          </div>
        )}

        {!existingApplication && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Đơn sẽ được lưu dưới dạng <strong>nháp</strong>. Bạn có thể chỉnh sửa và nộp sau.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
