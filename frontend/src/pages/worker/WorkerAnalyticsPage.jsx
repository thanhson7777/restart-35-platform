import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { getMyEnrollments } from '@/apis/courseApi'
import { getMyApplications } from '@/apis/recruitmentAPI'
import { getMyCertificates } from '@/apis'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, BookOpen, FileCheck, Award, BarChart2,
} from 'lucide-react'

// ─── Palette ────────────────────────────────────────────────────────────────
const PALETTE = {
  emerald: '#10b981',
  teal:    '#14b8a6',
  indigo:  '#6366f1',
  amber:   '#f59e0b',
  red:     '#ef4444',
  slate:   '#94a3b8',
  purple:  '#a855f7',
  blue:    '#3b82f6',
}

const APPLICATION_FUNNEL_STEPS = [
  { key: 'new',                 label: 'Đã nộp',    color: PALETTE.blue },
  { key: 'reviewing',           label: 'Xem xét',   color: PALETTE.indigo },
  { key: 'shortlisted',         label: 'Shortlist', color: PALETTE.purple },
  { key: 'interview_scheduled', label: 'Lên PV',    color: PALETTE.amber },
  { key: 'interviewed',         label: 'Đã PV',     color: PALETTE.teal },
  { key: 'offered',             label: 'Offer',     color: PALETTE.emerald },
]

const STATUS_DONUT_CONFIG = {
  new:                 { label: 'Mới',            color: PALETTE.blue },
  reviewing:           { label: 'Đang xem',       color: PALETTE.indigo },
  shortlisted:         { label: 'Shortlist',      color: PALETTE.purple },
  interview_scheduled: { label: 'Lên lịch PV',   color: PALETTE.amber },
  interviewed:         { label: 'Đã PV',          color: PALETTE.teal },
  offered:             { label: 'Offer',          color: PALETTE.emerald },
  hired:               { label: 'Đã nhận',        color: '#22c55e' },
  rejected:            { label: 'Từ chối',        color: PALETTE.red },
  withdrawn:           { label: 'Đã rút',         color: PALETTE.slate },
}

const ENROLLMENT_STATUS_CONFIG = {
  active:    { label: 'Đang học',    color: PALETTE.blue },
  completed: { label: 'Hoàn thành', color: PALETTE.emerald },
  cancelled: { label: 'Đã hủy',     color: PALETTE.slate },
  dropped:   { label: 'Đã bỏ',      color: PALETTE.red },
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-lg px-4 py-3">
      {label && <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color || entry.fill }} />
          <span className="text-sm font-medium">{entry.name}: <strong>{entry.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ─── Custom Donut Label ──────────────────────────────────────────────────────
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold" fontSize={12}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Section skeleton ────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <Card>
    <CardHeader className="pb-2 pt-4 px-5">
      <Skeleton className="h-4 w-40" />
    </CardHeader>
    <CardContent className="px-5 pb-5">
      <Skeleton className="h-48 w-full rounded-xl" />
    </CardContent>
  </Card>
)

