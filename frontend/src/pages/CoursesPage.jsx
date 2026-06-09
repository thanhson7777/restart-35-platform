import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseFilters } from '@/components/course/CourseFilters';
import { CourseGrid } from '@/components/course/CourseGrid';
import { ViewModeToggle } from '@/components/course/ViewModeToggle';
import { getCourses, getRecommendedCourses } from '@/apis/courseApi';
import { getCategoriesAPI } from '@/apis';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  level: '',
  isFree: false,
  hasScholarship: false,
  delivery_type: '',
  funding_model: '',
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
  const [categories, setCategories] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize viewMode from localStorage (default to 'grid')
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('courseViewMode') || 'grid';
  });

  // Sync viewMode to localStorage when changed
  useEffect(() => {
    localStorage.setItem('courseViewMode', viewMode);
  }, [viewMode]);

  // Initialize filters from URL params
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    level: searchParams.get('level') || '',
    isFree: searchParams.get('isFree') === 'true',
    hasScholarship: searchParams.get('hasScholarship') === 'true',
    delivery_type: searchParams.get('delivery_type') || '',
    funding_model: searchParams.get('funding_model') || '',
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
    if (f.delivery_type) params.delivery_type = f.delivery_type;
    if (f.funding_model) params.funding_model = f.funding_model;
    if (f.sortBy && f.sortBy !== 'enrollmentCount') params.sortBy = f.sortBy;
    if (f.order && f.order !== 'desc') params.order = f.order;
    if (f.page && f.page > 1) params.page = String(f.page);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Fetch courses list
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
      setCourses(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories list
  const fetchCategories = useCallback(async () => {
    try {
      const res = await getCategoriesAPI();
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setCategories(list);
    } catch (err) {
      console.error('Error fetching categories:', err);
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
    fetchCategories();
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
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Light Gradient Header */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] shadow-sm py-14">
          <div className="container mx-auto px-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-semibold tracking-wider bg-blue-50 text-blue-600 border border-blue-100 mb-4">
              Khóa học & Kỹ năng
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] mb-3">
              Nâng tầm Kỹ năng & Sự nghiệp
            </h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm sm:text-base max-w-xl leading-relaxed">
              Khám phá hơn {pagination?.totalItems || '...'} khóa học chất lượng được thiết kế riêng giúp người lao động 35+ vững vàng kỹ năng, tự tin mở rộng cơ hội mới.
            </p>
          </div>
        </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filters */}
        <div className="mb-8">
          <CourseFilters 
            filters={filters} 
            onChange={handleFiltersChange} 
            categories={categories}
          />
        </div>

        {/* Recommended section (logged-in users) */}
        {currentUser && recommendedList.length > 0 && !loading && (
          <section className="mb-10 p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/15 border border-zinc-200/50 dark:border-zinc-850">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🎯</span>
              <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Gợi ý cho bạn</h2>
              <span className="text-xs text-muted-foreground font-medium">
                (Dựa trên hồ sơ & kỹ năng cá nhân)
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
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-200">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              Tất cả khóa học
              {pagination && (
                <span className="text-muted-foreground font-semibold text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200">
                {pagination.totalItems} khóa
              </span>
            )}
          </h2>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Course Grid / List */}
        {error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-destructive font-medium mb-3">{error}</p>
            <button
              onClick={() => fetchCourses(filters)}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl hover:bg-primary/95 transition-colors shadow-sm"
            >
              Thử tải lại trang
            </button>
          </div>
        ) : (
          <CourseGrid
            courses={courses}
            loading={loading}
            matchScores={matchScores}
            onCourseClick={handleCourseClick}
            viewMode={viewMode}
            emptyMessage={
              filters.search
                ? `Không tìm thấy khóa học nào phù hợp với từ khóa "${filters.search}"`
                : 'Không tìm thấy khóa học phù hợp'
            }
          />
        )}

        {/* Premium Styled Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-900">
            {Array.from({ length: pagination.totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = page === pagination.currentPage;
              
              return (
                <button
                  key={page}
                  onClick={() => handleFiltersChange({ ...filters, page })}
                  className={`w-10 h-10 rounded-xl text-xs font-bold border transition-all duration-300 ${
                    isCurrent
                      ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
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
      <Footer />
    </>
  );
}
