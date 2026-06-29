import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { getEnrollmentStats, getMyCourses, getTrainerSchedules, getEnterpriseStudents, getMyCourseStats } from '@/apis/trainerApi';
import { getDropoutRisk } from '@/apis/learningRecordApi';
import { getMyTransactions } from '@/apis/walletApi';
import { getTrainerPartnerships } from '@/apis/trainerPartnershipsApi';

import { TrainerStatsCards } from '@/components/trainer/TrainerStatsCards';
import { TrainerEnrollmentTrendChart } from '@/components/trainer/TrainerEnrollmentTrendChart';
import { TrainerRevenueChart } from '@/components/trainer/TrainerRevenueChart';
import { TrainerCourseStatusChart } from '@/components/trainer/TrainerCourseStatusChart';
import { TrainerTopCoursesChart } from '@/components/trainer/TrainerTopCoursesChart';
import { TrainerCourseFundingChart } from '@/components/trainer/TrainerCourseFundingChart';
import { TrainerCourseDeliveryChart } from '@/components/trainer/TrainerCourseDeliveryChart';
import { TrainerPartnershipTrendChart } from '@/components/trainer/TrainerPartnershipTrendChart';
import { TrainerPartnershipStatusChart } from '@/components/trainer/TrainerPartnershipStatusChart';
import { TrainerRecentStudents } from '@/components/trainer/TrainerRecentStudents';
import { TrainerQuickActions } from '@/components/trainer/TrainerQuickActions';

import { Skeleton } from '@/components/ui';
import { FileSpreadsheet, FileText, BookOpen, Clock, CheckCircle2, XCircle, Wallet, TrendingUp, Handshake } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';
import { formatCurrency } from '@/utils/formatter';

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

// Map statuses
const COURSE_STATUS_MAP = {
  'draft': 'Bản nháp',
  'approved': 'Đã xuất bản',
  'pending': 'Chờ duyệt',
  'rejected': 'Bị từ chối'
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
  'COURSE_REVENUE': 'Doanh thu khóa học',
  'PARTNERSHIP_REVENUE': 'Tài trợ khóa học',
  'SYSTEM_FEE': 'Phí hệ thống',
  'RESERVE': 'Tạm giữ',
  'DISBURSE': 'Giải ngân',
  'REFUND': 'Hoàn tiền',
  'PAYMENT': 'Thanh toán'
};

