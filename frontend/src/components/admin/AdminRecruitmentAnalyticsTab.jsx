import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { Briefcase, Users, Clock, Shield, Award, BarChart2, FileText, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { getAdminRecruitmentAnalytics } from '@/apis/adminAnalyticsApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const JOB_STATUS_COLORS = {
  published: '#10b981', // emerald-500
  pending_approval: '#f59e0b', // amber-500
  draft: '#94a3b8', // slate-400
  closed: '#f43f5e', // rose-500
  expired: '#8b5cf6', // violet-500
  rejected: '#64748b' // slate-500
};

const JOB_STATUS_LABELS = {
  published: 'Đang tuyển',
  pending_approval: 'Chờ duyệt',
  draft: 'Bản nháp',
  closed: 'Đã đóng',
  expired: 'Hết hạn',
  rejected: 'Từ chối'
};

const APP_STATUS_COLORS = {
  new: '#3b82f6', // blue-500
  reviewing: '#f59e0b', // amber-500
  shortlisted: '#8b5cf6', // violet-500
  interview_scheduled: '#d946ef', // fuchsia-500
  interviewed: '#ec4899', // pink-500
  offered: '#06b6d4', // cyan-500
  hired: '#10b981', // emerald-500
  rejected: '#f43f5e', // rose-500
  withdrawn: '#64748b' // slate-500
};

const APP_STATUS_LABELS = {
  new: 'Mới ứng tuyển',
  reviewing: 'Đang xem xét',
  shortlisted: 'Đã sơ tuyển',
  interview_scheduled: 'Đã lên lịch PV',
  interviewed: 'Đã phỏng vấn',
  offered: 'Đã gửi Offer',
  hired: 'Đã nhận việc',
  rejected: 'Từ chối',
  withdrawn: 'Đã rút đơn'
};

const TABS = [
  { id: 'jobs', label: 'Tất cả Việc làm', icon: Briefcase },
  { id: 'applications', label: 'Hồ sơ Ứng tuyển', icon: FileText }
];

