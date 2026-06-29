import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Calendar, CheckCircle2, UserPlus, Building2, Download, Wallet, CreditCard, Clock, XCircle, FileText, FileSpreadsheet, HeartHandshake, ShoppingCart, Send, Lock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';

import { getEnterpriseDashboard } from '@/apis/enterpriseDashboardApi';
import { getEnterpriseJobs, getEnterpriseApplications } from '@/apis/recruitmentAPI';
import { getMyWallet, getMyTransactions } from '@/apis/walletApi';
import { formatPrice, formatCurrency } from '@/utils/formatter';
import { Skeleton } from '@/components/ui';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 flex items-center gap-4 hover:border-[hsl(var(--admin-accent))] transition-colors shadow-sm">
    <div className={`p-4 rounded-2xl ${color.bg}`}>
      <Icon size={24} className={color.text} />
    </div>
    <div>
      <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-1 font-medium">{label}</p>
      <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">{value ?? 0}</p>
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
  'rejected': 'Từ chối'
};

const PARTNERSHIP_STATUS_MAP = {
  'pending': 'Chờ duyệt',
  'negotiating': 'Thương lượng',
  'active': 'Đang hoạt động',
  'rejected': 'Từ chối',
  'cancelled': 'Đã hủy',
  'expired': 'Hết hạn'
};

const SPONSORSHIP_STATUS_MAP = {
  'pending': 'Chờ duyệt',
  'active': 'Đang hoạt động',
  'completed': 'Hoàn thành',
  'cancelled': 'Đã hủy',
  'expired': 'Hết hạn'
};

const ENROLLMENT_STATUS_MAP = {
  'active': 'Đang học',
  'completed': 'Đã tốt nghiệp',
  'suspended': 'Đình chỉ',
  'dropped': 'Bỏ học',
  'pending': 'Chờ duyệt'
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
  'PAYMENT': 'Mua gói / Thanh toán',
  'COURSE_REVENUE': 'Doanh thu',
  'SYSTEM_FEE': 'Phí hệ thống'
};

const COVERAGE_MAP = {
  'FULL': 'Toàn phần',
  'PARTIAL': 'Bán phần',
  'FIXED_AMOUNT': 'Cố định'
};

const shortId = (id) => id ? id.toString().slice(-6).toUpperCase() : 'N/A';


const ExportButtons = ({ onExcel, onPDF }) => (
  <div className="flex items-center gap-2">
    <button onClick={onExcel} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
      <FileSpreadsheet size={16} /> Excel
    </button>
    <button onClick={onPDF} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
      <FileText size={16} /> PDF
    </button>
  </div>
);

