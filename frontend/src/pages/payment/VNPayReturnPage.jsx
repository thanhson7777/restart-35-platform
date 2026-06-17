import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { publicAxiosInstance } from '@/utils/authorizeAxios';
import { API_ROOT } from '@/utils/constants';
import { selectCurrentUser } from '@/redux/user/userSlice';

export const VNPayReturnPage = () => {
  const [status, setStatus] = useState('verifying');
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const type = searchParams.get('type');
        
        if (type === 'wallet') {
          // Trigger IPN manually for localhost testing
          await publicAxiosInstance.get(`${API_ROOT}/v1/wallets/vnpay-ipn?${searchParams.toString()}`);
          
          if (searchParams.get('vnp_ResponseCode') === '00' || searchParams.get('vnp_ResponseCode') === '02') {
            setStatus('success');
          } else {
            setStatus('failed');
          }
        } else {
          // Logic thanh toán khóa học cũ
          const res = await publicAxiosInstance.get(`${API_ROOT}/v1/paymentTest/vnpay_ipn?${searchParams.toString()}`);
          if (res.data?.RspCode === '00' || res.data?.RspCode === '02') {
            setStatus('success');
          } else {
            setStatus('failed');
          }
        }
      } catch (error) {
        console.error('Lỗi xác thực thanh toán:', error);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [location.search]);

  const isWallet = new URLSearchParams(location.search).get('type') === 'wallet';
  const walletPath = currentUser?.role === 'enterprise' ? '/enterprise/wallet' : '/ngo/dashboard/wallet';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl text-center space-y-6">
        {status === 'verifying' && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Đang xác thực thanh toán...</h2>
            <p className="text-zinc-500">Vui lòng không đóng trình duyệt trong lúc này.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Giao dịch thành công!</h2>
            <p className="text-zinc-500">
              {isWallet ? 'Hệ thống đã ghi nhận số tiền nạp vào Ví tài trợ của bạn.' : 'Hệ thống đã ghi nhận thanh toán. Bạn đã được ghi danh thành công vào lớp học.'}
            </p>
            <Button onClick={() => navigate(isWallet ? walletPath : '/my-enrollments')} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isWallet ? 'Quay lại Ví tài trợ' : 'Vào lớp học ngay'}
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Giao dịch thất bại</h2>
            <p className="text-zinc-500">Giao dịch của bạn đã bị hủy hoặc xảy ra lỗi trong quá trình xử lý.</p>
            <Button variant="outline" onClick={() => navigate(isWallet ? walletPath : '/courses')} className="w-full">
              {isWallet ? 'Quay lại Ví tài trợ' : 'Quay lại danh sách khóa học'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
