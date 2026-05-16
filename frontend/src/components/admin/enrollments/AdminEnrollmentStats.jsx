import { Users, BookOpen, CheckCircle, Clock, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatPrice } from '@/utils/formatter';

const STATUS_CONFIG = {
  total: { icon: Users, color: 'blue', bgColor: 'bg-blue-50', iconColor: 'text-blue-600', label: 'Tổng đăng ký' },
  enrolled: { icon: BookOpen, color: 'purple', bgColor: 'bg-purple-50', iconColor: 'text-purple-600', label: 'Đang học' },
  in_progress: { icon: Clock, color: 'amber', bgColor: 'bg-amber-50', iconColor: 'text-amber-600', label: 'Đang tiến hành' },
  completed: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-50', iconColor: 'text-green-600', label: 'Hoàn thành' },
  waitlist: { icon: Clock, color: 'cyan', bgColor: 'bg-cyan-50', iconColor: 'text-cyan-600', label: 'Chờ xếp lớp' },
  dropped: { icon: AlertTriangle, color: 'red', bgColor: 'bg-red-50', iconColor: 'text-red-600', label: 'Đã bỏ cuộc' },
  cancelled: { icon: AlertTriangle, color: 'slate', bgColor: 'bg-slate-100', iconColor: 'text-slate-500', label: 'Đã hủy' }
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
      { key: 'revenue', value: revenue.total || 0, isPrice: true }
    ];
  };

  const formatMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    return monthNames[parseInt(month) - 1] || monthStr;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-lg mb-3" />
                <div className="w-16 h-6 bg-slate-200 rounded mb-2" />
                <div className="w-20 h-4 bg-slate-200 rounded" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-6 h-64">
            <div className="animate-pulse flex items-center justify-center h-full text-slate-400">
              Đang tải biểu đồ...
            </div>
          </Card>
          <Card className="p-6 h-64">
            <div className="animate-pulse flex items-center justify-center h-full text-slate-400">
              Đang tải biểu đồ...
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const statItems = getStatItems();
  const monthlyTrend = stats?.monthlyTrend || [];
  const topCourses = stats?.topCourses || [];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {statItems.map((item) => {
          const config = STATUS_CONFIG[item.key];
          if (!config) return null;
          const Icon = config.icon;

          return (
            <Card
              key={item.key}
              className={`p-4 hover:shadow-md transition-shadow ${
                item.key === 'revenue' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.iconColor}`} />
                </div>
                {item.key === 'completed' && item.value > 0 && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">
                  {item.isPrice
                    ? formatPrice(item.value)
                    : item.value.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {config.label}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend Chart */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Xu hướng đăng ký (6 tháng gần nhất)
          </h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tickFormatter={formatMonthLabel}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [`${value} đăng ký`, 'Số lượng']}
                  labelFormatter={(label) => {
                    const [year, month] = label.split('-');
                    return `Tháng ${month}/${year}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
              Chưa có dữ liệu xu hướng
            </div>
          )}
        </Card>

        {/* Top Courses Chart */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Top khóa học được đăng ký nhiều nhất
          </h3>
          {topCourses.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCourses.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={120}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                />
                <Tooltip
                  formatter={(value, name) => [`${value} học viên`, 'Số lượng']}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
              Chưa có dữ liệu khóa học
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminEnrollmentStats;
