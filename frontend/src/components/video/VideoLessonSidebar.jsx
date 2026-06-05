import React, { useState, useMemo } from 'react';
import { ChevronDown, Play, CheckCircle, Circle, Lock } from 'lucide-react';
import { formatDuration } from '@/utils/formatter';
import { motion, AnimatePresence } from 'framer-motion';

export const VideoLessonSidebar = ({
  lessons = [],
  currentLessonId,
  onSelectLesson,
  progress,
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState({ 1: true }); // Open Week 1 by default

  // Group lessons by weekNumber
  const weekGroups = useMemo(() => {
    const groups = {};
    lessons.forEach((lesson) => {
      const week = lesson.weekNumber || 1;
      if (!groups[week]) groups[week] = [];
      groups[week].push(lesson);
    });
    return groups;
  }, [lessons]);

  const percentage = progress?.percentage || 0;
  const completedLessons = progress?.completedLessons || 0;

  const toggleWeek = (weekNum) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekNum]: !prev[weekNum],
    }));
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-zinc-900 text-white">
      {/* Sidebar Progress Header */}
      <div className="p-5 border-b border-zinc-900 shrink-0">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block mb-1">
          Tiến độ học tập
        </span>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xl font-extrabold text-white">{percentage}%</span>
          <span className="text-[10.5px] text-zinc-400 font-medium">
            {completedLessons}/{lessons.length} bài học
          </span>
        </div>
        <div className="w-full h-1 bg-zinc-850 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>

      {/* Week Accordion Groups List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/50 scrollbar-thin">
        {Object.entries(weekGroups).map(([weekNum, weekLessons]) => {
          const isExpanded = expandedWeeks[weekNum];
          const completedInWeek = weekLessons.filter((l) => l.completed).length;

          return (
            <div key={weekNum} className="flex flex-col">
              {/* Week Trigger button */}
              <button
                onClick={() => toggleWeek(weekNum)}
                className="w-full flex items-center justify-between px-5 py-4 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors text-left focus:outline-none"
              >
                <div className="min-w-0 pr-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-0.5">
                    Tuần {weekNum}
                  </span>
                  <span className="text-xs font-bold text-zinc-300 truncate block">
                    Nội dung tuần {weekNum}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10.5px] text-zinc-500 font-semibold">
                    {completedInWeek}/{weekLessons.length}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Lessons Collapsible list */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                  >
                    <div className="bg-zinc-950 divide-y divide-zinc-900/30">
                      {weekLessons.map((lesson) => {
                        const isCurrent = lesson._id === currentLessonId || lesson.id === currentLessonId;
                        const isCompleted = lesson.completed;

                        return (
                          <button
                            key={lesson._id || lesson.id}
                            onClick={() => onSelectLesson(lesson)}
                            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-l-2 focus:outline-none ${
                              isCurrent
                                ? 'bg-primary/5 border-primary text-white'
                                : 'border-transparent hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {/* Checkmark Status Indicator */}
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : isCurrent ? (
                              <Play className="w-4 h-4 text-primary fill-current shrink-0 animate-pulse" />
                            ) : (
                              <Circle className="w-4 h-4 text-zinc-700 shrink-0" strokeWidth={1.5} />
                            )}

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs leading-snug line-clamp-2 ${isCurrent ? 'font-bold' : 'font-medium'}`}>
                                {lesson.title}
                              </p>
                              {lesson.duration > 0 && (
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                  {formatDuration(lesson.duration)}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
