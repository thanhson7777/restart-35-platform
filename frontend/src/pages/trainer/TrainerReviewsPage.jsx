import React, { useState, useEffect, useCallback } from 'react';
import { Star, ChevronDown, RefreshCw, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { TrainerReviewCard } from '@/components/trainer/TrainerReviewCard';
import { getMyCourses, getReviewsByCourse } from '@/apis/courseApi';

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
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Phản hồi đánh giá</h1>
            <p className="text-gray-400 text-sm mt-1">
              Xem và phản hồi ý kiến đóng góp, đánh giá khóa học từ học viên.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-[#111827]">
            <MessageSquare size={15} className="text-slate-500" />
            <span className="text-sm text-slate-300">
              <span className="font-bold text-white">{reviews.length}</span>{' '}
              <span className="text-slate-500">đánh giá</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <Clock size={15} className="text-amber-400" />
            <span className="text-sm text-slate-300">
              <span className="font-bold text-amber-400">{pendingCount}</span>{' '}
              <span className="text-slate-500">chưa phản hồi</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/20 bg-green-500/5">
            <CheckCircle2 size={15} className="text-green-400" />
            <span className="text-sm text-slate-300">
              <span className="font-bold text-green-400">{respondedCount}</span>{' '}
              <span className="text-slate-500">đã phản hồi</span>
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tab filters */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                filterTab === tab.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            <span className="max-w-[160px] truncate">{selectedCourseLabel}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${courseDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {courseDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-[#111827] border border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => { setCourseFilter(''); setCourseDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 transition-colors ${
                    !courseFilter ? 'bg-blue-600/15 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
                        ? 'bg-blue-600/15 text-blue-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="block truncate">{course.title || 'Khóa học'}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{course.status || ''}</span>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            <span>Sắp xếp: <strong>{selectedSortLabel}</strong></span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-48 bg-[#111827] border border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                    sortBy === opt.value
                      ? 'bg-blue-600/15 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
            className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-72 bg-slate-950 border border-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-6 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs gap-1.5"
          >
            <RefreshCw size={13} />
            Thử lại
          </Button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="border border-slate-800 bg-[#111827] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mx-auto mb-4">
            <Star size={28} className="text-slate-600" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-300">
              {filterTab === 'pending'
                ? 'Không có đánh giá chưa phản hồi.'
                : filterTab === 'responded'
                ? 'Không có đánh giá đã phản hồi.'
                : 'Chưa có đánh giá nào.'}
            </p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
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
        <p className="text-center text-xs text-slate-600">
          Hiển thị {filteredReviews.length} trên tổng số {reviews.length} đánh giá
          {courseFilter && ` trong khóa học đã chọn`}
        </p>
      )}
    </div>
  );
}

// Import missing icons

