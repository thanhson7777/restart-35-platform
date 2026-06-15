import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { CreditCard, Sparkles, Loader2 } from 'lucide-react';
import { formatPrice } from '@/utils/formatter';
import toast from 'react-hot-toast';
import { createPayment } from '@/apis/courseApi';

export const FundingSidebarPaymentCard = ({ course }) => {
  const [creating, setCreating] = useState(false);
  const { fee = 15000000, _id } = course || {};

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

      <div className="space-y-3">
        <Button
          onClick={handleCreatePayment}
          disabled={creating}
          variant="default"
          className="w-full py-4 text-xs font-bold rounded-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang kết nối cổng thanh toán...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Thanh toán qua VNPay
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
