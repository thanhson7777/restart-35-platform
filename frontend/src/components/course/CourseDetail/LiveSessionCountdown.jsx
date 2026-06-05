import React, { useState, useEffect } from 'react';
import { Video, Clock, AlertCircle } from 'lucide-react';

export const LiveSessionCountdown = ({ session }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [status, setStatus] = useState('upcoming'); // 'upcoming' | 'ongoing' | 'completed'

  const {
    date,
    startTime = '09:00',
    endTime = '11:00',
    title = 'Buổi hướng dẫn nhập môn & Kích hoạt tài khoản',
  } = session || {};

  useEffect(() => {
    if (!date) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      
      // Combine date and start time
      // Assume date format is YYYY-MM-DD or standard ISO date string
      const sessionDateStr = new Date(date).toISOString().split('T')[0];
      const startDateTime = new Date(`${sessionDateStr}T${startTime}:00`);
      const endDateTime = new Date(`${sessionDateStr}T${endTime}:00`);
      
      const diffStart = startDateTime - now;
      const diffEnd = endDateTime - now;

      if (diffStart > 0) {
        setStatus('upcoming');
        const days = Math.floor(diffStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffStart / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffStart / 1000 / 60) % 60);
        const seconds = Math.floor((diffStart / 1000) % 60);
        
        setTimeLeft({ days, hours, minutes, seconds });
      } else if (diffEnd > 0) {
        setStatus('ongoing');
        setTimeLeft(null);
      } else {
        setStatus('completed');
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [date, startTime, endTime]);

  if (!date) return null;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-zinc-900/60 dark:bg-zinc-950/40 border border-zinc-800/80 max-w-md">
      <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider mb-2.5 animate-pulse">
        <Video className="w-3.5 h-3.5 fill-current" />
        <span>Lớp học Live tiếp theo</span>
      </div>
      
      <h4 className="text-xs font-bold text-zinc-300 line-clamp-1 mb-3">
        {title}
      </h4>

      {status === 'upcoming' && timeLeft && (
        <div className="flex gap-3 text-center">
          {/* Days */}
          <div className="flex-1 bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-2 min-w-[60px]">
            <span className="block text-lg font-extrabold text-white font-mono leading-none">
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mt-1 block">Ngày</span>
          </div>
          
          {/* Hours */}
          <div className="flex-1 bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-2 min-w-[60px]">
            <span className="block text-lg font-extrabold text-white font-mono leading-none">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mt-1 block">Giờ</span>
          </div>

          {/* Minutes */}
          <div className="flex-1 bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-2 min-w-[60px]">
            <span className="block text-lg font-extrabold text-white font-mono leading-none">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mt-1 block">Phút</span>
          </div>

          {/* Seconds */}
          <div className="flex-1 bg-zinc-800/40 border border-zinc-850 rounded-xl p-2 min-w-[60px] border-primary/20 bg-primary/5">
            <span className="block text-lg font-extrabold text-primary font-mono leading-none">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-primary/60 font-bold mt-1 block">Giây</span>
          </div>
        </div>
      )}

      {status === 'ongoing' && (
        <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-bold">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Buổi học đang diễn ra trực tuyến! Vào lớp học ngay.</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-2 p-3 bg-zinc-800/30 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>Buổi học Live đã kết thúc. Bạn có thể xem lại video ghi lại ở tab Nội dung.</span>
        </div>
      )}
    </div>
  );
};
