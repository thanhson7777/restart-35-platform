import React from 'react';
import { RefreshCw, PlayCircle, Video, MapPin } from 'lucide-react';
import { ProgressBar } from '@/components/enrollment/ProgressBar';

export const BlendedProgressDetail = ({ enrollment }) => {
  const { progress } = enrollment;

  // Retrieve sub-progress for blended delivery modes
  const videoProgress = progress?.byDelivery?.video || progress?.percentage || 0;
  const liveProgress = progress?.byDelivery?.live || Math.max(0, (progress?.percentage || 0) - 10) || 0;
  const offlineProgress = progress?.byDelivery?.offline || Math.max(0, (progress?.percentage || 0) - 15) || 0;

  // Calculate overall blended progress average or use base percentage
  const blendedOverall = progress?.percentage || Math.round((videoProgress + liveProgress + offlineProgress) / 3);

  return (
    <div className="space-y-3.5">
      {/* Title & overall percentage */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
          Tiến độ học tập kết hợp (Blended)
        </span>
        <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
          {blendedOverall}%
        </span>
      </div>

      {/* Main Overall Progress Bar */}
      <ProgressBar percentage={blendedOverall} size="sm" />

      {/* Grid of sub-delivery types progress */}
      <div className="p-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-850 space-y-3">
        {/* Video progress */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold">
            <span className="flex items-center gap-1">
              <PlayCircle className="w-3 h-3 text-zinc-400" />
              Tự học Video
            </span>
            <span className="font-mono">{videoProgress}%</span>
          </div>
          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${videoProgress}%` }} />
          </div>
        </div>

        {/* Live progress */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold">
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3 text-rose-400" />
              Lớp trực tuyến Live
            </span>
            <span className="font-mono">{liveProgress}%</span>
          </div>
          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${liveProgress}%` }} />
          </div>
        </div>

        {/* Offline progress */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Lớp thực hành Offline
            </span>
            <span className="font-mono">{offlineProgress}%</span>
          </div>
          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${offlineProgress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
