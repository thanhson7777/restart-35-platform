import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { Users, UserCheck, UserX, Clock, Building, GraduationCap, Globe, Shield } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { getAdminUsersAnalytics } from '@/apis/adminAnalyticsApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { API_ROOT } from '@/utils/constants';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authorizeAxiosInstance } from '@/utils/authorizeAxios';

const ROLE_COLORS = {
  worker: 'hsl(var(--admin-accent))',
  enterprise: 'hsl(var(--admin-success))',
  trainer: 'hsl(var(--admin-warning))',
  ngo: 'hsl(var(--admin-danger))'
};

const STATUS_COLORS = {
  approved: 'hsl(var(--admin-success))',
  pending: 'hsl(var(--admin-warning))',
  rejected: 'hsl(var(--admin-danger))'
};

const ROLE_LABELS = {
  worker: 'Người lao động',
  enterprise: 'Doanh nghiệp',
  trainer: 'Trung tâm đào tạo',
  ngo: 'NGO'
};

export const AdminUsersAnalyticsTab = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversionRoleFilter, setConversionRoleFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getAdminUsersAnalytics(dateRange?.start, dateRange?.end);
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phân tích người dùng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange?.start, dateRange?.end]);

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

  const { overview, userGrowth, conversionStatus, recentUsers } = data;

  // 1. STATS CARDS
  const statCards = [
    {
      title: 'Tổng người dùng',
      value: (overview?.totalUsers || 0).toLocaleString(),
      icon: Users,
      color: 'hsl(var(--admin-text-primary))'
    },
    {
      title: 'Quản trị viên',
      value: (overview?.totalAdmins || 0).toLocaleString(),
      icon: Shield,
      color: 'hsl(var(--admin-text-muted))'
    },
    {
      title: 'Người lao động',
      value: (overview?.totalWorkers || 0).toLocaleString(),
      icon: Users,
      color: 'hsl(var(--admin-accent))'
    },
    {
      title: 'Doanh nghiệp',
      value: (overview?.totalEnterprises || 0).toLocaleString(),
      icon: Building,
      color: 'hsl(var(--admin-success))'
    },
    {
      title: 'Trung tâm đào tạo',
      value: (overview?.totalTrainers || 0).toLocaleString(),
      icon: GraduationCap,
      color: 'hsl(var(--admin-warning))'
    },
    {
      title: 'Tổ chức NGO',
      value: (overview?.totalNGOs || 0).toLocaleString(),
      icon: Globe,
      color: 'hsl(var(--admin-danger))'
    }
  ];

  // 2. PIE CHART DATA PREPARATION
  const preparePieData = () => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    if (conversionRoleFilter === 'all') {
      Object.values(conversionStatus).forEach(statusCounts => {
        approved += statusCounts.approved || 0;
        pending += statusCounts.pending || 0;
        rejected += statusCounts.rejected || 0;
      });
    } else {
      const counts = conversionStatus[conversionRoleFilter] || { approved: 0, pending: 0, rejected: 0 };
      approved = counts.approved || 0;
      pending = counts.pending || 0;
      rejected = counts.rejected || 0;
    }

    return [
      { name: 'Đã duyệt', value: approved, color: STATUS_COLORS.approved },
      { name: 'Chờ duyệt', value: pending, color: STATUS_COLORS.pending },
      { name: 'Từ chối', value: rejected, color: STATUS_COLORS.rejected }
    ].filter(item => item.value > 0); // Hide empty slices
  };
  const pieData = preparePieData();

  return (
    <div className="space-y-6">
      {/* SECTION 1: OVERVIEW STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
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
        {/* User Growth Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 h-full"
        >
          <BezelCard className="flex flex-col h-full relative overflow-hidden group">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[hsl(var(--admin-accent))]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--admin-accent))] animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[hsl(var(--admin-accent))] uppercase">Analytics</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tăng trưởng Người dùng</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Số lượng đăng ký mới phân bổ theo từng vai trò trong 6 tháng qua</p>
              </div>
            </div>

            <div className="w-full h-[320px] mt-auto relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWorker" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ROLE_COLORS.worker} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ROLE_COLORS.worker} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnterprise" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ROLE_COLORS.enterprise} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ROLE_COLORS.enterprise} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTrainer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ROLE_COLORS.trainer} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ROLE_COLORS.trainer} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNgo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ROLE_COLORS.ngo} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ROLE_COLORS.ngo} stopOpacity={0} />
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
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '13px', fontWeight: 500, paddingTop: '20px' }}
                  />
                  <Area type="monotone" name="Lao động" dataKey="worker" stroke={ROLE_COLORS.worker} fillOpacity={1} fill="url(#colorWorker)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" name="Doanh nghiệp" dataKey="enterprise" stroke={ROLE_COLORS.enterprise} fillOpacity={1} fill="url(#colorEnterprise)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" name="Trung tâm đào tạo" dataKey="trainer" stroke={ROLE_COLORS.trainer} fillOpacity={1} fill="url(#colorTrainer)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" name="NGO" dataKey="ngo" stroke={ROLE_COLORS.ngo} fillOpacity={1} fill="url(#colorNgo)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </BezelCard>
        </motion.div>

        {/* Account Conversion Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full"
        >
          <BezelCard className="flex flex-col h-full relative overflow-hidden group">
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-[hsl(var(--admin-warning))]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 flex flex-col justify-between mb-6 gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tỉ lệ duyệt</h3>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1 font-medium">Trạng thái phê duyệt tài khoản</p>
              </div>

              <div className="relative mt-2">
                <select
                  value={conversionRoleFilter}
                  onChange={(e) => setConversionRoleFilter(e.target.value)}
                  className="w-full appearance-none bg-[hsl(var(--admin-surface-muted))]/50 hover:bg-[hsl(var(--admin-surface-muted))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] text-sm font-medium rounded-xl px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 transition-all cursor-pointer"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="worker">Người lao động</option>
                  <option value="enterprise">Doanh nghiệp</option>
                  <option value="trainer">Trung tâm đào tạo</option>
                  <option value="ngo">NGO</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--admin-text-muted))]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
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
                      formatter={(value, name) => [`${value} tài khoản`, name]}
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
                <span className="font-medium">Chưa có dữ liệu phê duyệt</span>
              </div>
            )}
          </BezelCard>
        </motion.div>
      </div>

      {/* SECTION 3: RECENT USERS TABLE */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <BezelCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tất cả người dùng</h3>
            <button
              onClick={() => {
                let query = '';
                if (dateRange?.start && dateRange?.end) {
                  query = `?startDate=${dateRange.start}&endDate=${dateRange.end}`;
                }
                const toastId = toast.loading('Đang xuất Excel...');
                authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/export/excel${query}`, { responseType: 'blob' })
                  .then(response => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'admin_users_report.xlsx');
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    toast.success('Xuất file thành công', { id: toastId });
                  })
                  .catch(() => toast.error('Lỗi khi tải file', { id: toastId }));
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-success))]/10 hover:text-[hsl(var(--admin-success))] hover:border-[hsl(var(--admin-success))]/30 rounded-lg text-xs font-medium text-[hsl(var(--admin-text-primary))] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel
            </button>
          </div>

          <div className="max-h-[500px] overflow-auto rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-sm mt-4">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-[hsl(var(--admin-surface-elevated))]">
                <tr className="border-b border-[hsl(var(--admin-border))] text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--admin-text-muted))]">
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4 text-right">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--admin-border))]/60 bg-[hsl(var(--admin-surface))]">
                {recentUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-[hsl(var(--admin-surface-muted))]/50 transition-all duration-200 group cursor-default">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {user.avatar ? (
                          <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-[hsl(var(--admin-border))] to-[hsl(var(--admin-surface-muted))] group-hover:from-[hsl(var(--admin-accent))]/50 group-hover:to-[hsl(var(--admin-accent))]/10 transition-colors">
                            <div className="w-full h-full rounded-full overflow-hidden border-2 border-[hsl(var(--admin-surface))]">
                              <img src={user.avatar} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-[hsl(var(--admin-border))] to-[hsl(var(--admin-surface-muted))] group-hover:from-[hsl(var(--admin-accent))]/50 group-hover:to-[hsl(var(--admin-accent))]/10 transition-colors">
                            <div className="w-full h-full rounded-full border-2 border-[hsl(var(--admin-surface))] flex items-center justify-center text-sm font-bold text-[hsl(var(--admin-text-primary))] group-hover:text-[hsl(var(--admin-accent))] transition-colors bg-[hsl(var(--admin-surface-muted))]">
                              {user.displayName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] group-hover:text-[hsl(var(--admin-accent))] transition-colors">{user.displayName}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-0.5 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border border-[hsl(var(--admin-border))]/50 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[user.role] || 'hsl(var(--admin-text-muted))' }}></span>
                        {ROLE_LABELS[user.role] || user.role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-sm ${user.status === 'approved' ? 'bg-[hsl(var(--admin-success))]/10 text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success))]/20' :
                        user.status === 'rejected' ? 'bg-[hsl(var(--admin-danger))]/10 text-[hsl(var(--admin-danger))] border-[hsl(var(--admin-danger))]/20' :
                          'bg-[hsl(var(--admin-warning))]/10 text-[hsl(var(--admin-warning))] border-[hsl(var(--admin-warning))]/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'approved' ? 'bg-[hsl(var(--admin-success))]' :
                          user.status === 'rejected' ? 'bg-[hsl(var(--admin-danger))]' :
                            'bg-[hsl(var(--admin-warning))]'
                          }`} />
                        {user.status === 'approved' ? 'Đã duyệt' : user.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.phone ? (
                        <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                          {user.phone}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--admin-text-muted))]">
                          Chưa cập nhật
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                          {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                        </span>
                        <span className="text-[11px] text-[hsl(var(--admin-text-muted))] mt-0.5 font-medium">
                          {format(new Date(user.createdAt), 'HH:mm')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-8 h-8 text-[hsl(var(--admin-text-muted))] mb-3 opacity-50" />
                        <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Chưa có người dùng nào</p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Dữ liệu sẽ hiển thị tại đây khi có đăng ký mới.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </BezelCard>
      </motion.div>
    </div>
  );
};
