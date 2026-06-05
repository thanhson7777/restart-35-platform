import React from 'react';
import { Users, BookOpen, CheckCircle, Clock, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { BezelCard } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatPrice } from '@/utils/formatter';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  total: {
    icon: Users,
    iconColor: 'text-[#3B82F6]',
    bgGlow: 'from-[#3B82F6]/10 to-transparent',
    label: 'Tổng đăng ký',
  },
  enrolled: {
    icon: BookOpen,
    iconColor: 'text-[#8B5CF6]',
    bgGlow: 'from-[#8B5CF6]/10 to-transparent',
    label: 'Đang học',
  },
  in_progress: {
    icon: Clock,
    iconColor: 'text-[#F59E0B]',
    bgGlow: 'from-[#F59E0B]/10 to-transparent',
    label: 'Đang tiến hành',
  },
  completed: {
    icon: CheckCircle,
    iconColor: 'text-[#10B981]',
    bgGlow: 'from-[#10B981]/10 to-transparent',
    label: 'Hoàn thành',
  },
  waitlist: {
    icon: Clock,
    iconColor: 'text-[#06B6D4]',
    bgGlow: 'from-[#06B6D4]/10 to-transparent',
    label: 'Chờ xếp lớp',
  },
  revenue: {
    icon: DollarSign,
    iconColor: 'text-[#10B981]',
    bgGlow: 'from-[#10B981]/10 to-transparent',
    label: 'Tổng doanh thu',
  },
};

const AdminEnrollmentStats = ({ stats, loading }) => {
  const getStatItems = () => {
    if (!stats) return [];
    const { total = 0, byStatus = {}, revenue = {} } = stats;
    return [
      { key: 'total', value: total },
      { key: 'enrolled', value: byStatus.enrolled || 0 },
      { key: 'in_progress', value: byStatus.in_progress || 0 },
      { key: 'completed', value: byStatus.completed || 0 },
      { key: 'waitlist', value: byStatus.waitlist || 0 },
      { key: 'revenue', value: revenue.total || 0, isPrice: true },
    ];
  };

  const formatMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const month = parts[1];
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    return monthNames[parseInt(month) - 1] || monthStr;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-900/50 border border-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900/50 border border-slate-800 animate-pulse rounded-2xl" />
          <div className="h-80 bg-slate-900/50 border border-slate-800 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  const statItems = getStatItems();
  const monthlyTrend = stats?.monthlyTrend || [];
  const topCourses = stats?.topCourses || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {statItems.map((item, index) => {
          const config = STATUS_CONFIG[item.key];
          if (!config) return null;
          const Icon = config.icon;

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={item.key === 'revenue' ? 'col-span-2' : ''}
            >
              <BezelCard
                outerClassName="h-full hover:border-slate-700/60 transition-all duration-300"
                innerClassName="flex flex-col justify-between p-4 h-full"
              >
                {/* Background Glow */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${config.bgGlow} rounded-bl-full pointer-events-none blur-lg opacity-60`} />

                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400 font-mono">
                    {config.label}
                  </span>
                  <div className="p-1.5 rounded-full bg-slate-950 border border-slate-800/80 shadow-inner">
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                </div>

                <div className="relative z-10 mt-1">
                  <h3 className="text-xl font-extrabold tracking-tight text-white font-mono truncate">
                    {item.isPrice
                      ? formatPrice(item.value)
                      : item.value.toLocaleString('vi-VN')}
                  </h3>
                  {item.key === 'completed' && item.value > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400 font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      <span>Đầu ra tốt</span>
                    </div>
                  )}
                </div>
              </BezelCard>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <BezelCard className="p-6">
            <h3 className="text-sm font-bold text-white tracking-tight mb-6">
              Xu hướng đăng ký (6 tháng gần nhất)
            </h3>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tickFormatter={formatMonthLabel}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                    stroke="#334155"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                    stroke="#334155"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(value) => [`${value} đăng ký`, 'Số lượng']}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      const parts = label.split('-');
                      return parts.length >= 2 ? `Tháng ${parts[1]}/${parts[0]}` : label;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#0b0f19', stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#3b82f6', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                Chưa có dữ liệu xu hướng
              </div>
            )}
          </BezelCard>
        </motion.div>

        {/* Top Courses Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <BezelCard className="p-6">
            <h3 className="text-sm font-bold text-white tracking-tight mb-6">
              Khóa học được đăng ký nhiều nhất
            </h3>
            {topCourses.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCourses.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }} stroke="#334155" />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={100}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                    stroke="#334155"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(value) => [`${value} học viên`, 'Số lượng']}
                  />
                  <Bar dataKey="count" fill="url(#barGlow)" radius={[0, 9999, 9999, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                Chưa có dữ liệu khóa học
              </div>
            )}
          </BezelCard>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminEnrollmentStats;
