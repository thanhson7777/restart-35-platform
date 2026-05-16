import { CourseCard } from './CourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { BookOpen } from 'lucide-react';

export const CourseGrid = ({
  courses = [],
  loading = false,
  matchScores = {},
  onCourseClick,
  onEnroll,
  emptyMessage = 'Không tìm thấy khóa học phù hợp',
}) => {
  // Normalize: API may return { data: [...] } or a plain array
  const courseList = Array.isArray(courses)
    ? courses
    : Array.isArray(courses?.data)
    ? courses.data
    : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!courseList || courseList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          {emptyMessage}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {courseList.map((course) => (
        <CourseCard
          key={course._id || course.id}
          course={course}
          matchScore={matchScores[course._id || course.id]}
          onClick={() => onCourseClick?.(course)}
          onEnroll={() => onEnroll?.(course)}
        />
      ))}
    </div>
  );
};
