import React from 'react';
import { MapPin, Navigation, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { ProgressBar } from '@/components/enrollment/ProgressBar';
import { formatDate } from '@/utils/formatter';
import { Button } from '@/components/ui';

export const OfflineProgressDetail = ({ enrollment, schedule }) => {
  const { progress, course } = enrollment;

  // Mock venue & sessions list
  const address = course?.location?.address || 'Tầng 3, Tòa nhà A, 123 Nguyễn Huệ, Quận 1, TP.HCM';
  const mapLink = course?.location?.link || `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
  
  // Use actual schedule sessions or fallback
  const sessions = schedule?.sessions || progress?.sessions || [];
  
  const totalSessions = enrollment?.attendance?.totalSessions || progress?.totalLessons || (sessions.length > 0 ? sessions.length : 1);
  const attendedCount = enrollment?.attendance 
    ? ((enrollment.attendance.present || 0) + (enrollment.attendance.late || 0)) 
    : (progress?.currentLesson || progress?.completedItems?.length || 0);
    
  const offlineProgress = progress?.byDelivery?.offline || Math.round((attendedCount / totalSessions) * 100) || 0;
  const completedItemIds = progress?.completedItems?.map(String) || [];

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
          {sessions.map((s, idx) => {
            const isCompleted = completedItemIds.includes(String(s.sessionNumber || idx + 1));
            return (
              <span 
                key={idx} 
                className={`w-2.5 h-2.5 rounded-full border ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-450' 
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                }`}
                title={`Buổi ${s.sessionNumber || idx + 1}: ${isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'}`}
              />
            );
          })}
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
            window.open(mapLink, '_blank');
          }}
        >
          <Navigation className="w-3 h-3 text-zinc-500" />
          Bản đồ
        </Button>
      </div>

      {/* Completion Box */}
      {totalSessions > 0 && attendedCount >= totalSessions && (
        <div className="p-3 mt-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col items-center justify-center text-center space-y-1">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            🎉 Bạn đã đi học đủ tất cả các buổi
          </p>
          <p className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80 font-medium px-2">
            Giảng viên sẽ tổng kết điểm và cập nhật trạng thái tốt nghiệp cho bạn.
          </p>
        </div>
      )}
    </div>
  );
};
