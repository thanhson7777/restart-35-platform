import { useState, useEffect, useCallback } from 'react';
import { Button, Dialog, DialogContent, Input } from '@/components/ui';
import { CreditCard, ArrowDownCircle, CheckCircle2, XCircle, ArrowUpCircle, Lock, Loader2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyWallet, getMyTransactions, createTopupUrl } from '@/apis/walletApi';
import { toast } from 'react-toastify';

export default function EnterpriseWalletPage() {
  const [wallet, setWallet] = useState({ availableBalance: 0, lockedBalance: 0, totalDisbursed: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const limit = 10;
  
  // Topup State
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const fetchWalletData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [walletRes, txRes] = await Promise.all([
        getMyWallet().catch(() => ({ data: null })),
        getMyTransactions({ page, limit }).catch(() => ({ data: [], pagination: {} }))
      ]);
      if (walletRes.data) setWallet(walletRes.data);
      if (txRes.data) {
        setTransactions(txRes.data);
        setPagination(txRes.pagination || { page: 1, total_pages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Fetch wallet error:', error);
      toast.error('Không thể tải thông tin ví');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchWalletData(1);
  }, [fetchWalletData]);

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount < 10000) {
      return toast.error('Vui lòng nhập tối thiểu 10,000đ');
    }

    setTopupLoading(true);
    try {
      const res = await createTopupUrl({ 
        amount, 
        returnUrl: window.location.origin + '/payment/vnpay-return?type=wallet' 
      });
      if (res.data) {
        window.location.href = res.data; // Chuyển hướng sang VNPay
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch nạp tiền');
    } finally {
      setTopupLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Thành công</span>;
      case 'PENDING': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Đang xử lý</span>;
      case 'FAILED': return <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Thất bại</span>;
      default: return null;
    }
  };

  const getTypeInfo = (type) => {
    switch(type) {
      case 'DEPOSIT': return { icon: <ArrowDownCircle className="text-emerald-500" />, label: 'Nạp tiền', color: 'text-emerald-600', prefix: '+' };
      case 'RESERVE': return { icon: <Lock className="text-amber-500" />, label: 'Khóa quỹ', color: 'text-amber-600', prefix: '-' };
      case 'DISBURSE': return { icon: <ArrowUpCircle className="text-rose-500" />, label: 'Giải ngân', color: 'text-rose-600', prefix: '-' };
      case 'REFUND': return { icon: <CheckCircle2 className="text-blue-500" />, label: 'Hoàn tiền', color: 'text-blue-600', prefix: '+' };
      default: return { icon: <Wallet />, label: type, color: 'text-zinc-600', prefix: '' };
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Ví Doanh Nghiệp (Wallet)</h1>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
          Quản lý nguồn vốn, nạp tiền và theo dõi dòng tiền tài trợ, liên kết.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Virtual ATM Card */}
        <div className="relative rounded-2xl p-8 overflow-hidden text-white shadow-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CreditCard size={120} />
          </div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium tracking-wider uppercase mb-1">Số dư khả dụng</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                {formatCurrency(wallet.availableBalance)}
              </h2>
            </div>
            
            <div className="mt-12 flex items-end justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-blue-300 text-xs font-medium uppercase flex items-center gap-1 mb-1">
                    <Lock size={12} /> Tiền đang phong tỏa
                  </p>
                  <p className="text-xl font-semibold text-amber-200">{formatCurrency(wallet.lockedBalance)}</p>
                </div>
                <div>
                  <p className="text-blue-300 text-xs font-medium uppercase mb-1">Tổng tiền đã thanh toán</p>
                  <p className="text-emerald-300 font-semibold">{formatCurrency(wallet.totalDisbursed)}</p>
                </div>
              </div>
              <Button 
                onClick={() => setTopupOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Nạp tiền ngay
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats or Instructions */}
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 flex flex-col justify-center">
          <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg mb-4">Làm thế nào để sử dụng ví?</h3>
          <ul className="space-y-4">
            <li className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center shrink-0 font-bold text-[hsl(var(--admin-text-secondary))]">1</div>
              <p className="text-[hsl(var(--admin-text-secondary))]"><strong className="text-[hsl(var(--admin-text-primary))]">Nạp tiền vào ví:</strong> Sử dụng VNPay để nạp tiền vào Số dư khả dụng.</p>
            </li>
            <li className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center shrink-0 font-bold text-[hsl(var(--admin-text-secondary))]">2</div>
              <p className="text-[hsl(var(--admin-text-secondary))]"><strong className="text-[hsl(var(--admin-text-primary))]">Khóa quỹ tạm thời:</strong> Khi bạn tạo chương trình tài trợ/liên kết, tiền sẽ chuyển sang trạng thái "Phong tỏa".</p>
            </li>
            <li className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center shrink-0 font-bold text-[hsl(var(--admin-text-secondary))]">3</div>
              <p className="text-[hsl(var(--admin-text-secondary))]"><strong className="text-[hsl(var(--admin-text-primary))]">Thanh toán tự động:</strong> Khi đơn được duyệt, hệ thống sẽ chuyển tiền từ Quỹ phong tỏa cho bên nhận.</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden mt-8">
        <div className="p-6 border-b border-[hsl(var(--admin-border))]">
          <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Lịch sử giao dịch</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-muted))] uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Giao dịch</th>
                <th className="px-6 py-4 font-medium">Số tiền</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium">Ngày thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--admin-border))]">
              {transactions.length > 0 ? transactions.map((tx) => {
                const info = getTypeInfo(tx.type);
                return (
                  <tr key={tx._id} className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {info.icon}
                        <div>
                          <p className="font-medium text-[hsl(var(--admin-text-primary))]">{info.label}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))] max-w-[250px] truncate" title={tx.description}>{tx.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-bold ${info.color}`}>
                      {info.prefix}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="px-6 py-4 text-[hsl(var(--admin-text-muted))]">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-[hsl(var(--admin-text-muted))]">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[hsl(var(--admin-border))]">
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">
              Hiển thị <span className="font-medium text-[hsl(var(--admin-text-primary))]">{((pagination.page - 1) * limit) + 1}</span> đến <span className="font-medium text-[hsl(var(--admin-text-primary))]">{Math.min(pagination.page * limit, pagination.total)}</span> trong số <span className="font-medium text-[hsl(var(--admin-text-primary))]">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => fetchWalletData(Math.max(1, pagination.page - 1))} disabled={pagination.page === 1} className="h-8 w-8 text-[hsl(var(--admin-text-secondary))]"><ChevronLeft size={16} /></Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(pageNum => {
                  if (pageNum === 1 || pageNum === pagination.total_pages || (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)) {
                    return (
                      <Button key={pageNum} variant={pagination.page === pageNum ? 'default' : 'outline'} onClick={() => fetchWalletData(pageNum)} className={`h-8 w-8 p-0 ${pagination.page === pageNum ? 'bg-[hsl(var(--admin-accent))] text-white hover:bg-[hsl(var(--admin-accent-hover))]' : 'text-[hsl(var(--admin-text-secondary))]'}`}>
                        {pageNum}
                      </Button>
                    );
                  }
                  if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) return <span key={pageNum} className="text-[hsl(var(--admin-text-muted))] px-1">...</span>;
                  return null;
                })}
              </div>
              <Button variant="outline" size="icon" onClick={() => fetchWalletData(Math.min(pagination.total_pages, pagination.page + 1))} disabled={pagination.page === pagination.total_pages} className="h-8 w-8 text-[hsl(var(--admin-text-secondary))]"><ChevronRight size={16} /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Topup Dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-md bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Nạp tiền vào Ví</h2>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Nhập số tiền bạn muốn nạp qua cổng VNPay.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2 block">Số tiền (VNĐ)</label>
                <Input 
                  type="number" 
                  value={topupAmount} 
                  onChange={(e) => setTopupAmount(e.target.value)} 
                  placeholder="VD: 5000000"
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-lg h-12"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setTopupAmount('1000000')}>1.000.000đ</Button>
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setTopupAmount('5000000')}>5.000.000đ</Button>
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setTopupAmount('10000000')}>10.000.000đ</Button>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button variant="outline" onClick={() => setTopupOpen(false)} className="flex-1 border-[hsl(var(--admin-border))]">Hủy</Button>
              <Button onClick={handleTopup} disabled={topupLoading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                {topupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thanh toán VNPay'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
