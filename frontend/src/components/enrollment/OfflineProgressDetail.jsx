import React from 'react';
import { MapPin, Navigation, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { ProgressBar } from '@/components/enrollment/ProgressBar';
import { formatDate } from '@/utils/formatter';
import { Button } from '@/components/ui';

export const OfflineProgressDetail = ({ enrollment }) => {
  const { progress, course } = enrollment;

  // Mock venue & sessions list
  const address = course?.location?.address || 'Tầng 3, Tòa nhà A, 123 Nguyễn Huệ, Quận 1, TP.HCM';
  const sessions = progress?.sessions || [
    { sessionNumber: 1, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), attended: true },
    { sessionNumber: 2, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), attended: true },
    { sessionNumber: 3, date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), attended: null },
    { sessionNumber: 4, date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(), attended: null },
  ];

  const totalSessions = sessions.length;
  const attendedCount = sessions.filter(s => s.attended === true).length;
  const offlineProgress = progress?.byDelivery?.offline || Math.round((attendedCount / totalSessions) * 100) || 0;

  return (
    <div className="space-y-3">
      {/* Title & Progress Percentage */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
          Tiến độ học tại lớp Offline
        </span>
        <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
          {offlineProgress}%
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar percentage={offlineProgress} size="sm" />

      {/* Checkin Ratio info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>
          Đã đi học <span className="font-bold text-zinc-800 dark:text-zinc-200">{attendedCount}/{totalSessions}</span> buổi thực hành
        </span>
        
        {/* Simple mini dot-timeline */}
        <div className="flex items-center gap-1">
          {sessions.map((s, idx) => (
            <span 
              key={idx} 
              className={`w-2.5 h-2.5 rounded-full border ${
                s.attended === true 
                  ? 'bg-emerald-500 border-emerald-450' 
                  : s.attended === false 
                  ? 'bg-rose-500 border-rose-450' 
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
              }`}
              title={`Buổi ${s.sessionNumber}: ${s.attended === true ? 'Có mặt' : s.attended === false ? 'Vắng mặt' : 'Sắp tới'}`}
            />
          ))}
        </div>
      </div>

      {/* Location Map Box */}
      <div className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-start gap-2.5 justify-between">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">
            Địa chỉ phòng học
          </span>
          <p className="text-xs font-bold text-zinc-850 dark:text-zinc-200 leading-snug line-clamp-2">
            {address}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-[10px] h-7 px-2.5 shrink-0 rounded-lg border-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-900 gap-1 bg-white dark:bg-zinc-950 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            window.open('https://maps.google.com', '_blank');
          }}
        >
          <Navigation className="w-3 h-3 text-zinc-500" />
          Bản đồ
        </Button>
      </div>
    </div>
  );
};
