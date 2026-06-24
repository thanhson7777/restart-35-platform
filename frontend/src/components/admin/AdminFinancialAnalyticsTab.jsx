import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Package, BookOpen, Wallet, CreditCard, PieChart as PieChartIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { getAdminFinancialAnalytics } from '@/apis/adminAnalyticsApi';

const STATUS_COLORS = {
  COMPLETED: '#10b981', // emerald-500
  PENDING: '#f59e0b', // amber-500
  FAILED: '#f43f5e', // rose-500
  CANCELLED: '#64748b' // slate-500
};

const STATUS_LABELS = {
  COMPLETED: 'Thành công',
  PENDING: 'Đang xử lý',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  completed: 'Thành công',
  pending: 'Đang xử lý',
  failed: 'Thất bại',
  cancelled: 'Đã hủy'
};

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

const TABS = [
  { id: 'courses', label: 'Giao dịch Khóa học', icon: BookOpen },
  { id: 'services', label: 'Gói Dịch Vụ', icon: Package },
  { id: 'deposits', label: 'Nạp/Rút Tiền', icon: Wallet }
];

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-4 rounded-xl shadow-lg">
        <p className="text-[hsl(var(--admin-foreground))] font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-[hsl(var(--admin-foreground-muted))]">{entry.name}:</span>
            <span className="text-sm font-medium text-[hsl(var(--admin-foreground))]">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminFinancialAnalyticsTab({ timeRange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getAdminFinancialAnalytics(timeRange);
        if (response?.success && response?.data) {
          setData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch financial analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[hsl(var(--admin-surface-muted))]/50 rounded-2xl" />
        ))}
        <div className="lg:col-span-3 h-[400px] bg-[hsl(var(--admin-surface-muted))]/50 rounded-2xl" />
        <div className="h-[400px] bg-[hsl(var(--admin-surface-muted))]/50 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { overview, revenueBreakdown = [], paymentMethods = [], growthData = [], tables } = data;

  return (
    <div className="space-y-6">
      {/* 1. Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Tổng Doanh Thu</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatCurrency(overview.totalRevenue)}
            </h3>
          </div>
        </BezelCard>

        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/20 text-blue-500 rounded-xl">
              <Package size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Doanh Thu Dịch Vụ</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatCurrency(overview.serviceRevenue)}
            </h3>
          </div>
        </BezelCard>

        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-violet-500/20 text-violet-500 rounded-xl">
              <BookOpen size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Hoa Hồng Khóa Học</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatCurrency(overview.courseCommission)}
            </h3>
          </div>
        </BezelCard>

        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-cyan-500/20 text-cyan-500 rounded-xl">
              <Wallet size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Tổng Nạp Tiền</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatCurrency(overview.totalDeposits)}
            </h3>
          </div>
        </BezelCard>
      </div>

      {/* 2. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Full Width */}
        <BezelCard className="p-6 lg:col-span-3 relative overflow-hidden min-w-0">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />

          <h3 className="text-lg font-semibold text-[hsl(var(--admin-foreground))] mb-6 relative z-10">Tăng trưởng Dòng tiền</h3>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  {/* Glowing line filters */}
                  <filter id="glowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#10b981" floodOpacity="0.5" />
                  </filter>
                  <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#06b6d4" floodOpacity="0.5" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
                <XAxis dataKey="name" stroke="hsl(var(--admin-foreground-muted))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="hsl(var(--admin-foreground-muted))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} dx={-10} />
                <RechartsTooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: 'hsl(var(--admin-surface-muted))', strokeWidth: 2, strokeDasharray: '4 4' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Tổng Doanh Thu" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fill="url(#colorTotal)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981', filter: 'url(#glowEmerald)' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="deposits" 
                  name="Tiền Nạp" 
                  stroke="#06b6d4" 
                  strokeWidth={4} 
                  fill="url(#colorDeposit)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4', filter: 'url(#glowCyan)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BezelCard>

        {/* Bar Chart - 2 Columns */}
        <BezelCard className="p-6 lg:col-span-2 relative overflow-hidden min-w-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
          
          <h3 className="text-lg font-semibold text-[hsl(var(--admin-foreground))] mb-6 relative z-10">Cơ cấu Doanh thu Dịch vụ & Khóa học</h3>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={8} barCategoryGap="25%">
                <defs>
                  <linearGradient id="colorService" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
                <XAxis dataKey="name" stroke="hsl(var(--admin-foreground-muted))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="hsl(var(--admin-foreground-muted))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} dx={-10} />
                <RechartsTooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'transparent' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar 
                  dataKey="service" 
                  name="Dịch vụ" 
                  fill="url(#colorService)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={48}
                  activeBar={{ stroke: '#60a5fa', strokeWidth: 2, fillOpacity: 0.9 }}
                />
                <Bar 
                  dataKey="commission" 
                  name="Khóa học" 
                  fill="url(#colorCommission)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={48}
                  activeBar={{ stroke: '#c084fc', strokeWidth: 2, fillOpacity: 0.9 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BezelCard>

        {/* Donut Chart - 1 Column */}
        <BezelCard className="p-6 lg:col-span-1 relative overflow-hidden min-w-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-lg font-semibold text-[hsl(var(--admin-foreground))] mb-6 relative z-10">Phương thức Thanh toán</h3>
          <div className="h-[350px] flex flex-col justify-center relative z-10">
            {paymentMethods.length > 0 && paymentMethods.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                  <defs>
                    <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.15" />
                    </filter>
                  </defs>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]} filter="url(#pieShadow)" />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--admin-foreground-muted))]">
                <PieChartIcon size={64} className="mb-4 opacity-20" />
                <p>Chưa có dữ liệu thanh toán</p>
              </div>
            )}
          </div>
        </BezelCard>
      </div>

      {/* 3. Data Tables with Tabs */}
      <BezelCard className="overflow-hidden">
        <div className="border-b border-[hsl(var(--admin-border))] px-2 pt-2">
          <div className="flex overflow-x-auto hide-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'border-emerald-500 text-emerald-500' 
                    : 'border-transparent text-[hsl(var(--admin-foreground-muted))] hover:text-[hsl(var(--admin-foreground))] hover:border-[hsl(var(--admin-border))]'
                  }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-0">
          {activeTab === 'courses' && <CourseTransactionsTable data={tables.courseTransactions} />}
          {activeTab === 'services' && <ServiceTransactionsTable data={tables.serviceTransactions} />}
          {activeTab === 'deposits' && <DepositTransactionsTable data={tables.walletTransactions} />}
        </div>
      </BezelCard>
    </div>
  );
}

