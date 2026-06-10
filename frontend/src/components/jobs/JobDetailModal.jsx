import React, { useState } from 'react'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

import { X, MapPin, CurrencyDollar, ArrowSquareOut, BookmarkSimple, Flag, Sparkle, Check } from '@phosphor-icons/react'

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

  // Handle apply - always try to open link, no blocking verification
  const handleApply = async () => {
    if (!jobData.sourceUrl) return

    // Always try to open the link directly
    // Background verify happens asynchronously (fire-and-forget)
    // The backend logs the result to MongoDB for future reference
    window.open(jobData.sourceUrl, '_blank', 'noopener,noreferrer')
    onApply?.(job)

    // Background verify (non-blocking)
    fetch(`/v1/jobs/${jobData.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
      // Silently ignore - user already has the link open
    })
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
                  <MapPin className="w-3 h-3 mr-1" weight="regular" />
                  {jobData.location}
                </Badge>
                <Badge variant="outline" className="font-normal text-success">
                  <CurrencyDollar className="w-3 h-3 mr-1" weight="regular" />
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
              <X className="w-5 h-5" weight="bold" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Match Info */}
          {(jobData.matchScore > 0 || jobData.skillsMatch > 0) && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
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
                <Check className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Kinh nghiệm:</strong> {jobData.experienceRequired} năm</span>
              </li>
              {jobData.educationRequired && (
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span><strong>Bằng cấp:</strong> {jobData.educationRequired}</span>
                </li>
              )}
              {jobData.agePreference && jobData.agePreference !== 'any' && (
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
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
          {/* Apply Button */}
          <Button
            onClick={handleApply}
            disabled={!jobData.sourceUrl}
            className="w-full"
            size="lg"
          >
            <ArrowSquareOut className="w-4 h-4 mr-2" />
            Ứng tuyển tại nhà tuyển dụng
          </Button>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              className="flex-1"
            >
              <BookmarkSimple className="w-4 h-4 mr-2" />
              Lưu việc làm
            </Button>
            <Button
              variant="outline"
              onClick={handleReportDeadLink}
              className="flex-1"
            >
              <Flag className="w-4 h-4 mr-2" />
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
              <Sparkle className="w-4 h-4 mr-2" />
              Xem khóa học gợi ý cho vị trí này
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobDetailModal
