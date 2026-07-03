import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { Badge, Avatar } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { toggleSaveJob, selectIsJobSaved } from '@/redux/job/jobSlice'
import { JOB_TYPE_OPTIONS } from '@/data/profileData'

import { MapPin, CurrencyDollar, BookmarkSimple, Check, Warning, Sparkle } from '@phosphor-icons/react'

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
 * @param {boolean} [props.isApplied] - Whether the user has already applied to this job
 * @param {Object} [props.onViewSimilar] - Callback when clicking view similar
 * @param {Function} [props.onOpenDetail] - Callback when clicking to open detail modal
 * @param {string} [props.className] - Additional CSS classes
 */
const JobCard = ({
  job,
  userSkills = [],
  targetSalary = null,
  onViewSimilar,
  onOpenDetail,
  className
}) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
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
    source: job?.source || '',
    // AI Explainability scores
    ageScore: job?.age_score || 0,
    locationScore: job?.location_score || 0,
    familyScore: job?.family_score || 0,
    jobTitleMatch: job?.job_title_match || false
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

  // AI Profile Reasons
  if (jobData.jobTitleMatch) {
    reasons.push({
      type: 'success',
      text: 'Khớp chức danh cũ'
    })
  }

  if (jobData.ageScore >= 0.7) {
    reasons.push({
      type: 'success',
      text: 'Phù hợp độ tuổi'
    })
  }

  if (jobData.locationScore >= 0.8) {
    reasons.push({
      type: 'success',
      text: 'Gần khu vực sinh sống'
    })
  }

  if (jobData.familyScore >= 0.8) {
    reasons.push({
      type: 'success',
      text: 'Thuận tiện chăm sóc gia đình'
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

  // Handle open detail
  const handleOpenDetail = (e) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (onOpenDetail) {
      onOpenDetail(job)
    } else {
      navigate(`/jobs/${jobId}`)
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
                  <MapPin className="w-4 h-4 shrink-0" weight="regular" />
                  <span className="truncate">{jobData.location}</span>
                </span>

                <span className="flex items-center gap-1.5 text-success font-medium">
                  <CurrencyDollar className="w-4 h-4 shrink-0" weight="regular" />
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
                      {isMatching && <Check className="w-3 h-3 mr-1" weight="bold" />}
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
                <Sparkle className="w-4 h-4 text-primary" weight="fill" />
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
                      <Check className="w-3.5 h-3.5 shrink-0" weight="bold" />
                    ) : (
                      <Warning className="w-3.5 h-3.5 shrink-0" weight="regular" />
                    )}
                    <span>{reason.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  )
}

export default JobCard
