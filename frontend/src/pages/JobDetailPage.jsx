import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJobByIdAPI } from '@/apis/aiAPI'
import { useDispatch, useSelector } from 'react-redux'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { MapPin, CurrencyDollar, Briefcase, Clock, Building, ArrowSquareOut, BookmarkSimple, Flag, ArrowLeft, Sparkle, ChartBar } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

const JobDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaved, setIsSaved] = useState(false)

  const savedJobs = useSelector(state => state.job?.savedJobs || [])

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getJobByIdAPI(id)
        setJob(res.data || res)
      } catch (err) {
        setError(err.message || 'Không thể tải thông tin công việc')
        toast.error('Không thể tải thông tin công việc')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchJob()
  }, [id])

  useEffect(() => {
    if (job) {
      const saved = savedJobs.some(j => (j.id || j._id) === (job.id || job._id))
      setIsSaved(saved)
    }
  }, [job, savedJobs])

  const toggleSave = () => {
    if (!job) return
    const jobId = job.id || job._id
    let updated
    if (isSaved) {
      updated = savedJobs.filter(j => (j.id || j._id) !== jobId)
      toast.success('Đã bỏ lưu')
    } else {
      updated = [...savedJobs, job]
      toast.success('Đã lưu việc làm')
    }
    dispatch({ type: 'job/setSavedJobs', payload: updated })
    localStorage.setItem('savedJobs', JSON.stringify(updated))
    setIsSaved(!isSaved)
  }

  const jobData = job ? {
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
    matchScore: job.match_score || job.matchScore || 0
  } : null

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải thông tin công việc...</p>
        </div>
      </div>
    )
  }

  if (error || !jobData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy công việc'}</p>
          <Button variant="outline" onClick={() => navigate('/jobs')}>
            <ArrowLeft size={16} className="mr-2" /> Quay lại
          </Button>
        </div>
      </div>
    )
  }

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thoả thuận'
    const fmt = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(0)} triệu` : `${n.toLocaleString()} VND`
    if (min && max) return `${fmt(min)} - ${fmt(max)}`
    if (min) return `Từ ${fmt(min)}`
    return `Đến ${fmt(max)}`
  }

  const jobTypeLabels = {
    'full-time': 'Toàn thời gian',
    'part-time': 'Bán thời gian',
    'contract': 'Hợp đồng',
    'internship': 'Thực tập',
    'remote': 'Từ xa'
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={16} className="mr-1" /> Quay lại
        </Button>

        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {jobData.qualityScore > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <ChartBar size={12} className="mr-1" />Score: {jobData.qualityScore}%
                      </Badge>
                    )}
                    {jobData.matchScore > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <Sparkle size={12} className="mr-1" />Phù hợp: {Math.round(jobData.matchScore * 100)}%
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{jobData.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mt-2">
                    <Building size={16} /> {jobData.company}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin size={14} /> {jobData.location}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={isSaved ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleSave}
                  >
                    <BookmarkSimple size={16} className="mr-1" weight={isSaved ? 'fill' : 'regular'} />
                    {isSaved ? 'Đã lưu' : 'Lưu'}
                  </Button>
                  {jobData.sourceUrl && (
                    <Button size="sm" asChild>
                      <a href={jobData.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ArrowSquareOut size={16} className="mr-1" /> Ứng tuyển
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(jobData.salaryMin || jobData.salaryMax || jobData.salaryRange) && (
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <CurrencyDollar size={20} className="text-green-600 mb-2" />
                  <p className="text-sm font-medium">
                    {jobData.salaryRange || formatSalary(jobData.salaryMin, jobData.salaryMax)}
                  </p>
                  <p className="text-xs text-muted-foreground">Mức lương</p>
                </CardContent>
              </Card>
            )}
            {jobData.jobType && (
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Clock size={20} className="text-blue-600 mb-2" />
                  <p className="text-sm font-medium">{jobTypeLabels[jobData.jobType] || jobData.jobType}</p>
                  <p className="text-xs text-muted-foreground">Loại hình</p>
                </CardContent>
              </Card>
            )}
            {jobData.experienceRequired > 0 && (
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Briefcase size={20} className="text-purple-600 mb-2" />
                  <p className="text-sm font-medium">{jobData.experienceRequired} năm</p>
                  <p className="text-xs text-muted-foreground">Kinh nghiệm</p>
                </CardContent>
              </Card>
            )}
            {jobData.agePreference && (
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Badge variant="secondary" className="mb-2">{jobData.agePreference}</Badge>
                  <p className="text-xs text-muted-foreground">Độ tuổi</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Skills */}
          {jobData.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kỹ năng yêu cầu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {jobData.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {jobData.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mô tả công việc</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {jobData.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {jobData.educationRequired && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yêu cầu trình độ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{jobData.educationRequired}</p>
              </CardContent>
            </Card>
          )}

          {/* Source */}
          {jobData.source && (
            <Card className="bg-zinc-50 dark:bg-zinc-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Nguồn: {jobData.source}</span>
                  {!jobData.isActive && (
                    <Badge variant="destructive" className="text-xs">Link có thể đã hết hạn</Badge>
                  )}
                </div>
                {jobData.sourceUrl && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={jobData.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ArrowSquareOut size={14} className="mr-1" /> Mở link gốc
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default JobDetailPage
