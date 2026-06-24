import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { BookOpen, Users, Clock, Shield, Award, DollarSign, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { getAdminTrainingAnalytics } from '@/apis/adminAnalyticsApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const COURSE_STATUS_COLORS = {
  approved: 'hsl(var(--admin-success))',
  pending: 'hsl(var(--admin-warning))',
  rejected: 'hsl(var(--admin-danger))',
  draft: 'hsl(var(--admin-text-muted))',
  archived: 'hsl(var(--admin-border))'
};

const COURSE_STATUS_LABELS = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Từ chối',
  draft: 'Bản nháp',
  archived: 'Lưu trữ'
};

const TABS = [
  { id: 'courses', label: 'Tất cả Khóa học', icon: BookOpen },
  { id: 'enrollments', label: 'Học viên Đăng ký', icon: Users },
  { id: 'transactions', label: 'Giao dịch', icon: DollarSign },
  { id: 'certificates', label: 'Chứng chỉ Đã cấp', icon: Award }
];

export const AdminTrainingAnalyticsTab = ({ timeRange = '6M' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getAdminTrainingAnalytics(timeRange);
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phân tích đào tạo:', error);
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

  const { overview, courseStatusData, enrollmentGrowth, revenueGrowth = [], topCourses = [], tables } = data;

  const statCards = [
    {
      title: 'Tổng Khóa Học',
      value: (overview?.totalCourses || 0).toLocaleString(),
      icon: BookOpen,
      color: 'hsl(var(--admin-text-primary))'
    },
    {
      title: 'Chờ Duyệt',
      value: (overview?.pendingCourses || 0).toLocaleString(),
      icon: Clock,
      color: 'hsl(var(--admin-warning))'
    },
    {
      title: 'Lượt Đăng Ký',
      value: (overview?.totalEnrollments || 0).toLocaleString(),
      icon: Users,
      color: 'hsl(var(--admin-accent))'
    },
    {
      title: 'Chứng Chỉ Đã Cấp',
      value: (overview?.totalCertificates || 0).toLocaleString(),
      icon: Award,
      color: 'hsl(var(--admin-success))'
    },
    {
      title: 'Doanh Thu Admin',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(overview?.adminRevenue || 0),
      icon: DollarSign,
      color: 'hsl(var(--admin-text-primary))'
    }
  ];

  // Map status data to Pie chart format
  const pieData = courseStatusData.map(item => ({
    name: COURSE_STATUS_LABELS[item.name] || item.name,
    value: item.value,
    color: COURSE_STATUS_COLORS[item.name] || 'hsl(var(--admin-border))'
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

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Growth Line Chart */}
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
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tăng trưởng Học viên</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Lượt ghi danh khóa học trong 6 tháng qua</p>
              </div>
            </div>

            <div className="w-full h-[320px] mt-auto relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-accent))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--admin-accent))" stopOpacity={0} />
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
                    itemStyle={{ paddingBottom: '6px', fontWeight: 500, color: 'hsl(var(--admin-accent))' }}
                    cursor={{ stroke: 'hsl(var(--admin-border))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    formatter={(value) => [value, 'Lượt đăng ký']}
                  />
                  <Area type="monotone" name="Lượt đăng ký" dataKey="enrollments" stroke="hsl(var(--admin-accent))" fillOpacity={1} fill="url(#colorEnrollments)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </BezelCard>
        </motion.div>

        {/* Course Status Donut Chart */}
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
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Trạng thái Khóa học</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Phân bổ khóa học trên hệ thống</p>
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
                      formatter={(value, name) => [`${value} khóa học`, name]}
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
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-[hsl(var(--admin-text-muted))] min-h-[260px] relative z-10 bg-[hsl(var(--admin-surface-muted))]/30 rounded-2xl border border-dashed border-[hsl(var(--admin-border))] m-4">
                <Shield className="w-8 h-8 opacity-20 mb-3" />
                <span className="font-medium">Chưa có dữ liệu khóa học</span>
              </div>
            )}
          </BezelCard>
        </motion.div>
      </div>

      {/* SECTION 3: CHARTS - ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 h-full"
        >
          <BezelCard className="flex flex-col h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[hsl(var(--admin-success))]/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Doanh thu Đào tạo</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Doanh thu thực tế (Admin Share) trong 6 tháng qua</p>
              </div>
            </div>
            <div className="w-full h-64 mt-auto relative z-10 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueGrowth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                    tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
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
                    formatter={(value) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), 'Doanh thu']}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar
                    name="Doanh thu"
                    dataKey="revenue"
                    fill="hsl(var(--admin-success))"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    activeBar={{ fill: 'hsl(var(--admin-success))', opacity: 0.8 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BezelCard>
        </motion.div>

        {/* Top 5 Courses Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="h-full"
        >
          <BezelCard className="flex flex-col h-full relative overflow-hidden group">
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-[hsl(var(--admin-accent))]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 flex flex-col justify-between mb-6 gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Top 5 Khóa học</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Nhiều học viên đăng ký nhất</p>
              </div>
            </div>

            {topCourses.length > 0 ? (
              <div className="w-full h-64 mt-auto relative z-10 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCourses}
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
                      width={100}
                      tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
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
                      formatter={(value) => [value, 'Học viên']}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar
                      name="Học viên"
                      dataKey="enrollmentCount"
                      fill="hsl(var(--admin-accent))"
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                      activeBar={{ fill: 'hsl(var(--admin-accent))', opacity: 0.8 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[hsl(var(--admin-text-muted))] py-10 mt-auto z-10">
                <BookOpen className="w-12 h-12 opacity-20 mb-3" />
                <p>Chưa có dữ liệu khóa học</p>
              </div>
            )}
          </BezelCard>
        </motion.div>
      </div>

      {/* SECTION 3: DETAILED TABLES WITH TABS */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <BezelCard className="p-0 overflow-hidden flex flex-col">
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
              {activeTab === 'courses' && (
                <motion.div key="courses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <CoursesTable data={tables.courses} />
                </motion.div>
              )}
              {activeTab === 'enrollments' && (
                <motion.div key="enrollments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <EnrollmentsTable data={tables.enrollments} />
                </motion.div>
              )}
              {activeTab === 'transactions' && (
                <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <TransactionsTable data={tables.transactions} />
                </motion.div>
              )}
              {activeTab === 'certificates' && (
                <motion.div key="certificates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <CertificatesTable data={tables.certificates} />
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

const CoursesTable = ({ data }) => {
  return (
    <TableWrapper hasData={data && data.length > 0} emptyMessage="Chưa có khóa học nào">
      <thead className="text-xs uppercase bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-text-muted))] sticky top-0 z-10 backdrop-blur-sm">
        <tr>
          <th className="px-6 py-4 font-bold tracking-wider">Khóa học</th>
          <th className="px-6 py-4 font-bold tracking-wider">Trung tâm đào tạo</th>
          <th className="px-6 py-4 font-bold tracking-wider">Học phí</th>
          <th className="px-6 py-4 font-bold tracking-wider text-center">Ngày tạo</th>
          <th className="px-6 py-4 font-bold tracking-wider text-right">Trạng thái</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.map((course) => (
          <tr key={course._id} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4">
              <div className="font-semibold text-[hsl(var(--admin-text-primary))]">{course.title}</div>
              <div className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{course.enrollmentCount} học viên</div>
            </td>
            <td className="px-6 py-4 font-medium">{course.providerName}</td>
            <td className="px-6 py-4">
              {course.fee > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(course.fee) : 'Miễn phí'}
            </td>
            <td className="px-6 py-4 text-center text-[hsl(var(--admin-text-muted))]">
              {course.createdAt ? format(new Date(course.createdAt), 'dd/MM/yyyy') : '-'}
            </td>
            <td className="px-6 py-4 text-right">
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border" style={{
                color: COURSE_STATUS_COLORS[course.status] || 'hsl(var(--admin-text-muted))',
                backgroundColor: `${COURSE_STATUS_COLORS[course.status]}10`,
                borderColor: `${COURSE_STATUS_COLORS[course.status]}30`
              }}>
                {COURSE_STATUS_LABELS[course.status] || course.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
};

const EnrollmentsTable = ({ data }) => {
  return (
    <TableWrapper hasData={data && data.length > 0} emptyMessage="Chưa có học viên nào đăng ký">
      <thead className="text-xs uppercase bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-text-muted))] sticky top-0 z-10 backdrop-blur-sm">
        <tr>
          <th className="px-6 py-4 font-bold tracking-wider">Học viên</th>
          <th className="px-6 py-4 font-bold tracking-wider">Khóa học</th>
          <th className="px-6 py-4 font-bold tracking-wider">Ngày đăng ký</th>
          <th className="px-6 py-4 font-bold tracking-wider text-right">Trạng thái / Tiến độ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.map((en, idx) => (
          <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4">
              <div className="font-semibold text-[hsl(var(--admin-text-primary))]">{en.userName || 'Ẩn danh'}</div>
              <div className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{en.userEmail}</div>
            </td>
            <td className="px-6 py-4 font-medium max-w-[300px] truncate">{en.courseTitle}</td>
            <td className="px-6 py-4 text-[hsl(var(--admin-text-muted))]">
              {en.createdAt ? format(new Date(en.createdAt), 'dd/MM/yyyy', { locale: vi }) : '-'}
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-3">
                <div className="w-24 bg-[hsl(var(--admin-border))] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[hsl(var(--admin-accent))] h-full rounded-full" style={{ width: `${en.progress?.percentage || 0}%` }} />
                </div>
                <span className="text-xs font-bold text-[hsl(var(--admin-text-primary))] w-8">{en.progress?.percentage || 0}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
};

const TransactionsTable = ({ data }) => {
  return (
    <TableWrapper hasData={data && data.length > 0} emptyMessage="Chưa có giao dịch khóa học nào">
      <thead className="text-xs uppercase bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-text-muted))] sticky top-0 z-10 backdrop-blur-sm">
        <tr>
          <th className="px-6 py-4 font-bold tracking-wider">Mã GD</th>
          <th className="px-6 py-4 font-bold tracking-wider">Khách hàng</th>
          <th className="px-6 py-4 font-bold tracking-wider">Khóa học</th>
          <th className="px-6 py-4 font-bold tracking-wider text-right">Tổng thanh toán</th>
          <th className="px-6 py-4 font-bold tracking-wider text-right">Admin Share (20%)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.map((tx, idx) => (
          <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4 font-mono text-xs text-[hsl(var(--admin-text-muted))]">
              {tx.transactionId || `#${tx._id?.substring(0, 8)}`}
            </td>
            <td className="px-6 py-4 font-medium">{tx.userName}</td>
            <td className="px-6 py-4 text-[hsl(var(--admin-text-muted))] max-w-[200px] truncate">{tx.courseTitle}</td>
            <td className="px-6 py-4 text-right font-semibold">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}
            </td>
            <td className="px-6 py-4 text-right font-bold text-[hsl(var(--admin-accent))]">
              +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.adminShare)}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
};

const CertificatesTable = ({ data }) => {
  return (
    <TableWrapper hasData={data && data.length > 0} emptyMessage="Chưa có chứng chỉ nào được cấp">
      <thead className="text-xs uppercase bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-text-muted))] sticky top-0 z-10 backdrop-blur-sm">
        <tr>
          <th className="px-6 py-4 font-bold tracking-wider">Mã Chứng Chỉ</th>
          <th className="px-6 py-4 font-bold tracking-wider">Người nhận</th>
          <th className="px-6 py-4 font-bold tracking-wider">Khóa học</th>
          <th className="px-6 py-4 font-bold tracking-wider text-right">Ngày cấp</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.map((cert, idx) => (
          <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4 font-mono text-xs text-[hsl(var(--admin-accent))] font-bold">
              {cert.certificateId || cert._id?.substring(0, 10).toUpperCase()}
            </td>
            <td className="px-6 py-4 font-medium">{cert.userName}</td>
            <td className="px-6 py-4 text-[hsl(var(--admin-text-muted))] max-w-[300px] truncate">{cert.courseTitle}</td>
            <td className="px-6 py-4 text-right text-[hsl(var(--admin-text-muted))]">
              {cert.issuedDate ? format(new Date(cert.issuedDate), 'dd/MM/yyyy') : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
};
