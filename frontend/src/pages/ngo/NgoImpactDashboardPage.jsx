import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Users, CheckCircle2, CalendarDays, Wallet, ArrowUpRight, ArrowDownRight, 
  TrendingUp, Award, Clock, HeartHandshake, Plus, Calendar, MapPin, ExternalLink,
  CreditCard, Send, Lock, ShoppingCart, FileText, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { Skeleton, Button, Badge } from '@/components/ui';
import { getNgoImpactDashboard } from '@/apis/ngoDashboardApi';
import { fetchEventsAPI } from '@/apis/eventAPI';
import { getMyWallet, getMyTransactions } from '@/apis/walletApi';
import { selectCurrentUser } from '~/redux/user/userSlice';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { formatPrice, formatCurrency } from '@/utils/formatter';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const formatMonthYear = (date) => {
  const m = date.getMonth() + 1;
  return `${m < 10 ? '0' + m : m}/${date.getFullYear()}`;
};

const formatDateTime = (dateStr) => {
  const d = new Date(dateStr);
  const DD = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YYYY = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DD}/${MM}/${YYYY} ${HH}:${mm}`;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SPONSORSHIP_STATUS_MAP = {
  'draft': 'Bản nháp',
  'pending': 'Chờ duyệt',
  'active': 'Đang hoạt động',
  'completed': 'Hoàn thành',
  'cancelled': 'Đã hủy',
  'expired': 'Hết hạn'
};

const TRANSACT_STATUS_MAP = {
  'PENDING': 'Chờ xử lý',
  'COMPLETED': 'Thành công',
  'FAILED': 'Thất bại',
  'CANCELLED': 'Đã hủy'
};

const TRANSACT_TYPE_MAP = {
  'deposit': 'Nạp tiền',
  'withdraw': 'Rút tiền',
  'DEPOSIT': 'Nạp tiền',
  'WITHDRAW': 'Rút tiền',
  'RESERVE': 'Ký quỹ',
  'DISBURSE': 'Giải ngân',
  'REFUND': 'Hoàn tiền',
  'PAYMENT': 'Thanh toán',
  'PARTNERSHIP_REVENUE': 'Doanh thu hợp tác',
  'SYSTEM_FEE': 'Phí hệ thống'
};

const shortId = (id) => id ? id.toString().slice(-6).toUpperCase() : 'N/A';

const exportToExcel = (data, filename, headersMap) => {
  if (!data || !data.length) return;
  const headers = Object.keys(headersMap);
  const formattedData = data.map(row => {
    const newRow = {};
    headers.forEach(h => {
      newRow[headersMap[h]] = row[h];
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

const exportToPDF = (data, filename, headersMap, title) => {
  if (!data || !data.length) return;
  const doc = new jsPDF();
  
  const headers = Object.keys(headersMap);
  const tableHeaders = [headers.map(h => headersMap[h])];
  const tableData = data.map(row => headers.map(h => row[h]));

  const removeAccents = (str) => {
    if (str === null || str === undefined) return '';
    return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const safeTitle = removeAccents(title);
  const safeTableHeaders = [tableHeaders[0].map(h => removeAccents(h))];
  const safeTableData = tableData.map(row => row.map(cell => removeAccents(cell)));

  doc.text(safeTitle, 14, 15);
  doc.autoTable({
    startY: 20,
    head: safeTableHeaders,
    body: safeTableData,
    styles: { font: 'helvetica' }
  });
  doc.save(`${filename}.pdf`);
};

const ExportButtons = ({ onExcel, onPDF }) => (
  <div className="flex items-center gap-2">
    <button onClick={onExcel} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors border border-green-200">
      <FileSpreadsheet size={14} /> Excel
    </button>
    <button onClick={onPDF} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200">
      <FileText size={14} /> PDF
    </button>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-[2rem] p-6 flex items-center gap-4 hover:border-[hsl(var(--admin-accent))] hover:shadow-md transition-all duration-300 group">
    <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300 ${color.bg}`}>
      <Icon size={24} className={color.text} />
    </div>
    <div>
      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black text-[hsl(var(--admin-text-primary))]">{value ?? 0}</p>
    </div>
  </div>
);

