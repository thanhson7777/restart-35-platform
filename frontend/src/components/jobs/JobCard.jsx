import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, CardContent } from '@/components/ui'
import { Badge, Avatar } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { toggleSaveJob, selectIsJobSaved } from '@/redux/job/jobSlice'
import { JOB_TYPE_OPTIONS } from '@/data/profileData'

// Icons
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

const BookmarkIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const BookmarkFilledIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const LinkIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const CheckIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const AlertIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
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

const BriefcaseIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>
)

/**
 * Format salary for display
 * @param {number|string} salary - Salary value
 * @returns {string} Formatted salary string
 */
const formatSalary = (salary) => {
  if (!salary) return 'Thoả thuận'
  const num = typeof salary === 'string' ? parseInt(salary.replace(/[^0-9]/g, '')) : salary
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(0)} - ${(num / 1000000 + 2).toFixed(0)} triệu`
  }
  return `${num.toLocaleString('vi-VN')} VND`
}

/**
 * Get job type label
 * @param {string} jobType - Job type value
 * @returns {string} Job type label
 */
const getJobTypeLabel = (jobType) => {
  const found = JOB_TYPE_OPTIONS.find(opt => opt.value === jobType)
  return found ? found.label : jobType || 'Toàn thời gian'
}

/**
 * Get match score color
 * @param {number} score - Match score (0-100)
 * @returns {string} Color class
 */
const getMatchScoreColor = (score) => {
  if (score >= 80) return 'bg-success text-white'
  if (score >= 60) return 'bg-primary text-white'
  if (score >= 40) return 'bg-warning text-white'
  return 'bg-muted text-muted-foreground'
}

/**
 * JobCard Component - Hiển thị thông tin việc làm với 4 phần:
 * 1. Thông tin cơ bản: job title, company, logo, location, salary, type
 * 2. Match score badge
 * 3. Skill tags with match indicators
 * 4. Explainability: "Tại sao phù hợp?"
 * Actions: Save, Similar, Apply, Open Detail
 *
 * @param {Object} props
 * @param {Object} props.job - Job data object
 * @param {string} [props.job.id] - Job ID
 * @param {string} [props.job._id] - Job ID (alternative)
 * @param {string} [props.job.title] - Job title
 * @param {string} [props.job.job_title] - Job title (alternative)
 * @param {string} [props.job.company] - Company name
 * @param {string} [props.job.company_name] - Company name (alternative)
 * @param {string} [props.job.location] - Location
 * @param {string} [props.job.province] - Province
 * @param {number} [props.job.salary] - Salary
 * @param {number} [props.job.salary_min] - Min salary
 * @param {number} [props.job.salary_max] - Max salary
 * @param {string} [props.job.job_type] - Job type
 * @param {string[]} [props.job.required_skills] - Required skills
 * @param {string[]} [props.job.skills] - Skills (alternative)
 * @param {number} [props.job.match_score] - Match score
 * @param {string[]} [props.job.matching_skills] - Skills that match user's profile
 * @param {string} [props.job.logo] - Company logo URL
 * @param {string} [props.job.posted_date] - Posted date
 * @param {string} [props.job.description] - Job description
 * @param {Object} [props.userSkills] - User's skills from profile for comparison
 * @param {Object} [props.targetSalary] - User's target salary
 * @param {Object} [props.onApply] - Callback when clicking apply
 * @param {Object} [props.onViewSimilar] - Callback when clicking view similar
 * @param {Function} [props.onOpenDetail] - Callback when clicking to open detail modal
 * @param {string} [props.className] - Additional CSS classes
 */
const JobCard = ({
  job,
  userSkills = [],
  targetSalary = null,
  onApply,
  onViewSimilar,
  onOpenDetail,
  className
}) => {
  const dispatch = useDispatch()
  const jobId = job?.id || job?._id
  const isSaved = useSelector(selectIsJobSaved(jobId))

  // Normalize job data
  const jobData = {
    id: jobId,
    title: job?.title || job?.job_title || 'Không có tiêu đề',
    company: job?.company || job?.company_name || 'Công ty không xác định',
    location: job?.location || job?.province || 'Không xác định',
    salary: job?.salary || job?.salary_min || job?.salary_max,
    salaryMin: job?.salary_min || job?.salary,
    salaryMax: job?.salary_max || job?.salary,
    jobType: job?.job_type || job?.jobType || 'full-time',
    requiredSkills: job?.required_skills || job?.skills || [],
    matchScore: job?.match_score || job?.matchScore || 0,
    matchingSkills: job?.matching_skills || [],
    logo: job?.logo || job?.company_logo,
    postedDate: job?.posted_date || job?.postedDate || job?.created_at,
    description: job?.description || job?.job_description,
    sourceUrl: job?.source_url || job?.sourceUrl || job?.job_url || '',
    isActive: job?.is_active !== false,
    qualityScore: job?.quality_score || job?.qualityScore || 0,
    source: job?.source || ''
  }

  // Calculate matching skills if user skills provided
  const displayMatchingSkills = jobData.matchingSkills.length > 0
    ? jobData.matchingSkills
    : (userSkills.length > 0
      ? jobData.requiredSkills.filter(skill =>
          userSkills.some(userSkill =>
            skill.toLowerCase().includes(userSkill.toLowerCase()) ||
            userSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      : [])

  // Build explainability reasons
  const reasons = []

  if (displayMatchingSkills.length > 0) {
    const totalSkills = jobData.requiredSkills.length || 1
    reasons.push({
      type: 'success',
      text: `${displayMatchingSkills.length}/${totalSkills} kỹ năng khớp`
    })
  }

  if (targetSalary && jobData.salaryMin) {
    if (jobData.salaryMin <= targetSalary) {
      reasons.push({
        type: 'success',
        text: 'Mức lương phù hợp với mong muốn'
      })
    } else {
      reasons.push({
        type: 'warning',
        text: 'Mức lương cao hơn mong muốn'
      })
    }
  }

  if (jobData.matchScore >= 70) {
    reasons.push({
      type: 'success',
      text: 'Độ khớp cao với hồ sơ'
    })
  }

  if (jobData.matchScore < 50) {
    reasons.push({
      type: 'warning',
      text: 'Cần thêm kỹ năng để phù hợp hơn'
    })
  }

  // Handle save toggle
  const handleSaveToggle = (e) => {
    e.stopPropagation()
    dispatch(toggleSaveJob(job))
  }

  // Handle similar jobs
  const handleViewSimilar = (e) => {
    e.stopPropagation()
    onViewSimilar?.(jobData)
  }

  // Handle apply
  const handleApply = (e) => {
    e.stopPropagation()
    onApply?.(jobData)
  }

  // Handle open detail
  const handleOpenDetail = (e) => {
    if (onOpenDetail) {
      e?.stopPropagation?.()
      onOpenDetail(job)
    }
  }

  // Generate company logo fallback
  const companyInitials = jobData.company
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card
      className={cn(
        'group hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30 cursor-pointer',
        className
      )}
      onClick={() => handleOpenDetail()}
    >
      <CardContent className="p-0">
        {/* Section 1: Basic Info */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="shrink-0">
              {jobData.logo ? (
                <img
                  src={jobData.logo}
                  alt={jobData.company}
                  className="w-14 h-14 rounded-lg object-cover bg-muted"
                />
              ) : (
                <Avatar
                  size="lg"
                  fallback={companyInitials}
                  className="bg-primary/10 text-primary font-semibold"
                />
              )}
            </div>

            {/* Job Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {jobData.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {jobData.company}
                  </p>
                </div>

                {/* Match Score Badge */}
                {jobData.matchScore > 0 && (
                  <div className={cn(
                    'shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center text-xs font-bold',
                    getMatchScoreColor(jobData.matchScore)
                  )}>
                    <span className="text-base leading-none">{jobData.matchScore}%</span>
                    <span className="text-[10px] opacity-80">khớp</span>
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPinIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{jobData.location}</span>
                </span>

                <span className="flex items-center gap-1.5 text-success font-medium">
                  <DollarSignIcon className="w-4 h-4 shrink-0" />
                  <span>{formatSalary(jobData.salary || jobData.salaryMin)}</span>
                </span>

                <Badge variant="outline" className="font-normal">
                  {getJobTypeLabel(jobData.jobType)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Section 2: Skill Tags */}
          {jobData.requiredSkills.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {jobData.requiredSkills.slice(0, 5).map((skill, index) => {
                  const isMatching = displayMatchingSkills.some(
                    ms => ms.toLowerCase() === skill.toLowerCase()
                  )
                  return (
                    <Badge
                      key={index}
                      variant={isMatching ? 'success' : 'muted'}
                      className={cn(
                        'font-normal',
                        isMatching && 'bg-success/10 text-success border-success/20'
                      )}
                    >
                      {isMatching && <CheckIcon className="w-3 h-3 mr-1" />}
                      {skill}
                    </Badge>
                  )
                })}
                {jobData.requiredSkills.length > 5 && (
                  <Badge variant="outline" className="font-normal">
                    +{jobData.requiredSkills.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Explainability */}
        {reasons.length > 0 && (
          <div className="px-5 pb-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Tại sao phù hợp?</span>
              </div>
              <ul className="space-y-1">
                {reasons.map((reason, index) => (
                  <li
                    key={index}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      reason.type === 'success' ? 'text-success' : 'text-warning'
                    )}
                  >
                    {reason.type === 'success' ? (
                      <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertIcon className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{reason.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Section 4: Actions */}
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToggle}
            className={cn(
              'flex-1 min-w-[100px]',
              isSaved && 'text-primary border-primary/30 bg-primary/5'
            )}
          >
            {isSaved ? (
              <>
                <BookmarkFilledIcon className="w-4 h-4 mr-1.5" />
                Đã lưu
              </>
            ) : (
              <>
                <BookmarkIcon className="w-4 h-4 mr-1.5" />
                Lưu
              </>
            )}
          </Button>

          {onViewSimilar && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewSimilar}
              className="flex-1 min-w-[100px]"
            >
              <LinkIcon className="w-4 h-4 mr-1.5" />
              Tương tự
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleApply}
            className="flex-[2] min-w-[140px]"
          >
            <BriefcaseIcon className="w-4 h-4 mr-1.5" />
            Ứng tuyển ngay
          </Button>

          {onOpenDetail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetail(job)}
              className="flex-1 min-w-[100px]"
            >
              <SparklesIcon className="w-4 h-4 mr-1.5" />
              Khóa học
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default JobCard