const TrainerDashboardPage = () => {
  const currentUser = useSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [courseStats, setCourseStats] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [dropoutRisk, setDropoutRisk] = useState({});
  const [enterpriseStudents, setEnterpriseStudents] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [partnerships, setPartnerships] = useState([]);

  const financialStats = useMemo(() => {
    // We now receive exact all-time revenue stats from the backend in the `stats` object
    const courseRev = stats.courseRevenue || 0;
    const partnerRev = stats.partnershipRevenue || 0;
    const totalRev = stats.totalRevenue || 0;
    
    // totalTx should reflect the number of transactions, not enrollments
    const totalTx = transactions.length;

    return { totalTx, courseRev, partnerRev, totalRev };
  }, [transactions, stats]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, coursesRes, courseStatsRes, schedulesRes, riskRes, enterpriseRes, transRes, partnershipsRes] = await Promise.all([
        getEnrollmentStats().catch(() => ({ data: { data: {} } })),
        getMyCourses().catch(() => ({ data: { data: [] } })),
        getMyCourseStats().catch(() => ({ data: { data: {} } })),
        getTrainerSchedules({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        getDropoutRisk().catch(() => ({ data: { data: {} } })),
        getEnterpriseStudents().catch(() => ({ data: { data: null } })),
        getMyTransactions().catch(() => ({ data: [] })),
        getTrainerPartnerships({ limit: 100 }).catch(() => ({ data: { data: [] } }))
      ]);

      setStats(statsRes.data?.data || {});
      setCourses(coursesRes.data?.data || []);
      setCourseStats(courseStatsRes.data?.data || {});
      setSchedules(schedulesRes.data?.data || []);
      setDropoutRisk(riskRes.data?.data || {});
      setEnterpriseStudents(enterpriseRes.data?.data || null);
      setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
      setPartnerships(partnershipsRes.data?.data || []);
    } catch (err) {
      console.error('Unexpected error loading dashboard:', err);
      toast.error('Có lỗi xảy ra khi tải dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, fetchDashboardData]);

  // Handle Exports
  const handleExportCourses = (type) => {
    const headers = { 
      title: 'Tên khóa học', 
      status: 'Trạng thái', 
      price: 'Giá tiền', 
      enrollments: 'Số học viên', 
      rating: 'Đánh giá',
      revenue: 'Doanh thu (ước tính)'
    };
    const data = courses.map(c => {
      const isFree = c.isFree || c.fundingConfig?.type === 'FREE';
      const price = isFree ? 0 : (c.fee || c.fundingConfig?.price || 0);
      const enrolls = c.enrollmentCount || c.currentStudents || 0;
      return {
        title: c.title,
        status: COURSE_STATUS_MAP[c.status] || c.status,
        price: isFree ? 'Miễn phí' : formatCurrency(price),
        enrollments: enrolls,
        rating: c.rating?.average || 0,
        revenue: formatCurrency(enrolls * price)
      };
    });
    
    if (type === 'excel') exportToExcel(data, 'danh-sach-khoa-hoc', headers);
    if (type === 'pdf') exportToPDF(data, 'danh-sach-khoa-hoc', headers, 'Danh sách khóa học');
  };

  const handleExportTransactions = (type) => {
    const headers = { 
      id: 'Mã GD', 
      type: 'Loại giao dịch', 
      amount: 'Số tiền', 
      status: 'Trạng thái', 
      createdAt: 'Ngày giao dịch' 
    };
    const data = transactions.map(t => ({
      id: t._id.slice(-6).toUpperCase(),
      type: TRANSACT_TYPE_MAP[t.type] || t.type,
      amount: formatCurrency(t.amount),
      status: TRANSACT_STATUS_MAP[t.status] || t.status,
      createdAt: new Date(t.createdAt).toLocaleString('vi-VN')
    }));
    
    if (type === 'excel') exportToExcel(data, 'lich-su-giao-dich', headers);
    if (type === 'pdf') exportToPDF(data, 'lich-su-giao-dich', headers, 'Lịch sử giao dịch');
  };

  const handleExportEnterpriseStudents = (type) => {
    const headers = { 
      name: 'Tên học viên', 
      course: 'Khóa học', 
      enterprise: 'Doanh nghiệp tài trợ', 
      status: 'Trạng thái học',
      enrolledAt: 'Ngày đăng ký'
    };
    const data = (enterpriseStudents?.list || []).map(s => ({
      name: s.user?.name || 'N/A',
      course: s.course?.title || 'N/A',
      enterprise: s.sponsorship?.enterprise?.name || 'N/A',
      status: s.status,
      enrolledAt: new Date(s.enrolledAt).toLocaleDateString('vi-VN')
    }));
    
    if (type === 'excel') exportToExcel(data, 'hoc-vien-doanh-nghiep', headers);
    if (type === 'pdf') exportToPDF(data, 'hoc-vien-doanh-nghiep', headers, 'Danh sách học viên doanh nghiệp');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-[2rem]" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-[2rem]" />
      </div>
    );
  }

  const trainerName = currentUser?.displayName || 'Giảng viên';

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'courses', label: 'Khóa học' },
    { id: 'financials', label: 'Tài chính' },
    { id: 'partnerships', label: 'Đối tác' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">
            Chào mừng quay trở lại, {trainerName}!
          </h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
            Dưới đây là tổng quan hoạt động và số liệu giảng dạy của bạn trên hệ thống.
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

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* TAB 1: TỔNG QUAN */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <TrainerStatsCards
              stats={stats}
              courses={courses}
              courseStats={courseStats}
              schedules={schedules}
              dropoutRisk={dropoutRisk}
              enterpriseStudents={enterpriseStudents}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrainerEnrollmentTrendChart data={stats.monthlyTrend || []} />
              <div className="flex flex-col gap-6">
                <TrainerQuickActions />
                <TrainerRecentStudents students={stats.recentEnrollments || []} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KHÓA HỌC */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard icon={BookOpen} label="Tổng khóa học" value={courseStats.total !== undefined ? courseStats.total : courses.length} color={{ bg: 'bg-blue-100/50', text: 'text-blue-600' }} />
              <StatCard icon={FileText} label="Bản nháp" value={courseStats.draft !== undefined ? courseStats.draft : courses.filter(c => c.status === 'draft').length} color={{ bg: 'bg-slate-100/50', text: 'text-slate-600' }} />
              <StatCard icon={Clock} label="Chờ duyệt" value={courseStats.pending !== undefined ? courseStats.pending : courses.filter(c => c.status === 'pending').length} color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} />
              <StatCard icon={XCircle} label="Bị từ chối" value={courseStats.rejected !== undefined ? courseStats.rejected : courses.filter(c => c.status === 'rejected').length} color={{ bg: 'bg-rose-100/50', text: 'text-rose-600' }} />
              <StatCard icon={CheckCircle2} label="Đã xuất bản" value={courseStats.approved !== undefined ? courseStats.approved : courses.filter(c => c.status === 'approved').length} color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} />
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TrainerCourseStatusChart courses={courses} courseStats={courseStats} />
                <TrainerTopCoursesChart courses={courses} />
                <TrainerCourseFundingChart courses={courses} />
                <TrainerCourseDeliveryChart courses={courses} />
              </div>
              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách Khóa học</h3>
                  <ExportButtons onExcel={() => handleExportCourses('excel')} onPDF={() => handleExportCourses('pdf')} />
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Tên khóa học</th>
                        <th className="px-4 py-3 bg-slate-50">Trạng thái</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Giá tiền</th>
                        <th className="px-4 py-3 text-center bg-slate-50">Học viên</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(c => {
                        const isFree = c.isFree || c.fundingConfig?.type === 'FREE';
                        const price = isFree ? 0 : (c.fee || c.fundingConfig?.price || 0);
                        const enrolls = c.enrollmentCount || c.currentStudents || 0;
                        return (
                          <tr key={c._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                                {COURSE_STATUS_MAP[c.status] || c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {isFree ? 'Miễn phí' : formatCurrency(price)}
                            </td>
                            <td className="px-4 py-3 text-center text-sky-600 font-medium">
                              {enrolls}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                              {formatCurrency(enrolls * price)}
                            </td>
                          </tr>
                        );
                      })}
                      {courses.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có khóa học nào</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TÀI CHÍNH */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Wallet} label="Tổng giao dịch" value={financialStats.totalTx} color={{ bg: 'bg-indigo-100/50', text: 'text-indigo-600' }} />
              <StatCard icon={TrendingUp} label="Tổng thu nhập" value={formatCurrency(financialStats.totalRev)} color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} />
              <StatCard icon={BookOpen} label="Thu nhập khóa học" value={formatCurrency(financialStats.courseRev)} color={{ bg: 'bg-blue-100/50', text: 'text-blue-600' }} />
              <StatCard icon={Handshake} label="Thu nhập đối tác" value={formatCurrency(financialStats.partnerRev)} color={{ bg: 'bg-purple-100/50', text: 'text-purple-600' }} />
            </div>
            <TrainerRevenueChart rawData={stats.rawDailyRevenue || []} />
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Lịch sử Giao dịch & Rút tiền</h3>
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
                      <th className="px-4 py-3 bg-slate-50">Ngày giao dịch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">#{t._id.slice(-6).toUpperCase()}</td>
                        <td className="px-4 py-3 text-slate-600">{TRANSACT_TYPE_MAP[t.type] || t.type}</td>
                        <td className={`px-4 py-3 text-right font-medium ${['withdraw', 'WITHDRAW', 'SYSTEM_FEE'].includes(t.type) ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {['withdraw', 'WITHDRAW', 'SYSTEM_FEE'].includes(t.type) ? '-' : '+'}{formatCurrency(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                            {TRANSACT_STATUS_MAP[t.status] || t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có giao dịch nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ĐỐI TÁC */}
        {activeTab === 'partnerships' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                icon={Handshake} 
                label="Tổng số đối tác" 
                value={partnerships.length} 
                color={{ bg: 'bg-indigo-100/50', text: 'text-indigo-600' }} 
              />
              <StatCard 
                icon={CheckCircle2} 
                label="Đang hợp tác" 
                value={partnerships.filter(p => p.status === 'active').length} 
                color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} 
              />
              <StatCard 
                icon={Clock} 
                label="Chờ phản hồi" 
                value={partnerships.filter(p => p.status === 'pending' || p.status === 'negotiating').length} 
                color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} 
              />
              <StatCard 
                icon={XCircle} 
                label="Đã kết thúc" 
                value={partnerships.filter(p => p.status === 'expired' || p.status === 'cancelled' || p.status === 'rejected').length} 
                color={{ bg: 'bg-slate-100/50', text: 'text-slate-600' }} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrainerPartnershipStatusChart partnerships={partnerships} />
              <TrainerPartnershipTrendChart data={enterpriseStudents?.trend || []} />
            </div>
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Danh sách Học viên Doanh nghiệp tài trợ</h3>
                <ExportButtons onExcel={() => handleExportEnterpriseStudents('excel')} onPDF={() => handleExportEnterpriseStudents('pdf')} />
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg bg-slate-50">Tên học viên</th>
                      <th className="px-4 py-3 bg-slate-50">Khóa học</th>
                      <th className="px-4 py-3 bg-slate-50">Doanh nghiệp tài trợ</th>
                      <th className="px-4 py-3 bg-slate-50">Trạng thái học</th>
                      <th className="px-4 py-3 bg-slate-50">Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(enterpriseStudents?.list || []).map(s => (
                      <tr key={s._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{s.user?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.course?.title || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.sponsorship?.enterprise?.name || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(s.enrolledAt).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                    {(!enterpriseStudents || enterpriseStudents.list?.length === 0) && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có học viên nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TrainerDashboardPage;
