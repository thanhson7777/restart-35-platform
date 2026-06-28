import { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, BookOpen, CheckCircle2, Wallet, Users, MessageSquare, 
  TrendingUp, Award, Calendar, CreditCard, XCircle, Heart 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { Skeleton } from '@/components/ui';

import { getMyEnrollments } from '@/apis/courseApi';
import { getMyApplications, getMyInterviews, getMyOffers } from '@/apis/recruitmentAPI';
import { getMyPayments } from '@/apis/paymentApi';
import { forumApi } from '@/apis/forumApi';
import { formatCurrency } from '@/utils/formatter';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 flex items-center gap-4 hover:border-[hsl(var(--border))] transition-colors shadow-sm">
    <div className={`p-4 rounded-2xl ${color.bg}`}>
      <Icon size={24} className={color.text} />
    </div>
    <div>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1 font-medium">{label}</p>
      <p className="text-2xl font-extrabold text-[hsl(var(--foreground))]">{value ?? 0}</p>
    </div>
  </div>
);

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7'];

const APP_STATUS_MAP = {
  'new': 'Mới',
  'pending': 'Chờ duyệt',
  'reviewing': 'Đang xem xét',
  'shortlisted': 'Lọt vào sơ tuyển',
  'interview_scheduled': 'Lịch phỏng vấn',
  'interviewed': 'Đã phỏng vấn',
  'offered': 'Đề nghị nhận việc',
  'hired': 'Đã tuyển',
  'rejected': 'Từ chối',
  'withdrawn': 'Đã rút'
};

const ENROLLMENT_STATUS_MAP = {
  'active': 'Đang học',
  'in_progress': 'Đang học',
  'completed': 'Hoàn thành',
  'suspended': 'Đình chỉ',
  'dropped': 'Bỏ học',
  'pending': 'Chờ duyệt'
};

const PAYMENT_STATUS_MAP = {
  'PENDING': 'Chờ thanh toán',
  'COMPLETED': 'Thành công',
  'FAILED': 'Thất bại',
  'REFUNDED': 'Đã hoàn tiền'
};

const PAYMENT_METHOD_MAP = {
  'VNPAY': 'VNPay',
  'MOMO': 'MoMo',
  'STRIPE': 'Thẻ quốc tế',
  'TRANSFER': 'Chuyển khoản'
};

const shortId = (id) => id ? id.toString().slice(-6).toUpperCase() : 'N/A';