export default function NgoImpactDashboardPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalGraduates: 0,
    scholarshipStats: {},
    totalEvents: 0,
    totalParticipants: 0,
    activeSponsorships: []
  });
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [resDashboard, resWallet, resTxns] = await Promise.allSettled([
        getNgoImpactDashboard(),
        getMyWallet(),
        getMyTransactions()
      ]);

      const dashboardData = resDashboard.status === 'fulfilled' ? resDashboard.value.data?.data || {} : {};
      
      let eventsData = [];
      let totalEvents = 0;
      let totalParticipants = 0;
      if (currentUser?._id) {
        const eventsRes = await fetchEventsAPI({ organizerId: currentUser._id, limit: 100 }).catch(() => ({ data: [] }));
        eventsData = eventsRes.data || [];
        totalEvents = eventsData.length;
        totalParticipants = eventsData.reduce((acc, ev) => acc + (ev.participantCount || 0), 0);
      }

      setStats({
        totalLearners: dashboardData.totalLearners || 0,
        totalGraduates: dashboardData.totalGraduates || 0,
        scholarshipStats: dashboardData.scholarshipStats || {},
        activeSponsorships: dashboardData.activeSponsorships || dashboardData.sponsorships || [],
        totalEvents,
        totalParticipants
      });

      setEventsList(eventsData);

      if (resWallet.status === 'fulfilled') {
        setWallet(resWallet.value.data);
      }

      if (resTxns.status === 'fulfilled') {
        setTransactions(resTxns.value.data || []);
      }
    } catch (err) {
      console.error('NGO impact dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Group transactions by month for Cash Flow Chart
  const cashFlowData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const monthsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = formatMonthYear(d);
      monthsMap[month] = { name: month, topup: 0, disburse: 0 };
    }

    transactions.forEach(txn => {
      if (txn.status !== 'COMPLETED') return;
      const month = formatMonthYear(new Date(txn.createdAt));
      if (monthsMap[month]) {
        if (txn.type === 'DEPOSIT') {
          monthsMap[month].topup += txn.amount;
        } else if (txn.type === 'DISBURSE') {
          monthsMap[month].disburse += txn.amount;
        }
      }
    });

    return Object.values(monthsMap);
  }, [transactions]);

  // Transaction Pie Chart Processing
  const transactionTypeData = useMemo(() => {
    const counts = transactions.reduce((acc, t) => {
      const type = t.type?.toUpperCase() || 'UNKNOWN';
      const label = TRANSACT_TYPE_MAP[type] || type;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Export functions
  const handleExportSponsorships = (type) => {
    const headers = { _id: 'Mã Tài trợ', title: 'Tên quỹ', budget: 'Ngân sách', spent: 'Đã giải ngân', remaining: 'Còn lại', targetLearners: 'Suất tài trợ', status: 'Trạng thái' };
    const data = stats.activeSponsorships.map(s => ({
      ...s,
      _id: shortId(s._id),
      budget: formatCurrency(s.budget || 0),
      spent: formatCurrency(s.spent || 0),
      remaining: formatCurrency(s.remaining || 0),
      status: SPONSORSHIP_STATUS_MAP[s.status] || s.status
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-quy-tai-tro-ngo', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-quy-tai-tro-ngo', headers, 'Danh sach quy tai tro ngo');
  };

  const handleExportEvents = (type) => {
    const headers = { title: 'Tên sự kiện', eventDate: 'Thời gian', location: 'Địa điểm', participantCount: 'Người tham gia', status: 'Trạng thái' };
    const data = eventsList.map(e => ({
      title: e.title,
      eventDate: formatDateTime(e.eventDate),
      location: e.location,
      participantCount: e.participantCount || 0,
      status: 'Đã xuất bản'
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-su-kien-ngo', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-su-kien-ngo', headers, 'Danh sach su kien ngo');
  };

  const handleExportTransactions = (type) => {
    const headers = { _id: 'Mã GD', type: 'Loại giao dịch', amount: 'Số tiền', status: 'Trạng thái', createdAt: 'Ngày giao dịch' };
    const data = transactions.map(t => ({
      ...t,
      _id: shortId(t._id),
      type: TRANSACT_TYPE_MAP[t.type] || t.type,
      amount: formatCurrency(t.amount),
      status: TRANSACT_STATUS_MAP[t.status] || t.status,
      createdAt: formatDateTime(t.createdAt)
    }));
    if (type === 'excel') exportToExcel(data, 'lich-su-giao-dich-ngo', headers);
    if (type === 'pdf') exportToPDF(data, 'lich-su-giao-dich-ngo', headers, 'Lich su giao dich ngo');
  };

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'sponsorships', label: 'Quỹ tài trợ' },
    { id: 'events', label: 'Sự kiện & Hoạt động' },
    { id: 'transactions', label: 'Giao dịch & Tài chính' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
        <Skeleton className="h-96 rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
            <Sparkles size={10} /> Impact Hub
          </span>
          <h1 className="text-4xl font-extrabold text-[hsl(var(--admin-text-primary))] tracking-tight">Trung tâm tác động xã hội</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1 font-medium">
            Quản lý dòng tiền tài trợ học bổng, tổ chức sự kiện & theo dõi tiến độ đào tạo.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          <div className="flex bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-1 rounded-full w-max shadow-sm">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-xs font-bold rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* TAB 1: TỔNG QUAN */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={Users} label="Học viên được hỗ trợ" value={stats.totalLearners} color={{ bg: 'bg-emerald-100/50 text-emerald-600', text: 'text-emerald-600' }} />
              <StatCard icon={CalendarDays} label="Lượt tham gia sự kiện" value={stats.totalParticipants} color={{ bg: 'bg-purple-100/50 text-purple-600', text: 'text-purple-600' }} />
              <StatCard icon={Wallet} label="Số dư quỹ khả dụng" value={formatCurrency(wallet?.availableBalance || 0)} color={{ bg: 'bg-blue-100/50 text-blue-600', text: 'text-blue-600' }} />
            </div>

            {/* Cashflow Chart */}
            <div className="rounded-[2.5rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
                    <Wallet className="text-emerald-500" size={20} /> Biến động dòng tiền quỹ (6 tháng)
                  </h3>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Theo dõi hoạt động Nạp quỹ & Giải ngân học phí học viên</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Nạp vào
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div> Giải ngân
                  </div>
                </div>
              </div>
              
              <div className="h-80 w-full">
                {cashFlowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDisburse" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--admin-text-muted))' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--admin-text-muted))' }} tickFormatter={(val) => `${val / 1000000}M`} />
                      <RechartsTooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))', borderRadius: '16px' }}
                      />
                      <Area type="monotone" dataKey="topup" name="Nạp quỹ" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTopup)" />
                      <Area type="monotone" dataKey="disburse" name="Giải ngân" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDisburse)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-[hsl(var(--admin-border))] rounded-2xl text-[hsl(var(--admin-text-muted))]">
                    <Wallet className="opacity-20 mb-2" size={32} />
                    <p className="text-sm">Chưa có dữ liệu giao dịch phát sinh</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUỸ TÀI TRỢ */}
        {activeTab === 'sponsorships' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard icon={HeartHandshake} label="Tổng chương trình tài trợ" value={stats.activeSponsorships.length} color={{ bg: 'bg-emerald-100/50 text-emerald-600', text: 'text-emerald-600' }} />
              <StatCard icon={Clock} label="Số dư ký quỹ" value={formatCurrency(wallet?.lockedBalance || 0)} color={{ bg: 'bg-amber-100/50 text-amber-600', text: 'text-amber-600' }} />
              <StatCard icon={Send} label="Đã giải ngân" value={formatCurrency(wallet?.totalDisbursed || 0)} color={{ bg: 'bg-blue-100/50 text-blue-600', text: 'text-blue-600' }} />
              <div className="flex items-center justify-center p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem]">
                <Button onClick={() => navigate('/ngo/sponsorships/create')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-full py-6 font-bold shadow-lg shadow-emerald-600/10">
                  <Plus size={18} /> Thiết lập Quỹ mới
                </Button>
              </div>
            </div>

            {/* Active Sponsorship Cards */}
            <div className="rounded-[2.5rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] mb-6">Quỹ tài trợ đang mở</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.activeSponsorships.length > 0 ? (
                  stats.activeSponsorships.map(sp => {
                    const target = sp.targetLearners || 1;
                    const approved = sp.stats?.approvedLearners || 0;
                    const percent = Math.min(100, Math.round((approved / target) * 100));

                    let progressColor = 'bg-emerald-500';
                    if (percent >= 90) progressColor = 'bg-rose-500';
                    else if (percent >= 60) progressColor = 'bg-amber-500';

                    return (
                      <div key={sp._id} className="p-6 rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg leading-tight line-clamp-1">{sp.title}</h4>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-none">Active</Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold text-[hsl(var(--admin-text-secondary))]">
                            <span>Đã phê duyệt {approved} suất</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="h-3 w-full bg-[hsl(var(--admin-surface-hover))] rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 ${progressColor}`} style={{ width: `${percent}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[hsl(var(--admin-border))]">
                            <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngân sách: {formatCurrency(sp.budget || 0)}</p>
                            <Button onClick={() => navigate(`/ngo/sponsorships/${sp._id}/learners`)} className="bg-[hsl(var(--admin-surface-hover))] hover:bg-emerald-600 hover:text-white text-[hsl(var(--admin-text-secondary))] h-8 px-4 text-xs font-semibold rounded-full border border-[hsl(var(--admin-border))] shadow-none">
                              Duyệt hồ sơ
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-16 text-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
                    <HeartHandshake className="mx-auto mb-3 opacity-20" size={40} />
                    <p className="text-sm font-medium">Chưa có quỹ tài trợ nào được kích hoạt.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sponsorships Table list */}
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg">Danh sách chương trình tài trợ</h3>
                <ExportButtons onExcel={() => handleExportSponsorships('excel')} onPDF={() => handleExportSponsorships('pdf')} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Mã quỹ</th>
                      <th className="px-4 py-3">Tên quỹ</th>
                      <th className="px-4 py-3 text-right">Ngân sách</th>
                      <th className="px-4 py-3 text-right">Đã chi</th>
                      <th className="px-4 py-3 text-right">Còn lại</th>
                      <th className="px-4 py-3 text-center">Mục tiêu</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.activeSponsorships.map(sp => (
                      <tr key={sp._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-600">#{shortId(sp._id)}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{sp.title}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(sp.budget || 0)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(sp.spent || 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(sp.remaining || 0)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{sp.targetLearners} học viên</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {SPONSORSHIP_STATUS_MAP[sp.status] || sp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stats.activeSponsorships.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu chương trình</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SỰ KIỆN & HOẠT ĐỘNG */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={Calendar} label="Tổng số sự kiện" value={stats.totalEvents} color={{ bg: 'bg-purple-100/50 text-purple-600', text: 'text-purple-600' }} />
              <StatCard icon={Users} label="Tổng số người tham gia" value={stats.totalParticipants} color={{ bg: 'bg-emerald-100/50 text-emerald-600', text: 'text-emerald-600' }} />
              <div className="flex items-center justify-center p-6 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-[2rem]">
                <Button onClick={() => navigate('/ngo/events/create')} className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-full py-6 font-bold shadow-lg shadow-purple-600/10">
                  <Plus size={18} /> Tạo sự kiện mới
                </Button>
              </div>
            </div>

            {/* Events list table */}
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg">Danh sách sự kiện cộng đồng</h3>
                <ExportButtons onExcel={() => handleExportEvents('excel')} onPDF={() => handleExportEvents('pdf')} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Tên sự kiện</th>
                      <th className="px-4 py-3">Thời gian diễn ra</th>
                      <th className="px-4 py-3">Địa điểm</th>
                      <th className="px-4 py-3 text-center">Người tham gia</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsList.map(e => (
                      <tr key={e._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-800">{e.title}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(e.eventDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={e.location}>{e.location}</td>
                        <td className="px-4 py-3 text-center font-bold text-purple-600">{e.participantCount || 0} người</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            Đã xuất bản
                          </span>
                        </td>
                      </tr>
                    ))}
                    {eventsList.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu sự kiện</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GIAO DỊCH & TÀI CHÍNH */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard icon={CreditCard} label="Tổng giao dịch" value={transactions.length} color={{ bg: 'bg-emerald-100/50 text-emerald-600', text: 'text-emerald-600' }} />
              <StatCard icon={Lock} label="Ví đang ký quỹ" value={formatCurrency(wallet?.lockedBalance || 0)} color={{ bg: 'bg-amber-100/50 text-amber-600', text: 'text-amber-600' }} />
              <StatCard icon={Send} label="Giải ngân học phí" value={formatCurrency(wallet?.totalDisbursed || 0)} color={{ bg: 'bg-rose-100/50 text-rose-600', text: 'text-rose-600' }} />
              <StatCard icon={Wallet} label="Số dư ví khả dụng" value={formatCurrency(wallet?.availableBalance || 0)} color={{ bg: 'bg-blue-100/50 text-blue-600', text: 'text-blue-600' }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pie Chart of transaction distribution */}
              <div className="rounded-[2.5rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm flex flex-col justify-between">
                <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] mb-6">Phân loại giao dịch</h3>
                <div className="h-64 relative">
                  {transactionTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={transactionTypeData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                        >
                          {transactionTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
                      Chưa có dữ liệu giao dịch
                    </div>
                  )}
                </div>
                
                {transactionTypeData.length > 0 && (
                  <div className="flex flex-col gap-2 mt-4">
                    {transactionTypeData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span>{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-white">{item.value} GD</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions Table list */}
              <div className="lg:col-span-2 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg">Lịch sử giao dịch ví NGO</h3>
                  <ExportButtons onExcel={() => handleExportTransactions('excel')} onPDF={() => handleExportTransactions('pdf')} />
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 bg-slate-50">Mã GD</th>
                        <th className="px-4 py-3 bg-slate-50">Loại giao dịch</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Số tiền</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                        <th className="px-4 py-3 bg-slate-50">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-500">#{shortId(t._id)}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800">{TRANSACT_TYPE_MAP[t.type] || t.type}</span>
                          </td>
                          <td className={`px-4 py-3 text-right font-black ${
                            ['DEPOSIT', 'REFUND', 'PARTNERSHIP_REVENUE'].includes(t.type?.toUpperCase()) ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {['DEPOSIT', 'REFUND', 'PARTNERSHIP_REVENUE'].includes(t.type?.toUpperCase()) ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {TRANSACT_STATUS_MAP[t.status] || t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(t.createdAt)}</td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có giao dịch phát sinh</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
