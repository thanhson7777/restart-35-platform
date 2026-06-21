import React from 'react';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react';
import { ProgressBar } from '@/components/enrollment/ProgressBar';
import { formatDate } from '@/utils/formatter';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

export const LiveProgressDetail = ({ enrollment, schedule }) => {
  const { progress } = enrollment;

  // Mock schedule session list fallback
  const sessions = schedule?.sessions || progress?.sessions || [
    { sessionNumber: 1, title: 'Khai giảng & Setup công cụ', status: 'completed' },
    { sessionNumber: 2, title: 'Kỹ năng số văn phòng', status: 'completed' },
    { sessionNumber: 3, title: 'Làm việc nhóm trực tuyến', status: 'upcoming', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), startTime: '19:30', endTime: '21:00', location: 'https://meet.google.com/abc-defg-hij' }
  ];

  const totalSessions = progress?.totalLessons || sessions.length || 1;
  const attendedCount = progress?.currentLesson || progress?.completedItems?.length || 0;
  const liveProgress = progress?.byDelivery?.live || Math.round((attendedCount / totalSessions) * 100) || 0;

  // Find next upcoming session
  const nextSession = sessions.find(s => s.status !== 'completed');

  return (
    <div className="space-y-3">
      {/* Title & Progress Percentage */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-rose-500 shrink-0" strokeWidth={1.5} />
          Tiến độ học trực tuyến Live
        </span>
        <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
          {liveProgress}%
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar percentage={liveProgress} size="sm" />

      {/* Attendance Stats */}
      <p className="text-[11px] text-zinc-500 font-medium">
        Đã tham gia <span className="font-bold text-zinc-800 dark:text-zinc-200">{attendedCount}/{totalSessions}</span> buổi học chuyên đề
      </p>

      {/* Next Session Box */}
      {nextSession && (
        <div className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block">
              Buổi học tiếp theo (Buổi {nextSession.sessionNumber})
            </span>
          </div>
          
          <p className="text-xs font-bold text-zinc-850 dark:text-zinc-200 leading-snug line-clamp-1">
            {nextSession.title}
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-zinc-500 font-medium">
            {nextSession.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                {formatDate(nextSession.date)}
              </span>
            )}
            {nextSession.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                {nextSession.startTime} - {nextSession.endTime || '21:00'}
              </span>
            )}
          </div>
        </div>
      )}


      {/* Completion Box */}
      {!nextSession && totalSessions > 0 && attendedCount >= totalSessions && (
        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col items-center justify-center text-center space-y-1">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            🎉 Bạn đã hoàn thành tất cả các buổi học
          </p>
          <p className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80 font-medium px-2">
            Giảng viên sẽ tổng kết điểm và cập nhật trạng thái tốt nghiệp cho bạn.
          </p>
        </div>
      )}
    </div>
  );
};
