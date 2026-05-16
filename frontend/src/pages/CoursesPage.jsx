import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseFilters } from '@/components/course/CourseFilters';
import { CourseGrid } from '@/components/course/CourseGrid';
import { Skeleton } from '@/components/ui';
import { getCourses, getRecommendedCourses } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { BookOpen } from 'lucide-react';

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  level: '',
  isFree: false,
  hasScholarship: false,
  sortBy: 'enrollmentCount',
  order: 'desc',
  page: 1,
  limit: 12,
};

export default function CoursesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useSelector(selectCurrentUser);

  const [courses, setCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize filters from URL params
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    level: searchParams.get('level') || '',
    isFree: searchParams.get('isFree') === 'true',
    hasScholarship: searchParams.get('hasScholarship') === 'true',
    sortBy: searchParams.get('sortBy') || 'enrollmentCount',
    order: searchParams.get('order') || 'desc',
    page: parseInt(searchParams.get('page') || '1'),
  }));

  // Sync filters to URL
  const syncFiltersToUrl = useCallback((f) => {
    const params = {};
    if (f.search) params.search = f.search;
    if (f.category) params.category = f.category;
    if (f.level) params.level = f.level;
    if (f.isFree) params.isFree = 'true';
    if (f.hasScholarship) params.hasScholarship = 'true';
    if (f.sortBy && f.sortBy !== 'enrollmentCount') params.sortBy = f.sortBy;
    if (f.order && f.order !== 'desc') params.order = f.order;
    if (f.page && f.page > 1) params.page = String(f.page);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Fetch courses
  const fetchCourses = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...f };
      // Clean empty values
      Object.keys(params).forEach((k) => {
        if (params[k] === '' || params[k] === null || params[k] === undefined) {
          delete params[k];
        }
      });

      const res = await getCourses(params);
      setCourses(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch recommended courses for logged-in users
  const fetchRecommended = useCallback(async () => {
    if (!currentUser) return;
    setRecommendedLoading(true);
    try {
      const res = await getRecommendedCourses();
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setRecommendedCourses(list);
    } catch (err) {
      console.error('Error fetching recommended courses:', err);
    } finally {
      setRecommendedLoading(false);
    }
  }, [currentUser]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    syncFiltersToUrl(newFilters);
  }, [syncFiltersToUrl]);

  // Initial load
  useEffect(() => {
    fetchCourses(filters);
  }, []);

  // Fetch recommended when user changes
  useEffect(() => {
    fetchRecommended();
  }, [fetchRecommended]);

  // Refetch when filters change (after initial)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(filters);
    }, 50);
    return () => clearTimeout(timer);
  }, [filters, fetchCourses]);

  const handleCourseClick = (course) => {
    navigate(`/courses/${course._id}`);
  };

  // Normalize: API may return { data: [...] } or a plain array
  const normalizeCourses = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const recommendedList = normalizeCourses(recommendedCourses);

  // Build match scores from recommended courses
  const matchScores = {};
  recommendedList.forEach((rc) => {
    if (rc.matchScore != null) {
      matchScores[rc._id] = rc.matchScore;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-white py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Khóa học</h1>
          <p className="text-primary-foreground/80">
            Khám phá hơn {pagination?.totalItems || '...'} khóa học chất lượng cho người lao động 35+
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8">
          <CourseFilters filters={filters} onChange={handleFiltersChange} />
        </div>

        {/* Recommended section (logged-in users) */}
        {currentUser && recommendedList.length > 0 && !loading && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🎯</span>
              <h2 className="text-xl font-semibold">Gợi ý cho bạn</h2>
              <span className="text-sm text-muted-foreground">
                (dựa trên hồ sơ & kỹ năng của bạn)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedList.slice(0, 4).map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  matchScore={course.matchScore}
                  onClick={() => navigate(`/courses/${course._id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* All courses header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Tất cả khóa học
            {pagination && (
              <span className="text-muted-foreground font-normal text-base ml-2">
                ({pagination.totalItems} khóa)
              </span>
            )}
          </h2>
        </div>

        {/* Course grid */}
        {error ? (
          <div className="flex flex-col items-center py-16">
            <p className="text-destructive font-medium mb-2">{error}</p>
            <button
              onClick={() => fetchCourses(filters)}
              className="text-primary underline text-sm"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <CourseGrid
            courses={courses}
            loading={loading}
            matchScores={matchScores}
            onCourseClick={handleCourseClick}
            emptyMessage={
              filters.search
                ? `Không tìm thấy khóa học với từ khóa "${filters.search}"`
                : 'Không tìm thấy khóa học phù hợp'
            }
          />
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pagination.totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = page === pagination.currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handleFiltersChange({ ...filters, page })}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
