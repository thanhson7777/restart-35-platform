import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Award,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Avatar, Progress } from '@/components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const statsData = [
  {
    title: 'Tổng người dùng',
    value: '2,456',
    change: '+12.5%',
    changeType: 'positive',
    icon: Users,
    color: 'blue',
  },
  {
    title: 'Khóa học',
    value: '48',
    change: '+3',
    changeType: 'positive',
    icon: BookOpen,
    color: 'green',
  },
  {
    title: 'Đơn đăng ký',
    value: '1,234',
    change: '+8.2%',
    changeType: 'positive',
    icon: GraduationCap,
    color: 'purple',
  },
  {
    title: 'Học bổng',
    value: '15',
    change: '-2',
    changeType: 'negative',
    icon: Award,
    color: 'orange',
  },
];

const enrollmentData = [
  { month: 'T1', enrollments: 245, completions: 120 },
  { month: 'T2', enrollments: 312, completions: 145 },
  { month: 'T3', enrollments: 278, completions: 132 },
  { month: 'T4', enrollments: 356, completions: 168 },
  { month: 'T5', enrollments: 423, completions: 195 },
  { month: 'T6', enrollments: 389, completions: 178 },
];

const courseDistribution = [
  { name: 'Kỹ thuật', value: 35, color: '#3B82F6' },
  { name: 'CNTT', value: 25, color: '#10B981' },
  { name: 'Kinh tế', value: 20, color: '#8B5CF6' },
  { name: 'Nghệ thuật', value: 12, color: '#F59E0B' },
  { name: 'Khác', value: 8, color: '#6B7280' },
];

const recentUsers = [
  { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', role: 'Học viên', avatar: null, joinedAt: '2 giờ trước' },
  { id: 2, name: 'Trần Thị B', email: 'tranthib@email.com', role: 'Học viên', avatar: null, joinedAt: '3 giờ trước' },
  { id: 3, name: 'Lê Văn C', email: 'levanc@email.com', role: 'Giảng viên', avatar: null, joinedAt: '5 giờ trước' },
  { id: 4, name: 'Phạm Thị D', email: 'phamthid@email.com', role: 'Học viên', avatar: null, joinedAt: '6 giờ trước' },
];

const recentEnrollments = [
  { id: 1, user: 'Nguyễn Văn A', course: 'Lập trình Python cơ bản', status: 'active', progress: 45 },
  { id: 2, user: 'Trần Thị B', course: 'Nghề hàn xuất khí', status: 'active', progress: 72 },
  { id: 3, user: 'Lê Văn C', course: 'Marketing Online', status: 'completed', progress: 100 },
  { id: 4, user: 'Phạm Thị D', course: 'May đo thời trang', status: 'pending', progress: 0 },
];

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

const AdminDashboardPage = () => {
  return (
    <AdminLayout>
      <AdminPageTitle
        title="Tổng quan"
        subtitle="Chào mừng bạn đến với trang quản trị"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.changeType === 'positive';

          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${colorMap[stat.color]} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 ${colorMap[stat.color].replace('bg-', 'text-')}`} />
                  </div>
                  <Badge
                    variant={isPositive ? 'success' : 'destructive'}
                    className="flex items-center gap-1"
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {stat.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Enrollment Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Đăng ký và hoàn thành khóa học</span>
              <select className="text-sm border border-input rounded-lg px-2 py-1 bg-background">
                <option>6 tháng gần nhất</option>
                <option>12 tháng gần nhất</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="enrollments" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Đăng ký" />
                  <Bar dataKey="completions" fill="#10B981" radius={[4, 4, 0, 0]} name="Hoàn thành" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Course Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố khóa học</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {courseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {courseDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-medium ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Người dùng mới</CardTitle>
            <a href="/admin/users" className="text-sm text-primary hover:underline">
              Xem tất cả
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4">
                  <Avatar
                    src={user.avatar}
                    fallback={user.name?.charAt(0) || 'U'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    <span className="text-xs text-muted-foreground">{user.joinedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Đăng ký gần đây</CardTitle>
            <a href="/admin/enrollments" className="text-sm text-primary hover:underline">
              Xem tất cả
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{enrollment.user}</p>
                    <p className="text-xs text-muted-foreground truncate">{enrollment.course}</p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <Progress value={enrollment.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {enrollment.progress}%
                    </span>
                  </div>
                  <Badge
                    variant={
                      enrollment.status === 'completed'
                        ? 'success'
                        : enrollment.status === 'active'
                        ? 'primary'
                        : 'secondary'
                    }
                  >
                    {enrollment.status === 'completed'
                      ? 'Hoàn thành'
                      : enrollment.status === 'active'
                      ? 'Đang học'
                      : 'Chờ duyệt'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