export const AdminRecruitmentAnalyticsTab = ({ timeRange = '6M' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getAdminRecruitmentAnalytics(timeRange);
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phân tích tuyển dụng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[hsl(var(--admin-text-muted))]">
        <span className="flex items-center gap-2">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
            <div className="w-5 h-5 border-2 border-t-[hsl(var(--admin-accent))] rounded-full border-transparent" />
          </motion.div>
          Đang tải dữ liệu...
        </span>
      </div>
    );
  }

  const { overview, jobStatusData, growthData = [], topJobs = [], tables } = data;

  const statCards = [
    {
      title: 'Tổng Việc Làm',
      value: (overview?.totalJobs || 0).toLocaleString(),
      icon: Briefcase,
      color: 'hsl(var(--admin-text-primary))'
    },
    {
      title: 'Đang Tuyển',
      value: (overview?.activeJobs || 0).toLocaleString(),
      icon: CheckCircle,
      color: 'hsl(var(--admin-success))'
    },
    {
      title: 'Chờ Duyệt',
      value: (overview?.pendingJobs || 0).toLocaleString(),
      icon: Clock,
      color: 'hsl(var(--admin-warning))'
    },
    {
      title: 'Tổng Lượt Nộp CV',
      value: (overview?.totalApplications || 0).toLocaleString(),
      icon: FileText,
      color: 'hsl(var(--admin-accent))'
    },
    {
      title: 'Tỉ Lệ Chọi (CV/Job)',
      value: overview?.avgApplicationsPerJob || 0,
      icon: BarChart2,
      color: 'hsl(var(--admin-text-primary))'
    }
  ];

  // Map status data to Pie chart format
  const pieData = jobStatusData.map(item => ({
    name: JOB_STATUS_LABELS[item.name] || item.name,
    value: item.value,
    color: JOB_STATUS_COLORS[item.name] || 'hsl(var(--admin-border))'
  }));

  return (
    <div className="space-y-6">
      {/* SECTION 1: OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <BezelCard padding="sm" className="relative overflow-hidden group h-full">
                <div className="absolute inset-0 bg-gradient-to-br opacity-5 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, ${item.color}, transparent)` }} />
                <div className="flex flex-col relative z-10 h-full justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-[hsl(var(--admin-surface))] shadow-inner border border-[hsl(var(--admin-border))] opacity-80 group-hover:opacity-100 transition-opacity">
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight mb-1">{item.value}</h3>
                    <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--admin-text-muted))] font-medium">{item.title}</p>
                  </div>
                </div>
              </BezelCard>
            </motion.div>
          );
        })}
      </div>

      {/* SECTION 2: CHARTS - ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 h-full"
        >
          <BezelCard className="flex flex-col h-full relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[hsl(var(--admin-accent))]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--admin-accent))] animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[hsl(var(--admin-accent))] uppercase">Analytics</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tăng trưởng Tuyển dụng</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Lượt đăng tin và nộp CV trong 6 tháng qua</p>
              </div>
            </div>

            <div className="w-full h-64 mt-auto relative z-10 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-accent))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--admin-accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-success))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--admin-success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--admin-text-muted))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    fontFamily="inherit"
                  />
                  <YAxis
                    stroke="hsl(var(--admin-text-muted))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    fontFamily="inherit"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--admin-surface-elevated))',
                      borderColor: 'hsl(var(--admin-border))',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      color: 'hsl(var(--admin-text-primary))'
                    }}
                    itemStyle={{ paddingBottom: '6px', fontWeight: 500 }}
                    cursor={{ stroke: 'hsl(var(--admin-border))', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area name="Hồ sơ ứng tuyển" type="monotone" dataKey="applications" stroke="hsl(var(--admin-accent))" fillOpacity={1} fill="url(#colorApps)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area name="Việc làm mới" type="monotone" dataKey="jobs" stroke="hsl(var(--admin-success))" fillOpacity={1} fill="url(#colorJobs)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </BezelCard>
        </motion.div>

        {/* Status Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-full"
        >
          <BezelCard className="flex flex-col h-full relative overflow-hidden group">
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-[hsl(var(--admin-success))]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 flex flex-col justify-between mb-6 gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Trạng thái Việc làm</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Phân bổ tin tuyển dụng</p>
              </div>
            </div>

            {pieData.length > 0 ? (
              <div className="w-full h-64 mt-auto relative z-10 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--admin-surface-elevated))',
                        borderColor: 'hsl(var(--admin-border))',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        color: 'hsl(var(--admin-text-primary))'
                      }}
                      itemStyle={{ fontWeight: 500 }}
                      formatter={(value, name) => [`${value} việc làm`, name]}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '13px', fontWeight: 500 }}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                  <span className="text-3xl font-bold tracking-tighter text-[hsl(var(--admin-text-primary))]">
                    {pieData.reduce((sum, item) => sum + item.value, 0)}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--admin-text-muted))] font-bold mt-1">Tổng cộng</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[hsl(var(--admin-text-muted))] py-10 mt-auto z-10">
                <Briefcase className="w-12 h-12 opacity-20 mb-3" />
                <p>Chưa có dữ liệu</p>
              </div>
            )}
          </BezelCard>
        </motion.div>
      </div>

      {/* SECTION 3: CHARTS - ROW 2 (Top Jobs) */}
      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <BezelCard className="flex flex-col relative overflow-hidden group">
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-[hsl(var(--admin-warning))]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 flex flex-col justify-between mb-6 gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Top 5 Công việc nổi bật</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Nhận được nhiều hồ sơ ứng tuyển nhất</p>
              </div>
            </div>
            
            {topJobs.length > 0 ? (
              <div className="w-full h-80 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topJobs} 
                    layout="vertical" 
                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" opacity={0.4} horizontal={false} />
                    <XAxis 
                      type="number"
                      stroke="hsl(var(--admin-text-muted))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      fontFamily="inherit"
                      allowDecimals={false}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="title" 
                      stroke="hsl(var(--admin-text-muted))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      width={180}
                      tickFormatter={(value) => value.length > 25 ? `${value.substring(0, 25)}...` : value}
                      fontFamily="inherit" 
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--admin-surface-elevated))', 
                        borderColor: 'hsl(var(--admin-border))', 
                        borderRadius: '12px', 
                        fontSize: '13px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        color: 'hsl(var(--admin-text-primary))'
                      }}
                      itemStyle={{ paddingBottom: '6px', fontWeight: 500 }}
                      formatter={(value) => [value, 'Hồ sơ']}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar 
                      name="Hồ sơ" 
                      dataKey="applications" 
                      fill="hsl(var(--admin-warning))" 
                      radius={[0, 6, 6, 0]} 
                      barSize={24}
                      activeBar={{ fill: 'hsl(var(--admin-warning))', opacity: 0.8 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-[hsl(var(--admin-text-muted))] py-10 h-64 z-10 relative">
                <Briefcase className="w-12 h-12 opacity-20 mb-3" />
                <p>Chưa có dữ liệu</p>
              </div>
            )}
          </BezelCard>
        </motion.div>
      </div>

      {/* SECTION 4: DETAILED TABLES WITH TABS */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <BezelCard padding="none" className="overflow-hidden flex flex-col">
          {/* TABS NAV */}
          <div className="flex items-center overflow-x-auto border-b border-[hsl(var(--admin-border))] px-2 pt-2 hide-scrollbar">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 outline-none ${isActive
                      ? 'text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]'
                      : 'text-[hsl(var(--admin-text-muted))] border-transparent hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-muted))]/30 rounded-t-xl'
                    }`}
                >
                  <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENTS */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {activeTab === 'jobs' && (
                <motion.div key="jobs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <JobsTable data={tables.jobs} />
                </motion.div>
              )}
              {activeTab === 'applications' && (
                <motion.div key="applications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <ApplicationsTable data={tables.applications} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BezelCard>
      </motion.div>
    </div>
  );
};

/* --- TABLE COMPONENTS --- */

const TableWrapper = ({ children, emptyMessage, hasData }) => (
  <div className="w-full overflow-auto max-h-[600px] min-h-[400px] styled-scrollbar">
    {hasData ? (
      <table className="w-full text-left text-sm text-[hsl(var(--admin-text-primary))]">
        {children}
      </table>
    ) : (
      <div className="flex flex-col items-center justify-center h-[400px] text-[hsl(var(--admin-text-muted))]">
        <Shield className="w-12 h-12 opacity-20 mb-4" />
        <p>{emptyMessage}</p>
      </div>
    )}
  </div>
);

const JobsTable = ({ data }) => {
  return (
    <TableWrapper hasData={data && data.length > 0} emptyMessage="Chưa có tin tuyển dụng nào">
      <thead className="text-xs uppercase bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-text-muted))] sticky top-0 z-10 backdrop-blur-sm">
        <tr>
          <th className="px-6 py-4 font-bold tracking-wider">Việc làm</th>
          <th className="px-6 py-4 font-bold tracking-wider">Doanh nghiệp</th>
          <th className="px-6 py-4 font-bold tracking-wider text-center">Mức lương</th>
          <th className="px-6 py-4 font-bold tracking-wider text-center">Hồ sơ</th>
          <th className="px-6 py-4 font-bold tracking-wider text-right">Trạng thái</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.map((job) => (
          <tr key={job._id} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4 max-w-[300px]">
              <div className="font-semibold text-[hsl(var(--admin-text-primary))] truncate" title={job.title}>{job.title}</div>
              <div className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                {job.createdAt ? format(new Date(job.createdAt), 'dd/MM/yyyy') : '-'}
              </div>
            </td>
            <td className="px-6 py-4 font-medium">{job.enterpriseName}</td>
            <td className="px-6 py-4 text-center">
              {job.salaryMin ? `${(job.salaryMin / 1000000).toFixed(1)}M` : '?'} - {job.salaryMax ? `${(job.salaryMax / 1000000).toFixed(1)}M` : '?'}
            </td>
            <td className="px-6 py-4 text-center">
              <span className="font-bold text-[hsl(var(--admin-accent))]">{job.applications || 0}</span>
            </td>
            <td className="px-6 py-4 text-right">
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border" style={{
                color: JOB_STATUS_COLORS[job.status] || 'hsl(var(--admin-text-muted))',
                backgroundColor: `${JOB_STATUS_COLORS[job.status]}10`,
                borderColor: `${JOB_STATUS_COLORS[job.status]}30`
              }}>
                {JOB_STATUS_LABELS[job.status] || job.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
};

const ApplicationsTable = ({ data }) => {
  return (
    <TableWrapper hasData={data && data.length > 0} emptyMessage="Chưa có hồ sơ ứng tuyển nào">
      <thead className="text-xs uppercase bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-text-muted))] sticky top-0 z-10 backdrop-blur-sm">
        <tr>
          <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider w-1/4">Ứng viên</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider w-1/3">Công việc</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider w-1/4">Doanh nghiệp</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.map((app, idx) => (
          <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4">
              <div className="font-semibold text-[hsl(var(--admin-text-primary))]">{app.userName || 'Đang cập nhật'}</div>
              <div className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                {app.createdAt ? format(new Date(app.createdAt), 'dd/MM/yyyy') : '-'}
              </div>
            </td>
            <td className="px-6 py-4 font-medium max-w-[300px] truncate" title={app.jobTitle}>{app.jobTitle || 'N/A'}</td>
            <td className="px-6 py-4 font-medium max-w-[200px] truncate" title={app.enterpriseName}>
              {app.enterpriseName || 'Chưa cập nhật'}
            </td>
            <td className="px-6 py-4">
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border" style={{
                color: APP_STATUS_COLORS[app.status] || 'hsl(var(--admin-text-muted))',
                backgroundColor: `${APP_STATUS_COLORS[app.status] || 'hsl(var(--admin-text-muted))'}10`,
                borderColor: `${APP_STATUS_COLORS[app.status] || 'hsl(var(--admin-text-muted))'}30`
              }}>
                {APP_STATUS_LABELS[app.status] || app.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
};
