import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList
} from 'recharts';
import { authorizeAxiosInstance } from '@/utils/authorizeAxios';
import { Users, BookOpen, FileText, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--admin-text-muted))]">{title}</p>
        <h3 className="text-2xl font-bold text-[hsl(var(--admin-text-primary))] mt-2">{value}</h3>
      </div>
      <div className="p-3 bg-[hsl(var(--admin-accent-muted))] rounded-lg">
        <Icon className="w-5 h-5 text-[hsl(var(--admin-accent))]" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        {trend.isPositive ? (
          <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-500 mr-1" />
        )}
        <span className={trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}>
          {trend.value}%
        </span>
        <span className="text-[hsl(var(--admin-text-muted))] ml-2">so với tháng trước</span>
      </div>
    )}
  </div>
);

const ChartContainer = ({ title, children }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))] mb-4">{title}</h3>
    <div className="h-[300px] w-full">
      {children}
    </div>
  </div>
);

const AdminOverviewDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [rolesDistribution, setRolesDistribution] = useState([]);
  const [learningProgress, setLearningProgress] = useState([]);
  const [applicationFunnel, setApplicationFunnel] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          kpisRes,
          userGrowthRes,
          rolesDistributionRes,
          learningProgressRes,
          applicationFunnelRes,
          applicationStatusRes
        ] = await Promise.all([
          authorizeAxiosInstance.get('/v1/admin-analytics/kpis'),
          authorizeAxiosInstance.get('/v1/admin-analytics/user-growth'),
          authorizeAxiosInstance.get('/v1/admin-analytics/roles-distribution'),
          authorizeAxiosInstance.get('/v1/admin-analytics/learning-progress'),
          authorizeAxiosInstance.get('/v1/admin-analytics/application-funnel'),
          authorizeAxiosInstance.get('/v1/admin-analytics/application-status')
        ]);

        setKpis(kpisRes.data?.data || {});
        setUserGrowth(userGrowthRes.data?.data || []);
        setRolesDistribution(rolesDistributionRes.data?.data || []);
        setLearningProgress(learningProgressRes.data?.data || []);
        setApplicationFunnel(applicationFunnelRes.data?.data || []);
        setApplicationStatus(applicationStatusRes.data?.data || []);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        toast.error('Không thể tải dữ liệu tổng quan');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--admin-accent))]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Tổng người dùng"
          value={kpis?.totalUsers || 0}
          icon={Users}
        />
        <StatCard
          title="Khóa học đang diễn ra"
          value={kpis?.activeCourses || 0}
          icon={BookOpen}
        />
        <StatCard
          title="Hồ sơ chờ duyệt"
          value={kpis?.pendingApplications || 0}
          icon={FileText}
        />
        <StatCard
          title="Tỉ lệ trúng tuyển"
          value={`${kpis?.acceptanceRate || 0}%`}
          icon={CheckCircle}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer title="Xu hướng tăng trưởng người dùng">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--admin-text-muted))' }} />
              <YAxis tick={{ fill: 'hsl(var(--admin-text-muted))' }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))' }}
                itemStyle={{ color: 'hsl(var(--admin-text-primary))' }}
              />
              <Legend />
              <Line type="monotone" dataKey="users" name="Người dùng mới" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Tình hình hoàn thành bài học">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={learningProgress} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--admin-text-muted))' }} />
              <YAxis tick={{ fill: 'hsl(var(--admin-text-muted))' }} />
              <RechartsTooltip
                cursor={{ fill: 'hsl(var(--admin-accent-muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))' }}
              />
              <Bar dataKey="count" name="Số lượng">
                {
                  learningProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartContainer title="Phân bổ vai trò người dùng">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rolesDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {rolesDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Phễu chuyển đổi ứng tuyển">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))' }} />
              <Funnel
                dataKey="value"
                data={applicationFunnel}
                isAnimationActive
              >
                <LabelList position="right" fill="hsl(var(--admin-text-primary))" stroke="none" dataKey="name" />
                {
                  applicationFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))
                }
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Trạng thái hồ sơ">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={applicationStatus}
                cx="50%"
                cy="50%"
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {applicationStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default AdminOverviewDashboard;
