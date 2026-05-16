import { Card, Button, Textarea } from '@/components/ui';
import { EligibilityIndicator } from '@/components/shared/EligibilityIndicator';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Users } from 'lucide-react';

export const CourseEnrollmentForm = ({
  course,
  eligibility,
  existingEnrollment,
  onSubmit,
  isSubmitting,
}) => {
  const [motivation, setMotivation] = useState('');
  const [scholarshipId, setScholarshipId] = useState('');

  const isEligible = eligibility?.eligible !== false;
  const hasEnrollment = !!existingEnrollment;
  const isWaitlistAvailable = eligibility?.waitlistAvailable === true;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEligible && !isWaitlistAvailable) {
      toast.error('Bạn không đủ điều kiện đăng ký khóa học này');
      return;
    }

    try {
      await onSubmit({
        courseId: course._id,
        motivation: motivation.trim() || undefined,
        scholarshipId: scholarshipId || undefined,
        source: scholarshipId ? 'scholarship' : 'direct',
      });
    } catch (err) {
      // Error handled by caller
    }
  };

  // Already enrolled state
  if (hasEnrollment) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xl">✅</span>
          </div>
          <div>
            <p className="font-semibold">Bạn đã đăng ký khóa học này</p>
            <p className="text-sm text-muted-foreground">
              Xem tiến độ học tập của bạn
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = `/my-enrollments`}
        >
          Xem khóa học của tôi
        </Button>
      </Card>
    );
  }

  // Not eligible state
  if (!isEligible && !isWaitlistAvailable) {
    return (
      <Card className="p-6">
        <EligibilityIndicator eligibility={eligibility} />
        <p className="text-sm text-muted-foreground mt-3 text-center">
          Vui lòng hoàn thiện hồ sơ hoặc chọn khóa học khác phù hợp hơn.
        </p>
      </Card>
    );
  }

  // Enrollment form
  return (
    <Card className="p-6">
      <EligibilityIndicator eligibility={eligibility} />

      {/* Capacity warning */}
      {isWaitlistAvailable && eligibility?.currentCapacity && (
        <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
          <Users className="w-4 h-4" />
          Lớp đã đầy ({eligibility.currentCapacity}). Bạn sẽ được xếp vào danh sách chờ.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Motivation letter */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Thư động lực <span className="text-muted-foreground">(tùy chọn)</span>
          </label>
          <Textarea
            placeholder="Chia sẻ lý do bạn muốn tham gia khóa học này..."
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {motivation.length}/500
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span>Đang xử lý...</span>
          ) : isWaitlistAvailable ? (
            'Đăng ký + Xếp chờ'
          ) : (
            'Đăng ký ngay'
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Bằng cách đăng ký, bạn đồng ý với điều khoản sử dụng của nền tảng.
        </p>
      </form>
    </Card>
  );
};
