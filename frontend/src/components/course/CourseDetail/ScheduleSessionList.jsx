import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { Calendar, Video, MapPin, CheckCircle, ExternalLink, Navigation } from 'lucide-react';
import { getCourseSchedule } from '@/apis/courseApi';

export const ScheduleSessionList = ({ courseId, delivery_type }) => {
  const [sessions, setSessions] = useState([]);
  const [scheduleLocation, setScheduleLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await getCourseSchedule(courseId);
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : null;

        if (raw && raw.length > 0) {
          // raw is array of sessions — extract venue from first session
          const firstSession = raw[0];
          setScheduleLocation(firstSession.location || null);
          setSessions(raw);
        } else {
          setSessions([]);
        }
      } catch (err) {
        console.warn('API error:', err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [courseId, delivery_type]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-1/3 rounded bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const upcomingSessions = sessions.filter(s => s.status !== 'completed');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const isOffline = delivery_type === 'offline';

  return (
    <div className="space-y-6">
      {/* Sessions Summary Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
          Lịch trình học tập ({sessions.length} buổi)
        </h3>
        <Badge variant="secondary" className="text-[10.5px] px-2.5 py-0.5 rounded-full font-medium">
          {isOffline ? 'Học tại lớp' : 'Học trực tuyến'}
        </Badge>
      </div>

      {/* Upcoming Sessions List */}
      <div className="space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Buổi học sắp diễn ra</span>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session, idx) => (
              <SessionItem key={session._id || idx} session={session} isOffline={isOffline} scheduleLocation={scheduleLocation} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic py-2">
            Không có buổi học nào sắp tới.
          </p>
        )}
      </div>

      {/* Completed Sessions List */}
      {completedSessions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Buổi học đã hoàn thành</span>
          <div className="space-y-3 opacity-60">
            {completedSessions.map((session, idx) => (
              <SessionItem key={session._id || idx} session={session} isOffline={isOffline} scheduleLocation={scheduleLocation} />
            ))}
          </div>
        </div>
      )}

      {/* Offline Venue Map Card */}
      {isOffline && (
        <div className="group p-1.5 rounded-[20px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/80 transition-all duration-300 mt-6">
          <Card className="rounded-[14px] bg-white dark:bg-zinc-950 p-5 border border-zinc-100 dark:border-zinc-900 shadow-sm space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Địa điểm học tập</span>
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" strokeWidth={1.5} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                  {scheduleLocation?.address || 'Phòng học chuyên đề, Tầng 3, Tòa nhà A'}
                </p>
                {scheduleLocation?.link && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                    {scheduleLocation.link}
                  </p>
                )}
              </div>
            </div>
            
            {/* Interactive maps button */}
            {scheduleLocation?.address && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="text-xs gap-1.5 px-3 py-1.5 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(scheduleLocation.address)}`, '_blank')}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Xem chỉ đường trên bản đồ
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

// Sub-Component for individual Session Item
const SessionItem = ({ session, isOffline, scheduleLocation }) => {
  const {
    sessionNumber,
    title,
    date,
    startTime,
    endTime,
    location,
    instructorName = 'Trần Thị B',
    status,
  } = session;

  const isCompleted = status === 'completed';

  // Resolve effective location: session override > schedule default
  const effectiveLocation = location || scheduleLocation;
  const locationText = typeof effectiveLocation === 'string'
    ? effectiveLocation
    : effectiveLocation?.address || effectiveLocation?.link || null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-850 bg-white dark:bg-zinc-950 gap-4 shadow-sm">
      <div className="flex gap-3.5 min-w-0">
        {/* Date visual box */}
        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${
          isCompleted 
            ? 'bg-zinc-100 text-zinc-550 dark:bg-zinc-900 dark:text-zinc-500' 
            : 'bg-primary/5 text-primary border border-primary/10'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
            {new Date(date).toLocaleDateString('vi-VN', { month: 'short' })}
          </span>
          <span className="text-lg font-extrabold font-mono mt-0.5 leading-none">
            {new Date(date).getDate()}
          </span>
        </div>

        {/* Title details */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Buổi {sessionNumber}
            </span>
            <span className="text-[10px] text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-[11px] font-mono text-zinc-500">
              {startTime} - {endTime}
            </span>
          </div>
          <h5 className="text-sm font-semibold text-zinc-850 dark:text-zinc-200 truncate leading-snug">
            {title}
          </h5>
          <p className="text-xs text-zinc-450 mt-1 leading-none">
            Giảng viên: <span className="font-semibold text-zinc-600 dark:text-zinc-400">{instructorName}</span>
          </p>
        </div>
      </div>

      {/* Meet Link / Map Pin Trigger */}
      <div className="shrink-0 w-full sm:w-auto flex justify-end">
        {isCompleted ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full flex items-center gap-1 px-2.5 py-0.5 font-medium text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã tham gia
          </Badge>
        ) : (
          <Button
            variant="outline"
            className="text-xs gap-1.5 px-3 py-1.5 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950 font-semibold"
            onClick={() => {
              const defaultUrl = isOffline ? 'https://maps.google.com' : 'https://meet.google.com';
              if (typeof effectiveLocation === 'string' && effectiveLocation) {
                window.open(effectiveLocation, '_blank');
              } else if (effectiveLocation?.link) {
                window.open(effectiveLocation.link, '_blank');
              } else if (effectiveLocation?.address) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveLocation.address)}`, '_blank');
              } else {
                window.open(defaultUrl, '_blank');
              }
            }}
          >
            {isOffline ? <MapPin className="w-3.5 h-3.5 text-zinc-500" /> : <Video className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{isOffline ? 'Phòng học' : 'Vào lớp Live'}</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Mock sessions helper
const getMockSessions = (delivery_type) => {
  const isOffline = delivery_type === 'offline';
  
  return [
    {
      _id: 'sess-1',
      sessionNumber: 1,
      title: 'Khai giảng, làm quen & Hướng dẫn kích hoạt tài khoản phần mềm',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      startTime: '09:00',
      endTime: '11:30',
      location: isOffline ? 'Phòng học chuyên đề, Tầng 3, Tòa nhà A' : 'https://meet.google.com/abc-defg-hij',
      instructorName: 'Trần Thị B',
      status: 'upcoming',
    },
    {
      _id: 'sess-2',
      sessionNumber: 2,
      title: 'Kỹ năng số căn bản & Thiết lập các công cụ văn phòng hiện đại',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      startTime: '09:00',
      endTime: '12:00',
      location: isOffline ? 'Phòng học chuyên đề, Tầng 3, Tòa nhà A' : 'https://meet.google.com/abc-defg-hij',
      instructorName: 'Trần Thị B',
      status: 'upcoming',
    },
    {
      _id: 'sess-3',
      sessionNumber: 3,
      title: 'Kỹ năng tìm kiếm, đánh giá và khai thác thông tin trên Internet an toàn',
      date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(), // 17 days from now
      startTime: '09:00',
      endTime: '12:00',
      location: isOffline ? 'Phòng học chuyên đề, Tầng 3, Tòa nhà A' : 'https://meet.google.com/abc-defg-hij',
      instructorName: 'Trần Thị B',
      status: 'upcoming',
    },
    {
      _id: 'sess-0',
      sessionNumber: 0,
      title: 'Định hướng lộ trình học tập & Kiểm tra kiến thức đầu vào',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      startTime: '19:30',
      endTime: '21:00',
      location: isOffline ? 'Phòng học chuyên đề, Tầng 3, Tòa nhà A' : 'https://meet.google.com/abc-defg-hij',
      instructorName: 'Trần Thị B',
      status: 'completed',
    },
  ];
};
