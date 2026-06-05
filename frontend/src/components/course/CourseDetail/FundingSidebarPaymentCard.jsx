import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { CreditCard, QrCode, Sparkles, Check, Clock } from 'lucide-react';
import { formatPrice } from '@/utils/formatter';

export const FundingSidebarPaymentCard = ({ course, onSubmit, isSubmitting }) => {
  const [showQR, setShowQR] = useState(false);
  const { fee = 15000000, _id } = course || {};

  const monthlyInstallment = Math.round(fee / 4);

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

      {/* Toggle options or QR Code display */}
      {!showQR ? (
        <div className="space-y-3">
          {/* Installment Plan Summary */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs space-y-1.5">
            <p className="font-bold text-zinc-700 dark:text-zinc-300">
              💡 Trả góp 0% lãi suất:
            </p>
            <p className="text-zinc-500">
              Thanh toán thành 4 đợt: <span className="font-bold text-zinc-700 dark:text-zinc-300">{formatPrice(monthlyInstallment)}</span> x 4 tháng.
            </p>
          </div>

          {/* Action button to display QR */}
          <Button
            onClick={() => setShowQR(true)}
            variant="outline"
            className="w-full py-4 text-xs font-bold rounded-full border-zinc-300 dark:border-zinc-800 flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Hiển thị mã VietQR chuyển khoản
          </Button>

          {/* Direct enroll and pay later button */}
          <Button
            onClick={() => onSubmit({ fundingModel: 'learner_paid', method: 'direct' })}
            disabled={isSubmitting}
            className="w-full py-5 rounded-full text-xs font-bold shadow-sm"
          >
            {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký và Thanh toán sau'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* VietQR Code double-bezel nested hardware simulation */}
          <div className="p-1 rounded-[16px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800">
            <div className="p-4 rounded-[12px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 text-center space-y-3">
              <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">
                Mã Thanh Toán VietQR
              </span>
              
              {/* Fake QR visual placeholder with double-bezel */}
              <div className="w-36 h-36 mx-auto p-1.5 border border-zinc-200 rounded-xl bg-white flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=vietqr_mock_payment_for_${_id}`}
                  alt="VietQR code placeholder"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Bank Details */}
              <div className="space-y-1 text-xs text-zinc-650 dark:text-zinc-400 font-medium">
                <p>Ngân hàng: <span className="font-bold text-zinc-950 dark:text-white">Vietcombank</span></p>
                <p>STK: <span className="font-bold text-zinc-950 dark:text-white font-mono">1234 5678 90</span></p>
                <p>Số tiền: <span className="font-bold text-primary font-mono">{formatPrice(fee)}</span></p>
                <p className="text-[10px] text-zinc-400">Nội dung: <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded font-bold">ENROLL_{_id?.slice(-6).toUpperCase()}</span></p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowQR(false)}
              variant="outline"
              className="flex-1 py-4 text-xs font-semibold rounded-full border-zinc-200 dark:border-zinc-800"
            >
              Quay lại
            </Button>
            <Button
              onClick={() => onSubmit({ fundingModel: 'learner_paid', method: 'qr' })}
              disabled={isSubmitting}
              className="flex-[2] py-4 text-xs font-bold rounded-full shadow-sm"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đã chuyển khoản'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Mã chuyển khoản có hiệu lực trong vòng 24 giờ</span>
          </div>
        </div>
      )}
    </div>
  );
};
