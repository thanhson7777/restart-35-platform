import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { CreditCard, Sparkles, Loader2, HeartHandshake } from 'lucide-react';
import { formatPrice } from '@/utils/formatter';
import toast from 'react-hot-toast';
import { createPayment } from '@/apis/courseApi';

export const FundingSidebarPaymentCard = ({ course, sponsorships, onSubmit, isSubmitting, isLimitReached }) => {
  const [creating, setCreating] = useState(false);
  const { fee = 15000000, _id } = course || {};

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
          <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {formatPrice(fee)}
          </span>
          <span className="text-xs text-zinc-400 line-through">
            {formatPrice(fee * 1.6)}
          </span>
        </div>
      </div>

      {/* Benefits highlight */}
      <div className="flex items-center gap-2 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 text-xs">
        <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
        <span className="font-medium">Giảm ngay 40% cho người lao động 35+</span>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={handleCreatePayment}
          disabled={creating || isSubmitting || isLimitReached}
          variant="outline"
          className="w-full py-4 text-xs font-bold rounded-full flex items-center justify-center gap-2 border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang kết nối...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 text-zinc-400" />
              Tự thanh toán (VNPay)
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
