import React from 'react';
import { PlayCircle, Bookmark } from 'lucide-react';
import { ProgressBar } from '@/components/enrollment/ProgressBar';

export const VideoProgressDetail = ({ enrollment }) => {
  const { progress, nextLesson } = enrollment;

  const totalLessons = progress?.totalLessons || 0;
  const completedLessons = progress?.completedLessons || 0;
  const videoProgress = progress?.byDelivery?.video || progress?.percentage || 0;
  const bookmarks = progress?.bookmarks || [];

  return (
    <div className="space-y-2.5">
      {/* Title & percentage */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
          Tiến độ tự học qua Video
        </span>
        <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
          {videoProgress}%
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar percentage={videoProgress} size="sm" />

      {/* Lesson details */}
      <div className="flex flex-wrap items-center justify-between text-[11px] gap-2 pt-0.5">
        <span className="text-zinc-500 font-medium">
          Đã hoàn thành <span className="font-bold text-zinc-800 dark:text-zinc-200">{completedLessons}/{totalLessons}</span> bài học
        </span>
        {nextLesson && (
          <span className="text-primary font-bold hover:underline shrink-0 max-w-[28ch] truncate" title={nextLesson.title}>
            Bài tiếp theo: {nextLesson.title}
          </span>
        )}
      </div>

      {/* Bookmarks info snippet */}
      {bookmarks.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 px-2 py-1 rounded-lg w-fit border border-zinc-150/40 dark:border-zinc-850">
          <Bookmark className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
          <span>Ghim: <b>{bookmarks[0].title}</b>{bookmarks.length > 1 && ` (+${bookmarks.length - 1})`}</span>
        </div>
      )}
    </div>
  );
};
