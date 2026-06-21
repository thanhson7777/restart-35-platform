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
import { ScheduleSessionList } from '@/components/course/CourseDetail/ScheduleSessionList';
import { LiveSessionCountdown } from '@/components/course/CourseDetail/LiveSessionCountdown';
import { CourseInstructorInfo } from '@/components/course/CourseDetail/CourseInstructorInfo';
import { getCourseById, getRelatedCourses, enrollCourse, getMyEnrollments, getCourseSchedule, getCourseLessons } from '@/apis/courseApi';
import { getSponsorships } from '@/apis/courseSponsorshipApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { formatPrice, formatDuration } from '@/utils/formatter';
import { Star, Users, Clock, MapPin, BookOpen, Eye, Play, CheckCircle2 } from 'lucide-react';
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
        if (currentUser && courseData?._id) {
          try {
            const enrollRes = await getMyEnrollments({ courseId: courseData._id });
            const raw = enrollRes.data;
            console.log('[DEBUG] enrollments', { isSuccess: raw?.success, rawKeys: raw ? Object.keys(raw) : [] });
            const enrollments = Array.isArray(raw)
              ? raw
              : Array.isArray(raw?.data)
              ? raw.data
              : [];
            const found = enrollments.find(
              (e) => e.courseId === courseData._id || e.course?._id === courseData._id
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

  const actualIsFree = course?.fundingConfig?.type === 'FREE' || course?.isFree || course?.fee === 0;
  const computedFundingModel = actualIsFree 
    ? 'free' 
    : (course?.funding_model === 'free' ? 'learner_paid' : (course?.funding_model || (course?.fundingConfig?.type === 'PAID' ? 'learner_paid' : null)));

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
      
      {/* 1. Hero Section (Light Blue Theme) */}
      <section className="relative w-full pt-32 pb-24 bg-blue-50/50 text-zinc-900 overflow-hidden border-b border-blue-100">
        {/* Subtle background pattern/gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-transparent mix-blend-multiply" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Left Content (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Badges / Meta */}
              <div className="flex flex-wrap items-center gap-3">
                {course.delivery_type && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3 py-1 text-xs">
                    {course.delivery_type.toUpperCase()}
                  </Badge>
                )}
                {level && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3 py-1 text-xs">
                    {level === 'beginner' ? 'Người mới' : level === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 text-xs">
                    Đã kiểm duyệt
                  </Badge>
                )}
              </div>

              {/* Huge Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                {title}
              </h1>

              {/* Short Description */}
              {course.shortDescription && (
                <p className="text-lg sm:text-xl text-zinc-600 max-w-3xl leading-relaxed">
                  {course.shortDescription}
                </p>
              )}

              {/* Stats Inline */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-600 mt-2">
                {rating?.average > 0 && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    {rating.average.toFixed(1)} ({rating.count} đánh giá)
                  </span>
                )}
                {enrollmentCount > 0 && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-5 h-5" />
                    {enrollmentCount} học viên
                  </span>
                )}
              </div>

            </div>

            {/* Right Placeholder for spacing in Hero, the actual card is fixed/absolute below */}
            <div className="hidden lg:block lg:col-span-4"></div>

          </div>
        </div>
      </section>


      {/* 3. Main Storytelling Content */}
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-8 relative">
            
            {/* 2. Sticky Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 py-4 mb-8">
              <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                <button onClick={() => scrollTo(overviewRef)} className="text-sm font-bold text-zinc-600 hover:text-blue-600 whitespace-nowrap transition-colors">
                  Tổng quan
                </button>
                <button onClick={() => scrollTo(curriculumRef)} className="text-sm font-bold text-zinc-600 hover:text-blue-600 whitespace-nowrap transition-colors">
                  Giáo trình
                </button>

                <button onClick={() => scrollTo(instructorRef)} className="text-sm font-bold text-zinc-600 hover:text-blue-600 whitespace-nowrap transition-colors">
                  Giảng viên
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-16">
            
            {/* Outcomes Section (Pulled out of CourseInfo) */}
            {course.outcomes && course.outcomes.length > 0 && (
              <section className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  Bạn sẽ học được gì?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {course.outcomes.map((outcome, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-zinc-700 leading-relaxed text-sm">{outcome}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Overview Section */}
            <section ref={overviewRef} className="scroll-mt-32">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 mb-3">Thông tin chi tiết</h2>
                <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <CourseInfo 
                course={course} 
                isEnrolled={!!existingEnrollment} 
                lessons={courseLessons} 
              />
            </section>

            {/* Curriculum Section */}
            <section ref={curriculumRef} className="scroll-mt-32">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 mb-3">Giáo trình</h2>
                <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
                <p className="text-zinc-500 mt-3">Hành trình chi tiết từ lúc bắt đầu đến khi thành thạo.</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <SyllabusAccordion
                  syllabus={course?.syllabus || []}
                  delivery_type={course.delivery_type}
                  courseId={course._id}
                  isEnrolled={!!existingEnrollment}
                  enrollmentId={existingEnrollment?._id}
                  lessons={courseLessons}
                />
              </div>
            </section>



            {/* Instructor Section */}
            <section ref={instructorRef} className="scroll-mt-32">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 mb-3">Giảng viên</h2>
                <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <CourseInstructorInfo provider={provider} />
            </section>

            {/* Related Courses Section */}
            {relatedCourses.length > 0 && (
              <section className="pt-12 border-t border-zinc-200">
                <h3 className="text-2xl font-bold tracking-tight mb-6 text-zinc-900">
                  Các khóa học liên quan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
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

            </div>
          </div>

          {/* Right Column (Sticky Sidebar) */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden flex flex-col z-30 lg:-mt-64">
              
              {/* Thumbnail inside the card */}
              {thumbnail && (
                <div className="w-full h-48 md:h-56 relative bg-zinc-100">
                  <SafeImage 
                    src={thumbnail} 
                    alt={title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10"></div>
                </div>
              )}

              <div className="p-6 md:p-8 flex flex-col gap-6">
                


                {/* Enrollment Action */}
                <div className="flex flex-col gap-3">
                  {currentUser?.role === 'enterprise' ? (
                    <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <h3 className="font-bold text-sm text-blue-900">Dành cho Doanh nghiệp</h3>
                      <p className="text-xs text-blue-700">
                        Hợp tác với giảng viên để tuyển dụng học viên hoặc tài trợ.
                      </p>
                      <button 
                        onClick={() => setIsPartnershipModalOpen(true)}
                        className="w-full py-3 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Yêu cầu Hợp tác
                      </button>
                    </div>
                  ) : (
                    <CourseEnrollmentForm
                      course={course}
                      eligibility={eligibility}
                      existingEnrollment={existingEnrollment}
                      sponsorships={sponsorships}
                      onSubmit={handleEnroll}
                      isSubmitting={enrolling}
                    />
                  )}
                  {maxStudents && (
                    <div className="text-center text-xs text-zinc-500 font-medium">
                      {enrollmentCount || currentStudents || 0}/{maxStudents} học viên đã đăng ký
                    </div>
                  )}
                </div>

                {/* Course Meta Bullets */}
                <div className="pt-6 border-t border-zinc-100 space-y-4">
                  {duration && (
                    <div className="flex items-center gap-3 text-sm text-zinc-600">
                      <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Thời lượng: <strong>{formatDuration(duration)}</strong></span>
                    </div>
                  )}
                  {course.delivery_type && (
                    <div className="flex items-center gap-3 text-sm text-zinc-600">
                      <Play className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Hình thức: <strong>{course.delivery_type === 'video' ? 'Video qua mạng' : course.delivery_type === 'live' ? 'Học trực tuyến (Live)' : course.delivery_type === 'offline' ? 'Học tại trung tâm' : 'Kết hợp (Blended)'}</strong></span>
                    </div>
                  )}
                  {course.certificate && (
                    <div className="flex items-center gap-3 text-sm text-zinc-600">
                      <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Cấp chứng chỉ: <strong>Có</strong></span>
                    </div>
                  )}
                  {location?.type === 'offline' && location?.address && (
                    <div className="flex items-start gap-3 text-sm text-zinc-600">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Địa điểm: <strong>{location.address}</strong></span>
                    </div>
                  )}
                </div>

                {/* Job Guarantee Banner */}
                {sponsorships && sponsorships.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100">
                    <JobGuaranteeHighlight sponsorships={sponsorships} />
                  </div>
                )}
                
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {currentUser?.role === 'enterprise' && (
        <EnterprisePartnershipModal 
          isOpen={isPartnershipModalOpen}
          onClose={() => setIsPartnershipModalOpen(false)}
          course={course}
          trainerId={provider?._id || provider}
        />
      )}

      <Footer />
    </div>
  );
}
