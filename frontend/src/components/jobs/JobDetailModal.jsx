import React, { useState } from 'react'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

// Icons
const XIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
)

const MapPinIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const DollarSignIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const ExternalLinkIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
)

const BookmarkIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const FlagIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </svg>
)

const SparklesIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
)

const CheckIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const AlertIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </svg>
)

const LoaderIcon = ({ className }) => (
  <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

/**
 * JobDetailModal Component - Modal hiển thị chi tiết job
 * Features:
 * - Full job description
 * - Skills with match indicators
 * - Requirements
 * - Apply button with URL verification
 * - Warning when link is dead
 * - Save and report dead link buttons
 * 
 * @param {Object} props
 * @param {Object} props.job - Job data
 * @param {Function} props.onClose - Close modal handler
 * @param {Function} props.onApply - Apply handler
 * @param {Function} props.onReportDeadLink - Report dead link handler
 * @param {Function} props.onSave - Save job handler
 */
const JobDetailModal = ({
  job,
  onClose,
  onApply,
  onReportDeadLink,
  onSave,
  onViewCourses
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showDeadWarning, setShowDeadWarning] = useState(false)

  if (!job) return null

  // Normalize job data
  const jobData = {
    id: job.id || job._id,
    title: job.title || 'Không có tiêu đề',
    company: job.company || 'Công ty không xác định',
    location: job.location || job.province || 'Không xác định',
    salaryMin: job.salary_min || job.salaryMin || 0,
    salaryMax: job.salary_max || job.salaryMax || 0,
    salaryRange: job.salary_range || '',
    jobType: job.type || job.job_type || 'full-time',
    skills: job.skills || [],
    description: job.description || '',
    experienceRequired: job.experience_required || job.experienceRequired || 0,
    educationRequired: job.education_required || job.educationRequired || '',
    agePreference: job.age_preference || job.agePreference,
    sourceUrl: job.source_url || job.sourceUrl || '',
    isActive: job.is_active !== false,
    qualityScore: job.quality_score || job.qualityScore || 0,
    source: job.source || '',
    skillsMatch: job.skills_match || 0,
    score: job.score || 0,
    matchScore: job.match_score || job.matchScore || 0
  }

  // Format salary
  const formatSalary = () => {
    if (jobData.salaryRange) return jobData.salaryRange
    if (jobData.salaryMin === 0 && jobData.salaryMax === 0) return 'Thoả thuận'
    if (jobData.salaryMin === jobData.salaryMax) {
      return `${(jobData.salaryMin / 1000000).toFixed(0)} triệu`
    }
    return `${(jobData.salaryMin / 1000000).toFixed(0)} - ${(jobData.salaryMax / 1000000).toFixed(0)} triệu`
  }

  // Get job type label
  const getJobTypeLabel = (type) => {
    const labels = {
      'full-time': 'Toàn thời gian',
      'part-time': 'Bán thời gian',
      'temporary': 'Tạm thời',
      'freelance': 'Freelance'
    }
    return labels[type] || type || 'Toàn thời gian'
  }

  // Get quality badge class
  const getQualityBadge = () => {
    if (jobData.qualityScore >= 75) return { label: 'Chất lượng cao', class: 'bg-success/10 text-success border-success/20' }
    if (jobData.qualityScore >= 50) return { label: 'Trung bình', class: 'bg-warning/10 text-warning border-warning/20' }
    return { label: 'Cơ bản', class: 'bg-muted text-muted-foreground' }
  }

  const qualityBadge = getQualityBadge()

  // Handle apply with URL verification
  const handleApply = async () => {
    if (!jobData.sourceUrl) return

    setIsVerifying(true)

    try {
      // Call API to verify URL
      const response = await fetch(`/v1/jobs/${jobData.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()

      if (result.isAlive === true) {
        // URL is alive - open it
        window.open(jobData.sourceUrl, '_blank', 'noopener,noreferrer')
        onApply?.(job)
      } else if (result.isAlive === false) {
        // URL is dead - show warning
        setShowDeadWarning(true)
        // Report dead link automatically
        onReportDeadLink?.(jobData.id)
      } else {
        // Unknown status (job not in MongoDB) - try to open anyway
        window.open(jobData.sourceUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      // Network error - try to open link anyway
      console.warn('Verification failed, trying to open link anyway:', err)
      window.open(jobData.sourceUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setIsVerifying(false)
    }
  }

  // Handle report dead link
  const handleReportDeadLink = () => {
    onReportDeadLink?.(jobData.id)
  }

  // Handle save
  const handleSave = () => {
    onSave?.(job)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="shrink-0 p-6 border-b bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold leading-tight pr-4">
                {jobData.title}
              </h2>
              <p className="text-muted-foreground mt-1">{jobData.company}</p>
              
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline" className="font-normal">
                  <MapPinIcon className="w-3 h-3 mr-1" />
                  {jobData.location}
                </Badge>
                <Badge variant="outline" className="font-normal text-success">
                  <DollarSignIcon className="w-3 h-3 mr-1" />
                  {formatSalary()}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {getJobTypeLabel(jobData.jobType)}
                </Badge>
                {jobData.source && (
                  <Badge variant="outline" className="font-normal">
                    Nguồn: {jobData.source}
                  </Badge>
                )}
                <Badge className={cn('font-normal border', qualityBadge.class)}>
                  {qualityBadge.label}
                </Badge>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Match Info */}
          {(jobData.matchScore > 0 || jobData.skillsMatch > 0) && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-primary" />
                Độ phù hợp với hồ sơ của bạn
              </h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>Skills khớp: <strong>{jobData.skillsMatch}</strong></span>
                <span>Điểm match: <strong>{Math.round((jobData.score || jobData.matchScore) * 100)}%</strong></span>
              </div>
            </div>
          )}

          {/* Skills */}
          {jobData.skills && jobData.skills.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Kỹ năng yêu cầu</h3>
              <div className="flex flex-wrap gap-2">
                {jobData.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div>
            <h3 className="font-medium mb-3">Yêu cầu</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Kinh nghiệm:</strong> {jobData.experienceRequired} năm</span>
              </li>
              {jobData.educationRequired && (
                <li className="flex items-start gap-2">
                  <CheckIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span><strong>Bằng cấp:</strong> {jobData.educationRequired}</span>
                </li>
              )}
              {jobData.agePreference && jobData.agePreference !== 'any' && (
                <li className="flex items-start gap-2">
                  <CheckIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span><strong>Tuổi:</strong> {jobData.agePreference}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Description */}
          {jobData.description && (
            <div>
              <h3 className="font-medium mb-3">Mô tả công việc</h3>
              <div className={cn(
                'text-sm text-muted-foreground whitespace-pre-wrap',
                !showFullDescription && 'line-clamp-6'
              )}>
                {jobData.description}
              </div>
              {jobData.description.length > 800 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-6 border-t bg-card space-y-3">
          {/* Dead link warning */}
          {showDeadWarning && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertIcon className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Link đã hết hạn</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tin tuyển dụng này có thể đã được gỡ bỏ hoặc đã hết hạn.
                  Cảm ơn bạn đã báo cáo!
                </p>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <Button
            onClick={handleApply}
            disabled={isVerifying || !jobData.sourceUrl}
            className="w-full"
            size="lg"
          >
            {isVerifying ? (
              <>
                <LoaderIcon className="w-4 h-4 mr-2" />
                Đang kiểm tra link...
              </>
            ) : (
              <>
                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                Ứng tuyển tại nhà tuyển dụng
              </>
            )}
          </Button>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              className="flex-1"
            >
              <BookmarkIcon className="w-4 h-4 mr-2" />
              Lưu việc làm
            </Button>
            <Button
              variant="outline"
              onClick={handleReportDeadLink}
              className="flex-1"
            >
              <FlagIcon className="w-4 h-4 mr-2" />
              Báo link chết
            </Button>
          </div>

          {/* Course Recommendation CTA */}
          {onViewCourses && (
            <Button
              variant="secondary"
              onClick={() => onViewCourses(job)}
              className="w-full mt-2"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              Xem khóa học gợi ý cho vị trí này
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobDetailModal
