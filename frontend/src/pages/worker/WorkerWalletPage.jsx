import { useState, useEffect, useCallback } from 'react';
import { CreditCard, ArrowDownCircle, CheckCircle2, ArrowUpCircle, Loader2, Wallet, Building2, UserCircle2, Search, ChevronDown } from 'lucide-react';
import { Button, Dialog, DialogContent, Input } from '@/components/ui';
import { getMyWallet, getMyTransactions, withdrawWallet } from '@/apis/walletApi';
import toast from 'react-hot-toast';

export default function WorkerWalletPage() {
  const [wallet, setWallet] = useState({ availableBalance: 0, lockedBalance: 0, totalDisbursed: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, IN, OUT

  // Withdraw State
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // States cho Dropdown Ngân hàng
  const [banks, setBanks] = useState([]);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, txRes] = await Promise.all([
        getMyWallet().catch(() => ({ data: null })),
        getMyTransactions({ limit: 100 }).catch(() => ({ data: [] }))
      ]);
      if (walletRes.data) setWallet(walletRes.data);
      if (txRes.data) setTransactions(txRes.data);
    } catch (error) {
      console.error('Fetch wallet error:', error);
      toast.error('Không thể tải thông tin ví');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
    const fetchBanks = async () => {
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const data = await response.json();
        if (data.code === '00') {
          setBanks(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch banks:', error);
      }
    };
    fetchBanks();
  }, [fetchWalletData]);

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount < 50000) {
      return toast.error('Số tiền rút tối thiểu là 50,000đ');
    }
    if (amount > wallet.availableBalance) {
      return toast.error('Số tiền rút vượt quá số dư khả dụng');
    }
    if (!bankCode || !bankAccount) {
      return toast.error('Vui lòng điền đầy đủ thông tin ngân hàng');
    }

    setWithdrawLoading(true);
    try {
      await withdrawWallet({ amount, bankCode, bankAccount });
      toast.success('Rút tiền thành công! Đang xử lý giao dịch.');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setBankCode('');
      setBankAccount('');
      fetchWalletData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi rút tiền');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Thành công</span>;
      case 'PENDING': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Đang xử lý</span>;
      case 'FAILED': return <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Thất bại</span>;
      default: return null;
    }
  };

  const getTypeInfo = (type) => {
    // Worker typically has IN (COURSE_REVENUE, PAYMENT, REFUND...) and OUT (WITHDRAW)
    switch (type) {
      case 'COURSE_REVENUE':
      case 'PARTNERSHIP_REVENUE':
      case 'PAYMENT':
      case 'DEPOSIT':
        return { icon: <ArrowDownCircle className="text-emerald-500" />, label: 'Tiền vào', color: 'text-emerald-600', prefix: '+' };
      case 'WITHDRAW': return { icon: <ArrowUpCircle className="text-rose-500" />, label: 'Rút tiền', color: 'text-rose-600', prefix: '-' };
      default: return { icon: <Wallet />, label: type, color: 'text-zinc-600', prefix: '' };
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN') return ['COURSE_REVENUE', 'PARTNERSHIP_REVENUE', 'PAYMENT', 'DEPOSIT'].includes(tx.type);
    if (activeTab === 'OUT') return tx.type === 'WITHDRAW';
    return true;
  });

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" /></div>;
  }

  const filteredBanks = banks.filter(bank => 
    bank.shortName.toLowerCase().includes(bankSearch.toLowerCase()) || 
    bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.code.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Ví của tôi</h1>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
          Quản lý số dư, tiền nhận từ dự án lập nghiệp và lịch sử giao dịch của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Virtual ATM Card */}
        <div className="relative rounded-2xl p-8 overflow-hidden text-white shadow-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CreditCard size={120} />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-teal-200 text-sm font-medium tracking-wider uppercase mb-1">Số dư hiện tại (Khả dụng)</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                {formatCurrency(wallet.availableBalance)}
              </h2>
            </div>

            <div className="mt-12 flex items-end justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-teal-300 text-xs font-medium uppercase mb-1">Tổng tiền đã rút</p>
                  <p className="text-emerald-300 font-semibold">{formatCurrency(wallet.totalDisbursed)}</p>
                </div>
              </div>
              <Button
                onClick={() => setWithdrawOpen(true)}
                className="bg-white text-teal-900 hover:bg-slate-100 rounded-xl shadow-lg font-semibold"
              >
                Rút tiền
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats or Instructions */}
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 flex flex-col justify-center">
          <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg mb-4">Hướng dẫn rút tiền</h3>
          <ul className="space-y-4">
            <li className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center shrink-0 font-bold text-[hsl(var(--admin-text-secondary))]">1</div>
              <p className="text-[hsl(var(--admin-text-secondary))]"><strong className="text-[hsl(var(--admin-text-primary))]">Kiểm tra số dư:</strong> Đảm bảo số dư khả dụng lớn hơn mức rút tối thiểu (50,000đ).</p>
            </li>
            <li className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center shrink-0 font-bold text-[hsl(var(--admin-text-secondary))]">2</div>
              <p className="text-[hsl(var(--admin-text-secondary))]"><strong className="text-[hsl(var(--admin-text-primary))]">Nhập thông tin:</strong> Điền chính xác Tên Ngân Hàng và Số Tài Khoản để tránh thất lạc tiền.</p>
            </li>
            <li className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center shrink-0 font-bold text-[hsl(var(--admin-text-secondary))]">3</div>
              <p className="text-[hsl(var(--admin-text-secondary))]"><strong className="text-[hsl(var(--admin-text-primary))]">Xử lý tự động:</strong> Lệnh rút sẽ được hệ thống tiếp nhận và chuyển tiền qua API tự động trong vòng vài phút.</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden mt-8">
        <div className="p-6 border-b border-[hsl(var(--admin-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Lịch sử giao dịch</h2>
          <div className="flex bg-[hsl(var(--admin-surface-elevated))] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'ALL' ? 'bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-primary))] shadow-sm' : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('IN')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'IN' ? 'bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-primary))] shadow-sm' : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'}`}
            >
              Tiền vào
            </button>
            <button
              onClick={() => setActiveTab('OUT')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'OUT' ? 'bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-primary))] shadow-sm' : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'}`}
            >
              Tiền ra
            </button>
          </div>
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
              {filteredTransactions.length > 0 ? filteredTransactions.map((tx) => {
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
                  <td colSpan="4" className="px-6 py-12 text-center text-[hsl(var(--admin-text-muted))]">
                    Chưa có giao dịch nào trong danh mục này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Rút tiền về tài khoản</h2>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Hệ thống sẽ chuyển khoản tự động đến ngân hàng của bạn.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-[hsl(var(--admin-surface-hover))] p-4 rounded-xl border border-[hsl(var(--admin-border))] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--admin-text-secondary))]">Số dư hiện tại:</span>
                  <span className="font-semibold text-[hsl(var(--admin-text-primary))]">{formatCurrency(wallet.availableBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--admin-text-secondary))]">Số tiền rút:</span>
                  <span className="font-semibold text-rose-500">-{formatCurrency(Number(withdrawAmount) || 0)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-[hsl(var(--admin-border))] flex justify-between text-sm">
                  <span className="text-[hsl(var(--admin-text-secondary))] font-medium">Số dư còn lại:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(wallet.availableBalance - (Number(withdrawAmount) || 0))}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2 block">Số tiền cần rút (VNĐ)</label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val > wallet.availableBalance) {
                      setWithdrawAmount(wallet.availableBalance.toString());
                    } else {
                      setWithdrawAmount(e.target.value);
                    }
                  }}
                  placeholder="VD: 1000000"
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-lg h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2 block flex items-center gap-1"><Building2 size={14} /> Ngân hàng</label>
                  <div 
                    className="flex items-center justify-between bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] h-10 px-3 rounded-md cursor-pointer hover:border-emerald-500 transition-colors"
                    onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                  >
                    <span className={`text-sm truncate ${bankCode ? 'text-[hsl(var(--admin-text-primary))] font-medium' : 'text-gray-400'}`}>
                      {bankCode ? banks.find(b => b.shortName === bankCode)?.name || bankCode : 'Chọn ngân hàng...'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  </div>

                  {isBankDropdownOpen && (
                    <div className="absolute z-50 top-[70px] left-0 w-full md:w-[350px] bg-white border border-[hsl(var(--admin-border))] rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-2 border-b border-[hsl(var(--admin-border))] flex items-center gap-2">
                        <Search size={16} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm ngân hàng (Tên, mã...)"
                          value={bankSearch}
                          onChange={(e) => setBankSearch(e.target.value)}
                          className="w-full text-sm outline-none border-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1">
                        {filteredBanks.length === 0 ? (
                          <div className="p-3 text-center text-sm text-gray-500">Không tìm thấy ngân hàng</div>
                        ) : (
                          filteredBanks.map(bank => (
                            <div 
                              key={bank.id}
                              className="flex items-center gap-3 p-2 hover:bg-emerald-50 cursor-pointer rounded-md transition-colors"
                              onClick={() => {
                                setBankCode(bank.shortName);
                                setIsBankDropdownOpen(false);
                                setBankSearch('');
                              }}
                            >
                              <img src={bank.logo} alt={bank.shortName} className="w-8 h-8 object-contain bg-white rounded border border-gray-100 p-0.5" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-gray-900">{bank.shortName}</span>
                                <span className="text-xs text-gray-500 truncate">{bank.name}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2 block flex items-center gap-1"><UserCircle2 size={14} /> Số tài khoản</label>
                  <Input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="VD: 0123456789"
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] h-10"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button variant="outline" onClick={() => setWithdrawOpen(false)} className="flex-1 border-[hsl(var(--admin-border))]">Hủy</Button>
              <Button onClick={handleWithdraw} disabled={withdrawLoading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-md shadow-emerald-500/20">
                {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {withdrawLoading ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
