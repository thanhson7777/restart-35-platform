import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCourseById, getCourseLessons } from '@/apis/courseApi'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, Button } from '@/components/ui'
import { Progress } from '@/components/ui'
import { ArrowLeft, Play, CheckCircle, Clock, BookOpen, User } from 'lucide-react'
import toast from 'react-hot-toast'

const CourseCurriculumPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const courseRes = await getCourseById(id)
        const courseData = courseRes.data || courseRes
        setCourse(courseData)
        
        let lessonsData = []
        try {
          const lessonsRes = await getCourseLessons(id)
          lessonsData = lessonsRes?.data || []
          if (!Array.isArray(lessonsData)) {
            // If API returns wrapped data
            lessonsData = lessonsData.data || lessonsData.lessons || []
          }
        } catch (err) {
          // Fallback to course syllabus if API fails
          console.warn('Could not fetch lessons from API, falling back to course syllabus')
        }
        
        if (!Array.isArray(lessonsData) || lessonsData.length === 0) {
          lessonsData = courseData.syllabus || []
        }
        
        setLessons(Array.isArray(lessonsData) ? lessonsData : [])
      } catch (err) {
        toast.error('Không thể tải khóa học')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải giáo trình...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Không tìm thấy khóa học</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-2" /> Quay lại
        </Button>
      </div>
    )
  }

  // Group lessons by section
  const sections = lessons.reduce((acc, lesson) => {
    const sectionName = lesson.sectionTitle || lesson.section || 'Bài học'
    if (!acc[sectionName]) acc[sectionName] = []
    acc[sectionName].push(lesson)
    return acc
  }, {})

  const totalLessons = lessons.length
  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration || l.videoDuration || 0), 0)

  const formatDuration = (seconds) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}p`
    return `${mins}p`
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={16} className="mr-1" /> Quay lại
        </Button>

        {/* Course Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {course.deliveryType && (
                    <Badge variant="secondary">{course.deliveryType}</Badge>
                  )}
                  {course.fundingModel && (
                    <Badge className="bg-green-100 text-green-700">{course.fundingModel}</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold">{course.title || course.name}</h1>
                {course.instructor?.name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <User size={14} /> {course.instructor.name}
                  </p>
                )}
                {course.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{course.description}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BookOpen size={16} />
                <span>{totalLessons} bài học</span>
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={16} />
                  <span>{formatDuration(totalDuration)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Curriculum Sections */}
        {Object.keys(sections).length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Chưa có giáo trình</h3>
            <p className="text-muted-foreground">Giảng viên chưa cập nhật nội dung bài học.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(sections).map(([sectionName, sectionLessons], idx) => {
              const isExpanded = expandedSection === idx
              return (
                <Card key={idx}>
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{sectionName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sectionLessons.length} bài
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t">
                      {sectionLessons.map((lesson, lIdx) => (
                        <button
                          key={lesson._id || lIdx}
                          onClick={() => lesson.videoUrl && navigate(`/learn/${course._id || id}/lesson/${lesson._id}`)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b last:border-b-0"
                        >
                          {/* Completion indicator */}
                          <div className="shrink-0">
                            {lesson.isCompleted || lesson.watched ? (
                              <CheckCircle size={18} className="text-green-500" />
                            ) : lesson.videoUrl ? (
                              <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
                            ) : (
                              <div className="w-[18px] h-[18px] rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <span className="text-[8px] font-medium">{lIdx + 1}</span>
                              </div>
                            )}
                          </div>

                          {/* Lesson info */}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{lesson.title || `Bài ${lIdx + 1}`}</p>
                            {lesson.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          {/* Duration + Play */}
                          <div className="flex items-center gap-2 shrink-0">
                            {(lesson.duration || lesson.videoDuration) && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(lesson.duration || lesson.videoDuration)}
                              </span>
                            )}
                            {lesson.videoUrl && (
                              <Play size={14} className="text-primary" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* CTA */}
        {lessons.length > 0 && (
          <div className="mt-6 text-center">
            <Button size="lg" onClick={() => {
              const firstLesson = lessons.find(l => l.videoUrl)
              if (firstLesson) {
                navigate(`/learn/${course._id || id}/lesson/${firstLesson._id}`)
              }
            }}>
              <Play size={18} className="mr-2" /> Bắt đầu học
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default CourseCurriculumPage
