import React, { useState, useEffect } from 'react';
import { Card, Button, Textarea } from '@/components/ui';
import { EligibilityIndicator } from '@/components/shared/EligibilityIndicator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { getMyEnrollments } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { Users, AlertTriangle, BookOpen, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ENROLLMENT_SOURCE } from '@/utils/constants';

// Import Funding Sidebar sub-cards
import { FundingSidebarFreeCard } from './FundingSidebarFreeCard';
import { FundingSidebarISACard } from './FundingSidebarISACard';
import { FundingSidebarPaymentCard } from './FundingSidebarPaymentCard';
import { FundingSidebarEnterpriseCard } from './FundingSidebarEnterpriseCard';

const MAX_CONCURRENT_ENROLLMENTS = 3;

export const CourseEnrollmentForm = ({
  course,
  eligibility,
  existingEnrollment,
  sponsorships = [],
  onSubmit,
  isSubmitting,
}) => {
  const currentUser = useSelector(selectCurrentUser);
  const [motivation, setMotivation] = useState('');
  const [activeCount, setActiveCount] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(false);

  const isEligible = eligibility?.eligible !== false;
  const hasEnrollment = !!existingEnrollment;
  const isWaitlistAvailable = eligibility?.waitlistAvailable === true;
  const { funding_model: rawFundingModel, delivery_type, fundingConfig, isFree, fee } = course || {};

  const actualIsFree = fundingConfig?.type === 'FREE' || isFree || fee === 0;
  const funding_model = actualIsFree 
    ? 'free' 
    : (rawFundingModel === 'free' ? 'learner_paid' : (rawFundingModel || (fundingConfig?.type === 'PAID' ? 'learner_paid' : 'learner_paid')));

  const isVideoCourse = delivery_type === 'video';
  const activeSponsor = sponsorships?.length > 0 ? sponsorships[0] : null;
  const isEnterpriseSponsored = activeSponsor?.sponsorType === 'enterprise';
  const isNgoSponsored = activeSponsor?.sponsorType === 'ngo';

  const shouldShowMotivation = !isVideoCourse || isEnterpriseSponsored || isNgoSponsored;

  let motivationOptions = [
    'Muốn chuyển đổi sang nghề nghiệp ổn định hơn',
    'Đang thất nghiệp, cần việc làm sau khóa học',
    'Muốn nâng cao kỹ năng để thăng tiến',
  ];

  if (isEnterpriseSponsored) {
    motivationOptions = [
      'Muốn ứng tuyển vào doanh nghiệp tài trợ sau khóa học',
      'Cam kết hoàn thành khóa học để nhận việc',
      'Mong muốn học hỏi quy trình thực tế từ doanh nghiệp',
    ];
  } else if (isNgoSponsored) {
    motivationOptions = [
      'Đang gặp khó khăn tài chính, cần hỗ trợ học phí',
      'Thuộc nhóm yếu thế cần hỗ trợ chuyển đổi nghề',
      'Rất quyết tâm học nhưng chưa đủ điều kiện kinh tế',
    ];
  }

  // Fetch active enrollments to verify limit limits
  useEffect(() => {
    const fetchActiveCount = async () => {
      if (currentUser && !hasEnrollment) {
        setCheckingLimit(true);
        try {
          const res = await getMyEnrollments({ status: 'in_progress' });
          const list = Array.isArray(res.data) 
            ? res.data 
            : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];
          setActiveCount(list.length);
        } catch (err) {
          console.error('Error fetching active enrollments count:', err);
        } finally {
          setCheckingLimit(false);
        }
      }
    };
    fetchActiveCount();
  }, [currentUser, hasEnrollment]);

  // Handle submit logic from child cards
  const handleEnrollSubmit = async (additionalData = {}) => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để đăng ký khóa học.');
      return;
    }

    if (activeCount >= MAX_CONCURRENT_ENROLLMENTS) {
      toast.error(`Bạn đã đăng ký tối đa ${MAX_CONCURRENT_ENROLLMENTS} khóa học đang hoạt động.`);
      return;
    }

    try {
      await onSubmit({
        courseId: course._id,
        motivation: motivation.trim() || undefined,
        source: additionalData?.source || (
          course?.linkedPartnershipId
          ? ENROLLMENT_SOURCE.ENTERPRISE_LINKED
          : ENROLLMENT_SOURCE.DIRECT
        ),
        ...additionalData, // Pass fundingModel, method, voucherCode if any
      });
    } catch (err) {
      // Handled by parent caller
    }
  };

  // ─── 1. Already Enrolled Layout ───────────────────────────────────────────
  if (hasEnrollment) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white text-base">
              Đã ghi danh thành công
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[22ch] mx-auto leading-relaxed">
              Bạn đang học khóa học này. Hãy tiếp tục lộ trình học tập của mình nhé!
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full py-4 text-xs font-bold rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950 text-zinc-900 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-zinc-100"
            onClick={() => window.location.href = `/my-enrollments`}
          >
            Vào lớp học của tôi
          </Button>
        </div>
      </div>
    );
  }

  // ─── 2. Not Eligible Layout ──────────────────────────────────────────────
  if (!isEligible && !isWaitlistAvailable) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 shadow-sm space-y-4">
          <EligibilityIndicator eligibility={eligibility} />
          <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed text-center">
            Bạn chưa đạt tiêu chuẩn để ghi danh chương trình này. Vui lòng hoàn thiện hồ sơ cá nhân hoặc chọn khóa học khác phù hợp hơn.
          </p>
        </div>
      </div>
    );
  }

  // Determine which sidebar card version to render based on funding model
  const renderFundingSidebar = () => {
    const isLimitReached = activeCount >= MAX_CONCURRENT_ENROLLMENTS;

    switch (funding_model) {
      case 'free':
        const activeSponsor = sponsorships.length > 0 ? sponsorships[0] : null;

        if (activeSponsor && activeSponsor.sponsorType === 'enterprise') {
          const quota = activeSponsor.guaranteedPlacements;
          const used = activeSponsor.stats?.approvedLearners || 0;
          const remaining = quota ? Math.max(0, quota - used) : null;
          
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">Tài trợ bởi Doanh nghiệp</p>
                <p className="text-xs text-blue-800 dark:text-blue-400/80 mb-3">Bạn sẽ được học miễn phí và cam kết phỏng vấn nhận việc sau khi hoàn thành.</p>
                
                {remaining !== null && (
                  <div className="flex items-center justify-between text-[11px] font-bold bg-white dark:bg-zinc-950 px-3 py-2 rounded-lg text-blue-600 dark:text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/20">
                    <span>Số suất cam kết:</span>
                    <span>Còn {remaining}/{quota} suất</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => handleEnrollSubmit({ source: 'enterprise_sponsored', sponsorshipId: activeSponsor._id })}
                disabled={isSubmitting || isLimitReached || (remaining !== null && remaining <= 0)}
                className="w-full py-5 rounded-full text-xs font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                {isSubmitting ? 'Đang xử lý...' : remaining === 0 ? 'Đã hết suất tài trợ' : '🔥 Nhận tài trợ & Giữ chỗ'}
              </Button>
            </div>
          );
        }

        if (activeSponsor && activeSponsor.sponsorType === 'ngo') {
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-sm font-semibold text-blue-900 mb-1">Tài trợ bởi NGO</p>
                <p className="text-xs text-blue-800">Khóa học này đang được tài trợ. Đăng ký của bạn sẽ được gửi cho tổ chức xét duyệt.</p>
              </div>
              <Button
                onClick={() => handleEnrollSubmit({ source: 'ngo_sponsored', sponsorshipId: sponsorships[0]._id })}
                disabled={isSubmitting || isLimitReached}
                className="w-full py-5 rounded-full text-xs font-bold shadow-sm bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Đang gửi...' : 'Đăng ký xét duyệt tài trợ'}
              </Button>
            </div>
          );
        }
        return (
          <FundingSidebarFreeCard
            course={course}
            onSubmit={handleEnrollSubmit}
            isSubmitting={isSubmitting}
            isLimitReached={isLimitReached}
          />
        );
      case 'isa':
        return (
          <FundingSidebarISACard
            course={course}
            eligibility={eligibility}
            onSubmit={handleEnrollSubmit}
            isSubmitting={isSubmitting}
            isLimitReached={isLimitReached}
          />
        );
      case 'learner_paid':
        return (
          <FundingSidebarPaymentCard
            course={course}
            sponsorships={sponsorships}
            onSubmit={handleEnrollSubmit}
            isSubmitting={isSubmitting}
            isLimitReached={isLimitReached}
          />
        );
      case 'enterprise_funded':
        return (
          <FundingSidebarEnterpriseCard
            course={course}
            onSubmit={handleEnrollSubmit}
            isSubmitting={isSubmitting}
            isLimitReached={isLimitReached}
          />
        );
      default:
        if (sponsorships.length > 0 && sponsorships[0].sponsorType === 'ngo') {
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-sm font-semibold text-blue-900 mb-1">Tài trợ bởi NGO</p>
                <p className="text-xs text-blue-800">Khóa học này đang được tài trợ. Đăng ký của bạn sẽ được gửi cho tổ chức xét duyệt.</p>
              </div>
              <Button
                onClick={() => handleEnrollSubmit({ source: 'ngo_sponsored', sponsorshipId: sponsorships[0]._id })}
                disabled={isSubmitting || isLimitReached}
                className="w-full py-5 rounded-full text-xs font-bold shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Đang gửi...' : 'Đăng ký xét duyệt tài trợ'}
              </Button>
            </div>
          );
        }
        // Default simple registration form
        return (
          <div className="space-y-4">
            <Button
              onClick={() => handleEnrollSubmit()}
              disabled={isSubmitting || isLimitReached}
              className="w-full py-5 rounded-full text-xs font-bold shadow-sm"
            >
              {isSubmitting ? 'Đang xử lý...' : isWaitlistAvailable ? 'Đăng ký + Xếp chờ' : 'Đăng ký ngay'}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
        
        {/* Eligibility Indicator */}
        <EligibilityIndicator eligibility={eligibility} />

        {/* Prerequisite Warning - shown when eligibility has warnings */}
        {eligibility?.prerequisiteWarnings?.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/30 p-4">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Khuyến nghị hoàn thành khóa tiên quyết
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                  Bạn chưa hoàn thành khóa học:{' '}
                  <span className="font-medium">{eligibility.prerequisiteWarnings.join(', ')}</span>
                </p>
                <p className="text-xs text-amber-500 dark:text-amber-500/70 mt-1">
                  Bạn vẫn có thể đăng ký. Tuy nhiên, nền tảng có thể khó hơn nếu chưa có kiến thức nền tảng.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enrollment limits warning */}
        {activeCount >= MAX_CONCURRENT_ENROLLMENTS && (
          <Alert 
            variant="warning" 
            icon={<AlertTriangle className="w-4.5 h-4.5 text-warning shrink-0" strokeWidth={2.0} />}
            className="rounded-xl"
          >
            <AlertTitle className="text-xs font-bold text-warning-foreground">Giới hạn đăng ký học</AlertTitle>
            <AlertDescription className="text-[11px] text-warning-foreground leading-normal mt-1 block">
              Bạn đã đăng ký tối đa {MAX_CONCURRENT_ENROLLMENTS} khóa học song song. Hoàn thành hoặc hủy ít nhất 1 khóa để ghi danh khóa mới.
            </AlertDescription>
          </Alert>
        )}

        {/* Waitlist Warning */}
        {isWaitlistAvailable && eligibility?.currentCapacity && (
          <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>Lớp học đã đầy. Bạn sẽ được xếp vào danh sách chờ.</span>
          </div>
        )}



        {/* Funding Model Sidebar Wrapper */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
          {renderFundingSidebar()}
        </div>

        <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 leading-snug">
          Bằng cách đăng ký, bạn đồng ý với Điều khoản sử dụng và Hướng dẫn đào tạo của dự án.
        </p>
    </div>
  );
};