export default function WorkerAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [applications, setApplications] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [posts, setPosts] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, enrollRes, intRes, offRes, payRes, postRes] = await Promise.all([
        getMyApplications({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        getMyEnrollments().catch(() => ({ data: [] })),
        getMyInterviews({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        getMyOffers({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        getMyPayments({ limit: 100 }).catch(() => ({ data: [] })),
        forumApi.getMyPosts({ limit: 100 }).catch(() => ({ data: [] }))
      ]);

      const appData = appRes?.data?.data?.applications || appRes?.data?.data || appRes?.data || [];
      const enrollData = Array.isArray(enrollRes?.data) ? enrollRes.data : (Array.isArray(enrollRes?.data?.data) ? enrollRes.data.data : []);
      const intData = Array.isArray(intRes?.data?.data) ? intRes.data.data : [];
      const offData = Array.isArray(offRes?.data?.data) ? offRes.data.data : [];
      const payData = Array.isArray(payRes?.data) ? payRes.data : (Array.isArray(payRes?.data?.data) ? payRes.data.data : []);
      const postData = Array.isArray(postRes?.data) ? postRes.data : (Array.isArray(postRes?.data?.data) ? postRes.data.data : []);

      setApplications(Array.isArray(appData) ? appData : []);
      setEnrollments(enrollData);
      setInterviews(intData);
      setOffers(offData);
      setPayments(payData);
      setPosts(postData);
    } catch (err) {
      console.error('Worker analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived Stats
  const activeCoursesCount = enrollments.filter(e => e.status === 'active' || e.status === 'in_progress').length;
  const completedCoursesCount = enrollments.filter(e => e.status === 'completed').length;
  const totalAppsCount = applications.length;
  const totalTransAmount = payments.filter(t => t.status?.toUpperCase() === 'COMPLETED').reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);

  // Overview Charts
  const monthlyData = (() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0,
      });
    }
    applications.forEach(a => {
      const d = new Date(a.appliedAt || a.createdAt);
      const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
      if (m) m.count++;
    });
    return months.map(({ label, count }) => ({ label, count }));
  })();

  // Learning Charts
  const enrollDonutData = (() => {
    const counts = {};
    enrollments.forEach(e => {
      const s = e.status || 'active';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: ENROLLMENT_STATUS_MAP[key] ?? key,
        value
      }));
  })();

  // Jobs Charts
  const funnelData = (() => {
    const steps = ['new', 'reviewing', 'interview_scheduled', 'offered', 'hired'];
    const labels = ['Đã nộp', 'Đang duyệt', 'Phỏng vấn', 'Được mời', 'Đã nhận'];
    return steps.map((key, i) => {
      const stepIdx = i;
      const count = applications.filter(a => {
        const aIdx = steps.indexOf(a.status);
        if (aIdx === -1 && a.status !== 'rejected' && a.status !== 'withdrawn') return i === 0; 
        return aIdx >= stepIdx;
      }).length;
      return { name: labels[i], value: count };
    });
  })();

  // Payments Charts
  const payment7DaysData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toLocaleDateString('en-CA'), // YYYY-MM-DD
        label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        amount: 0
      });
    }
    payments.forEach(p => {
      if (p.status?.toUpperCase() === 'COMPLETED') {
        const d = new Date(p.createdAt).toLocaleDateString('en-CA');
        const day = days.find(x => x.date === d);
        if (day) day.amount += Math.abs(p.amount || 0);
      }
    });
    return days;
  })();

  // Community Charts
  const postInteractionsData = (() => {
    return posts.slice(0, 5).map(p => ({
      name: p.title?.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
      comments: p.commentCount || 0,
      likes: p.reactions?.thumbsUp || 0
    }));
  })();

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'learning', label: 'Học tập' },
    { id: 'jobs', label: 'Việc làm' },
    { id: 'payments', label: 'Thanh toán' },
    { id: 'community', label: 'Cộng đồng' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--foreground))]">Thống kê của tôi</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
            Theo dõi tiến trình học tập, cơ hội việc làm và các hoạt động của bạn.
          </p>
        </div>

        <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          <div className="flex bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-1 rounded-full w-max shadow-sm">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-[hsl(var(--muted))]" />)}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} label="Khóa đang học" value={activeCoursesCount} color={{ bg: 'bg-blue-100/50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' }} />
                <StatCard icon={Award} label="Khóa hoàn thành" value={completedCoursesCount} color={{ bg: 'bg-emerald-100/50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' }} />
                <StatCard icon={Briefcase} label="Đơn ứng tuyển" value={totalAppsCount} color={{ bg: 'bg-indigo-100/50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' }} />
                <StatCard icon={Wallet} label="Tổng tiền giao dịch" value={formatCurrency(totalTransAmount)} color={{ bg: 'bg-amber-100/50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">Lưu lượng nộp đơn (6 tháng qua)</h3>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                        <Area type="monotone" dataKey="count" name="Số đơn nộp" stroke="#818cf8" strokeWidth={3} fill="url(#trendArea)" activeDot={{ r: 6, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">Khóa học đang học</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {enrollments.filter(e => e.status === 'active' || e.status === 'in_progress').map(e => (
                      <div key={e._id} className="flex items-start justify-between p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors">
                        <div>
                          <p className="font-medium text-[hsl(var(--foreground))] line-clamp-1">{e.course?.title || 'Khóa học'}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Đăng ký: {new Date(e.enrolledAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold rounded-lg">Đang học</span>
                      </div>
                    ))}
                    {enrollments.filter(e => e.status === 'active' || e.status === 'in_progress').length === 0 && (
                      <div className="h-full flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm italic">
                        Chưa có khóa học nào đang diễn ra
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HỌC TẬP */}
          {activeTab === 'learning' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} label="Tổng số khóa" value={enrollments.length} color={{ bg: 'bg-blue-100/50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' }} />
                <StatCard icon={TrendingUp} label="Đang học" value={activeCoursesCount} color={{ bg: 'bg-amber-100/50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' }} />
                <StatCard icon={CheckCircle2} label="Đã hoàn thành" value={completedCoursesCount} color={{ bg: 'bg-emerald-100/50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' }} />
                <StatCard icon={XCircle} label="Đã hủy/Bỏ" value={enrollments.filter(e => e.status === 'dropped' || e.status === 'cancelled').length} color={{ bg: 'bg-rose-100/50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">Trạng thái khóa học</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={enrollDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                          {enrollDonutData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">Danh sách Khóa học</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[350px] relative custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-[hsl(var(--muted-foreground))] uppercase bg-[hsl(var(--muted))] sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">Tên khóa học</th>
                          <th className="px-4 py-3">Hình thức</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3 rounded-tr-lg">Ngày đăng ký</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map(e => (
                          <tr key={e._id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{e.course?.title || 'N/A'}</td>
                            <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] uppercase text-xs">{e.course?.delivery_type || 'VIDEO'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                                {ENROLLMENT_STATUS_MAP[e.status] || e.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{new Date(e.enrolledAt).toLocaleDateString('vi-VN')}</td>
                          </tr>
                        ))}
                        {enrollments.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Chưa có dữ liệu</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VIỆC LÀM */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Briefcase} label="Tổng CV đã nộp" value={applications.length} color={{ bg: 'bg-blue-100/50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' }} />
                <StatCard icon={TrendingUp} label="Đang chờ duyệt" value={applications.filter(a => a.status === 'new' || a.status === 'pending').length} color={{ bg: 'bg-amber-100/50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' }} />
                <StatCard icon={Calendar} label="Lịch phỏng vấn" value={interviews.filter(i => i.status === 'SCHEDULED').length} color={{ bg: 'bg-purple-100/50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' }} />
                <StatCard icon={CheckCircle2} label="Lời mời (Offers)" value={offers.length} color={{ bg: 'bg-emerald-100/50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">Phễu trạng thái ứng tuyển</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Bar dataKey="value" name="Số lượng" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={32}>
                          {funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">Danh sách đơn ứng tuyển</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] relative custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-[hsl(var(--muted-foreground))] uppercase bg-[hsl(var(--muted))] sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">Công việc</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3 rounded-tr-lg">Ngày nộp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map(app => (
                          <tr key={app._id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{app.jobTitle || app.job?.title || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                                {APP_STATUS_MAP[app.status] || app.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{new Date(app.appliedAt).toLocaleDateString('vi-VN')}</td>
                          </tr>
                        ))}
                        {applications.length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Chưa có dữ liệu</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: THANH TOÁN */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={CreditCard} label="Tổng số thanh toán" value={payments.length} color={{ bg: 'bg-sky-100/50 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400' }} />
                <StatCard icon={Wallet} label="Thành công" value={payments.filter(t => t.status?.toUpperCase() === 'COMPLETED').length} color={{ bg: 'bg-emerald-100/50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' }} />
                <StatCard icon={CreditCard} label="Tổng chi phí" value={formatCurrency(payments.filter(t => t.status?.toUpperCase() === 'COMPLETED').reduce((acc, t) => acc + Math.abs(t.amount), 0))} color={{ bg: 'bg-rose-100/50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' }} />
              </div>

              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--foreground))]">Chi tiêu (7 ngày qua)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={payment7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000000 ? `${val/1000000}tr` : val >= 1000 ? `${val/1000}k` : val} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                        formatter={(value) => [formatCurrency(value), 'Số tiền']}
                        cursor={{ fill: 'hsl(var(--muted))' }}
                      />
                      <Bar dataKey="amount" name="Số tiền" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--foreground))]">Lịch sử thanh toán</h3>
                </div>
                <div className="overflow-x-auto max-h-[350px] relative custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[hsl(var(--muted-foreground))] uppercase bg-[hsl(var(--muted))] sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Mã TT</th>
                        <th className="px-4 py-3">Khóa học</th>
                        <th className="px-4 py-3">Phương thức</th>
                        <th className="px-4 py-3 text-right">Số tiền</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3 rounded-tr-lg">Ngày thanh toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(t => (
                        <tr key={t._id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                          <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">#{shortId(t._id)}</td>
                          <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-[200px] truncate" title={t.course?.title || t.description}>{t.course?.title || t.description || 'Mua khóa học'}</td>
                          <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{PAYMENT_METHOD_MAP[t.paymentMethod?.toUpperCase()] || t.paymentMethod || 'VNPay'}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            <span className={t.status?.toUpperCase() === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-600'}>
                              {formatCurrency(t.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                              {PAYMENT_STATUS_MAP[t.status?.toUpperCase()] || t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Chưa có lịch sử thanh toán khóa học</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CỘNG ĐỒNG */}
          {activeTab === 'community' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} label="Bài đăng" value={posts.length} color={{ bg: 'bg-indigo-100/50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' }} />
                <StatCard icon={Users} label="Bình luận" value={posts.reduce((acc, p) => acc + (p.commentCount || 0), 0)} color={{ bg: 'bg-teal-100/50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' }} />
                <StatCard icon={Heart} label="Lượt tim" value={posts.reduce((acc, p) => acc + (p.reactions?.thumbsUp || 0), 0)} color={{ bg: 'bg-rose-100/50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' }} />
              </div>

              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm mb-6">
                <div className="mb-6">
                  <h3 className="font-bold text-[hsl(var(--foreground))]">Tương tác bài đăng gần đây</h3>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={postInteractionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                        cursor={{ fill: 'hsl(var(--muted))' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="likes" name="Lượt tim" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar dataKey="comments" name="Bình luận" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--foreground))]">Bài đăng trên diễn đàn</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] relative custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[hsl(var(--muted-foreground))] uppercase bg-[hsl(var(--muted))] sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Tiêu đề bài viết</th>
                        <th className="px-4 py-3">Chủ đề</th>
                        <th className="px-4 py-3 text-center">Bình luận</th>
                        <th className="px-4 py-3 text-center">Tương tác</th>
                        <th className="px-4 py-3 rounded-tr-lg">Ngày đăng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map(p => (
                        <tr key={p._id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]">
                          <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                            <div className="line-clamp-2" title={p.title}>{p.title}</div>
                          </td>
                          <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                              {p.category?.name || (p.tags && p.tags.length > 0 ? p.tags[0] : 'Chung')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-[hsl(var(--muted-foreground))] font-medium">{p.commentCount || 0}</td>
                          <td className="px-4 py-3 text-center text-[hsl(var(--muted-foreground))] font-medium">{p.reactions?.thumbsUp || 0}</td>
                          <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                      {posts.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Chưa có bài đăng nào</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
