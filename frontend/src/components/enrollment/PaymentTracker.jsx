import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { CreditCard, CheckCircle2, Clock, AlertCircle, QrCode, X, Loader2 } from 'lucide-react';
import { formatPrice, formatDate } from '@/utils/formatter';
import { motion, AnimatePresence } from 'framer-motion';
import { createPayment, getPaymentById } from '@/apis/courseApi';
import toast from 'react-hot-toast';

export const PaymentTracker = ({ installments = [], enrollmentId, courseId, onPaymentSuccess }) => {
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [activePayment, setActivePayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState(null);

  if (!installments || installments.length === 0) return null;

  const totalAmount = installments.reduce((acc, curr) => acc + curr.amount, 0);
  const paidAmount = installments
    .filter((inst) => inst.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const percentPaid = Math.round((paidAmount / totalAmount) * 100);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400';
      case 'overdue':
        return 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 animate-pulse';
      case 'pending':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'upcoming':
        return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500 dark:text-zinc-400';
      default:
        return 'bg-zinc-100 border-zinc-200 text-zinc-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'overdue':
        return 'Quá hạn';
      case 'pending':
        return 'Chờ thanh toán';
      case 'upcoming':
        return 'Chưa đến hạn';
      default:
        return 'Chưa rõ';
    }
  };

  const handleOpenPayment = async (e, installment, index) => {
    e.stopPropagation();
    setSelectedInstallment({ ...installment, index });
    setLoading(true);
    setActivePayment(null);
    setVerifiedStatus(null);
    try {
      const res = await createPayment({
        enrollmentId,
        courseId,
        method: 'bank_transfer',
        amount: installment.amount
      });
      const paymentData = res.data?.data || res.data || res;
      setActivePayment(paymentData);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tạo thông tin thanh toán. Vui lòng thử lại sau.');
      setSelectedInstallment(null);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId) => {
    setVerifying(true);
    setVerifiedStatus('pending');
    const maxAttempts = 20;
    const intervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await getPaymentById(paymentId);
        const payment = res.data?.data || res.data || res;
        const status = payment?.status;
        
        if (status === 'completed') {
          setVerifiedStatus('completed');
          setActivePayment((prev) => ({ ...prev, status }));
          setVerifying(false);
          toast.success('Hệ thống đã nhận được thanh toán của bạn.');
          if (onPaymentSuccess) onPaymentSuccess();
          return true;
        }
        if (status === 'failed') {
          setVerifiedStatus('failed');
          setActivePayment((prev) => ({ ...prev, status }));
          setVerifying(false);
          toast.error('Thanh toán không thành công. Vui lòng kiểm tra lại giao dịch.');
          return false;
        }
      } catch (err) {
        console.error('Poll payment status error:', err);
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    setVerifiedStatus('timeout');
    setVerifying(false);
    toast.error('Hệ thống chưa xác nhận được thanh toán. Vui lòng thử lại sau.');
    return false;
  };

  const handleConfirmTransfer = async () => {
    if (!activePayment?._id) {
      toast.error('Không tìm thấy mã giao dịch để xác nhận.');
      return;
    }
    await checkPaymentStatus(activePayment._id);
  };

  const handleClosePayment = () => {
    setSelectedInstallment(null);
    setActivePayment(null);
    setVerifiedStatus(null);
    setVerifying(false);
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  return (
    <div className="space-y-4 py-3 border-t border-zinc-100 dark:border-zinc-900 mt-2">
      {/* Tuition Summary Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            Học phí trả góp (0% lãi suất)
          </span>
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            {formatPrice(paidAmount)} / {formatPrice(totalAmount)}
          </span>
        </div>
        
        {/* Simple Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${percentPaid}%` }} 
          />
        </div>
      </div>

      {/* Timeline Rows */}
      <div className="space-y-2">
        {installments.map((installment, idx) => {
          const { amount, dueDate, status, paidAt } = installment;
          const isPayable = ['pending', 'overdue', 'upcoming'].includes(status);

          return (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-950/20 text-xs gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-850 dark:text-zinc-200">
                    Đợt {idx + 1}: {formatPrice(amount)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
                <p className="text-zinc-450 text-[10.5px]">
                  {status === 'paid' && paidAt
                    ? `Đã thanh toán vào: ${formatDate(paidAt)}`
                    : `Hạn thanh toán: ${formatDate(dueDate)}`
                  }
                </p>
              </div>

              {isPayable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 px-3 rounded-lg border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 gap-1 bg-white dark:bg-zinc-950"
                  onClick={(e) => handleOpenPayment(e, installment, idx + 1)}
                >
                  <QrCode className="w-3 h-3 text-zinc-500" />
                  Đóng học phí
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* VietQR Slide-In Modal */}
      <AnimatePresence>
        {selectedInstallment && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
            onClick={handleClosePayment}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-sm rounded-[24px] bg-zinc-900 border border-zinc-800 p-1 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-primary" />
                    Thanh toán Đợt {selectedInstallment.index}
                  </h4>
                  <button 
                    onClick={handleClosePayment}
                    className="p-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-xs text-zinc-500">Đang khởi tạo mã giao dịch...</p>
                  </div>
                ) : (
                  activePayment && (
                    <div className="space-y-4">
                      <div className="p-1 rounded-[16px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
                        <div className="bg-white p-4 rounded-[12px] text-center space-y-3">
                          <div className="w-40 h-40 mx-auto p-1.5 border border-zinc-200 rounded-xl bg-white flex items-center justify-center">
                            <img
                              src={activePayment.qrUrl}
                              alt="VietQR code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          <div className="space-y-1 text-xs text-zinc-650 font-medium">
                            <p>Ngân hàng: <span className="font-bold text-zinc-900">Sacombank (SCB)</span></p>
                            <p>Số tài khoản: <span className="font-bold text-zinc-900 font-mono">0701 3957 3585</span></p>
                            <p>Số tiền: <span className="font-bold text-primary font-mono">{formatPrice(activePayment.amount)}</span></p>
                            <div className="text-[10px] text-zinc-550 mt-2 bg-zinc-100 p-2 rounded-lg leading-relaxed">
                              <p className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider mb-0.5">Nội dung chuyển khoản chính xác:</p>
                              <span className="font-mono bg-zinc-200/60 text-zinc-800 px-2 py-0.5 rounded font-bold text-xs select-all">
                                RESTART35-{enrollmentId.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!verifiedStatus || verifiedStatus === 'timeout' || verifiedStatus === 'failed' ? (
                        <Button
                          className="w-full py-4 text-xs font-bold rounded-full shadow-sm"
                          onClick={handleConfirmTransfer}
                          disabled={verifying}
                        >
                          {verifying ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang đối soát thanh toán...
                            </span>
                          ) : (
                            'Tôi đã chuyển khoản thành công'
                          )}
                        </Button>
                      ) : null}

                      {verifying && (
                        <p className="text-[10px] text-center text-amber-600">
                          Đang chờ hệ thống xác nhận giao dịch...
                        </p>
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

                      <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 leading-normal">
                        Vui lòng quét mã QR trên hoặc chuyển khoản chính xác nội dung hiển thị để hệ thống ghi nhận đối soát tự động.
                      </p>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
