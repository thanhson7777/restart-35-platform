import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFreeCourses, getPaidCourses, getCourses } from '@/apis/courseApi';
import { CourseCard } from '@/components/course/CourseCard';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui';

export default function CommunityCourseSection() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('free');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        let res;
        if (activeSubTab === 'free') {
          res = await getFreeCourses({ limit: 8 });
        } else if (activeSubTab === 'paid') {
          res = await getPaidCourses({ limit: 8 });
        } else {
          res = await getCourses({ limit: 8 });
        }
        setCourses(res.data?.data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [activeSubTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        </div>
        <Button 
          variant="outline" 
          className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]"
          onClick={() => navigate('/courses')}
        >
          Xem tất cả khóa học
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <Skeleton key={n} className="h-72 w-full rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map(course => (
            <CourseCard 
              key={course._id} 
              course={course} 
              onClick={() => navigate(`/courses/${course._id}`)} 
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-[hsl(var(--admin-surface))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy khóa học nào phù hợp.</p>
        </div>
      )}
    </div>
  );
}
