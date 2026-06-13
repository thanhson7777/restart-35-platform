/**
 * Recommendation Analytics Page — Admin dashboard cho course recommendation metrics
 * Refactored: segmented control, Lucide icons, premium spacing
 */

import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui'
import { AdminPageTitle } from '@/components/layout'
import {
  getRecommendationMetricsAPI,
  getTimelineAPI,
  getTopCoursesAPI
} from '@/apis/recommendationFeedbackAPI'
import { KPICard } from '@/components/admin/recommendation/KPICard'
import { TimelineChart } from '@/components/admin/recommendation/TimelineChart'
import { TopCoursesTable } from '@/components/admin/recommendation/TopCoursesTable'

const PERIOD_OPTIONS = [
  { label: '7 ngày', value: 7 },
  { label: '30 ngày', value: 30 },
  { label: '90 ngày', value: 90 },
]

/** Inline segmented control — no external dep needed */
const SegmentedControl = ({ options, value, onChange }) => (
  <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
    {options.map((opt) => {
      const active = opt.value === value
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200
            ${active
              ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border border-[hsl(var(--admin-accent))]/30 shadow-sm'
              : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] border border-transparent'
            }
          `}
        >
          {opt.label}
        </button>
      )
    })}
  </div>
)

const RecommendationAnalyticsPage = () => {
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [topCourses, setTopCourses] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [metricsRes, timelineRes, topRes] = await Promise.all([
        getRecommendationMetricsAPI(period).catch(() => null),
        getTimelineAPI(period).catch(() => []),
        getTopCoursesAPI(period, 10).catch(() => [])
      ])

      if (metricsRes?.success) setMetrics(metricsRes.data)
      if (timelineRes?.success) setTimeline(timelineRes.data || [])
      if (topRes?.success) setTopCourses(topRes.data || [])
    } catch (err) {
      console.error('[RecommendationAnalytics] fetch error:', err)
      toast.error('Khong the tai du lieu analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <>
      <div className="space-y-8">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <AdminPageTitle
            title="Analytics — Gợi ý khóa học"
            subtitle={`Theo dõi hiệu quả hệ thống gợi ý khóa học (${period} ngày gần nhất)`}
          />
          <div className="flex items-center gap-3 mt-1">
            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:border-[hsl(var(--admin-accent))]/30 hover:bg-[hsl(var(--admin-accent-subtle))] rounded-xl"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Impressions"
              value={(metrics.impressions || 0).toLocaleString('vi-VN')}
              sub={`${period} ngày`}
              color="blue"
            />
            <KPICard
              label="CTR (Click Rate)"
              value={`${((metrics.ctr || 0) * 100).toFixed(1)}%`}
              sub={`${metrics.clicks || 0} clicks`}
              color="green"
            />
            <KPICard
              label="Enrollment Rate"
              value={`${((metrics.enrollment_rate || 0) * 100).toFixed(1)}%`}
              sub={`${metrics.enrolls || 0} đăng ký`}
              color="purple"
            />
            <KPICard
              label="Completion Rate"
              value={`${((metrics.completion_rate || 0) * 100).toFixed(1)}%`}
              sub={`${metrics.completes || 0} hoàn thành`}
              color="amber"
            />
          </div>
        )}

        {/* Thumbs feedback summary */}
        {metrics && (
          <div className="flex flex-wrap items-center gap-6 text-[13px]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold tabular-nums">{metrics.thumbs_up || 0}</span>
                <span className="text-[hsl(var(--admin-text-muted))] text-[11px]">thumbs up</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/8 border border-red-500/20">
                <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-500 font-semibold tabular-nums">{metrics.thumbs_down || 0}</span>
                <span className="text-[hsl(var(--admin-text-muted))] text-[11px]">thumbs down</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                <Minus className="w-3.5 h-3.5 text-[hsl(var(--admin-text-muted))]" />
                <span className="text-[hsl(var(--admin-text-secondary))] font-semibold tabular-nums">
                  {((metrics.dismiss_rate || 0) * 100).toFixed(1)}%
                </span>
                <span className="text-[hsl(var(--admin-text-muted))] text-[11px]">dismiss rate</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline chart */}
        <TimelineChart data={timeline} loading={loading} period={period} />

        {/* Top courses table */}
        <TopCoursesTable courses={topCourses} loading={loading} period={period} />
      </div>
    </>
  )
}

export default RecommendationAnalyticsPage
