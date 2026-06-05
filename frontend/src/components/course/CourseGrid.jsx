import React from 'react';
import { CourseCard } from './CourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CourseGrid = ({
  courses = [],
  loading = false,
  matchScores = {},
  onCourseClick,
  onEnroll,
  emptyMessage = 'Không tìm thấy khóa học phù hợp',
  viewMode = 'grid', // 'grid' | 'list'
}) => {
  // Normalize: API may return { data: [...] } or a plain array
  const courseList = Array.isArray(courses)
    ? courses
    : Array.isArray(courses?.data)
    ? courses.data
    : [];

  const isList = viewMode === 'list';

  // Responsive layout: 1 column for list view, dynamic grid columns for grid view
  const gridClasses = isList
    ? 'grid-cols-1 gap-4 max-w-4xl mx-auto'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';

  if (loading) {
    return (
      <div className={`grid ${gridClasses}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <CourseCardSkeleton 
            key={i} 
            variant={isList ? 'horizontal' : 'vertical'} 
          />
        ))}
      </div>
    );
  }

  if (!courseList || courseList.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <BookOpen className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4 stroke-[1.2]" />
        <p className="text-lg font-medium text-zinc-650 dark:text-zinc-400">
          {emptyMessage}
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
          Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác
        </p>
      </motion.div>
    );
  }

  return (
    <div className={`grid ${gridClasses}`}>
      <AnimatePresence mode="popLayout">
        {courseList.map((course, index) => (
          <motion.div
            key={course._id || course.id}
            layout="position"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 26,
              delay: Math.min(index * 0.04, 0.24), // Stagger reveal capped at 0.24s
            }}
          >
            <CourseCard
              course={course}
              matchScore={matchScores[course._id || course.id]}
              onClick={() => onCourseClick?.(course)}
              onEnroll={() => onEnroll?.(course)}
              variant={isList ? 'horizontal' : 'vertical'}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
