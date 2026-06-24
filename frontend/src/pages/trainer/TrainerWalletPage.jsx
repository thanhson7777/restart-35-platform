import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { walletAPI } from '@/apis/trainerWalletAPI';
import { Skeleton, Badge } from '@/components/ui';
import { formatDate } from '@/utils/formatter';
import { Wallet, ArrowDownRight, ArrowUpRight, History, CreditCard } from 'lucide-react';

const formatCurrency = (amount) => {
  if (amount == null) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

const TRANSACT_TYPE_MAP = {
  'deposit': 'Nạp tiền',
  'withdraw': 'Rút tiền',
  'DEPOSIT': 'Nạp tiền',
  'WITHDRAW': 'Rút tiền',
  'COURSE_REVENUE': 'Doanh thu khóa học',
  'PARTNERSHIP_REVENUE': 'Tài trợ khóa học',
  'SYSTEM_FEE': 'Phí hệ thống',
  'RESERVE': 'Tạm giữ',
  'DISBURSE': 'Giải ngân',
  'REFUND': 'Hoàn tiền',
  'PAYMENT': 'Thanh toán'
};

const TrainerWalletPage = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [walletRes, transRes] = await Promise.all([
          walletAPI.getMyWallet(),
          walletAPI.getMyTransactions()
        ]);
        setWallet(walletRes.data);
        setTransactions(transRes.data);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        toast.error('Không thể tải dữ liệu ví');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'COURSE_REVENUE':
      case 'DEPOSIT':
      case 'RECEIVE':
      case 'PARTNERSHIP_REVENUE':
        return <ArrowDownRight className="w-5 h-5 text-green-500" />;
      case 'WITHDRAW':
      case 'DISBURSE':
      case 'PAYMENT':
      case 'SYSTEM_FEE':
      case 'RESERVE':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      default:
        return <History className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'COURSE_REVENUE':
      case 'DEPOSIT':
      case 'RECEIVE':
      case 'PARTNERSHIP_REVENUE':
        return 'text-green-600 bg-green-50 border-green-100';
      case 'WITHDRAW':
      case 'DISBURSE':
      case 'PAYMENT':
      case 'SYSTEM_FEE':
      case 'RESERVE':
        return 'text-red-600 bg-red-50 border-red-100';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Hoàn thành</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Đang xử lý</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Thất bại</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Đã hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">
          Ví & Doanh Thu
        </h1>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm">
          Quản lý số dư, doanh thu từ khóa học và lịch sử giao dịch của bạn.
        </p>
      </div>

      {/* Wallet Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-blue-100 font-medium flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Số dư khả dụng
              </p>
              <h2 className="text-4xl font-bold tracking-tight">
                {formatCurrency(wallet?.availableBalance || 0)}
              </h2>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="relative z-10 mt-6 pt-4 border-t border-white/20 flex gap-6">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wider font-medium mb-1">Đã rút</p>
              <p className="font-semibold">{formatCurrency(wallet?.totalDisbursed || 0)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wider font-medium mb-1">Đang khóa</p>
              <p className="font-semibold">{formatCurrency(wallet?.lockedBalance || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions History */}
      <div className="bg-[hsl(var(--admin-surface-elevated))] rounded-[2rem] border border-[hsl(var(--admin-border))] overflow-hidden">
        <div className="p-6 border-b border-[hsl(var(--admin-border))] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
            <History className="w-5 h-5 text-[hsl(var(--admin-accent))]" /> Lịch sử giao dịch
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-[hsl(var(--admin-text-muted))]">
              Chưa có giao dịch nào
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-secondary))]">
                <tr>
                  <th className="px-6 py-4 font-semibold w-1/4">Giao dịch</th>
                  <th className="px-6 py-4 font-semibold w-1/4">Số tiền</th>
                  <th className="px-6 py-4 font-semibold w-1/4">Thời gian</th>
                  <th className="px-6 py-4 font-semibold w-1/4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${getTransactionColor(tx.type)}`}>
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--admin-text-primary))]">{TRANSACT_TYPE_MAP[tx.type] || tx.type}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-0.5 line-clamp-1" title={tx.description}>
                            {tx.description || 'Không có mô tả'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        ['COURSE_REVENUE', 'DEPOSIT', 'RECEIVE', 'PARTNERSHIP_REVENUE'].includes(tx.type) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {['COURSE_REVENUE', 'DEPOSIT', 'RECEIVE', 'PARTNERSHIP_REVENUE'].includes(tx.type) ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[hsl(var(--admin-text-secondary))]">
                      {formatDate(tx.createdAt, 'PPp')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(tx.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerWalletPage;