export default function EnterpriseDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Data for lists
  const [jobsList, setJobsList] = useState([]);
  const [applicationsList, setApplicationsList] = useState([]);
  const [walletData, setWalletData] = useState({ balance: 0 });
  const [transactionsList, setTransactionsList] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, jobsRes, appsRes, walletRes, transRes] = await Promise.all([
        getEnterpriseDashboard().catch(() => ({ data: { data: {} } })),
        getEnterpriseJobs({ limit: 50 }).catch(() => ({ data: { data: [] } })),
        getEnterpriseApplications({ limit: 50 }).catch(() => ({ data: { data: [] } })),
        getMyWallet().catch(() => ({ data: { balance: 0 } })),
        getMyTransactions().catch(() => ({ data: [] }))
      ]);
      setStats(dashRes.data?.data || {});
      setJobsList(Array.isArray(jobsRes.data?.data) ? jobsRes.data.data : []);
      setApplicationsList(Array.isArray(appsRes.data?.data) ? appsRes.data.data : []);
      setWalletData(walletRes.data || { availableBalance: 0 });
      setTransactionsList(Array.isArray(transRes.data) ? transRes.data : []);
    } catch (err) {
      console.error('Enterprise dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const funnelData = stats.applicationFunnel || [];
  const trendData = stats.applicationTrend || [];
  const applicationStatusData = stats.applicationStatusData || [];
  const jobStatusData = stats.jobStatusData || [];
  const partnershipStatusData = stats.partnershipStatusData || [];
  const sponsorshipStatusData = stats.sponsorshipStatusData || [];
  
  const activePartnerships = stats.activePartnerships || [];
  const activeSponsorships = stats.activeSponsorships || [];
  const sponsoredLearners = stats.sponsoredLearners || [];

  const reserveCount = transactionsList.filter(t => t.type?.toUpperCase() === 'RESERVE').length;
  const disburseCount = transactionsList.filter(t => t.type?.toUpperCase() === 'DISBURSE').length;
  const paymentCount = transactionsList.filter(t => t.type?.toUpperCase() === 'PAYMENT').length;

  const transactionTypeData = Object.entries(
    transactionsList.reduce((acc, t) => {
      const type = t.type?.toUpperCase() || 'UNKNOWN';
      const label = TRANSACT_TYPE_MAP[type] || type;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const transactionStatusData = Object.entries(
    transactionsList.reduce((acc, t) => {
      const status = TRANSACT_STATUS_MAP[t.status] || t.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const timeSeriesDataMap = [...transactionsList].reverse().reduce((acc, t) => {
    if (t.status !== 'COMPLETED') return acc;
    const dateStr = new Date(t.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    if (!acc[dateStr]) acc[dateStr] = { date: dateStr, Inflow: 0, Outflow: 0 };
    
    const isIncoming = ['DEPOSIT', 'REFUND', 'COURSE_REVENUE'].includes(t.type?.toUpperCase());
    if (isIncoming) {
      acc[dateStr].Inflow += Math.abs(t.amount);
    } else {
      acc[dateStr].Outflow += Math.abs(t.amount);
    }
    return acc;
  }, {});
  let currentCumulative = 0;
  const timeSeriesData = Object.values(timeSeriesDataMap).map(d => {
    currentCumulative += d.Outflow;
    return { ...d, cumulativeOutflow: currentCumulative };
  });

  const handleExportJobs = (type) => {
    const headers = { title: 'Tiêu đề', status: 'Trạng thái', views: 'Lượt xem', applicationsCount: 'Số ứng tuyển', createdAt: 'Ngày tạo' };
    const data = jobsList.map(j => ({ 
      ...j, 
      title: j.job?.title || 'Chưa có tiêu đề',
      views: j.stats?.views || 0,
      applicationsCount: j.stats?.applications || 0,
      createdAt: new Date(j.createdAt).toLocaleDateString('vi-VN') 
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-viec-lam', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-viec-lam', headers, 'Danh sách việc làm');
  };

  const handleExportApplications = (type) => {
    const headers = { fullName: 'Ứng viên', jobTitle: 'Tin tuyển dụng', status: 'Trạng thái', source: 'Nguồn', appliedAt: 'Ngày ứng tuyển' };
    const data = applicationsList.map(a => ({
      fullName: a.worker?.name || 'N/A',
      jobTitle: a.job?.title || 'N/A',
      status: APP_STATUS_MAP[a.status] || a.status,
      source: a.source,
      appliedAt: new Date(a.appliedAt).toLocaleString('vi-VN')
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-ung-vien', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-ung-vien', headers, 'Danh sách ứng viên');
  };

  const handleExportPartnerships = (type) => {
    const headers = { _id: 'Mã Hợp tác', trainerName: 'Đối tác', jobTitle: 'Tuyển dụng', status: 'Trạng thái', linkedCourses: 'Khóa học liên kết' };
    const data = activePartnerships.map(p => ({
      ...p,
      _id: shortId(p._id),
      trainerName: p.trainer?.displayName || 'Chưa rõ',
      jobTitle: p.recruitmentNeeds?.jobTitle || 'Không',
      status: PARTNERSHIP_STATUS_MAP[p.status] || p.status,
      linkedCourses: p.linkedCourses?.map(c => c.title).join(', ') || 'Chưa có'
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-hop-tac', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-hop-tac', headers, 'Danh sách dự án hợp tác');
  };

  const handleExportSponsorships = (type) => {
    const headers = { _id: 'Mã Tài trợ', title: 'Tên chương trình', budget: 'Ngân sách', spent: 'Đã giải ngân', targetLearners: 'Số lượng HV', status: 'Trạng thái' };
    const data = activeSponsorships.map(s => ({
      ...s,
      _id: shortId(s._id),
      title: s.title || 'N/A',
      budget: s.budget || 0,
      spent: s.spent || 0,
      targetLearners: s.targetLearners || 0,
      status: SPONSORSHIP_STATUS_MAP[s.status] || s.status
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-tai-tro', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-tai-tro', headers, 'Danh sách tài trợ');
  };

  const handleExportTransactions = (type) => {
    const headers = { _id: 'Mã GD', type: 'Loại giao dịch', amount: 'Số tiền', status: 'Trạng thái', createdAt: 'Ngày giao dịch' };
    const data = transactionsList.map(t => ({
      ...t,
      _id: shortId(t._id),
      type: TRANSACT_TYPE_MAP[t.type] || t.type,
      status: TRANSACT_STATUS_MAP[t.status] || t.status,
      createdAt: new Date(t.createdAt).toLocaleString('vi-VN')
    }));
    if (type === 'excel') exportToExcel(data, 'lich-su-giao-dich', headers);
    if (type === 'pdf') exportToPDF(data, 'lich-su-giao-dich', headers, 'Lịch sử giao dịch');
  };

  const handleExportSponsoredLearners = (type) => {
    const headers = { fullName: 'Học viên', course: 'Khóa học', sponsorship: 'Chương trình', status: 'Trạng thái', enrolledAt: 'Ngày tham gia' };
    const data = sponsoredLearners.map(l => ({
      fullName: l.user?.name || 'N/A',
      course: l.course?.title || 'N/A',
      sponsorship: l.sponsorship?.title || 'N/A',
      status: ENROLLMENT_STATUS_MAP[l.status] || l.status,
      enrolledAt: new Date(l.enrolledAt).toLocaleString('vi-VN')
    }));
    if (type === 'excel') exportToExcel(data, 'danh-sach-hoc-vien-tai-tro', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-hoc-vien-tai-tro', headers, 'Danh sách học viên được tài trợ');
  };

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'jobs', label: 'Việc làm' },
    { id: 'applications', label: 'Ứng viên' },
    { id: 'partnerships', label: 'Hợp tác' },
    { id: 'sponsorships', label: 'Tài trợ' },
    { id: 'transactions', label: 'Giao dịch' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Bảng điều khiển</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
            Theo dõi và phân tích hiệu quả hoạt động của doanh nghiệp.
          </p>
        </div>

        <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          <div className="flex bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-1 rounded-full w-max shadow-sm">
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />)}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Briefcase} label="Tin tuyển dụng mở" value={jobStatusData.find(s => s.id === 'published' || s.name === 'Đang hiển thị' || s.name === 'published')?.value || 0} color={{ bg: 'bg-blue-100/50', text: 'text-blue-600' }} />
                <StatCard icon={Users} label="Tổng ứng viên" value={stats.totalApplications} color={{ bg: 'bg-purple-100/50', text: 'text-purple-600' }} />
                <StatCard icon={Calendar} label="Phỏng vấn sắp tới" value={stats.totalInterviews} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
                <StatCard icon={Building2} label="Tổng hợp tác" value={stats.totalPartnerships} color={{ bg: 'bg-indigo-100/50', text: 'text-indigo-600' }} />
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Lưu lượng ứng tuyển (7 ngày qua)</h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="count" name="Số đơn nộp" stroke="#38bdf8" strokeWidth={3} fill="url(#trendArea)" activeDot={{ r: 6, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIỆC LÀM */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard icon={Briefcase} label="Tổng tin tuyển dụng" value={stats.totalJobs} color={{ bg: 'bg-blue-100/50', text: 'text-blue-600' }} />
                <StatCard icon={FileText} label="Bản nháp" value={jobStatusData.find(s => s.id === 'draft' || s.name === 'Bản nháp' || s.name === 'draft')?.value || 0} color={{ bg: 'bg-slate-100/50', text: 'text-slate-600' }} />
                <StatCard icon={Clock} label="Chờ duyệt" value={jobStatusData.find(s => s.id === 'pending_approval' || s.name === 'Chờ duyệt' || s.name === 'pending_approval')?.value || 0} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
                <StatCard icon={XCircle} label="Bị từ chối" value={jobStatusData.find(s => s.id === 'rejected' || s.name === 'Bị từ chối' || s.name === 'rejected')?.value || 0} color={{ bg: 'bg-rose-100/50', text: 'text-rose-600' }} />
                <StatCard icon={CheckCircle2} label="Đang hiển thị" value={jobStatusData.find(s => s.id === 'published' || s.name === 'Đang hiển thị' || s.name === 'published')?.value || 0} color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} />
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Trạng thái tin tuyển dụng</h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobStatusData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="value" name="Số lượng" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={32}>
                        {jobStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách tin tuyển dụng</h3>
                  <ExportButtons onExcel={() => handleExportJobs('excel')} onPDF={() => handleExportJobs('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Tiêu đề</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                        <th className="px-4 py-3 text-center bg-slate-50">Lượt xem</th>
                        <th className="px-4 py-3 text-center bg-slate-50">Ứng tuyển</th>
                        <th className="px-4 py-3 bg-slate-50">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobsList.map(job => (
                        <tr key={job._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{job.job?.title || 'Chưa có tiêu đề'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                              {job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600">{job.stats?.views || 0}</td>
                          <td className="px-4 py-3 text-center font-medium text-sky-600">{job.stats?.applications || 0}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(job.createdAt).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                      {jobsList.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ỨNG VIÊN */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Tổng nộp đơn" value={stats.totalApplications || 0} color={{ bg: 'bg-blue-100/50', text: 'text-blue-600' }} />
                <StatCard icon={CheckCircle2} label="Đã duyệt" value={applicationStatusData.find(s => s.id === 'processing' || s.name === 'Đang duyệt')?.value || 0} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
                <StatCard icon={Calendar} label="Phỏng vấn" value={applicationStatusData.find(s => s.id === 'interviewing' || s.name === 'Phỏng vấn')?.value || 0} color={{ bg: 'bg-purple-100/50', text: 'text-purple-600' }} />
                <StatCard icon={Briefcase} label="Trúng tuyển" value={applicationStatusData.find(s => s.id === 'hired' || s.name === 'Đã nhận')?.value || 0} color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Phễu chuyển đổi</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" name="Số lượng" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={32}>
                          {funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Trạng thái ứng viên</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={applicationStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                          {applicationStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách ứng viên</h3>
                  <ExportButtons onExcel={() => handleExportApplications('excel')} onPDF={() => handleExportApplications('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Ứng viên</th>
                        <th className="px-4 py-3 bg-slate-50">Tin tuyển dụng</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                        <th className="px-4 py-3 bg-slate-50">Ngày ứng tuyển</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicationsList.map(app => (
                        <tr key={app._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{app.worker?.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{app.job?.title || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                              {APP_STATUS_MAP[app.status] || app.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{new Date(app.appliedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        </tr>
                      ))}
                      {applicationsList.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HỢP TÁC */}
          {activeTab === 'partnerships' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Building2} label="Tổng cộng" value={partnershipStatusData.reduce((acc, curr) => acc + curr.value, 0)} color={{ bg: 'bg-slate-100/50', text: 'text-slate-600' }} />
                <StatCard icon={CheckCircle2} label="Đang hoạt động" value={partnershipStatusData.find(p => p.id === 'active')?.value || 0} color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} />
                <StatCard icon={Clock} label="Chờ duyệt" value={partnershipStatusData.find(p => p.id === 'pending')?.value || 0} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
                <StatCard icon={XCircle} label="Từ chối / Hủy" value={(partnershipStatusData.find(p => p.id === 'rejected')?.value || 0) + (partnershipStatusData.find(p => p.id === 'cancelled')?.value || 0)} color={{ bg: 'bg-rose-100/50', text: 'text-rose-600' }} />
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Biểu đồ trạng thái hợp tác</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={partnershipStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                        {partnershipStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách Hợp tác (Partnerships)</h3>
                  <ExportButtons onExcel={() => handleExportPartnerships('excel')} onPDF={() => handleExportPartnerships('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Mã Hợp tác</th>
                        <th className="px-4 py-3 bg-slate-50">Đối tác</th>
                        <th className="px-4 py-3 bg-slate-50">Tuyển dụng</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                        <th className="px-4 py-3 bg-slate-50">Khóa học liên kết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePartnerships.map(p => (
                        <tr key={p._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">#{shortId(p._id)}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{p.trainer?.displayName || 'Chưa rõ'}</td>
                          <td className="px-4 py-3 text-slate-600">{p.recruitmentNeeds?.jobTitle || <span className="text-slate-400 italic">Không</span>}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                              {PARTNERSHIP_STATUS_MAP[p.status] || p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={p.linkedCourses?.map(c => c.title).join(', ')}>{p.linkedCourses?.map(c => c.title).join(', ') || 'Chưa có'}</td>
                        </tr>
                      ))}
                      {activePartnerships.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TÀI TRỢ */}
          {activeTab === 'sponsorships' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={HeartHandshake} label="Tổng tài trợ" value={stats.totalSponsorships} color={{ bg: 'bg-rose-100/50', text: 'text-rose-600' }} />
                <StatCard icon={Clock} label="Chờ duyệt" value={sponsorshipStatusData.find(s => s.id === 'pending' || s.name === 'pending' || s.name === 'Chờ duyệt')?.value || 0} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
                <StatCard icon={CheckCircle2} label="Đang hoạt động" value={sponsorshipStatusData.find(s => s.id === 'active' || s.name === 'active' || s.name === 'Đang hoạt động')?.value || 0} color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} />
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Biểu đồ trạng thái tài trợ</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sponsorshipStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                        {sponsorshipStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách Tài trợ (Sponsorships)</h3>
                  <ExportButtons onExcel={() => handleExportSponsorships('excel')} onPDF={() => handleExportSponsorships('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Mã Tài trợ</th>
                        <th className="px-4 py-3 bg-slate-50">Tên chương trình</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Ngân sách</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Đã giải ngân</th>
                        <th className="px-4 py-3 text-center bg-slate-50">Học viên</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSponsorships.map(s => (
                        <tr key={s._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">#{shortId(s._id)}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            <div>{s.title || 'Chương trình tài trợ'}</div>
                            {s.courseTitle && <div className="text-xs text-slate-500 font-normal mt-0.5">Khóa: {s.courseTitle}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-right">{formatCurrency(s.budget || 0)}</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium text-right">{formatCurrency(s.spent || 0)}</td>
                          <td className="px-4 py-3 text-slate-600 text-center">{s.targetLearners || 0}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                              {SPONSORSHIP_STATUS_MAP[s.status] || s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {activeSponsorships.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách Học viên được Tài trợ</h3>
                  <ExportButtons onExcel={() => handleExportSponsoredLearners('excel')} onPDF={() => handleExportSponsoredLearners('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Học viên</th>
                        <th className="px-4 py-3 bg-slate-50">Khóa học</th>
                        <th className="px-4 py-3 bg-slate-50">Chương trình</th>
                        <th className="px-4 py-3 bg-slate-50">Ngày tham gia</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sponsoredLearners.map(l => (
                        <tr key={l._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{l.user?.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{l.course?.title || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{l.sponsorship?.title || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(l.enrolledAt).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                              {ENROLLMENT_STATUS_MAP[l.status] || l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {sponsoredLearners.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu học viên</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GIAO DỊCH */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={CreditCard} label="Tổng giao dịch" value={transactionsList.length} color={{ bg: 'bg-sky-100/50', text: 'text-sky-600' }} />
                <StatCard icon={Lock} label="Giao dịch ký quỹ" value={reserveCount} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
                <StatCard icon={Send} label="Giải ngân" value={disburseCount} color={{ bg: 'bg-indigo-100/50', text: 'text-indigo-600' }} />
                <StatCard icon={ShoppingCart} label="Giao dịch mua gói" value={paymentCount} color={{ bg: 'bg-rose-100/50', text: 'text-rose-600' }} />
              </div>

              {transactionsList.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                      <div className="mb-4"><h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Tỷ trọng các loại giao dịch</h3></div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={transactionTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                              {transactionTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                      <div className="mb-4"><h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Trạng thái giao dịch</h3></div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={transactionStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                              {transactionStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                      <div className="mb-4"><h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Biến động dòng tiền (Thu - Chi)</h3></div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000}k`} dx={-10} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(val) => formatCurrency(val)} />
                            <Legend />
                            <Bar dataKey="Inflow" name="Nạp tiền" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="Outflow" name="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                      <div className="mb-4"><h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Tích lũy chi tiêu</h3></div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timeSeriesData}>
                            <defs>
                              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000}k`} dx={-10} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(val) => formatCurrency(val)} />
                            <Area type="monotone" dataKey="cumulativeOutflow" name="Tổng chi tiêu lũy kế" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Lịch sử giao dịch</h3>
                  <ExportButtons onExcel={() => handleExportTransactions('excel')} onPDF={() => handleExportTransactions('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Mã GD</th>
                        <th className="px-4 py-3 bg-slate-50">Loại giao dịch</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Số tiền</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                        <th className="px-4 py-3 bg-slate-50">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsList.map(t => {
                        const isIncoming = ['DEPOSIT', 'REFUND', 'COURSE_REVENUE'].includes(t.type?.toUpperCase());
                        return (
                        <tr key={t._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">#{shortId(t._id)}</td>
                          <td className="px-4 py-3 text-slate-600">{TRANSACT_TYPE_MAP[t.type] || t.type}</td>
                          <td className={`px-4 py-3 text-right font-medium ${isIncoming ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isIncoming ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                              {TRANSACT_STATUS_MAP[t.status] || t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                        </tr>
                      )})}
                      {transactionsList.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu giao dịch</td></tr>
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
