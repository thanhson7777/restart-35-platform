import React, { useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { JOB_TYPE_OPTIONS } from '~/data/profileData'

const BUILDING_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
  </svg>
)

const USER_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const BRIEFCASE_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
)

const CLOCK_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const TRASH_ICON = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const YEAR_OPTIONS = Array.from({ length: 51 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '0 năm' : i === 1 ? '1 năm' : `${i} năm`
}))

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '0 tháng' : i === 1 ? '1 tháng' : `${i} tháng`
}))

function formatDuration(months) {
  if (!months || months === 0) return null
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = []
  if (y > 0) parts.push(`${y} năm`)
  if (m > 0) parts.push(`${m} tháng`)
  return `${parts.join(' ')} (${months} tháng)`
}

function JobCard({ job, onChange, onRemove, canRemove, index }) {
  const yearInputRef = useRef(null)

  const years = Math.floor((job.duration || 0) / 12)
  const months = (job.duration || 0) % 12

  const handleYearsChange = (val) => {
    const newY = parseInt(val) || 0
    const newM = parseInt(String(months)) || 0
    onChange('duration', newY * 12 + newM)
  }

  const handleMonthsChange = (val) => {
    const newM = parseInt(val) || 0
    const newY = parseInt(String(years)) || 0
    onChange('duration', newY * 12 + newM)
  }

  return (
    <div className="group relative bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
            {index + 1}
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Công việc {index + 1}
          </h3>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Xóa công việc"
          >
            <TRASH_ICON />
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {/* Company Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Tên công ty / Đơn vị
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <BUILDING_ICON />
            </div>
            <Input
              type="text"
              placeholder="VD: Cửa hàng tiện lợi ABC"
              value={job.companyName || ''}
              onChange={(e) => onChange('companyName', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Position */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Vị trí / Chức danh
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <USER_ICON />
            </div>
            <Input
              type="text"
              placeholder="VD: Nhân viên bán hàng"
              value={job.position || ''}
              onChange={(e) => onChange('position', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Thời gian làm việc
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10">
              <CLOCK_ICON />
            </div>
            <div className="grid grid-cols-2 gap-3 pl-10">
              <SelectField
                value={String(years)}
                options={YEAR_OPTIONS}
                onChange={handleYearsChange}
                placeholder="Năm"
              />
              <SelectField
                value={String(months)}
                options={MONTH_OPTIONS}
                onChange={handleMonthsChange}
                placeholder="Tháng"
              />
            </div>
          </div>
          {job.duration > 0 ? (
            <p className="text-xs text-green-600 flex items-center gap-1 ml-1">
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6L5 9L10 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formatDuration(job.duration)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground ml-1">
              Chưa chọn thời gian
            </p>
          )}
        </div>

        {/* Job Type */}
        <SelectField
          label="Loại hình công việc"
          value={job.jobType || ''}
          options={JOB_TYPE_OPTIONS}
          onChange={(val) => onChange('jobType', val)}
          placeholder="-- Chọn loại hình --"
          icon={<BRIEFCASE_ICON />}
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Mô tả công việc
            <span className="ml-1 text-xs text-muted-foreground font-normal">(tùy chọn)</span>
          </label>
          <textarea
            placeholder="Mô tả công việc đã làm, nhiệm vụ chính..."
            value={job.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            rows={3}
            className="
              flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm
              ring-offset-background transition-all duration-200
              placeholder:text-muted-foreground/60
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              focus-visible:ring-primary/50 focus-visible:border-primary
              disabled:cursor-not-allowed disabled:opacity-50
              resize-none
            "
          />
        </div>
      </div>
    </div>
  )
}

export default JobCard
