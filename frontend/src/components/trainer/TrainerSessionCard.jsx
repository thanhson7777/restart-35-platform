import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  BookOpen, 
  ExternalLink, 
  FileText, 
  Info,
  ChevronRight,
  AlertTriangle,
  Globe,
  Play,
  CheckCircle
} from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

export const TrainerSessionCard = ({ 
  selectedSession = null, 
  allSchedules = [],
  onTakeAttendance, 
  onSessionSelect,
  onCompleteSession
}) => {
  const navigate = useNavigate();
  const [hasStartedSession, setHasStartedSession] = useState(false);

  useEffect(() => {
    setHasStartedSession(false);
  }, [selectedSession?.scheduleId, selectedSession?.session?.sessionNumber]);

  // Format date to local Vietnamese
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Check if timestamp is today
  const isToday = (timestamp) => {
    const sessionDate = new Date(timestamp);
    const today = new Date();
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  };

  // Get today's sessions from all schedules
  const getTodaySessions = () => {
    const list = [];
    allSchedules.forEach((schedule) => {
      if (schedule.sessions && schedule.sessions.length > 0) {
        schedule.sessions.forEach((sess) => {
          if (isToday(sess.date)) {
            list.push({
              scheduleId: schedule._id,
              sessionNumber: sess.sessionNumber,
              courseId: schedule.courseId,
              courseTitle: schedule.course?.title || schedule.title || 'Khóa học',
              courseStatus: schedule.course?.status,
              session: sess
            });
          }
        });
      }
    });
    return list.sort((a, b) => a.session.startTime.localeCompare(b.session.startTime));
  };

  const todaySessions = getTodaySessions();

  const getDynamicStatus = (session) => {
    if (!session) return 'scheduled';
    if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'rescheduled') {
      return session.status;
    }

    if (!session.date || !session.startTime || !session.endTime) {
      return session.status || 'scheduled';
    }

    const now = new Date();
    const sessionDate = new Date(session.date);
    
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const [endHour, endMin] = session.endTime.split(':').map(Number);
    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    if (now > endDateTime) {
      return 'overdue';
    } else if (now >= startDateTime && now <= endDateTime) {
      return 'in_progress';
    }
    return 'scheduled';
  };

  // Status mappings
  const getStatusBadge = (session) => {
    const status = getDynamicStatus(session);
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">Đã hoàn thành</Badge>;
      case 'cancelled':
        return <Badge className="bg-[hsl(var(--admin-danger-subtle))] text-[hsl(var(--admin-danger))] border border-[hsl(var(--admin-danger))]/20 font-medium">Đã hủy</Badge>;
      case 'in_progress':
        return <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 font-medium flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span></span>Đang diễn ra</Badge>;
      case 'overdue':
        return <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium">Chưa hoàn thành</Badge>;
      case 'rescheduled':
        return <Badge className="bg-amber-500/10 text-[hsl(var(--admin-warning))] border border-amber-500/20 font-medium">Đổi lịch</Badge>;
      case 'scheduled':
      default:
        return <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">Chờ diễn ra</Badge>;
    }
  };

  // Render when no session is selected
  if (!selectedSession) {
    return (
      <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] shadow-[var(--admin-shadow-lg)] h-full flex flex-col justify-between min-h-[400px]">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--admin-border))] pb-4 mb-4">
            <BookOpen className="h-5 w-5 text-purple-500" />
            <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-base">Buổi học trong ngày</h3>
          </div>

          {todaySessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-[hsl(var(--admin-text-muted))] space-y-3">
              <Calendar className="h-12 w-12 text-[hsl(var(--admin-text-faint))] animate-pulse" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[hsl(var(--admin-text-muted))]">Không có buổi dạy nào hôm nay</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Nhấp chọn sự kiện trên lịch để xem chi tiết hoặc điểm danh.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <p className="text-xs text-[hsl(var(--admin-success))] font-semibold mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Hôm nay bạn có {todaySessions.length} buổi dạy:
              </p>
              {todaySessions.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => onSessionSelect(item)}
                  className="p-3 bg-[hsl(var(--admin-surface-elevated))]/60 hover:bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))] rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-subtle))] px-1.5 py-0.5 rounded">
                        Buổi {item.session.sessionNumber}
                      </span>
                      {getStatusBadge(item.session)}
                      {item.locationType === 'online' && (
                        <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium px-1.5">
                          <Globe className="h-3 w-3 mr-1" /> Online
                        </Badge>
                      )}
                      {item.locationType === 'offline' && (
                        <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium px-1.5">
                          <MapPin className="h-3 w-3 mr-1" /> Offline
                        </Badge>
                      )}
                      {item.session.isConflict && (
                        <Badge className="bg-[hsl(var(--admin-danger-subtle))] text-[hsl(var(--admin-danger))] border border-[hsl(var(--admin-danger))]/20 font-medium px-1.5">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Trùng
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-[hsl(var(--admin-text-primary))] truncate group-hover:text-[hsl(var(--admin-text-primary))] transition-colors">
                      {item.courseTitle}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--admin-text-muted))]">
                      <Clock className="h-3 w-3 text-[hsl(var(--admin-text-muted))]" />
                      <span>{item.session.startTime} - {item.session.endTime}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--admin-text-faint))] group-hover:text-[hsl(var(--admin-text-muted))] transition-colors" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const { session, courseTitle, scheduleId, sessionNumber, locationType, courseId, courseStatus } = selectedSession;
  const isCancelled = session.status === 'cancelled';
  const attendanceCount = session.attendance?.length || 0;
  const presentCount = session.attendance?.filter(a => a.status === 'present').length || 0;
  const dynamicStatus = getDynamicStatus(session);

  let isBeforeStartTime = false;
  if (session && session.date && session.startTime) {
    const now = new Date();
    const sessionDate = new Date(session.date);
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    sessionDate.setHours(startHour, startMin, 0, 0);
    isBeforeStartTime = now < sessionDate;
  }

  return (
    <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] shadow-[var(--admin-shadow-lg)] h-full min-h-[400px]">
      <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
        {courseStatus === 'pending' && (
          <div className="px-3 py-2 -mx-2 -mt-2 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              <strong className="block font-bold">Đang chờ duyệt</strong>
              <span className="opacity-90">Lịch này chưa hiển thị với học viên do khóa học đang ở trạng thái chờ duyệt.</span>
            </div>
          </div>
        )}
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--admin-border))] pb-4">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-mono font-bold text-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-subtle))] px-2 py-0.5 rounded">
                Buổi {sessionNumber}
              </span>
              <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-base truncate mt-1.5" title={session.title}>
                {session.title}
              </h3>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate" title={courseTitle}>
                {courseTitle}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {getStatusBadge(session)}
                {locationType === 'online' && (
                  <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                    <Globe className="h-3.5 w-3.5 mr-1.5" /> Học Online
                  </Badge>
                )}
                {locationType === 'offline' && (
                  <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" /> Học Offline
                  </Badge>
                )}
              </div>
              {session.isConflict && (
                <Badge className="bg-red-100 text-red-600 border border-red-200 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Trùng lịch dạy
                </Badge>
              )}
            </div>
          </div>

          {/* Time & Location details */}
          <div className="space-y-3 text-[hsl(var(--admin-text-secondary))] text-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-lg border border-[hsl(var(--admin-border))]">
                <Calendar className="h-4 w-4 text-[hsl(var(--admin-text-muted))]" />
              </div>
              <span className="text-xs">{formatDate(session.date)}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-lg border border-[hsl(var(--admin-border))]">
                <Clock className="h-4 w-4 text-[hsl(var(--admin-text-muted))]" />
              </div>
              <span className="text-xs">
                {session.startTime} - {session.endTime} ({session.duration} phút)
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-lg border border-[hsl(var(--admin-border))] mt-0.5">
                <MapPin className="h-4 w-4 text-[hsl(var(--admin-text-muted))]" />
              </div>
              <div className="text-xs flex-1 min-w-0">
                <span className="font-semibold block capitalize text-[hsl(var(--admin-text-muted))]">
                  {session.location?.type === 'online' ? 'Trực tuyến (Online)' : 'Trực tiếp (Offline)'}
                </span>
                {session.location?.type === 'online' ? (
                  session.location?.link ? (
                    <a 
                      href={session.location.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[hsl(var(--admin-accent))] hover:underline inline-flex items-center gap-1 truncate max-w-full mt-0.5"
                    >
                      Vào lớp học <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[hsl(var(--admin-text-muted))]">Chưa cung cấp link phòng học</span>
                  )
                ) : (
                  <span className="text-[hsl(var(--admin-text-secondary))] block truncate" title={session.location?.address}>
                    {session.location?.address || 'Chưa cung cấp địa chỉ'}
                  </span>
                )}
              </div>
            </div>

            {/* Attendance Stat */}
            <div className="flex items-center gap-3 border-t border-[hsl(var(--admin-border))] pt-3 mt-1">
              <div className="p-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-lg border border-[hsl(var(--admin-border))]">
                <UserCheck className="h-4 w-4 text-[hsl(var(--admin-success))]" />
              </div>
              <span className="text-xs">
                Điểm danh: <strong className="text-[hsl(var(--admin-text-primary))]">{presentCount}</strong> / {attendanceCount} có mặt
              </span>
            </div>
          </div>

          {/* Topic & Notes */}
          <div className="space-y-3 pt-3 border-t border-[hsl(var(--admin-border))]">
            {session.topic && (
              <div className="space-y-1">
                <span className="text-[10px] text-[hsl(var(--admin-text-muted))] font-semibold uppercase tracking-wider block">Chủ đề bài học</span>
                <p className="text-xs text-[hsl(var(--admin-text-secondary))] leading-relaxed bg-[hsl(var(--admin-surface-elevated))] p-2.5 rounded-lg border border-[hsl(var(--admin-border))]">
                  {session.topic}
                </p>
              </div>
            )}

            {session.notes && (
              <div className="space-y-1">
                <span className="text-[10px] text-[hsl(var(--admin-text-muted))] font-semibold uppercase tracking-wider block">Ghi chú dạy học</span>
                <p className="text-xs text-[hsl(var(--admin-text-secondary))] leading-relaxed bg-[hsl(var(--admin-surface-elevated))] p-2.5 rounded-lg border border-[hsl(var(--admin-border))]">
                  {session.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-[hsl(var(--admin-border))] flex flex-col gap-2">
          {['scheduled', 'in_progress', 'overdue'].includes(dynamicStatus) && (
            <>
              <Button
                onClick={() => {
                  setHasStartedSession(true);
                  if (locationType === 'online') {
                    const link = session.location?.link || 'https://meet.google.com/new';
                    window.open(link, '_blank');
                  } else {
                    toast.success('Lớp học đang diễn ra trực tiếp tại địa điểm đã định.');
                  }
                }}
                disabled={courseStatus === 'pending' || courseStatus === 'draft' || isBeforeStartTime}
                className={`w-full py-2.5 rounded-xl border-none font-bold text-xs flex items-center justify-center gap-2 ${
                  courseStatus === 'pending' || courseStatus === 'draft' || isBeforeStartTime
                    ? 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] cursor-not-allowed'
                    : 'bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))]/90 text-white'
                }`}
              >
                <Play className="h-4 w-4" />
                Bắt đầu học
              </Button>

              <Button
                onClick={() => onCompleteSession && onCompleteSession(selectedSession)}
                disabled={!hasStartedSession || courseStatus === 'pending' || courseStatus === 'draft'}
                className={`w-full py-2.5 rounded-xl border-none font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                  !hasStartedSession || courseStatus === 'pending' || courseStatus === 'draft'
                    ? 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] cursor-not-allowed border border-[hsl(var(--admin-border))]'
                    : 'bg-[hsl(var(--admin-success))] hover:bg-[hsl(var(--admin-success))]/90 text-white' 
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                Đánh dấu hoàn thành
              </Button>
            </>
          )}

          <Button
            onClick={() => onTakeAttendance(selectedSession)}
            disabled={isCancelled || courseStatus === 'pending' || courseStatus === 'draft' || isBeforeStartTime}
            className={`w-full py-2.5 rounded-xl border-none font-bold text-xs flex items-center justify-center gap-2 ${
              isCancelled || courseStatus === 'pending' || courseStatus === 'draft' || isBeforeStartTime
                ? 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] cursor-not-allowed' 
                : 'bg-[hsl(var(--admin-success))] hover:bg-[hsl(var(--admin-success))]/90 text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            {attendanceCount > 0 ? 'Cập nhật điểm danh' : 'Điểm danh học viên'}
          </Button>
          <Button
            onClick={() => navigate(`/trainer/courses/${courseId}/schedule`)}
            variant="outline"
            className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))]"
          >
            <Calendar className="h-4 w-4" />
            Sắp xếp / Sửa lịch học
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