// ─── Tab Button ──────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
    }`}
  >
    <Icon size={15} />
    {label}
  </button>
)

// ────────────────────────────────────────────────────────────────────────────
export default function WorkerAnalyticsPage() {
  const [tab, setTab] = useState('jobs')
  const [applications, setApplications] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [appRes, enrollRes] = await Promise.allSettled([
          getMyApplications({ limit: 200 }),
          getMyEnrollments(),
        ])
        if (cancelled) return

        if (appRes.status === 'fulfilled') {
          const raw = appRes.value?.data?.data ?? appRes.value?.data ?? []
          const list = raw?.applications ?? (Array.isArray(raw) ? raw : [])
          setApplications(list)
        }
        if (enrollRes.status === 'fulfilled') {
          const raw = enrollRes.value?.data
          setEnrollments(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Derived: Applications ─────────────────────────────────────────────────

  /** Funnel: count applications đạt đến mỗi bước */
  const funnelData = (() => {
    const stepOrder = APPLICATION_FUNNEL_STEPS.map(s => s.key)
    return APPLICATION_FUNNEL_STEPS.map(({ key, label, color }) => {
      const stepIdx = stepOrder.indexOf(key)
      const count = applications.filter(a => {
        const aIdx = stepOrder.indexOf(a.status)
        return aIdx >= stepIdx
      }).length
      return { label, count, color }
    })
  })()

  /** Donut: phân bổ trạng thái đơn */
  const statusDonutData = (() => {
    const counts = {}
    applications.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: STATUS_DONUT_CONFIG[key]?.label ?? key,
        value,
        color: STATUS_DONUT_CONFIG[key]?.color ?? PALETTE.slate,
      }))
  })()

  /** Line chart: ứng tuyển theo tháng (6 tháng gần nhất) */
  const monthlyData = (() => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0,
      })
    }
    applications.forEach(a => {
      const d = new Date(a.appliedAt || a.createdAt)
      const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth())
      if (m) m.count++
    })
    return months.map(({ label, count }) => ({ label, count }))
  })()

  // ── Derived: Enrollments ──────────────────────────────────────────────────

  /** Donut: phân bổ trạng thái khóa */
  const enrollDonutData = (() => {
    const counts = {}
    enrollments.forEach(e => {
      const s = e.status || 'active'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: ENROLLMENT_STATUS_CONFIG[key]?.label ?? key,
        value,
        color: ENROLLMENT_STATUS_CONFIG[key]?.color ?? PALETTE.slate,
      }))
  })()

  /** Progress bars: tiến độ từng khóa (chỉ khóa đang học, tối đa 8) */
  const progressData = enrollments
    .filter(e => e.status === 'active' || !e.status)
    .slice(0, 8)
    .map(e => ({
      name: e.course?.title || e.courseName || 'Khóa học',
      progress: Math.round(e.progress ?? e.completionPercentage ?? 0),
    }))
    .sort((a, b) => b.progress - a.progress)

  // ── Summary numbers ───────────────────────────────────────────────────────
  const totalApps        = applications.length
  const activeApps       = applications.filter(a => !['rejected','withdrawn','hired'].includes(a.status)).length
  const totalEnrollments = enrollments.length
  const completedCourses = enrollments.filter(e => e.status === 'completed').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10">
          <BarChart2 size={20} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Thống kê của tôi</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Phân tích quá trình tìm việc và học tập
          </p>
        </div>
      </div>

      {/* Summary mini-cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: FileCheck, label: 'Tổng đơn ứng tuyển', value: totalApps,        color: 'text-blue-500',    bg: 'bg-blue-500/10' },
            { icon: TrendingUp,label: 'Đang xử lý',          value: activeApps,       color: 'text-purple-500',  bg: 'bg-purple-500/10' },
            { icon: BookOpen,   label: 'Khóa đã ghi danh',   value: totalEnrollments, color: 'text-amber-500',   bg: 'bg-amber-500/10' },
            { icon: Award,      label: 'Khóa hoàn thành',    value: completedCourses, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label} className="border-[hsl(var(--border))]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-tight">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 p-1 bg-[hsl(var(--muted))] rounded-2xl w-fit">
        <TabBtn active={tab === 'jobs'}    onClick={() => setTab('jobs')}    icon={FileCheck} label="Việc làm" />
        <TabBtn active={tab === 'learning'} onClick={() => setTab('learning')} icon={BookOpen}  label="Học tập" />
      </div>

      {/* ── Tab: Việc làm ──────────────────────────────────────────────────── */}
      {tab === 'jobs' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Funnel */}
            {loading ? <div className="lg:col-span-2"><ChartSkeleton /></div> : (
              <Card className="lg:col-span-2 border-[hsl(var(--border))]">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Phễu ứng tuyển</CardTitle>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Số đơn đạt đến từng bước trong quy trình
                  </p>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {applications.length === 0 ? (
                    <EmptyChart message="Chưa có đơn ứng tuyển nào" />
                  ) : (
                    <div className="space-y-3 pt-2">
                      {funnelData.map(({ label, count, color }, i) => {
                        const max = funnelData[0]?.count || 1
                        const pct = max > 0 ? (count / max) * 100 : 0
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <span className="text-xs text-[hsl(var(--muted-foreground))] w-20 shrink-0 text-right">
                              {label}
                            </span>
                            <div className="flex-1 h-7 bg-[hsl(var(--muted))] rounded-lg overflow-hidden">
                              <div
                                className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                                style={{ width: `${Math.max(pct, 4)}%`, background: color }}
                              >
                                <span className="text-white text-xs font-bold">{count}</span>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] w-12 text-right shrink-0">
                              {max > 0 ? `${Math.round(pct)}%` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Donut trạng thái đơn */}
            {loading ? <ChartSkeleton /> : (
              <Card className="border-[hsl(var(--border))]">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Trạng thái đơn</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  {statusDonutData.length === 0 ? (
                    <EmptyChart message="Chưa có dữ liệu" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={statusDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                          label={renderCustomLabel}
                        >
                          {statusDonutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span className="text-xs text-[hsl(var(--foreground))]">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Line chart theo tháng */}
          {loading ? <ChartSkeleton /> : (
            <Card className="border-[hsl(var(--border))]">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Hoạt động ứng tuyển</CardTitle>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Số đơn nộp theo tháng trong 6 tháng gần nhất
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {applications.length === 0 ? (
                  <EmptyChart message="Chưa có đơn ứng tuyển nào" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Đơn ứng tuyển"
                        stroke={PALETTE.indigo}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: PALETTE.indigo, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: PALETTE.indigo }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Học tập ───────────────────────────────────────────────────── */}
      {tab === 'learning' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Donut trạng thái khóa */}
            {loading ? <ChartSkeleton /> : (
              <Card className="border-[hsl(var(--border))]">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Trạng thái khóa học</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  {enrollDonutData.length === 0 ? (
                    <EmptyChart message="Chưa ghi danh khóa nào" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={enrollDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                          label={renderCustomLabel}
                        >
                          {enrollDonutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span className="text-xs text-[hsl(var(--foreground))]">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Progress bars từng khóa */}
            {loading ? <div className="lg:col-span-2"><ChartSkeleton /></div> : (
              <Card className="lg:col-span-2 border-[hsl(var(--border))]">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Tiến độ khóa học</CardTitle>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Các khóa đang học, sắp xếp theo tiến độ
                  </p>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {progressData.length === 0 ? (
                    <EmptyChart message="Không có khóa đang học" />
                  ) : (
                    <div className="space-y-4 pt-1">
                      {progressData.map(({ name, progress }) => (
                        <div key={name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium truncate max-w-[75%]" title={name}>
                              {name}
                            </span>
                            <span className="text-sm font-bold text-emerald-500">{progress}%</span>
                          </div>
                          <div className="h-2.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${progress}%`,
                                background: progress >= 80
                                  ? PALETTE.emerald
                                  : progress >= 40
                                  ? PALETTE.teal
                                  : PALETTE.blue,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyChart({ message }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center gap-2 text-[hsl(var(--muted-foreground))]">
      <BarChart2 size={32} strokeWidth={1.2} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
