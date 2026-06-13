import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses } from '@/apis/courseApi';
import { CourseCard } from '@/components/course/CourseCard';
import { Button, Skeleton, Input } from '@/components/ui';
import { SelectField } from '@/components/ui/SelectField';
import { Search, ChevronLeft, ChevronRight, Sparkle, BookOpenText } from 'lucide-react';
import { useSelector } from 'react-redux';

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả cấp độ' },
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung bình' },
  { value: 'advanced', label: 'Nâng cao' }
];

const DELIVERY_OPTIONS = [
  { value: '', label: 'Tất cả hình thức' },
  { value: 'video', label: 'Video quay sẵn' },
  { value: 'live', label: 'Trực tuyến (Zoom/Meet)' },
  { value: 'offline', label: 'Trực tiếp' }
];

export default function CommunityCourseSection() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('free');
  
  // Get course recommendations from Redux
  const courseRecommendationsMap = useSelector(state => state.ai.courseRecommendationsMap);
  const recommendedCourses = Object.values(courseRecommendationsMap || {})
    .flat()
    .filter((course, index, self) => {
      const id = course._id || course.course_id || course.id;
      return index === self.findIndex((c) => (c._id || c.course_id || c.id) === id);
    });
  
  // Data states
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [level, setLevel] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [level, deliveryType, activeSubTab]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      
      if (activeSubTab === 'recommended') {
        let filtered = recommendedCourses;
        if (debouncedSearch) {
          filtered = filtered.filter(c => c.title.toLowerCase().includes(debouncedSearch.toLowerCase()));
        }
        if (level) {
          filtered = filtered.filter(c => c.level === level);
        }
        if (deliveryType) {
          filtered = filtered.filter(c => c.delivery_type === deliveryType);
        }
        
        const totalPages = Math.ceil(filtered.length / limit) || 1;
        const start = (page - 1) * limit;
        setCourses(filtered.slice(start, start + limit));
        setPagination({ currentPage: page, totalPages });
        setLoading(false);
        return;
      }

      try {
        const params = {
          limit,
          page
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (level) params.level = level;
        if (deliveryType) params.delivery_type = deliveryType;

        if (activeSubTab === 'free') {
          params.isFree = true;
        } else if (activeSubTab === 'paid') {
          params.isFree = false;
        }

        const res = await getCourses(params);
        setCourses(res.data?.data || []);
        if (res.data?.pagination) {
          setPagination(res.data.pagination);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [activeSubTab, debouncedSearch, level, deliveryType, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sub-tabs */}
        <div className="flex gap-2 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveSubTab('free')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'free'
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]'
            }`}
          >
            Khóa học miễn phí
          </button>
          <button
            onClick={() => setActiveSubTab('paid')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'paid'
                ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]'
            }`}
          >
            Khóa học có phí
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'all'
                ? 'bg-[hsl(var(--admin-accent))] text-white shadow-sm'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveSubTab('recommended')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'recommended'
                ? 'bg-orange-50 text-orange-700 shadow-sm'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]'
            }`}
          >
            <Sparkle size={14} />
            Gợi ý cho bạn
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--admin-text-muted))]" size={16} />
            <Input
              type="text"
              placeholder="Tìm kiếm khóa học..."
              className="pl-9 h-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <SelectField
              options={LEVEL_OPTIONS}
              value={level}
              onChange={setLevel}
            />
          </div>
          <div className="w-full sm:w-48">
            <SelectField
              options={DELIVERY_OPTIONS}
              value={deliveryType}
              onChange={setDeliveryType}
            />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <Skeleton key={n} className="h-72 w-full rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />
          ))}
        </div>
      ) : activeSubTab === 'recommended' && recommendedCourses.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-[hsl(var(--admin-surface))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <BookOpenText size={32} />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có gợi ý khóa học</h3>
          <p className="text-[hsl(var(--admin-text-muted))] max-w-md mb-6">
            Hệ thống cần phân tích hồ sơ và định hướng nghề nghiệp của bạn để đưa ra các gợi ý khóa học phù hợp nhất.
          </p>
          <Button onClick={() => navigate('/jobs')} className="rounded-xl px-6">
            Phân tích nghề nghiệp ngay
          </Button>
        </div>
      ) : courses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map(course => (
              <CourseCard 
                key={course._id} 
                course={course} 
                onClick={() => navigate(`/courses/${course._id}`)} 
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-10 w-10 rounded-xl border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]"
              >
                <ChevronLeft size={18} />
              </Button>
              <div className="flex items-center justify-center min-w-[4rem] text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                {page} / {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={page === pagination.totalPages}
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                className="h-10 w-10 rounded-xl border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]"
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center bg-[hsl(var(--admin-surface))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy khóa học nào phù hợp.</p>
        </div>
      )}
    </div>
  );
}
