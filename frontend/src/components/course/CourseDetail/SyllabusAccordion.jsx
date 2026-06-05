import React, { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { ChevronDown, Play, FileText, HelpCircle, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to format seconds (e.g. 750 -> "12:30")
const formatDurationFromSeconds = (seconds) => {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const SyllabusAccordion = ({
  syllabus = [],
  delivery_type,
  courseId,
  isEnrolled = false,
  lessons = [],
}) => {
  // Open the first week by default
  const [expandedWeeks, setExpandedWeeks] = useState({ 0: true });

  const toggleWeek = (index) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Filter lessons belonging to the given week number
  const getLessonsForWeek = (weekNumber) => {
    return Array.isArray(lessons) 
      ? lessons.filter((l) => l.weekNumber === weekNumber)
      : [];
  };

  return (
    <div className="space-y-4">
      {/* Syllabus Header Summary */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Nội dung chi tiết khóa học
        </h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          {syllabus.length} tuần {lessons.length > 0 && `• ${lessons.length} bài học`}
        </span>
      </div>

      {/* Week Cards Accordion */}
      <div className="space-y-3">
        {syllabus.map((week, index) => {
          const weekNumber = week.week || index + 1;
          const weekLessons = getLessonsForWeek(weekNumber);
          const isExpanded = expandedWeeks[index];
          const completedCount = weekLessons.filter((l) => l.completed).length;

          return (
            <div 
              key={index}
              className="p-1 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-800 transition-all duration-300"
            >
              <Card className="rounded-[12px] bg-white dark:bg-zinc-950 overflow-hidden border border-zinc-100 dark:border-zinc-900 shadow-sm">
                {/* Week Trigger Header Button */}
                <button
                  onClick={() => toggleWeek(index)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-0.5">
                        Tuần {weekNumber}
                      </span>
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                        {week.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0 font-medium">
                    {weekLessons.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-[11px]">
                        {completedCount}/{weekLessons.length} bài
                      </span>
                    ) : (
                      week.duration && <span>{week.duration}</span>
                    )}
                  </div>
                </button>

                {/* Collapsible content with Framer Motion */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    >
                      <div className="border-t border-zinc-100 dark:border-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-900 bg-white dark:bg-zinc-950">
                        {weekLessons.length > 0 ? (
                          weekLessons.map((lesson) => (
                            <LessonRow
                              key={lesson._id || lesson.id}
                              lesson={lesson}
                              isEnrolled={isEnrolled}
                              delivery_type={delivery_type}
                            />
                          ))
                        ) : (
                          /* Fallback to text content if no lesson arrays exist */
                          <div className="p-5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal bg-zinc-50/20 dark:bg-zinc-900/5">
                            {week.content}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// LessonRow Sub-Component
const LessonRow = ({ lesson, isEnrolled, delivery_type }) => {
  const isLocked = !isEnrolled && !lesson.isPreview;
  
  // Decide Icon based on lesson type
  const getIcon = () => {
    if (lesson.type === 'quiz') return HelpCircle;
    if (lesson.type === 'assignment') return FileText;
    return Play; // Default is video/lesson
  };
  const Icon = getIcon();

  return (
    <div 
      className={`flex items-center justify-between gap-4 px-5 py-3.5 transition-opacity ${
        isLocked ? 'opacity-55' : 'hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Icon with light gray container */}
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 stroke-[1.5]" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-250 truncate">
            {lesson.title}
          </p>
          {lesson.duration > 0 && (
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              {formatDurationFromSeconds(lesson.duration)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Completion Checkmark */}
        {lesson.completed && isEnrolled && (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/30 shrink-0" />
        )}

        {/* Lock indicator */}
        {isLocked && !lesson.completed && (
          <Lock className="w-3.5 h-3.5 text-zinc-350 dark:text-zinc-600 shrink-0" strokeWidth={2.0} />
        )}

        {/* Previewable Lesson Tag */}
        {lesson.isPreview && !isEnrolled && (
          <Badge 
            variant="outline" 
            className="text-[10px] font-bold border-emerald-200 text-emerald-600 bg-emerald-50/50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full"
          >
            Học thử
          </Badge>
        )}

        {/* Special Quiz / Assignment Badges */}
        {lesson.type === 'quiz' && !isLocked && (
          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border-0">
            Trắc nghiệm
          </Badge>
        )}
        {lesson.type === 'assignment' && !isLocked && (
          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-0">
            Bài tập
          </Badge>
        )}
      </div>
    </div>
  );
};
