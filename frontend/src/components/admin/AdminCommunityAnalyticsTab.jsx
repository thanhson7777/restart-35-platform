import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { MessageSquare, ThumbsUp, Users, FileText, Star, Flame } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { getAdminCommunityAnalytics } from '@/apis/adminAnalyticsApi';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#06b6d4'];

const formatNumber = (value) => {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('vi-VN').format(value);
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
            <span className="text-sm font-medium text-[hsl(var(--admin-foreground))]">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TABS = [
  { id: 'trending', label: 'Bài viết Nổi bật', icon: Flame },
  { id: 'members', label: 'Thành viên Tích cực', icon: Star }
];

export default function AdminCommunityAnalyticsTab({ timeRange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getAdminCommunityAnalytics(timeRange);
        if (response?.success && response?.data) {
          setData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch community analytics", error);
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

  const { overview, categoryData = [], growthData = [], tables } = data;

  return (
    <div className="space-y-6">
      {/* 1. Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/20 text-blue-500 rounded-xl">
              <FileText size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Tổng Số Bài Viết</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatNumber(overview.totalPosts)}
            </h3>
          </div>
        </BezelCard>

        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl">
              <MessageSquare size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Tổng Số Bình Luận</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatNumber(overview.totalComments)}
            </h3>
          </div>
        </BezelCard>

        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-violet-500/20 text-violet-500 rounded-xl">
              <ThumbsUp size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Lượt Thích / Tương Tác</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatNumber(overview.totalLikes)}
            </h3>
          </div>
        </BezelCard>

        <BezelCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
              <Users size={24} />
            </div>
          </div>
          <div>
            <p className="text-[hsl(var(--admin-foreground-muted))] text-sm font-medium mb-1">Thành Viên Hoạt Động</p>
            <h3 className="text-2xl font-bold text-[hsl(var(--admin-foreground))]">
              {formatNumber(overview.activeMembers)}
            </h3>
          </div>
        </BezelCard>
      </div>

      {/* 2. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart - 1 Column */}
        <BezelCard className="p-6 relative overflow-hidden min-w-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />

          <h3 className="text-lg font-semibold text-[hsl(var(--admin-foreground))] mb-6 relative z-10">Tăng trưởng Bài viết & Bình luận</h3>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={8} barCategoryGap="25%">
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
                <XAxis dataKey="name" stroke="hsl(var(--admin-foreground-muted))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="hsl(var(--admin-foreground-muted))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'transparent' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar 
                  dataKey="posts" 
                  name="Bài viết" 
                  fill="url(#colorPosts)" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="comments" 
                  name="Bình luận" 
                  fill="url(#colorComments)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BezelCard>

        {/* Donut Chart - 1 Column */}
        <BezelCard className="p-6 relative overflow-hidden min-w-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-lg font-semibold text-[hsl(var(--admin-foreground))] mb-6 relative z-10">Cơ cấu Chủ đề</h3>
          <div className="h-[350px] flex flex-col justify-center relative z-10">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                  <defs>
                    <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.15" />
                    </filter>
                  </defs>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} filter="url(#pieShadow)" />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--admin-foreground-muted))]">
                <FileText size={64} className="mb-4 opacity-20" />
                <p>Chưa có dữ liệu bài viết</p>
              </div>
            )}
          </div>
        </BezelCard>
      </div>

      {/* 3. Data Tables */}
      <BezelCard className="overflow-hidden">
        <div className="border-b border-[hsl(var(--admin-border))] px-2 pt-2">
          <div className="flex overflow-x-auto hide-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'border-blue-500 text-blue-500' 
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
          <AnimatePresence mode="wait">
            {activeTab === 'trending' && (
              <motion.div
                key="trending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TrendingPostsTable data={tables.trendingPosts} />
              </motion.div>
            )}
            {activeTab === 'members' && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ActiveMembersTable data={tables.topMembers} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BezelCard>
    </div>
  );
}

const TrendingPostsTable = ({ data = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-foreground-muted))] text-xs uppercase tracking-wider">
          <th className="px-6 py-4 font-semibold rounded-tl-xl">Bài Viết</th>
          <th className="px-6 py-4 font-semibold">Tác Giả</th>
          <th className="px-6 py-4 font-semibold text-center">Lượt Thích</th>
          <th className="px-6 py-4 font-semibold text-center">Bình Luận</th>
          <th className="px-6 py-4 font-semibold text-center">Điểm Tương Tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))] text-sm">
        {data.length > 0 ? data.map((item, index) => (
          <tr key={item._id || index} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4">
              <div className="flex flex-col">
                <span className="font-semibold text-[hsl(var(--admin-foreground))] truncate max-w-xs">{item.title || 'Bài viết không có tiêu đề'}</span>
                <span className="text-xs text-[hsl(var(--admin-foreground-muted))] bg-[hsl(var(--admin-surface-muted))] px-2 py-0.5 rounded-full w-max mt-1">{item.categoryName || 'Khác'}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                {item.authorAvatar ? (
                  <img src={item.authorAvatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                    {item.authorName ? item.authorName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="font-medium text-[hsl(var(--admin-foreground))]">{item.authorName || 'Người dùng ẩn danh'}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-center text-[hsl(var(--admin-foreground))]">{formatNumber(item.likes)}</td>
            <td className="px-6 py-4 text-center text-[hsl(var(--admin-foreground))]">{formatNumber(item.comments)}</td>
            <td className="px-6 py-4 text-center font-bold text-amber-500">{formatNumber(item.score)}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan="5" className="px-6 py-12 text-center text-[hsl(var(--admin-foreground-muted))]">
              Không có bài viết nào trong khoảng thời gian này.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const ActiveMembersTable = ({ data = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[hsl(var(--admin-surface-muted))]/30 text-[hsl(var(--admin-foreground-muted))] text-xs uppercase tracking-wider">
          <th className="px-6 py-4 font-semibold rounded-tl-xl w-16 text-center">Hạng</th>
          <th className="px-6 py-4 font-semibold">Thành Viên</th>
          <th className="px-6 py-4 font-semibold">Email</th>
          <th className="px-6 py-4 font-semibold text-center">Số Bài Viết</th>
          <th className="px-6 py-4 font-semibold text-center">Tổng Like Nhận Được</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[hsl(var(--admin-border))] text-sm">
        {data.length > 0 ? data.map((item, index) => (
          <tr key={item._id || index} className="hover:bg-[hsl(var(--admin-surface-muted))]/30 transition-colors group">
            <td className="px-6 py-4 text-center">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                ${index === 0 ? 'bg-amber-500/20 text-amber-500' : 
                  index === 1 ? 'bg-slate-400/20 text-slate-400' : 
                  index === 2 ? 'bg-amber-700/20 text-amber-700' : 'text-[hsl(var(--admin-foreground-muted))]'}`}
              >
                #{index + 1}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                {item.userAvatar ? (
                  <img src={item.userAvatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="font-medium text-[hsl(var(--admin-foreground))]">{item.userName || 'Người dùng ẩn danh'}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-[hsl(var(--admin-foreground-muted))]">{item.email || 'Không có email'}</td>
            <td className="px-6 py-4 text-center font-bold text-blue-500">{formatNumber(item.postsCount)}</td>
            <td className="px-6 py-4 text-center text-[hsl(var(--admin-foreground))]">{formatNumber(item.totalLikesReceived)}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan="5" className="px-6 py-12 text-center text-[hsl(var(--admin-foreground-muted))]">
              Không có dữ liệu thành viên trong khoảng thời gian này.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
