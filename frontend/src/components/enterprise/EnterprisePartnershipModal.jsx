import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, SelectField, Checkbox } from '@/components/ui';
import toast from 'react-hot-toast';
import { createPartnership } from '@/apis/partnershipApi';

export const EnterprisePartnershipModal = ({ isOpen, onClose, course, trainerId }) => {
  const [isRecruiting, setIsRecruiting] = useState(true);
  const [isSponsoring, setIsSponsoring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recruitment details
  const [recruitmentCount, setRecruitmentCount] = useState(1);

  // Sponsorship details
  const [budget, setBudget] = useState('');
  const [coverageType, setCoverageType] = useState('FULL');
  const [sponsorCount, setSponsorCount] = useState(1);

  const handleSubmit = async () => {
    if (!isRecruiting && !isSponsoring) {
      toast.error('Vui lòng chọn ít nhất một hình thức hợp tác (Tuyển dụng hoặc Tài trợ)');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        trainerId,
        requestedCourseIds: [course._id],
        recruitmentNeeds: isRecruiting ? {
          targetLearners: Number(recruitmentCount),
          jobRole: 'Học viên',
          employmentType: 'FULL_TIME',
          requirements: [],
          targetSkills: course.skills || []
        } : null,
        proposedSponsorship: isSponsoring ? {
          budget: Number(budget),
          targetLearners: Number(sponsorCount),
          coverageType
        } : null
      };

      await createPartnership(payload);
      toast.success('Gửi yêu cầu hợp tác thành công!');
      onClose();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Gửi yêu cầu thất bại';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle>Đề nghị Hợp tác</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <p className="text-sm text-zinc-500">
            Gửi yêu cầu hợp tác khóa học <strong>{course?.title}</strong>. Bạn có thể chọn cam kết tuyển dụng, tài trợ học phí, hoặc cả hai.
          </p>

          {/* Tuyển dụng */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <label className="flex items-center gap-3 font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={isRecruiting} 
                onChange={(e) => setIsRecruiting(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
              />
              Cam kết tuyển dụng
            </label>
            <p className="text-xs text-zinc-500 ml-8 mb-4">Cam kết phỏng vấn hoặc tiếp nhận học viên sau khi hoàn thành khóa học.</p>
            
            {isRecruiting && (
              <div className="ml-8 space-y-3">
                <Input 
                  label="Số lượng tuyển dự kiến" 
                  type="number" 
                  min="1"
                  value={recruitmentCount}
                  onChange={(e) => setRecruitmentCount(e.target.value)}
                  placeholder="VD: 5"
                  required
                />
              </div>
            )}
          </div>

          {/* Tài trợ */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <label className="flex items-center gap-3 font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={isSponsoring} 
                onChange={(e) => setIsSponsoring(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
              />
              Tài trợ học phí
            </label>
            <p className="text-xs text-zinc-500 ml-8 mb-4">Tài trợ chi phí học tập cho học viên. Số tiền sẽ được khóa tạm thời trong ví của bạn.</p>

            {isSponsoring && (
              <div className="ml-8 space-y-4">
                <Input 
                  label="Ngân sách tài trợ (VNĐ)" 
                  type="number" 
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="VD: 10000000"
                  required
                />
                
                <SelectField 
                  label="Mức tài trợ mỗi suất"
                  value={coverageType}
                  onChange={(val) => setCoverageType(val)}
                  options={[
                    { value: 'FULL', label: 'Toàn phần (100%)' },
                    { value: 'PARTIAL', label: 'Bán phần' },
                    { value: 'FIXED_AMOUNT', label: 'Số tiền cố định' }
                  ]}
                />

                <Input 
                  label="Số lượng suất tài trợ" 
                  type="number" 
                  min="1"
                  value={sponsorCount}
                  onChange={(e) => setSponsorCount(e.target.value)}
                  placeholder="VD: 5"
                  required
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Gửi yêu cầu
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
