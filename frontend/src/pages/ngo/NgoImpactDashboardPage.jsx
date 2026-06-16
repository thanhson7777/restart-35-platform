import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Users, CheckCircle2, CalendarDays, Wallet, ArrowUpRight, ArrowDownRight, 
  TrendingUp, Award, BookOpen, Clock, HeartHandshake, Plus
} from 'lucide-react';
import { Skeleton, Button, Dialog, DialogContent, Badge } from '@/components/ui';
import { getNgoImpactDashboard } from '@/apis/ngoDashboardApi';
import { fetchEventsAPI } from '@/apis/eventAPI';
import { getCourses } from '@/apis/courseApi';
import { getMyWallet, getMyTransactions } from '@/apis/walletApi';
import { selectCurrentUser } from '~/redux/user/userSlice';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { formatPrice } from '@/utils/formatter';

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

const COLORS = ['hsl(var(--admin-success))', 'hsl(var(--admin-warning))', 'hsl(var(--admin-accent))', 'hsl(var(--admin-destructive))'];

export default function NgoImpactDashboardPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalGraduates: 0,
    scholarshipStats: {},
    totalEvents: 0,
    totalParticipants: 0,
    activeSponsorships: []
  });
  const [courses, setCourses] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [resDashboard, resCourses, resWallet, resTxns] = await Promise.allSettled([
        getNgoImpactDashboard(),
        getCourses({ limit: 50, isFree: false, acceptsSponsorship: true }),
        getMyWallet(),
        getMyTransactions()
      ]);

      const dashboardData = resDashboard.status === 'fulfilled' ? resDashboard.value.data?.data || {} : {};
      
      let totalEvents = 0;
      let totalParticipants = 0;
      if (currentUser?._id) {
        const eventsRes = await fetchEventsAPI({ organizerId: currentUser._id, limit: 100 }).catch(() => ({ data: [] }));
        const eventsData = eventsRes.data || [];
        totalEvents = eventsData.length;
        totalParticipants = eventsData.reduce((acc, ev) => acc + (ev.participantCount || 0), 0);
      }

      setStats({
        totalLearners: dashboardData.totalLearners || 0,
        totalGraduates: dashboardData.totalGraduates || 0,
        scholarshipStats: dashboardData.scholarshipStats || {},
        activeSponsorships: dashboardData.activeSponsorships || [],
        totalEvents,
        totalParticipants
      });

      if (resCourses.status === 'fulfilled') {
        const paidCourses = (resCourses.value.data?.data || []).filter(c => c.fee > 0).slice(0, 4);
        setCourses(paidCourses);
      }

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

  // Data processing for Charts
  const learnerData = [
    { name: 'Đang học', value: Math.max(0, stats.totalLearners - stats.totalGraduates) },
    { name: 'Tốt nghiệp', value: stats.totalGraduates }
  ].filter(item => item.value > 0);

  // Group transactions by month for Cash Flow Chart
  const cashFlowData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // Create a map of last 6 months
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="md:col-span-2 h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-[hsl(var(--admin-text-primary))] tracking-tight">Impact Hub</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-base mt-1 font-medium">
              Trung tâm báo cáo tác động xã hội & Quản lý quỹ tài trợ
            </p>
          </div>
          <Button onClick={() => navigate('/ngo/sponsorships/create')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-full shadow-lg shadow-emerald-600/20 px-6">
            <Plus size={18} /> Lập Quỹ mới
          </Button>
        </div>

        {/* BENTO GRID: ROW 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* HERO METRIC: Total Learners (Spans 2 columns) */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-8 shadow-xl shadow-emerald-900/10 border border-emerald-500/20 group">
            {/* Background elements */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-400/20 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-3 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                <Users size={18} className="text-emerald-100" />
                <span className="text-sm font-semibold text-emerald-50">Học viên được hỗ trợ</span>
              </div>
              
              <div className="mt-8">
                <h2 className="text-6xl md:text-7xl font-black tracking-tighter drop-shadow-sm">
                  {stats.totalLearners}
                </h2>
                <div className="flex items-center gap-2 mt-3 text-emerald-100">
                  <TrendingUp size={20} className="text-emerald-300" />
                  <span className="text-base font-medium">Đang tạo ra tác động tích cực mỗi ngày</span>
                </div>
              </div>
            </div>
          </div>

          {/* SQUARE METRIC: Graduates */}
          <div className="rounded-[2rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 shadow-sm flex flex-col justify-between group hover:border-emerald-500/30 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Award size={24} />
            </div>
            <div>
              <p className="text-4xl font-extrabold text-[hsl(var(--admin-text-primary))]">{stats.totalGraduates}</p>
              <p className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mt-1">Học viên tốt nghiệp</p>
            </div>
          </div>

          {/* SQUARE METRIC: Events */}
          <div className="rounded-[2rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 shadow-sm flex flex-col justify-between group hover:border-purple-500/30 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-4xl font-extrabold text-[hsl(var(--admin-text-primary))]">{stats.totalParticipants}</p>
              <p className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mt-1">Lượt tham gia sự kiện</p>
            </div>
          </div>

        </div>

        {/* BENTO GRID: ROW 2 - FINANCIALS & CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CASH FLOW CHART (Spans 2 cols) */}
          <div className="lg:col-span-2 rounded-[2rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
                  <Wallet className="text-emerald-500" size={20} /> Dòng tiền Quỹ (6 tháng)
                </h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1">Biến động Nạp quỹ & Giải ngân học phí</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-medium"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Nạp vào</div>
                <div className="flex items-center gap-2 text-xs font-medium"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Giải ngân</div>
              </div>
            </div>
            
            <div className="h-72 w-full">
              {cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDisburse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--admin-text-muted))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--admin-text-muted))' }} tickFormatter={(val) => `${val / 1000000}M`} />
                    <RechartsTooltip 
                      formatter={(value) => formatPrice(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area type="monotone" dataKey="topup" name="Nạp quỹ" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTopup)" />
                    <Area type="monotone" dataKey="disburse" name="Giải ngân" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorDisburse)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-[hsl(var(--admin-border))] rounded-2xl text-[hsl(var(--admin-text-muted))]">
                  <Wallet className="opacity-20 mb-2" size={32} />
                  <p className="text-sm">Chưa có dữ liệu giao dịch</p>
                </div>
              )}
            </div>
          </div>

          {/* WALLET BALANCE & RECENT TRANSACTIONS */}
          <div className="rounded-[2rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] mb-6">Số dư Ví Ngo</h3>
            
            <div className="bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-100 dark:to-white rounded-2xl p-5 text-white dark:text-zinc-900 shadow-lg mb-6">
              <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">Khả dụng (Available)</p>
              <p className="text-3xl font-black">{formatPrice(wallet?.availableBalance || 0)}</p>
              
              <div className="mt-4 pt-4 border-t border-white/10 dark:border-black/10 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-medium opacity-70 uppercase">Đang khóa (Reserved)</p>
                  <p className="text-sm font-bold">{formatPrice(wallet?.lockedBalance || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium opacity-70 uppercase">Đã chi (Disbursed)</p>
                  <p className="text-sm font-bold">{formatPrice(wallet?.totalDisbursed || 0)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <h4 className="text-sm font-bold text-[hsl(var(--admin-text-secondary))] mb-4 flex items-center justify-between">
                Giao dịch gần đây
                <button onClick={() => navigate('/ngo/dashboard/wallet')} className="text-xs text-emerald-600 hover:underline">Xem tất cả</button>
              </h4>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[220px]">
                {transactions.slice(0, 5).map(txn => (
                  <div key={txn._id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      txn.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 
                      txn.type === 'DISBURSE' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 
                      'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                    }`}>
                      {txn.type === 'DEPOSIT' ? <ArrowUpRight size={18} /> : 
                       txn.type === 'DISBURSE' ? <ArrowDownRight size={18} /> : 
                       <Clock size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))] truncate">
                        {txn.type === 'DEPOSIT' ? 'Nạp tiền vào ví' : txn.type === 'DISBURSE' ? 'Giải ngân học phí' : 'Khóa quỹ tài trợ'}
                      </p>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDateTime(txn.createdAt)}</p>
                    </div>
                    <div className={`text-sm font-bold whitespace-nowrap ${
                      txn.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {txn.type === 'DEPOSIT' ? '+' : '-'}{formatPrice(txn.amount)}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-xs text-[hsl(var(--admin-text-muted))] py-4">Chưa có giao dịch</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BENTO GRID: ROW 3 - CROWDFUNDING CARDS & DONUT CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ACTIVE SPONSORSHIPS (CROWDFUNDING STYLE) */}
          <div className="lg:col-span-2 rounded-[2rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
                  <HeartHandshake className="text-emerald-500" size={20} /> Quản lý Quỹ Đang mở
                </h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1">Tiến độ cấp phát học bổng cho người lao động</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/ngo/sponsorships')} className="rounded-full text-xs font-semibold px-4 border-[hsl(var(--admin-border))]">
                Xem toàn bộ
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {stats.activeSponsorships && stats.activeSponsorships.length > 0 ? (
                stats.activeSponsorships.map(sp => {
                  const target = sp.targetLearners || 1;
                  const approved = sp.stats?.approvedLearners || 0;
                  const percent = Math.min(100, Math.round((approved / target) * 100));
                  
                  // Color dynamic
                  let progressColor = 'bg-emerald-500';
                  if (percent >= 90) progressColor = 'bg-rose-500';
                  else if (percent >= 60) progressColor = 'bg-amber-500';

                  return (
                    <div key={sp._id} className="p-5 rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-[hsl(var(--admin-text-primary))] text-lg leading-tight line-clamp-2 pr-4">{sp.title}</h4>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">Active</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-[hsl(var(--admin-text-secondary))]">Đã duyệt {approved} suất</span>
                          <span className="text-[hsl(var(--admin-text-primary))]">{percent}%</span>
                        </div>
                        <div className="h-3 w-full bg-[hsl(var(--admin-surface-hover))] rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[hsl(var(--admin-border))]">
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                            Mục tiêu: {target} suất
                          </p>
                          <Button 
                            onClick={() => navigate(`/ngo/sponsorships/${sp._id}/learners`)} 
                            className="bg-[hsl(var(--admin-surface-hover))] hover:bg-[hsl(var(--admin-success))] hover:text-white text-[hsl(var(--admin-text-secondary))] h-8 px-3 text-xs shadow-none border border-[hsl(var(--admin-border))]"
                          >
                            Duyệt hồ sơ
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full py-12 text-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
                  <HeartHandshake className="mx-auto mb-3 opacity-20" size={40} />
                  <p>Bạn chưa có quỹ tài trợ nào đang mở.</p>
                  <Button variant="link" onClick={() => navigate('/ngo/sponsorships/create')} className="text-emerald-600">Tạo quỹ mới ngay</Button>
                </div>
              )}
            </div>
          </div>

          {/* DONUT CHART: LEARNER STATUS */}
          <div className="rounded-[2rem] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6 lg:p-8 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] mb-6">Trạng thái Học viên</h3>
            
            <div className="flex-1 relative min-h-[250px]">
              {stats.totalLearners > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={learnerData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {learnerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))', borderRadius: '12px', padding: '8px 12px' }}
                        itemStyle={{ color: 'hsl(var(--admin-text-primary))', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Inner text for Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-[hsl(var(--admin-text-primary))]">{stats.totalLearners}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[hsl(var(--admin-text-muted))]">Tổng số</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl text-sm">
                  Chưa có dữ liệu học viên
                </div>
              )}
            </div>

            {stats.totalLearners > 0 && (
              <div className="flex flex-col gap-3 mt-6">
                {learnerData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between px-4 py-2 rounded-xl bg-[hsl(var(--admin-surface-hover))]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-sm font-semibold text-[hsl(var(--admin-text-secondary))]">{item.name}</span>
                    </div>
                    <span className="font-bold text-[hsl(var(--admin-text-primary))]">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </>
  );
}
