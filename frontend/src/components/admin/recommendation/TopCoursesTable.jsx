/**
 * Top Courses Table — Recommendation Analytics
 * Light admin theme
 */
import React from 'react'
import { BezelCard } from '@/components/ui'
import { ThumbsUp, ThumbsDown, Inbox, Trophy } from 'lucide-react'

const ENROLLMENT_COLOR = (rate) => {
  if (rate >= 0.5) return 'text-emerald-500'
  if (rate >= 0.2) return 'text-amber-500'
  return 'text-[hsl(var(--admin-text-muted))]'
}

const ENROLLMENT_BAR_COLOR = (rate) => {
  if (rate >= 0.5) return 'bg-emerald-500'
  if (rate >= 0.2) return 'bg-amber-500'
  return 'bg-[hsl(var(--admin-border))]'
}

const MiniProgressBar = ({ rate }) => {
  const pct = Math.min((rate || 0) * 100, 100)
  const barColor = ENROLLMENT_BAR_COLOR(rate || 0)
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[12px] font-semibold tabular-nums ${ENROLLMENT_COLOR(rate)}`}>
        {(rate * 100).toFixed(1)}%
      </span>
    </div>
  )
}

export const TopCoursesTable = ({ courses = [], loading, period }) => {
  return (
    <BezelCard className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[13px] font-semibold text-[hsl(var(--admin-text-primary))] tracking-tight">Khóa học hiệu quả nhất</h3>
          <p className="text-[11px] text-[hsl(var(--admin-text-muted))] mt-0.5">{period} ngày gần nhất</p>
        </div>
        <Trophy className="w-4 h-4 text-amber-500/60" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-[hsl(var(--admin-surface-elevated))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </div>
          <p className="text-[13px] font-medium text-[hsl(var(--admin-text-muted))]">Chưa có dữ liệu khóa học</p>
          <p className="text-[11px] text-[hsl(var(--admin-text-faint))] mt-1">Dữ liệu sẽ xuất hiện khi có người dùng đăng ký</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[hsl(var(--admin-border))]">
                <th className="pb-3 pr-4 text-[10px] uppercase tracking-[0.1em] font-semibold text-[hsl(var(--admin-text-muted))]">Khóa học</th>
                <th className="pb-3 px-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-[hsl(var(--admin-text-muted))] text-right">Impressions</th>
                <th className="pb-3 px-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-[hsl(var(--admin-text-muted))] text-right">Đăng ký</th>
                <th className="pb-3 px-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-[hsl(var(--admin-text-muted))] text-right">Enroll Rate</th>
                <th className="pb-3 px-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-[hsl(var(--admin-text-muted))] text-right">Thumbs</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, i) => {
                const enrollRate = course.enrollment_rate || 0
                const isEven = i % 2 === 0
                return (
                  <tr
                    key={i}
                    className={`
                      border-b border-[hsl(var(--admin-border))]/60
                      hover:bg-[hsl(var(--admin-accent-subtle))]
                      border-l-2 border-l-transparent hover:border-l-[hsl(var(--admin-accent))]
                      transition-all duration-150
                      ${isEven ? 'bg-transparent' : 'bg-[hsl(var(--admin-surface-elevated))]/50'}
                    `}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-[hsl(var(--admin-text-muted))] font-semibold tabular-nums w-5 shrink-0 text-right">
                          {i + 1}
                        </span>
                        <span className="text-[13px] font-medium text-[hsl(var(--admin-text-secondary))] line-clamp-1 max-w-[200px]">
                          {course._id?.courseTitle || 'Không tên'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-[12px] font-medium text-[hsl(var(--admin-text-secondary))] tabular-nums">
                      {(course.impressions || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-2 text-right text-[12px] font-medium text-[hsl(var(--admin-text-secondary))] tabular-nums">
                      {course.enrolls || 0}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex justify-end">
                        <MiniProgressBar rate={enrollRate} />
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 tabular-nums font-medium">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {course.thumbs_up || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-500 tabular-nums font-medium">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {course.thumbs_down || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </BezelCard>
  )
}
