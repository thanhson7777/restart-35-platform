import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { CreditCard, Sparkles, Loader2, HeartHandshake } from 'lucide-react';
import { formatPrice } from '@/utils/formatter';
import toast from 'react-hot-toast';
import { createPayment } from '@/apis/courseApi';

export const FundingSidebarPaymentCard = ({ course, sponsorships, onSubmit, isSubmitting, isLimitReached }) => {
  const [creating, setCreating] = useState(false);
  const { _id } = course || {};
  const fee = course?.fundingConfig?.price || course?.fee || 0;
  let finalFee = fee;
  let hasDiscount = false;

  const activeSponsorships = course?.activeSponsorships || sponsorships || [];
  const enterpriseSponsor = activeSponsorships.find(s => s.sponsorType === 'enterprise');
  
  if (enterpriseSponsor && fee > 0) {
    if (enterpriseSponsor.coverageType === 'FULL' || enterpriseSponsor.coverageType === 'full') {
      finalFee = 0;
      hasDiscount = true;
    } else if (enterpriseSponsor.amount > 0) {
      finalFee = Math.max(0, fee - enterpriseSponsor.amount);
      hasDiscount = true;
    } else if (enterpriseSponsor.maxAmountPerLearner > 0) {
      finalFee = Math.max(0, fee - enterpriseSponsor.maxAmountPerLearner);
      hasDiscount = true;
    }
  }

  const ngoSponsors = (sponsorships || []).filter(s => s.sponsorType === 'ngo');
  const activeNgoSponsor = ngoSponsors.length > 0 ? ngoSponsors[0] : null;

  const handleCreatePayment = async () => {
    setCreating(true);
    try {
      const res = await createPayment({
        courseId: _id,
        method: 'vnpay',
        amount: fee
      });
      const paymentData = res.data?.data || res.data || res;
      
      if (paymentData?.paymentUrl) {
        window.location.href = paymentData.paymentUrl;
      } else {
        toast.error('Không nhận được URL thanh toán từ server.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể kết nối cổng thanh toán. Vui lòng thử lại sau.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Price section */}
      <div className="text-center pb-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
          Học phí trọn gói
        </span>
        <div className="flex items-baseline justify-center gap-2">
          {hasDiscount && (
            <span className="text-sm font-medium text-zinc-400 line-through">
              {formatPrice(fee)}
            </span>
          )}
          <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {finalFee === 0 ? '0 đ' : formatPrice(finalFee)}
          </span>
        </div>
      </div>



      <div className="space-y-3 pt-2">
        <Button
          onClick={finalFee === 0 ? () => onSubmit({ source: 'direct' }) : handleCreatePayment}
          disabled={creating || isSubmitting || isLimitReached}
          className="w-full py-5 text-sm font-bold rounded-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md border-0 transition-colors"
        >
          {creating || isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang kết nối...
            </>
          ) : (
            <>
              {finalFee === 0 ? <Sparkles className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
              {finalFee === 0 ? 'Đăng ký tham gia' : 'Thanh toán để tham gia'}
            </>
          )}
        </Button>

        {activeNgoSponsor && (
          <Button
            onClick={() => onSubmit({ source: 'ngo_sponsored', sponsorshipId: activeNgoSponsor._id })}
            disabled={creating || isSubmitting || isLimitReached}
            className="w-full py-5 text-xs font-bold rounded-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang gửi hồ sơ...
              </>
            ) : (
              <>
                <HeartHandshake className="w-4.5 h-4.5" />
                Xin tài trợ miễn phí ({activeNgoSponsor.title})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
