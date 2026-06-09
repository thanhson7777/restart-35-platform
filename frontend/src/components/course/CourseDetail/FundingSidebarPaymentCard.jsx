import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { CreditCard, QrCode, Sparkles, Clock } from 'lucide-react';
import { formatPrice } from '@/utils/formatter';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createPayment, getPaymentById } from '@/apis/courseApi';

export const FundingSidebarPaymentCard = ({ course, onSubmit, isSubmitting }) => {
  const [showQR, setShowQR] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState(null);
  const { fee = 15000000, _id } = course || {};

  const monthlyInstallment = Math.round(fee / 4);

  const handleCreatePayment = async () => {
    setCreating(true);
    setActivePayment(null);
    setVerifiedStatus(null);
    try {
      const res = await createPayment({
        courseId: _id,
        method: 'bank_transfer',
        amount: fee
      });
      const paymentData = res.data || res;
      setActivePayment(paymentData);
      setShowQR(true);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tạo thông tin thanh toán. Vui lòng thử lại sau.');
    } finally {
      setCreating(false);
    }
  };

  const startPollingStatus = async (paymentId) => {
    setVerifying(true);
    setVerifiedStatus('pending');
    const maxAttempts = 20;
    const intervalMs = 2000;
    let attempt = 0;

    const poll = async () => {
      try {
        const res = await getPaymentById(paymentId);
        const payment = res.data || res;
        const status = payment?.status;
        if (status === 'completed') {
          setVerifiedStatus('completed');
          setActivePayment((prev) => ({ ...prev, status }));
          setVerifying(false);
          toast.success('Hệ thống đã nhận được thanh toán của bạn.');
          return true;
        }
        if (status === 'failed') {
          setVerifiedStatus('failed');
          setActivePayment((prev) => ({ ...prev, status }));
          setVerifying(false);
          toast.error('Thanh toán không thành công. Vui lòng kiểm tra lại giao dịch.');
          return true;
        }
      } catch (err) {
        console.error('Poll payment status error:', err);
      }
      attempt += 1;
      if (attempt >= maxAttempts) {
        setVerifiedStatus('timeout');
        setVerifying(false);
        toast.error('Hệ thống chưa xác nhận được thanh toán. Vui lòng thử lại sau.');
        return true;
      }
      return false;
    };

    const stopped = await poll();
    if (!stopped) {
      const timer = setInterval(async () => {
        const shouldStop = await poll();
        if (shouldStop) clearInterval(timer);
      }, intervalMs);
    }
  };

  const handleConfirmTransfer = async () => {
    try {
      setConfirming(true);
      const paymentId = activePayment?._id;
      if (!paymentId) {
        toast.error('Không tìm thấy mã giao dịch để xác nhận.');
        return;
      }
      await onSubmit({ fundingModel: 'learner_paid', method: 'qr', paymentId });
      await startPollingStatus(paymentId);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
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

          <Button
            onClick={handleCreatePayment}
            disabled={creating}
            variant="outline"
            className="w-full py-4 text-xs font-bold rounded-full border-zinc-300 dark:border-zinc-800 flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tạo mã thanh toán...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                Hiển thị mã VietQR chuyển khoản
              </>
            )}
          </Button>

          <Button
            onClick={() => onSubmit({ fundingModel: 'learner_paid', method: 'direct' })}
            disabled={isSubmitting}
            className="w-full py-5 rounded-full text-xs font-bold shadow-sm"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Đăng ký và Thanh toán sau'}
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-1 rounded-[16px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800">
            <div className="p-4 rounded-[12px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 text-center space-y-3">
              <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">
                Mã Thanh Toán VietQR
              </span>

              <div className="w-36 h-36 mx-auto p-1.5 border border-zinc-200 rounded-xl bg-white flex items-center justify-center">
                {activePayment?.qrUrl ? (
                  <img
                    src={activePayment.qrUrl}
                    alt="VietQR code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                )}
              </div>

              <div className="space-y-1 text-xs text-zinc-650 dark:text-zinc-400 font-medium">
                <p>Ngân hàng: <span className="font-bold text-zinc-950 dark:text-white">Sacombank (SCB)</span></p>
                <p>STK: <span className="font-bold text-zinc-950 dark:text-white font-mono">0701 3957 3585</span></p>
                <p>Chủ tài khoản: <span className="font-bold text-zinc-950 dark:text-white">NGUYEN THANH SON</span></p>
                <p>Số tiền: <span className="font-bold text-primary font-mono">{formatPrice(fee)}</span></p>
                <p className="text-[10px] text-zinc-400">Nội dung: <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded font-bold">{activePayment?.qrUrl ? `RESTART35-${(_id || '').toString().toUpperCase()}` : 'Đang tạo...'}</span></p>
              </div>
            </div>
          </div>

          {!verifiedStatus || verifiedStatus === 'timeout' || verifiedStatus === 'failed' ? (
            <Button
              onClick={handleConfirmTransfer}
              disabled={confirming || verifying}
              className="w-full py-4 text-xs font-bold rounded-full shadow-sm"
            >
              {confirming || verifying ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {verifying ? 'Đang đối soát thanh toán...' : 'Đang xác nhận...'}
                </span>
              ) : (
                'Tôi đã chuyển khoản thành công'
              )}
            </Button>
          ) : null}

          {verifying && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-amber-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang chờ hệ thống xác nhận giao dịch...</span>
            </div>
          )}

          {verifiedStatus === 'completed' && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xác nhận thanh toán thành công.</span>
            </div>
          )}

          {verifiedStatus === 'failed' && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Thanh toán không thành công. Vui lòng thử lại.</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Mã chuyển khoản có hiệu lực trong vòng 24 giờ</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
