import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Avatar, Skeleton } from '@/components/ui';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseEnrollmentForm } from '@/components/course/CourseDetail/CourseEnrollmentForm';
import { CourseInfo } from '@/components/course/CourseDetail/CourseInfo';
import { EnrollmentStatus } from '@/components/shared/EnrollmentStatus';
import { ProgressBar } from '@/components/enrollment/ProgressBar';
import { getCourseById, getRelatedCourses, enrollCourse, getMyEnrollments } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { formatPrice, formatDuration, formatDate } from '@/utils/formatter';
import { Star, Users, Clock, MapPin, BookOpen, Award, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
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
    enrollment,
    eligibility,
    stats,
  } = course || {};

  // Fetch course data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userId = currentUser?._id;
        const [courseRes, relatedRes] = await Promise.all([
          getCourseById(id, userId ? { userId } : {}),
          getRelatedCourses(id),
        ]);

        setCourse(courseRes.data || courseRes);

        const related = relatedRes.data || relatedRes;
        setRelatedCourses(Array.isArray(related) ? related : []);

        // Check existing enrollment
        if (currentUser) {
          try {
            const enrollRes = await getMyEnrollments({ courseId: id });
            const raw = enrollRes.data;
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
        console.error('Error fetching course:', err);
        setError('Không thể tải thông tin khóa học.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser]);

  // Handle enrollment
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

      if (resultStatus === 'waitlist') {
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
        <div className="bg-slate-900 text-white py-10">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-64 bg-white/10 mb-3" />
            <Skeleton className="h-5 w-96 bg-white/10" />
          </div>
        </div>
        <main className="container mx-auto px-4 py-8">
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
          <button onClick={() => navigate('/courses')} className="text-primary underline">
            Quay lại danh sách khóa học
          </button>
        </div>
      </div>
    );
  }

  const isApproved = status === 'approved';

  return (
    <div className="min-h-screen bg-background">
      {/* Course header */}
      <div className="bg-slate-900 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course info */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                {level && (
                  <Badge variant="outline" className="border-white/20 text-white">
                    {level === 'beginner' ? 'Người mới' : level === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-green-600 border-0">Đã duyệt</Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold mb-4">{title}</h1>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                {rating?.average && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">{rating.average.toFixed(1)}</span>
                    <span className="text-white/60">({rating.count} đánh giá)</span>
                  </span>
                )}
                {enrollmentCount != null && (
                  <span className="flex items-center gap-1 text-white/60">
                    <Users className="w-4 h-4" />
                    {enrollmentCount} học viên
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1 text-white/60">
                    <Clock className="w-4 h-4" />
                    {formatDuration(duration)}
                  </span>
                )}
                {viewCount != null && (
                  <span className="flex items-center gap-1 text-white/60">
                    <Eye className="w-4 h-4" />
                    {viewCount} lượt xem
                  </span>
                )}
              </div>

              {/* Provider */}
              {provider && (
                <div className="flex items-center gap-2 mb-2">
                  <Avatar fallback={provider.displayName?.[0] || 'T'} size="sm" />
                  <span className="text-sm text-white/80">
                    {provider.displayName}
                    {provider.verified && <span className="ml-1">✓</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Enrollment card (desktop) */}
            <div className="lg:col-span-1 hidden lg:block">
              <Card className="p-0 overflow-hidden bg-slate-800 border-slate-700">
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt={title}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-white">
                      {isFree || fee === 0 ? 'Miễn phí' : formatPrice(fee)}
                    </span>
                    {fee > 0 && (
                      <span className="text-white/40 line-through ml-2">
                        {formatPrice(fee * 1.6)}
                      </span>
                    )}
                  </div>

                  <CourseEnrollmentForm
                    course={course}
                    eligibility={eligibility}
                    existingEnrollment={existingEnrollment}
                    onSubmit={handleEnroll}
                    isSubmitting={enrolling}
                  />

                  {/* Quick info */}
                  <div className="space-y-2 text-sm text-white/70 pt-2 border-t border-white/10">
                    {duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Thời lượng: {formatDuration(duration)}
                      </div>
                    )}
                    {location?.type && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {location.type === 'online' ? 'Trực tuyến' : location.type === 'offline' ? 'Tại lớp' : 'Kết hợp'}
                        {location.address && ` — ${location.address}`}
                      </div>
                    )}
                    {currentStudents != null && maxStudents > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Đã ghi danh: {currentStudents}/{maxStudents} chỗ
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="curriculum">Nội dung</TabsTrigger>
                {stats?.reviewStats && (
                  <TabsTrigger value="reviews">
                    Đánh giá ({stats.reviewStats.totalReviews || 0})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview">
                <CourseInfo course={course} />
              </TabsContent>

              <TabsContent value="curriculum">
                <CourseInfo course={course} />
              </TabsContent>

              {stats?.reviewStats && (
                <TabsContent value="reviews">
                  <div className="flex items-center gap-4 mb-6 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <span className="text-4xl font-bold">
                        {stats.reviewStats.avgRating?.toFixed(1)}
                      </span>
                      <div className="flex gap-0.5 mt-1 justify-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(stats.reviewStats.avgRating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {stats.reviewStats.totalReviews} đánh giá
                      </span>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Right: Enrollment form (mobile/tablet) */}
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

        {/* Related courses */}
        {relatedCourses.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Khóa học liên quan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedCourses.slice(0, 4).map((rc) => (
                <CourseCard
                  key={rc._id}
                  course={rc}
                  onClick={() => navigate(`/courses/${rc._id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
