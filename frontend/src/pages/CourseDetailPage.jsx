import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge, Avatar, Skeleton, SafeImage } from '@/components/ui';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseEnrollmentForm } from '@/components/course/CourseDetail/CourseEnrollmentForm';
import { CourseInfo } from '@/components/course/CourseDetail/CourseInfo';
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';
import { JobGuaranteeHighlight } from '@/components/course/CourseDetail/JobGuaranteeHighlight';
import { SyllabusAccordion } from '@/components/course/CourseDetail/SyllabusAccordion';
import { VideoPreviewSection } from '@/components/course/CourseDetail/VideoPreviewSection';
import { ScheduleSessionList } from '@/components/course/CourseDetail/ScheduleSessionList';
import { LiveSessionCountdown } from '@/components/course/CourseDetail/LiveSessionCountdown';
import { CourseInstructorInfo } from '@/components/course/CourseDetail/CourseInstructorInfo';
import { getCourseById, getRelatedCourses, enrollCourse, getMyEnrollments, getCourseSchedule, getCourseLessons } from '@/apis/courseApi';
import { getSponsorships } from '@/apis/courseSponsorshipApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { formatPrice, formatDuration } from '@/utils/formatter';
import { Star, Users, Clock, MapPin, BookOpen, Eye, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';
import { EnterprisePartnershipModal } from '@/components/enterprise/EnterprisePartnershipModal';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const overviewRef = useRef(null);
  const curriculumRef = useRef(null);
  const previewRef = useRef(null);
  const scheduleRef = useRef(null);
  const instructorRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [courseLessons, setCourseLessons] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);
  
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);

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
        const [courseRes, relatedRes, sponsorRes] = await Promise.all([
          getCourseById(id, userId ? { userId } : {}),
          getRelatedCourses(id),
          getSponsorships({ courseId: id, status: 'active' }).catch(() => ({ data: { data: [] } }))
        ]);
        console.log('[DEBUG] courseRes', { status: courseRes?.status, keys: courseRes ? Object.keys(courseRes) : [], dataKeys: courseRes?.data ? Object.keys(courseRes.data) : [], hasSuccess: courseRes?.data?.success });

        const courseData = courseRes.data?.data || courseRes.data || courseRes;
        console.log('[DEBUG] courseData', { hasSuccess: !!courseData?.success, keys: courseData ? Object.keys(courseData) : [], title: courseData?.title, id: courseData?._id });
        setCourse(courseData);

        const related = relatedRes.data?.data || relatedRes.data || relatedRes;
        setRelatedCourses(Array.isArray(related) ? related : []);

        const activeSponsors = sponsorRes.data?.data || [];
        setSponsorships(Array.isArray(activeSponsors) ? activeSponsors : []);

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

  const scrollTo = (ref) => {
    if (ref && ref.current) {
      const yOffset = -80; // height of sticky nav
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />
      
      {/* 1. Cinematic Hero Section */}
      <section className="relative w-full min-h-[80vh] flex items-center pt-24 pb-16 overflow-hidden bg-zinc-950 text-white dark">
        {/* Background Layer */}
        {thumbnail && (
          <div className="absolute inset-0 z-0">
            <SafeImage 
              src={thumbnail} 
              alt="Course Background" 
              className="w-full h-full object-cover opacity-30 scale-105" 
            />
            {/* Cinematic Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
          </div>
        )}
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content (8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              
              {/* Badges / Meta */}
              <div className="flex flex-wrap items-center gap-3">
                {course.delivery_type && (
                  <DeliveryTypeBadge deliveryType={course.delivery_type} size="md" />
                )}
                {course.funding_model && (
                  <FundingModelChip fundingModel={course.funding_model} size="md" />
                )}
                {level && (
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs px-3 py-1 rounded-full font-medium tracking-wide">
                    {level === 'beginner' ? 'Người mới' : level === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-medium">
                    Đã kiểm duyệt
                  </Badge>
                )}
              </div>

              {/* Huge Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-[1.1]">
                {title}
              </h1>

              {/* Skills */}
              {skills?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.slice(0, 5).map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border-0 text-xs px-3 py-1 font-medium transition-colors"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {skills.length > 5 && (
                    <Badge variant="secondary" className="bg-zinc-800/50 text-zinc-400 border-0 text-xs">
                      +{skills.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* Sponsor / Job Guarantee Banner */}
              <div className="max-w-2xl mt-4">
                <JobGuaranteeHighlight sponsorships={sponsorships} />
              </div>

              {/* Bento Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 border-t border-zinc-800/50 pt-8">
                {rating?.average && (
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Đánh giá</span>
                    <span className="flex items-center gap-1.5 text-xl font-bold">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      {rating.average.toFixed(1)}
                    </span>
                  </div>
                )}
                {enrollmentCount != null && (
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Học viên</span>
                    <span className="flex items-center gap-1.5 text-xl font-bold">
                      <Users className="w-5 h-5 text-blue-400" />
                      {enrollmentCount}
                    </span>
                  </div>
                )}
                {duration && (
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Thời lượng</span>
                    <span className="flex items-center gap-1.5 text-xl font-bold">
                      <Clock className="w-5 h-5 text-emerald-400" />
                      {formatDuration(duration)}
                    </span>
                  </div>
                )}
                {viewCount != null && (
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Lượt xem</span>
                    <span className="flex items-center gap-1.5 text-xl font-bold">
                      <Eye className="w-5 h-5 text-purple-400" />
                      {viewCount}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Right Content (4 cols) - Floating Enrollment Card */}
            <div className="lg:col-span-5 xl:col-span-4 relative z-20">
              <div className="sticky top-24">
                {currentUser?.role === 'enterprise' ? (
                  <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-1 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                    <div className="bg-white dark:bg-zinc-950 rounded-[22px] overflow-hidden p-6 text-center space-y-4">
                      <h3 className="font-bold text-lg">Dành cho Doanh nghiệp</h3>
                      <p className="text-sm text-zinc-500">
                        Hợp tác với giảng viên để tuyển dụng học viên hoặc tài trợ học phí.
                      </p>
                      <button 
                        onClick={() => setIsPartnershipModalOpen(true)}
                        className="w-full py-4 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                      >
                        Yêu cầu Hợp tác
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-1 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                    <div className="bg-white dark:bg-zinc-950 rounded-[22px] overflow-hidden">
                      <CourseEnrollmentForm
                        course={course}
                        eligibility={eligibility}
                        existingEnrollment={existingEnrollment}
                        sponsorships={sponsorships}
                        onSubmit={handleEnroll}
                        isSubmitting={enrolling}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {currentUser?.role === 'enterprise' && (
        <EnterprisePartnershipModal 
          isOpen={isPartnershipModalOpen}
          onClose={() => setIsPartnershipModalOpen(false)}
          course={course}
          trainerId={provider?._id || provider}
        />
      )}

      {/* 2. Sticky Navigation Bar */}
      <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-4">
            <button onClick={() => scrollTo(overviewRef)} className="text-sm font-bold text-foreground/70 hover:text-foreground whitespace-nowrap transition-colors">
              Tổng quan
            </button>
            <button onClick={() => scrollTo(curriculumRef)} className="text-sm font-bold text-foreground/70 hover:text-foreground whitespace-nowrap transition-colors">
              Giáo trình
            </button>
            {['video', 'live'].includes(course.delivery_type) && (
              <button onClick={() => scrollTo(previewRef)} className="text-sm font-bold text-foreground/70 hover:text-foreground whitespace-nowrap transition-colors">
                Học thử
              </button>
            )}
            {['live', 'offline', 'blended'].includes(course.delivery_type) && (
              <button onClick={() => scrollTo(scheduleRef)} className="text-sm font-bold text-foreground/70 hover:text-foreground whitespace-nowrap transition-colors">
                Lịch học
              </button>
            )}
            <button onClick={() => scrollTo(instructorRef)} className="text-sm font-bold text-foreground/70 hover:text-foreground whitespace-nowrap transition-colors">
              Giảng viên
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Storytelling Content */}
      <main className="container mx-auto px-4 py-16 max-w-7xl flex flex-col gap-24">
        
        {/* Overview Section */}
        <section ref={overviewRef} className="scroll-mt-24 max-w-4xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Về khóa học này</h2>
            <div className="w-20 h-1.5 bg-blue-600 rounded-full"></div>
          </div>
          <CourseInfo 
            course={course} 
            isEnrolled={!!existingEnrollment} 
            lessons={courseLessons} 
          />
        </section>

        {/* Curriculum Section */}
        <section ref={curriculumRef} className="scroll-mt-24 max-w-4xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Giáo trình</h2>
            <div className="w-20 h-1.5 bg-blue-600 rounded-full"></div>
            <p className="text-muted-foreground mt-4 text-lg">Hành trình chi tiết từ lúc bắt đầu đến khi thành thạo.</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 md:p-10 border border-border">
            <SyllabusAccordion
              syllabus={course?.syllabus || []}
              delivery_type={course.delivery_type}
              courseId={course._id}
              isEnrolled={!!existingEnrollment}
              lessons={courseLessons}
            />
          </div>
        </section>

        {/* Preview Section */}
        {['video', 'live'].includes(course.delivery_type) && (
          <section ref={previewRef} className="scroll-mt-24 max-w-5xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Học thử ngay</h2>
              <div className="w-20 h-1.5 bg-blue-600 rounded-full"></div>
            </div>
            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border">
              <VideoPreviewSection courseId={id} />
            </div>
          </section>
        )}

        {/* Schedule Section */}
        {['live', 'offline', 'blended'].includes(course.delivery_type) && (
          <section ref={scheduleRef} className="scroll-mt-24 max-w-5xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Lịch học sắp tới</h2>
              <div className="w-20 h-1.5 bg-blue-600 rounded-full"></div>
            </div>
            <ScheduleSessionList courseId={id} delivery_type={course.delivery_type} />
          </section>
        )}

        {/* Instructor Section */}
        <section ref={instructorRef} className="scroll-mt-24 max-w-4xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Người dẫn dắt</h2>
            <div className="w-20 h-1.5 bg-blue-600 rounded-full"></div>
          </div>
          <CourseInstructorInfo provider={provider} />
        </section>

        {/* Related Courses Section */}
        {relatedCourses.length > 0 && (
          <section className="pt-16 border-t border-border mt-8">
            <h3 className="text-2xl font-bold tracking-tight mb-8">
              Các khóa học liên quan
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

      <Footer />
    </div>
  );
}
