import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMyStats } from '@/redux/outcome/outcomeSlice'
import { selectStats, selectStatsLoading } from '@/redux/outcome/outcomeSlice'
import { selectCurrentUser } from '@/redux/user/userSlice'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Target, CheckCircle, Users, Star, Briefcase, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const MySuccessStatsPage = () => {
  const dispatch = useDispatch()
  const stats = useSelector(selectStats)
  const statsLoading = useSelector(selectStatsLoading)
  const currentUser = useSelector(selectCurrentUser)

  useEffect(() => {
    if (!currentUser) return
    dispatch(fetchMyStats())
  }, [dispatch, currentUser?._id])

  if (statsLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải thống kê...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Tổng đơn ứng tuyển',
      value: stats.total || 0,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Phỏng vấn',
      value: stats.interviewed || 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30'
    },
    {
      label: 'Nhận việc',
      value: stats.hired || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30'
    },
    {
      label: 'Tỷ lệ thành công',
      value: `${Math.round(stats.successRate || 0)}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30'
    }
  ]

  const outcomeStatusData = [
    { status: 'Đã tuyển', count: stats.hired || 0, color: '#22c55e' },
    { status: 'Phỏng vấn', count: stats.interviewed || 0, color: '#6366f1' },
    { status: 'Bị từ chối', count: stats.rejected || 0, color: '#ef4444' },
    { status: 'Đang chờ', count: stats.pending || 0, color: '#f59e0b' }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Thống kê thành công</h1>
          <p className="text-muted-foreground mt-1">Theo dõi tiến độ tìm việc của bạn</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <card.icon size={20} className={card.color} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outcome Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Phân bổ trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {outcomeStatusData.map((item, i) => {
                  const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm">{item.status}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Categories */}
          {stats.topCategories && stats.topCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ngành nghề quan tâm nhiều nhất</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.topCategories} layout="vertical">
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="category" type="category" fontSize={12} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" name="Số đơn" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Interview Rate */}
          {stats.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tỷ lệ phỏng vấn</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor"
                      className="text-zinc-100 dark:text-zinc-800" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none"
                      stroke="#6366f1" strokeWidth="3"
                      strokeDasharray={`${Math.round(stats.interviewed / stats.total * 100)}, 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{Math.round(stats.interviewed / stats.total * 100)}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {stats.interviewed}/{stats.total} đơn được phỏng vấn
                </p>
              </CardContent>
            </Card>
          )}

          {/* Hire Rate */}
          {stats.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tỷ lệ nhận việc</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none"
                      className="text-zinc-100 dark:text-zinc-800" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none"
                      stroke="#22c55e" strokeWidth="3"
                      strokeDasharray={`${Math.round(stats.hired / stats.total * 100)}, 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{Math.round(stats.hired / stats.total * 100)}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {stats.hired}/{stats.total} đơn được nhận
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default MySuccessStatsPage