const CourseTransactionsTable = ({ data = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-foreground-muted))] text-xs uppercase tracking-wider">
          <th className="px-6 py-4 font-semibold rounded-tl-xl">Người Mua</th>
          <th className="px-6 py-4 font-semibold">Khóa Học</th>
          <th className="px-6 py-4 font-semibold text-right">Số Tiền</th>
          <th className="px-6 py-4 font-semibold">Phương Thức</th>
          <th className="px-6 py-4 font-semibold">Ngày Giao Dịch</th>
          <th className="px-6 py-4 font-semibold rounded-tr-xl">Trạng Thái</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.length === 0 ? (
          <tr>
            <td colSpan="6" className="px-6 py-8 text-center text-[hsl(var(--admin-foreground-muted))]">
              Không có giao dịch khóa học nào
            </td>
          </tr>
        ) : (
          data.map((item, idx) => (
            <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-[hsl(var(--admin-foreground))]">{item.userName || 'Đang cập nhật'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-[hsl(var(--admin-foreground-muted))] max-w-[200px] truncate" title={item.courseTitle}>
                  {item.courseTitle || 'Đang cập nhật'}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="font-medium text-[hsl(var(--admin-foreground))]">{formatCurrency(item.amount)}</div>
              </td>
              <td className="px-6 py-4 text-sm text-[hsl(var(--admin-foreground-muted))]">
                {item.method?.toUpperCase()}
              </td>
              <td className="px-6 py-4 text-sm text-[hsl(var(--admin-foreground-muted))]">
                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-6 py-4">
                <span 
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${STATUS_COLORS[item.status?.toUpperCase()] || '#94a3b8'}20`,
                    color: STATUS_COLORS[item.status?.toUpperCase()] || '#94a3b8'
                  }}
                >
                  {STATUS_LABELS[item.status?.toUpperCase()] || item.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const ServiceTransactionsTable = ({ data = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-foreground-muted))] text-xs uppercase tracking-wider">
          <th className="px-6 py-4 font-semibold rounded-tl-xl">Người Mua</th>
          <th className="px-6 py-4 font-semibold">Gói Dịch Vụ</th>
          <th className="px-6 py-4 font-semibold text-right">Số Tiền</th>
          <th className="px-6 py-4 font-semibold">Ngày Giao Dịch</th>
          <th className="px-6 py-4 font-semibold rounded-tr-xl">Trạng Thái</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.length === 0 ? (
          <tr>
            <td colSpan="5" className="px-6 py-8 text-center text-[hsl(var(--admin-foreground-muted))]">
              Không có giao dịch mua gói nào
            </td>
          </tr>
        ) : (
          data.map((item, idx) => (
            <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-[hsl(var(--admin-foreground))]">{item.userName || 'Đang cập nhật'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-[hsl(var(--admin-foreground-muted))]">
                  {item.packageName || 'Đang cập nhật'}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="font-medium text-[hsl(var(--admin-foreground))]">{formatCurrency(item.amount)}</div>
              </td>
              <td className="px-6 py-4 text-sm text-[hsl(var(--admin-foreground-muted))]">
                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-6 py-4">
                <span 
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${STATUS_COLORS[item.status?.toUpperCase()] || '#94a3b8'}20`,
                    color: STATUS_COLORS[item.status?.toUpperCase()] || '#94a3b8'
                  }}
                >
                  {STATUS_LABELS[item.status?.toUpperCase()] || item.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const DepositTransactionsTable = ({ data = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-foreground-muted))] text-xs uppercase tracking-wider">
          <th className="px-6 py-4 font-semibold rounded-tl-xl">Người Dùng</th>
          <th className="px-6 py-4 font-semibold">Loại GD</th>
          <th className="px-6 py-4 font-semibold">Mô tả</th>
          <th className="px-6 py-4 font-semibold text-right">Số Tiền</th>
          <th className="px-6 py-4 font-semibold">Ngày Tạo</th>
          <th className="px-6 py-4 font-semibold rounded-tr-xl">Trạng Thái</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))]">
        {data.length === 0 ? (
          <tr>
            <td colSpan="6" className="px-6 py-8 text-center text-[hsl(var(--admin-foreground-muted))]">
              Không có giao dịch nạp/rút tiền nào
            </td>
          </tr>
        ) : (
          data.map((item, idx) => (
            <tr key={idx} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-[hsl(var(--admin-foreground))]">{item.userName || 'Đang cập nhật'}</div>
              </td>
              <td className="px-6 py-4">
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                  item.type === 'DEPOSIT' ? 'bg-cyan-500/10 text-cyan-500' :
                  item.type === 'WITHDRAW' ? 'bg-rose-500/10 text-rose-500' :
                  'bg-slate-500/10 text-slate-500'
                }`}>
                  {item.type === 'DEPOSIT' ? 'NẠP TIỀN' : item.type === 'WITHDRAW' ? 'RÚT TIỀN' : item.type}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-[hsl(var(--admin-foreground-muted))] max-w-[200px] truncate" title={item.description}>
                  {item.description || '-'}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className={`font-medium ${
                  item.type === 'DEPOSIT' ? 'text-cyan-500' :
                  item.type === 'WITHDRAW' ? 'text-rose-500' :
                  'text-[hsl(var(--admin-foreground))]'
                }`}>
                  {item.type === 'DEPOSIT' ? '+' : item.type === 'WITHDRAW' ? '-' : ''}
                  {formatCurrency(item.amount)}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-[hsl(var(--admin-foreground-muted))]">
                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-6 py-4">
                <span 
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${STATUS_COLORS[item.status?.toUpperCase()] || '#94a3b8'}20`,
                    color: STATUS_COLORS[item.status?.toUpperCase()] || '#94a3b8'
                  }}
                >
                  {STATUS_LABELS[item.status?.toUpperCase()] || item.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
