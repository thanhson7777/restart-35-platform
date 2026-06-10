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
  getMyIsaRepayments,
} from '@/apis'
import { getMyOutcomesAPI } from '@/apis/outcomeAPI'
import { getMySponsorships } from '@/apis/courseSponsorshipApi'
import { fetchMyPlacements } from '@/redux/placement/placementSlice'
import { useDispatch } from 'react-redux'
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
  DollarSign,
  TrendingUp,
  CheckCircle,
  ClipboardList,
  Target,
  MessageSquare,
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
  const dispatch = useDispatch()

  const [enrollments, setEnrollments] = useState([])
  const [certificates, setCertificates] = useState([])
  const [applications, setApplications] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [isaList, setIsaList] = useState([])
  const [placements, setPlacements] = useState([])
  const [sponsorships, setSponsorships] = useState([])
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
          getMyIsaRepayments(),
          dispatch(fetchMyPlacements()).unwrap().catch(() => []),
          getMySponsorships(),
        ])

        if (cancelled) return

        const [enrollRes, certRes, appRes, schedRes, isaRes, placementsRes, sponsorshipRes] = results

        if (enrollRes.status === 'fulfilled') {
          const list = enrollRes.value?.data?.data ?? enrollRes.value?.data ?? []
          setEnrollments(Array.isArray(list) ? list : [])
        }
        if (certRes.status === 'fulfilled') {
          const list = certRes.value?.data?.data ?? certRes.value?.data ?? []
          setCertificates(Array.isArray(list) ? list : [])
        }
        if (appRes.status === 'fulfilled') {
          const list = appRes.value?.data?.data ?? appRes.value?.data ?? []
          setApplications(Array.isArray(list) ? list : [])
        }
        if (schedRes.status === 'fulfilled') {
          const list = schedRes.value?.data?.data ?? schedRes.value?.data ?? []
          setUpcomingSessions(Array.isArray(list) ? list.slice(0, 5) : [])
        }
        if (isaRes.status === 'fulfilled') {
          const list = isaRes.value?.data || []
          setIsaList(Array.isArray(list) ? list : [])
        }
        if (placementsRes.status === 'fulfilled') {
          const list = Array.isArray(placementsRes.value) ? placementsRes.value : []
          setPlacements(list)
        }
        if (sponsorshipRes.status === 'fulfilled') {
          const list = sponsorshipRes.value?.data || []
          setSponsorships(Array.isArray(list) ? list : [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [dispatch])

  const activeEnrollments = enrollments.filter(
    (e) => e.status === 'active' || e.status === 'enrolled' || e.progress?.percentage > 0
  )
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed')
  const pendingApplications = applications.filter(
    (a) => a.status === 'pending' || a.status === 'applied'
  )
  const activePlacements = placements.filter(
    (p) => ['started', 'accepted', 'offered', 'interviewing'].includes(p.status)
  )
  const activeISA = isaList.find((isa) => isa.status === 'active') || isaList[0]
  const nextISA = activeISA?.nextPayment

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
                <QuickAction icon={Award} label="Chứng chỉ" href="/verify-certificate" />
                <QuickAction icon={ClipboardList} label="Ghi danh" href="/my-enrollments" />
                <QuickAction icon={Target} label="Việc làm" href="/my-placements" />
                <QuickAction icon={DollarSign} label="ISA" href="/my-isa" />
                <QuickAction icon={MessageSquare} label="Diễn đàn" href="/community/forum" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base">Hoat dong gan day</CardTitle>
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

          {/* Placements Summary */}
          {!loading && placements.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5 flex-row items-center justify-between">
                <CardTitle className="text-base">Viec lam cua toi</CardTitle>
                <a href="/my-placements" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Chi tiet <ChevronRight className="w-3 h-3" />
                </a>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {activePlacements.slice(0, 3).map((p) => (
                  <div key={p._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.job?.title || p.position || 'Viec lam'}</p>
                      <p className="text-xs text-muted-foreground">{p.employer?.name || p.employerName || ''}</p>
                    </div>
                    <span className="text-xs text-green-600 font-medium shrink-0 capitalize">{p.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ISA Summary */}
          {!loading && activeISA && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5 flex-row items-center justify-between">
                <CardTitle className="text-base">ISA cua toi</CardTitle>
                <a href="/my-isa" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Chi tiet <ChevronRight className="w-3 h-3" />
                </a>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {activeISA.totalPaidAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Da tra</span>
                    <span className="text-sm font-medium text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(activeISA.totalPaidAmount)}
                    </span>
                  </div>
                )}
                {activeISA.maxCap > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Muc toi da</span>
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(activeISA.maxCap)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, ((activeISA.totalPaidAmount || 0) / activeISA.maxCap) * 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sponsorships Summary */}
          {!loading && sponsorships.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5 flex-row items-center justify-between">
                <CardTitle className="text-base">Hoc bong cua toi</CardTitle>
                <a href="/my-sponsorships" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Chi tiet <ChevronRight className="w-3 h-3" />
                </a>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {sponsorships.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.courseName}</p>
                      <p className="text-xs text-muted-foreground">{e.sponsorships?.length || 0} chuong trinh</p>
                    </div>
                    <span className="text-xs font-medium text-blue-600 shrink-0">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
                        (e.sponsorships || []).reduce((sum, sp) => sum + (sp.fundedAmount || 0), 0)
                      )}
                    </span>
                  </div>
                ))}
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
