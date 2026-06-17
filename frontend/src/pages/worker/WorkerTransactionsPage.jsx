import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { getMyPayments } from '@/apis/paymentApi';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui';
import { Receipt, Calendar, CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

function WorkerTransactionsPage() {
  const currentUser = useSelector(selectCurrentUser);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getMyPayments();
        const raw = response?.data;
        const paymentsArray = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setPayments(paymentsArray);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Không thể tải lịch sử giao dịch');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchTransactions();
    }
  }, [currentUser]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED': return 'Thành công';
      case 'FAILED': return 'Thất bại';
      case 'PENDING': return 'Đang xử lý';
      default: return status;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FAILED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Lịch sử giao dịch
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Quản lý các giao dịch thanh toán khóa học của bạn
            </p>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : payments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-dashed border-border p-12 text-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Chưa có giao dịch nào</h3>
            <p className="text-muted-foreground">
              Bạn chưa thực hiện giao dịch thanh toán khóa học nào trên hệ thống.
            </p>
          </motion.div>
        ) : (
          <Card className="overflow-hidden border-border/50 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Mã giao dịch</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Thời gian</th>
                    <th className="px-6 py-4 font-medium min-w-[200px]">Nội dung</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Số tiền</th>
                    <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payments.map((payment, index) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={payment._id} 
                      className="bg-white hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {payment.transactionId || payment._id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(payment.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex flex-col gap-1">
                          <span>Thanh toán khóa học</span>
                          {payment.courseId?.title && (
                            <span className="text-xs text-muted-foreground font-normal line-clamp-1">
                              {payment.courseId.title}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {getStatusText(payment.status)}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default WorkerTransactionsPage;
