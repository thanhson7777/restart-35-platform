import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, CardContent, Button } from '@/components/ui'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/utils'
import { setFilters, clearFilters, selectJobFilters } from '@/redux/job/jobSlice'
import { JOB_TYPE_OPTIONS } from '@/data/profileData'

// Icons
const FilterIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

const XIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
)

const SparklesIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
)

const ChevronDownIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const RotateCcwIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

// Match score options
const MATCH_SCORE_OPTIONS = [
  { value: 80, label: '>80%', description: 'Rất phù hợp' },
  { value: 60, label: '>60%', description: 'Phù hợp' },
  { value: 40, label: '>40%', description: 'Khá phù hợp' },
  { value: null, label: 'Tất cả', description: 'Mọi mức độ' }
]

// Posted date options
const POSTED_DATE_OPTIONS = [
  { value: null, label: 'Tất cả' },
  { value: 1, label: 'Hôm nay' },
  { value: 3, label: '3 ngày trước' },
  { value: 7, label: '1 tuần trước' },
  { value: 30, label: '1 tháng trước' }
]

/**
 * FilterPanel Component - Bảng điều khiển lọc việc làm
 *
 * Features:
 * - AI Match % (buttons: >80%, >60%, >40%, All)
 * - Job type (checkboxes)
 * - Posted date (dropdown)
 * - Clear all filters button
 *
 * @param {Object} props
 * @param {Function} [props.onFiltersChange] - Callback when filters change
 * @param {boolean} [props.showMatchScore=true] - Show AI match score filter
 * @param {boolean} [props.showJobType=true] - Show job type filter
 * @param {boolean} [props.showPostedDate=true] - Show posted date filter
 * @param {string} [props.className] - Additional CSS classes
 */
const FilterPanel = ({
  onFiltersChange,
  showMatchScore = true,
  showJobType = true,
  showPostedDate = true,
  className
}) => {
  const dispatch = useDispatch()
  const filters = useSelector(selectJobFilters)

  // Handle match score change
  const handleMatchScoreChange = (value) => {
    const newFilters = { ...filters, matchMin: value }
    dispatch(setFilters(newFilters))
    onFiltersChange?.(newFilters)
  }

  // Handle job type toggle
  const handleJobTypeToggle = (jobType) => {
    const currentJobTypes = filters.jobType ? filters.jobType.split(',') : []
    let newJobTypes

    if (currentJobTypes.includes(jobType)) {
      newJobTypes = currentJobTypes.filter(t => t !== jobType)
    } else {
      newJobTypes = [...currentJobTypes, jobType]
    }

    const newFilters = {
      ...filters,
      jobType: newJobTypes.length > 0 ? newJobTypes.join(',') : null
    }
    dispatch(setFilters(newFilters))
    onFiltersChange?.(newFilters)
  }

  // Handle posted date change
  const handlePostedDateChange = (value) => {
    const newFilters = { ...filters, postedWithin: value }
    dispatch(setFilters(newFilters))
    onFiltersChange?.(newFilters)
  }

  // Handle clear all filters
  const handleClearFilters = () => {
    dispatch(clearFilters())
    onFiltersChange?.({
      location: null,
      jobType: null,
      salaryMin: null,
      salaryMax: null,
      postedWithin: null,
      matchMin: null
    })
  }

  // Check if any filters are active
  const hasActiveFilters = filters.matchMin || filters.jobType || filters.postedWithin

  // Count active filters
  const activeFilterCount = [
    filters.matchMin,
    filters.jobType,
    filters.postedWithin
  ].filter(Boolean).length

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-5 h-5 text-primary" />
              <span className="font-semibold">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground hover:text-foreground text-xs h-8 px-2"
              >
                <RotateCcwIcon className="w-3.5 h-3.5 mr-1" />
                Xoá lọc
              </Button>
            )}
          </div>

          {/* AI Match Score */}
          {showMatchScore && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Mức độ phù hợp (AI)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MATCH_SCORE_OPTIONS.map((option) => (
                  <button
                    key={option.value ?? 'all'}
                    onClick={() => handleMatchScoreChange(option.value)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-sm',
                      filters.matchMin === option.value
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Job Type */}
          {showJobType && (
            <div>
              <span className="text-sm font-medium block mb-2">Loại công việc</span>
              <div className="space-y-2">
                {JOB_TYPE_OPTIONS.map((option) => {
                  const currentJobTypes = filters.jobType ? filters.jobType.split(',') : []
                  const isChecked = currentJobTypes.includes(option.value)

                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleJobTypeToggle(option.value)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Posted Date */}
          {showPostedDate && (
            <div>
              <span className="text-sm font-medium block mb-2">Ngày đăng</span>
              <div className="relative">
                <select
                  value={filters.postedWithin ?? ''}
                  onChange={(e) => handlePostedDateChange(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 py-2 rounded-lg border border-input bg-background text-sm appearance-none cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {POSTED_DATE_OPTIONS.map((option) => (
                    <option key={option.value ?? 'all'} value={option.value ?? ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {filters.matchMin && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    Khớp &gt;{filters.matchMin}%
                    <button
                      onClick={() => handleMatchScoreChange(null)}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.jobType && filters.jobType.split(',').map((type) => {
                  const option = JOB_TYPE_OPTIONS.find(o => o.value === type)
                  return (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                    >
                      {option?.label || type}
                      <button
                        onClick={() => handleJobTypeToggle(type)}
                        className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
                {filters.postedWithin && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    {POSTED_DATE_OPTIONS.find(o => o.value === filters.postedWithin)?.label}
                    <button
                      onClick={() => handlePostedDateChange(null)}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default FilterPanel
