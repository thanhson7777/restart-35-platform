import React from 'react';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react';
import { ProgressBar } from '@/components/enrollment/ProgressBar';
import { formatDate } from '@/utils/formatter';
import { Button } from '@/components/ui';

export const LiveProgressDetail = ({ enrollment, schedule }) => {
  const { progress } = enrollment;

  // Mock schedule session list fallback
  const sessions = schedule?.sessions || progress?.sessions || [
    { sessionNumber: 1, title: 'Khai giảng & Setup công cụ', status: 'completed' },
    { sessionNumber: 2, title: 'Kỹ năng số văn phòng', status: 'completed' },
    { sessionNumber: 3, title: 'Làm việc nhóm trực tuyến', status: 'upcoming', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), startTime: '19:30', endTime: '21:00', location: 'https://meet.google.com/abc-defg-hij' }
  ];

  const totalSessions = sessions.length;
  const attendedCount = sessions.filter(s => s.status === 'completed' || s.attended).length;
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
            {nextSession.location && (
              <Button
                variant="ghost"
                className="h-6 text-[10px] gap-1 px-2 border-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-primary shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(nextSession.location, '_blank');
                }}
              >
                <span>Vào lớp Live</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
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
    </div>
  );
};
