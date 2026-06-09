import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { StatsCard, CourseProgressCard, ActivityItem, QuickAction } from '@/components/dashboard'
import CareerRecommendations from '@/components/worker-profile/CareerRecommendations'
import {
  getMyEnrollments,
  getMyCertificates,
  getWorkerUpcomingSchedule,
} from '@/apis'
import { getMyOutcomesAPI } from '@/apis/outcomeAPI'
import {
  BookOpen,
  PlayCircle,
  Briefcase,
  Award,
  Gift,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

function SectionHeader({ title, action, actionHref }) {
  return (
    <CardHeader className="flex-row items-center justify-between py-4 px-5">
      <CardTitle className="text-base">{title}</CardTitle>
      {action && (
        <a
          href={actionHref}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {action} <ChevronRight className="w-3 h-3" />
        </a>
      )}
    </CardHeader>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-12 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CourseListSkeleton() {
  return (
    <div className="space-y-3 px-5 pb-5">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function WorkerDashboardPage() {
  const navigate = useNavigate()

  const [enrollments, setEnrollments] = useState([])
  const [certificates, setCertificates] = useState([])
  const [applications, setApplications] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.allSettled([
          getMyEnrollments(),
          getMyCertificates(),
          getMyOutcomesAPI(),
          getWorkerUpcomingSchedule(),
        ])

        if (cancelled) return

        const [enrollRes, certRes, appRes, schedRes] = results

        if (enrollRes.status === 'fulfilled') {
          const list = enrollRes.value?.data?.data
            ?? enrollRes.value?.data
            ?? []
          setEnrollments(Array.isArray(list) ? list : [])
        }
        if (certRes.status === 'fulfilled') {
          const list = certRes.value?.data?.data
            ?? certRes.value?.data
            ?? []
          setCertificates(Array.isArray(list) ? list : [])
        }
        if (appRes.status === 'fulfilled') {
          const list = appRes.value?.data?.data
            ?? appRes.value?.data
            ?? []
          setApplications(Array.isArray(list) ? list : [])
        }
        if (schedRes.status === 'fulfilled') {
          const list = schedRes.value?.data?.data
            ?? schedRes.value?.data
            ?? []
          setUpcomingSessions(Array.isArray(list) ? list.slice(0, 5) : [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const activeEnrollments = enrollments.filter(
    (e) => e.status === 'active' || e.status === 'enrolled' || e.progress?.percentage > 0
  )
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed')
  const pendingApplications = applications.filter(
    (a) => a.status === 'pending' || a.status === 'applied'
  )

  // Compose recent activity from real data
  const recentActivity = []
  enrollments
    .filter((e) => e.lastAccessedAt)
    .slice(0, 2)
    .forEach((e) => {
      recentActivity.push({
        type: 'course',
        icon: PlayCircle,
        title: 'Tiếp tục học',
        description: e.course?.name || 'Khóa học',
        time: formatRelativeTime(e.lastAccessedAt),
      })
    })
  if (recentActivity.length === 0 && enrollments.length > 0) {
    recentActivity.push({
      type: 'course',
      icon: BookOpen,
      title: 'Đang theo học',
      description: `${activeEnrollments.length} khóa học đang active`,
      time: 'Hiện tại',
    })
  }
  certificates.slice(0, 1).forEach((c) => {
    recentActivity.push({
      type: 'certificate',
      icon: Award,
      title: 'Nhận chứng chỉ',
      description: c.courseName || c.course?.name || 'Chứng chỉ hoàn thành',
      time: c.issuedAt ? formatRelativeTime(c.issuedAt) : 'Gần đây',
    })
  })
  applications.slice(0, 1).forEach((a) => {
    recentActivity.push({
      type: 'job',
      icon: Briefcase,
      title: 'Ứng tuyển thành công',
      description: a.jobTitle || a.job?.title || 'Vị trí ứng tuyển',
      time: a.appliedAt ? formatRelativeTime(a.appliedAt) : 'Gần đây',
    })
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Xin chào!</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Đây là tổng quan hoạt động của bạn
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Đang theo học"
            value={activeEnrollments.length}
            icon={BookOpen}
            color="blue"
          />
          <StatsCard
            title="Hoàn thành"
            value={completedEnrollments.length}
            icon={PlayCircle}
            color="green"
          />
          <StatsCard
            title="Đơn ứng tuyển"
            value={pendingApplications.length}
            icon={Briefcase}
            color="purple"
          />
          <StatsCard
            title="Chứng chỉ"
            value={certificates.length}
            icon={Award}
            color="amber"
          />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          {loading ? (
            <Card>
              <SectionHeader title="Tiếp tục học" action="Xem tất cả" actionHref="/my-enrollments" />
              <CourseListSkeleton />
            </Card>
          ) : activeEnrollments.length > 0 ? (
            <Card>
              <SectionHeader title="Tiếp tục học" action="Xem tất cả" actionHref="/my-enrollments" />
              <CardContent className="px-5 pb-5 space-y-3">
                {activeEnrollments.slice(0, 3).map((enrollment) => (
                  <CourseProgressCard
                    key={enrollment._id}
                    title={enrollment.course?.name || enrollment.courseName || 'Khóa học'}
                    category={enrollment.course?.category?.name}
                    progress={enrollment.progress?.percentage || 0}
                    thumbnail={enrollment.course?.thumbnail}
                    instructor={enrollment.course?.instructor?.name}
                    lessonsCompleted={enrollment.progress?.completedLessons || 0}
                    totalLessons={enrollment.progress?.totalLessons || 0}
                    onClick={() => navigate(`/my-enrollments/${enrollment._id}/learn`)}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <SectionHeader title="Tiếp tục học" action="Khám phá khóa học" actionHref="/courses" />
              <CardContent className="px-5 pb-5">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-primary/60" />
                  </div>
                  <p className="text-sm font-medium">Chưa có khóa học nào</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bắt đầu học để theo dõi tiến độ tại đây
                  </p>
                  <button
                    onClick={() => navigate('/courses')}
                    className="mt-4 text-xs text-primary hover:underline"
                  >
                    Khám phá khóa học
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Schedule */}
          {!loading && upcomingSessions.length > 0 && (
            <Card>
              <SectionHeader title="Lịch học sắp tới" />
              <CardContent className="px-5 pb-5 space-y-2">
                {upcomingSessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.title || session.courseName || 'Buổi học'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.scheduledAt
                          ? new Date(session.scheduledAt).toLocaleDateString('vi-VN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'numeric',
                            })
                          : ''}
                        {session.startTime ? ` \u00B7 ${session.startTime}` : ''}
                      </p>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Recommendations */}
          <CareerRecommendations compact />

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base">Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-2">
                <QuickAction icon={BookOpen} label="Khóa học" href="/courses" />
                <QuickAction icon={Briefcase} label="Việc làm" href="/jobs" />
                <QuickAction icon={Gift} label="Học bổng" href="/scholarships" />
                <QuickAction icon={Award} label="Chứng chỉ" href="/my-certificates" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="divide-y divide-border">
                  {recentActivity.slice(0, 4).map((item, i) => (
                    <ActivityItem
                      key={i}
                      type={item.type}
                      title={item.title}
                      description={item.description}
                      time={item.time}
                      icon={item.icon}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
}
