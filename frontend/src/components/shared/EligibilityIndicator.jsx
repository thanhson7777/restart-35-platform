import { Alert, AlertDescription } from '@/components/ui';
import { CheckCircle2, AlertTriangle, XCircle, Clock, BookOpen } from 'lucide-react';

export const EligibilityIndicator = ({ eligibility }) => {
  if (!eligibility) return null;

  if (eligibility.eligible === false) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-700">{eligibility.reason}</p>
          {(eligibility.missingPrerequisites || eligibility.prerequisiteWarnings)?.length > 0 && (
            <p className="text-sm text-red-600 mt-1">
              Cần hoàn thành: {(eligibility.missingPrerequisites || eligibility.prerequisiteWarnings).join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Prerequisite warnings — amber, non-blocking
  if (eligibility.prerequisiteWarnings?.length > 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <BookOpen className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-700">
            Bạn chưa hoàn thành khóa tiên quyết
          </p>
          <p className="text-sm text-amber-600 mt-1">
            Nên hoàn thành trước: {eligibility.prerequisiteWarnings.join(', ')}
          </p>
          <p className="text-sm text-amber-500 mt-1">
            Bạn vẫn có thể đăng ký, nhưng nền tảng có thể khó hơn.
          </p>
        </div>
      </div>
    );
  }

  if (eligibility.warning) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-700">{eligibility.warning}</p>
          {eligibility.suggestion && (
            <p className="text-sm text-amber-600 mt-1">{eligibility.suggestion}</p>
          )}
        </div>
      </div>
    );
  }

  if (eligibility.waitlistAvailable) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-700">
            Lớp đã đầy ({eligibility.currentCapacity})
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Bạn sẽ được xếp vào danh sách chờ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      <p className="font-medium text-green-700">Đủ điều kiện đăng ký</p>
    </div>
  );
};
