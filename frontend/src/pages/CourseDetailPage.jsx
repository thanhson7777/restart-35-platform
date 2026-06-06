import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Avatar, Skeleton } from '@/components/ui';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseEnrollmentForm } from '@/components/course/CourseDetail/CourseEnrollmentForm';
import { CourseInfo } from '@/components/course/CourseDetail/CourseInfo';
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';
import { SyllabusAccordion } from '@/components/course/CourseDetail/SyllabusAccordion';
import { VideoPreviewSection } from '@/components/course/CourseDetail/VideoPreviewSection';
import { ScheduleSessionList } from '@/components/course/CourseDetail/ScheduleSessionList';
import { LiveSessionCountdown } from '@/components/course/CourseDetail/LiveSessionCountdown';
import { CourseInstructorInfo } from '@/components/course/CourseDetail/CourseInstructorInfo';
import { getCourseById, getRelatedCourses, enrollCourse, getMyEnrollments, getCourseSchedule, getCourseLessons } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { formatPrice, formatDuration } from '@/utils/formatter';
import { Star, Users, Clock, MapPin, BookOpen, Eye, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [courseLessons, setCourseLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);

  const {
    title,
    thumbnail,
    rating,
    enrollmentCount,
    currentStudents,
    maxStudents,
    provider,
    duration,
    level,
    location,
    fee,
    isFree,
    viewCount,
    status,
    eligibility,
    stats,
    skills = [],
  } = course || {};

  // Fetch course data & schedules & lessons
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userId = currentUser?._id;
        console.log('[DEBUG] beforeAPI', { id, userId, url: `/v1/courses/${id}` });
        const [courseRes, relatedRes] = await Promise.all([
          getCourseById(id, userId ? { userId } : {}),
          getRelatedCourses(id),
        ]);
        console.log('[DEBUG] courseRes', { status: courseRes?.status, keys: courseRes ? Object.keys(courseRes) : [], dataKeys: courseRes?.data ? Object.keys(courseRes.data) : [], hasSuccess: courseRes?.data?.success });

        const courseData = courseRes.data?.data || courseRes.data || courseRes;
        console.log('[DEBUG] courseData', { hasSuccess: !!courseData?.success, keys: courseData ? Object.keys(courseData) : [], title: courseData?.title, id: courseData?._id });
        setCourse(courseData);

        const related = relatedRes.data?.data || relatedRes.data || relatedRes;
        setRelatedCourses(Array.isArray(related) ? related : []);

        // Fetch Schedule & Lessons based on course type
        const fetchDetails = [];
        if (['live', 'offline', 'blended'].includes(courseData?.delivery_type)) {
          fetchDetails.push(
            getCourseSchedule(id)
              .then((res) => {
                const list = Array.isArray(res.data?.data)
                  ? res.data.data
                  : Array.isArray(res.data)
                  ? res.data
                  : [];
                setSessions(list);
              })
              .catch((err) => console.warn('Schedules fetch failed:', err))
          );
        }
        
        fetchDetails.push(
          getCourseLessons(id)
            .then((res) => {
              const list = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res?.data?.data)
                ? res.data.data
                : Array.isArray(res?.data?.data?.data)
                ? res.data.data.data
                : [];
              setCourseLessons(list);
            })
            .catch((err) => console.warn('Lessons fetch failed:', err))
        );

        await Promise.all(fetchDetails);

        // Check existing enrollment
        if (currentUser) {
          try {
            const enrollRes = await getMyEnrollments({ courseId: id });
            const raw = enrollRes.data;
            console.log('[DEBUG] enrollments', { isSuccess: raw?.success, rawKeys: raw ? Object.keys(raw) : [] });
            const enrollments = Array.isArray(raw)
              ? raw
              : Array.isArray(raw?.data)
              ? raw.data
              : [];
            const found = enrollments.find(
              (e) => e.courseId === id || e.course?._id === id
            );
            setExistingEnrollment(found || null);
          } catch {
            // Not enrolled yet — ignore
          }
        }
      } catch (err) {
        console.error('Error fetching course detail:', err);
        console.log('[DEBUG] fetchData catch', { errMsg: err?.message, errResp: err?.response?.data, errStatus: err?.response?.status });
        setError('Không thể tải thông tin chi tiết khóa học.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser]);

  // Handle enrollment submission
  const handleEnroll = async (data) => {
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để đăng ký khóa học.');
      navigate('/auth');
      return;
    }

    setEnrolling(true);
    try {
      const res = await enrollCourse(data);
      const resultStatus = res.result?.status;
      const warnings = res.result?.prerequisiteWarnings || [];

      if (warnings.length > 0) {
        toast.success(
          `Đăng ký thành công! Chúc bạn học tốt 🎉\nLưu ý: Bạn chưa hoàn thành khóa tiên quyết: ${warnings.join(', ')}`,
          { duration: 6000 }
        );
      } else if (resultStatus === 'waitlist') {
        toast.success('Bạn đã được thêm vào danh sách chờ!');
      } else {
        toast.success('Đăng ký thành công! Chúc bạn học tốt 🎉');
      }

      // Refresh enrollment status
      setExistingEnrollment(res.data);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng ký thất bại. Vui lòng thử lại.';
      toast.error(msg);
      throw err;
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] py-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-64 bg-[hsl(var(--admin-surface-elevated))] mb-3" />
            <Skeleton className="h-5 w-96 bg-[hsl(var(--admin-surface-elevated))]" />
          </div>
        </div>
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive mb-2">
            {error || 'Khóa học không tồn tại'}
          </p>
          <button onClick={() => navigate('/courses')} className="text-primary underline text-sm">
            Quay lại danh sách khóa học
          </button>
        </div>
      </div>
    );
  }

  const isApproved = status === 'approved';
  const nextSession = sessions.filter(s => s.status !== 'completed')[0];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Light Gradient Header */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] shadow-sm py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_45%)] pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Course info details */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {course.delivery_type && (
                  <DeliveryTypeBadge deliveryType={course.delivery_type} size="md" />
                )}
                {course.funding_model && (
                  <FundingModelChip fundingModel={course.funding_model} size="md" />
                )}
                {level && (
                  <Badge 
                    variant="outline" 
                    className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] text-xs px-2.5 py-0.5 rounded-full font-medium"
                  >
                    {level === 'beginner' ? 'Người mới' : level === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-emerald-600 border-0 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    Đã kiểm duyệt
                  </Badge>
                )}
              </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] mb-4 leading-tight">
                {title}
              </h1>

              {/* Skills badges taught by course */}
              {skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {skills.slice(0, 5).map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-blue-50 border border-blue-100 text-blue-600 text-[10.5px] px-2 py-0.5 font-medium"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {skills.length > 5 && (
                    <Badge variant="secondary" className="bg-white/5 border border-white/10 text-zinc-400 text-[10.5px]">
                      +{skills.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--admin-text-muted))] border-t border-[hsl(var(--admin-border))] pt-4">
                {rating?.average && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-[hsl(var(--admin-text-primary))]">{rating.average.toFixed(1)}</span>
                    <span>({rating.count} đánh giá)</span>
                  </span>
                )}
                {enrollmentCount != null && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" strokeWidth={1.5} />
                    <span>{enrollmentCount} học viên đã ghi danh</span>
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" strokeWidth={1.5} />
                    <span>{formatDuration(duration)}</span>
                  </span>
                )}
                {viewCount != null && (
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                    <span>{viewCount} lượt xem</span>
                  </span>
                )}
              </div>

              {/* Provider Info */}
              {provider && (
                <div className="flex items-center gap-2 mt-4">
                  <Avatar fallback={provider.displayName?.[0] || 'T'} size="sm" className="border border-[hsl(var(--admin-border))]" />
                  <span className="text-xs text-[hsl(var(--admin-text-muted))] font-semibold flex items-center gap-1">
                    {provider.displayName}
                    {provider.verified && <span className="text-emerald-500 font-bold" title="Verified partner">✓</span>}
                  </span>
                </div>
              )}

              {/* Type-Specific Layout Additions inside Header */}
              
              {/* VIDEO layout play previews overlay */}
              {course.delivery_type === 'video' && (
                <div className="mt-6">
                  <div 
                    className="relative max-w-sm aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-[hsl(var(--admin-border))] cursor-pointer group shadow-lg"
                    onClick={() => {
                      const tab = document.querySelector('[role="tab"][value="preview"]');
                      if (tab) tab.click();
                    }}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt="Xem trước video bài giảng"
                        className="w-full h-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-50/30 group-hover:bg-blue-50/50 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-4.5 h-4.5 fill-current ml-0.5" strokeWidth={2} />
                      </div>
                    </div>
                    <span className="absolute bottom-3 right-3 bg-primary/90 text-white text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded shadow-sm font-mono">
                      Xem học thử
                    </span>
                  </div>
                </div>
              )}

              {/* LIVE layout next session countdown */}
              {course.delivery_type === 'live' && nextSession && (
                <LiveSessionCountdown session={nextSession} />
              )}

              {/* OFFLINE layout venue info */}
              {course.delivery_type === 'offline' && location?.address && (
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] text-xs mt-5 bg-[hsl(var(--admin-accent-subtle))] border border-[hsl(var(--admin-border))] px-3.5 py-2.5 rounded-xl max-w-md shadow-sm">
                  <MapPin className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                  <span>Địa điểm lớp: <span className="font-semibold text-[hsl(var(--admin-text-primary))]">{location.address}</span></span>
                </div>
              )}
            </div>

            {/* Right Column: Enrollment Card (Desktop) */}
            <div className="lg:col-span-1 hidden lg:block" id="enrollment-section">
              <Card className="p-0 overflow-hidden bg-white border border-[hsl(var(--admin-border))] shadow-xl">
                {thumbnail && course.delivery_type !== 'video' && (
                  <img
                    src={thumbnail}
                    alt={title}
                    className="w-full aspect-video object-cover border-b border-[hsl(var(--admin-border))]"
                  />
                )}
                <div className="p-6">
                  <CourseEnrollmentForm
                    course={course}
                    eligibility={eligibility}
                    existingEnrollment={existingEnrollment}
                    onSubmit={handleEnroll}
                    isSubmitting={enrolling}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Page Main Content Area */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column Tabs Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="mb-6 flex flex-wrap gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Tổng quan
                </TabsTrigger>
                
                <TabsTrigger value="curriculum" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Giáo trình
                </TabsTrigger>

                {/* Conditional Preview Tab */}
                {['video', 'live'].includes(course.delivery_type) && (
                  <TabsTrigger value="preview" className="rounded-lg text-xs font-semibold px-4 py-2">
                    Học thử
                  </TabsTrigger>
                )}

                {/* Conditional Schedule Tab */}
                {['live', 'offline', 'blended'].includes(course.delivery_type) && (
                  <TabsTrigger value="schedule" className="rounded-lg text-xs font-semibold px-4 py-2">
                    Lịch học
                  </TabsTrigger>
                )}

                <TabsTrigger value="instructor" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Giảng viên
                </TabsTrigger>
              </TabsList>

              {/* Tab: Overview */}
              <TabsContent value="overview" className="focus:outline-none">
                <CourseInfo 
                  course={course} 
                  isEnrolled={!!existingEnrollment} 
                  lessons={courseLessons} 
                />
              </TabsContent>

              {/* Tab: Curriculum */}
              <TabsContent value="curriculum" className="focus:outline-none">
                <SyllabusAccordion
                  syllabus={course?.syllabus || []}
                  delivery_type={course.delivery_type}
                  courseId={course._id}
                  isEnrolled={!!existingEnrollment}
                  lessons={courseLessons}
                />
              </TabsContent>

              {/* Tab: Video Preview */}
              {['video', 'live'].includes(course.delivery_type) && (
                <TabsContent value="preview" className="focus:outline-none">
                  <VideoPreviewSection courseId={id} />
                </TabsContent>
              )}

              {/* Tab: Schedule */}
              {['live', 'offline', 'blended'].includes(course.delivery_type) && (
                <TabsContent value="schedule" className="focus:outline-none">
                  <ScheduleSessionList courseId={id} delivery_type={course.delivery_type} />
                </TabsContent>
              )}

              {/* Tab: Instructor */}
              <TabsContent value="instructor" className="focus:outline-none">
                <CourseInstructorInfo provider={provider} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Enrollment Form (Mobile/Tablet display only) */}
          <div className="lg:col-span-1 lg:hidden">
            <div className="sticky top-4">
              <CourseEnrollmentForm
                course={course}
                eligibility={eligibility}
                existingEnrollment={existingEnrollment}
                onSubmit={handleEnroll}
                isSubmitting={enrolling}
              />
            </div>
          </div>
        </div>

        {/* Related courses list */}
        {relatedCourses.length > 0 && (
          <section className="mt-16 pt-10 border-t border-zinc-200">
            <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white mb-6">
              Khóa học liên quan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedCourses.slice(0, 4).map((rc) => (
                <CourseCard
                  key={rc._id || rc.id}
                  course={rc}
                  onClick={() => navigate(`/courses/${rc._id || rc.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
      </div>
      <Footer />
    </>
  );
}
