import React, { useState, useEffect, useCallback } from 'react';
import { Star, ChevronDown, RefreshCw, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { TrainerReviewCard } from '@/components/trainer/TrainerReviewCard';
import { getMyCourses, getReviewsByCourse } from '@/apis/trainerApi';

const FILTER_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chưa phản hồi' },
  { value: 'responded', label: 'Đã phản hồi' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'rating_low', label: 'Rating thấp nhất' },
  { value: 'rating_high', label: 'Rating cao nhất' }
];

export default function TrainerReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [submittingMap, setSubmittingMap] = useState({});

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await getMyCourses({ limit: 100 });
      setCourses(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const fetchAllReviews = useCallback(async (courseList) => {
    setLoading(true);
    setError(null);

    if (courseList.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        courseList.map(course =>
          getReviewsByCourse(course._id, { limit: 100, status: 'approved' }).catch(() => null)
        )
      );

      const allReviews = [];
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value?.data?.data) {
          const courseReviews = result.value.data.data.map(r => ({
            ...r,
            courseId: courseList[idx]._id,
            course: { _id: courseList[idx]._id, title: courseList[idx].title }
          }));
          allReviews.push(...courseReviews);
        }
      });

      setReviews(allReviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Không thể tải đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (!loadingCourses && courses.length > 0) {
      fetchAllReviews(courses);
    } else if (!loadingCourses && courses.length === 0) {
      setLoading(false);
    }
  }, [loadingCourses, courses, fetchAllReviews]);

  const handleRefresh = () => {
    if (courses.length > 0) {
      fetchAllReviews(courses);
    }
  };

  const handleResponse = (reviewId, responseText) => {
    setReviews(prev =>
      prev.map(r =>
        r._id === reviewId
          ? {
              ...r,
              trainerResponse: {
                text: responseText,
                createdAt: new Date().toISOString()
              }
            }
          : r
      )
    );
  };

  // Filter & sort
  const filteredReviews = reviews
    .filter(r => {
      if (filterTab === 'pending') return !r.trainerResponse?.text;
      if (filterTab === 'responded') return !!r.trainerResponse?.text;
      return true;
    })
    .filter(r => {
      if (!courseFilter) return true;
      return r.courseId === courseFilter || r.course?._id === courseFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'rating_low':
          return (a.rating?.overall || 0) - (b.rating?.overall || 0);
        case 'rating_high':
          return (b.rating?.overall || 0) - (a.rating?.overall || 0);
        default:
          return 0;
      }
    });

  const pendingCount = reviews.filter(r => !r.trainerResponse?.text).length;
  const respondedCount = reviews.filter(r => !!r.trainerResponse?.text).length;

  const selectedCourseLabel = courseFilter
    ? (courses.find(c => c._id === courseFilter)?.title || 'Khóa học đã chọn')
    : 'Tất cả khóa học';

  const selectedSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Mới nhất';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">Phản hồi đánh giá</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              Xem và phản hồi ý kiến đóng góp, đánh giá khóa học từ học viên.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] text-xs gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]">
            <MessageSquare size={15} className="text-[hsl(var(--admin-text-muted))]" />
            <span className="text-sm text-[hsl(var(--admin-text-secondary))]">
              <span className="font-bold text-[hsl(var(--admin-text-primary))]">{reviews.length}</span>{' '}
              <span className="text-[hsl(var(--admin-text-muted))]">đánh giá</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(var(--admin-warning))]/20 bg-[hsl(var(--admin-warning))]/5">
            <Clock size={15} className="text-[hsl(var(--admin-warning))]" />
            <span className="text-sm text-[hsl(var(--admin-text-secondary))]">
              <span className="font-bold text-[hsl(var(--admin-warning))]">{pendingCount}</span>{' '}
              <span className="text-[hsl(var(--admin-text-muted))]">chưa phản hồi</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(var(--admin-success))]/20 bg-[hsl(var(--admin-success))]/5">
            <CheckCircle2 size={15} className="text-[hsl(var(--admin-success))]" />
            <span className="text-sm text-[hsl(var(--admin-text-secondary))]">
              <span className="font-bold text-[hsl(var(--admin-success))]">{respondedCount}</span>{' '}
              <span className="text-[hsl(var(--admin-text-muted))]">đã phản hồi</span>
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tab filters */}
        <div className="flex items-center bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] rounded-xl p-1 gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                filterTab === tab.value
                  ? 'bg-[hsl(var(--admin-accent))] text-white shadow-sm'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Course dropdown */}
        <div className="relative">
          <button
            onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] rounded-xl text-sm text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-all duration-200"
          >
            <span className="max-w-[160px] truncate">{selectedCourseLabel}</span>
            <ChevronDown size={14} className={`text-[hsl(var(--admin-text-muted))] transition-transform ${courseDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {courseDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl shadow-[var(--admin-shadow-lg)] z-20 overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => { setCourseFilter(''); setCourseDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 transition-colors ${
                    !courseFilter ? 'bg-[hsl(var(--admin-accent))]/15 text-[hsl(var(--admin-accent))]' : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}
                >
                  Tất cả khóa học
                </button>
                {courses.map((course) => (
                  <button
                    key={course._id}
                    onClick={() => { setCourseFilter(course._id); setCourseDropdownOpen(false); }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                      courseFilter === course._id
                        ? 'bg-[hsl(var(--admin-accent))]/15 text-[hsl(var(--admin-accent))]'
                        : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                    }`}
                  >
                    <span className="block truncate">{course.title || 'Khóa học'}</span>
                    <span className="block text-xs text-[hsl(var(--admin-text-muted))] mt-0.5">{course.status || ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] rounded-xl text-sm text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-all duration-200"
          >
            <span>Sắp xếp: <strong>{selectedSortLabel}</strong></span>
            <ChevronDown size={14} className={`text-[hsl(var(--admin-text-muted))] transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-48 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl shadow-[var(--admin-shadow-lg)] z-20 overflow-hidden">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                    sortBy === opt.value
                      ? 'bg-[hsl(var(--admin-accent))]/15 text-[hsl(var(--admin-accent))]'
                      : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {(courseFilter || filterTab !== 'all') && (
          <button
            onClick={() => { setFilterTab('all'); setCourseFilter(''); }}
            className="text-xs text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] underline underline-offset-2"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-72 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-surface-elevated))]/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-[hsl(var(--admin-danger))]/30 bg-[hsl(var(--admin-danger))]/5 rounded-xl p-6 text-center">
          <p className="text-sm text-[hsl(var(--admin-danger))] mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-[hsl(var(--admin-danger))]/30 text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger))]/10 text-xs gap-1.5"
          >
            <RefreshCw size={13} />
            Thử lại
          </Button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]/80 border border-[hsl(var(--admin-border))] flex items-center justify-center mx-auto mb-4">
            <Star size={28} className="text-[hsl(var(--admin-text-faint))]" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-[hsl(var(--admin-text-secondary))]">
              {filterTab === 'pending'
                ? 'Không có đánh giá chưa phản hồi.'
                : filterTab === 'responded'
                ? 'Không có đánh giá đã phản hồi.'
                : 'Chưa có đánh giá nào.'}
            </p>
            <p className="text-sm text-[hsl(var(--admin-text-muted))] max-w-sm mx-auto">
              {filterTab === 'all' && !courseFilter
                ? 'Khi học viên đánh giá các khóa học của bạn, họ sẽ xuất hiện tại đây.'
                : 'Hãy thử thay đổi bộ lọc để xem thêm đánh giá.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredReviews.map((review) => (
            <TrainerReviewCard
              key={review._id}
              review={review}
              onResponse={handleResponse}
              loading={!!submittingMap[review._id]}
            />
          ))}
        </div>
      )}

      {/* Footer: count */}
      {!loading && !error && filteredReviews.length > 0 && (
        <p className="text-center text-xs text-[hsl(var(--admin-text-muted))]">
          Hiển thị {filteredReviews.length} trên tổng số {reviews.length} đánh giá
          {courseFilter && ` trong khóa học đã chọn`}
        </p>
      )}
    </div>
  );
}
