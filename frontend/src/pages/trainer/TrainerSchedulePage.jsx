import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import { getTrainerSchedules, getTrainerScheduleStats, getMyCourses } from '@/apis/trainerApi';
import { TrainerScheduleCalendar } from '@/components/trainer/TrainerScheduleCalendar';
import { TrainerSessionCard } from '@/components/trainer/TrainerSessionCard';
import { TrainerAttendanceModal } from '@/components/trainer/TrainerAttendanceModal';
import toast from 'react-hot-toast';

const TrainerSchedulePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected course filter
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  
  // Location type filter
  const [selectedLocationType, setSelectedLocationType] = useState('all');
  
  // Selected session for details and attendance modal
  const [selectedSession, setSelectedSession] = useState(null);
  
  // Attendance modal state
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    totalSessions: 0
  });

  // Fetch stats from schedule statistics API
  const fetchStats = useCallback(async () => {
    try {
      const res = await getTrainerScheduleStats();
      if (res.data?.success) {
        const statsData = res.data.data || { total: 0, byStatus: {} };
        
        const draftCount = statsData.byStatus?.draft?.count || 0;
        const publishedCount = statsData.byStatus?.published?.count || 0;
        const inProgressCount = statsData.byStatus?.in_progress?.count || 0;
        
        const totalSessions = Object.values(statsData.byStatus || {}).reduce(
          (acc, curr) => acc + (curr.totalSessions || 0), 
          0
        );

        setStats({
          total: statsData.total || 0,
          active: publishedCount + inProgressCount,
          draft: draftCount,
          totalSessions: totalSessions
        });
      }
    } catch (err) {
      console.error('Error fetching schedule stats:', err);
    }
  }, []);

  // Fetch all schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrainerSchedules({ limit: 1000 });
      setSchedules(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      toast.error('Không thể tải lịch dạy của bạn.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch courses for filtering
  const fetchCourses = useCallback(async () => {
    try {
      const res = await getMyCourses({ limit: 100 });
      setCourses(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching courses list:', err);
    }
  }, []);

  // Initialize data
  const initData = useCallback(async () => {
    await Promise.all([
      fetchSchedules(),
      fetchStats(),
      fetchCourses()
    ]);
  }, [fetchSchedules, fetchStats, fetchCourses]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Handle refresh action
  const handleRefresh = async () => {
    toast.promise(initData(), {
      loading: 'Đang làm mới dữ liệu...',
      success: 'Đã làm mới dữ liệu thành công!',
      error: 'Lỗi khi làm mới dữ liệu.'
    });
  };

  // Filter schedules client-side by course selection
  const getFilteredSchedules = () => {
    let filtered = schedules;
    if (selectedCourseId !== 'all') {
      filtered = filtered.filter(s => s.courseId === selectedCourseId);
    }
    if (selectedLocationType !== 'all') {
      filtered = filtered.filter(s => s.location?.type === selectedLocationType);
    }
    return filtered;
  };

  // Handle attendance modal opening
  const handleOpenAttendance = (sessionInfo) => {
    setSelectedSession(sessionInfo);
    setIsAttendanceModalOpen(true);
  };

  // Callback after successful attendance submission
  const handleAttendanceSaved = async () => {
    try {
      // 1. Refetch schedules list and stats
      const res = await getTrainerSchedules({ limit: 1000 });
      const updatedSchedules = res.data?.data || [];
      setSchedules(updatedSchedules);
      fetchStats();

      // 2. Update the selected session card details automatically
      if (selectedSession) {
        const matchingSchedule = updatedSchedules.find(s => s._id === selectedSession.scheduleId);
        if (matchingSchedule) {
          const matchingSession = matchingSchedule.sessions.find(
            sess => sess.sessionNumber === selectedSession.sessionNumber
          );
          if (matchingSession) {
            setSelectedSession({
              ...selectedSession,
              session: matchingSession
            });
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing post-attendance saving:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-[hsl(var(--admin-accent))]" />
            Lịch dạy của tôi
          </h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
            Quản lý lịch giảng dạy theo tháng, tuần và thực hiện điểm danh học viên chuyên cần.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))] font-semibold self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[hsl(var(--admin-text-muted))] uppercase font-semibold">Tổng số lịch học</p>
              <h3 className="text-2xl font-bold text-[hsl(var(--admin-text-primary))] mt-1">{stats.total}</h3>
            </div>
            <CalendarIcon className="h-8 w-8 text-[hsl(var(--admin-accent))]/20" />
          </CardContent>
        </Card>
        
        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[hsl(var(--admin-text-muted))] uppercase font-semibold">Đang hoạt động</p>
              <h3 className="text-2xl font-bold text-[hsl(var(--admin-success))] mt-1">{stats.active}</h3>
            </div>
            <CheckCircle className="h-8 w-8 text-[hsl(var(--admin-success))]/20" />
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[hsl(var(--admin-text-muted))] uppercase font-semibold font-sans">Tổng số buổi dạy</p>
              <h3 className="text-2xl font-bold text-purple-500 mt-1">{stats.totalSessions}</h3>
            </div>
            <BookOpen className="h-8 w-8 text-purple-500/20" />
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[hsl(var(--admin-text-muted))] uppercase font-semibold">Lịch bản nháp</p>
              <h3 className="text-2xl font-bold text-[hsl(var(--admin-text-muted))] mt-1">{stats.draft}</h3>
            </div>
            <FileText className="h-8 w-8 text-[hsl(var(--admin-text-muted))]/20" />
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace Layout */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-[550px] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl animate-pulse" />
          <div className="lg:col-span-4 h-[550px] bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Calendar Wrapper */}
          <div className="lg:col-span-8">
            <TrainerScheduleCalendar 
              schedules={getFilteredSchedules()} 
              onSessionSelect={setSelectedSession}
            />
          </div>

          {/* Right Side: Filters and details info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Filter Card */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] shadow-[var(--admin-shadow-md)]">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] font-semibold text-xs uppercase tracking-wider">
                  <Filter className="h-4 w-4 text-[hsl(var(--admin-accent))]" />
                  Bộ lọc khóa học
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      setSelectedSession(null); // Reset detail session view on filter change
                    }}
                    className="w-full rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3.5 py-2.5 text-xs text-[hsl(var(--admin-text-primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/50"
                  >
                    <option value="all">Tất cả khóa học</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedLocationType}
                    onChange={(e) => {
                      setSelectedLocationType(e.target.value);
                      setSelectedSession(null);
                    }}
                    className="w-full rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3.5 py-2.5 text-xs text-[hsl(var(--admin-text-primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/50"
                  >
                    <option value="all">Tất cả hình thức</option>
                    <option value="offline">Trực tiếp (Offline)</option>
                    <option value="online">Trực tuyến (Online)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Selected Session Information Card / Today's Sessions List */}
            <TrainerSessionCard 
              selectedSession={selectedSession} 
              allSchedules={getFilteredSchedules()}
              onTakeAttendance={handleOpenAttendance}
              onSessionSelect={setSelectedSession}
            />
          </div>
        </div>
      )}

      {/* Take Attendance Modal */}
      {selectedSession && (
        <TrainerAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          scheduleId={selectedSession.scheduleId}
          sessionNumber={selectedSession.sessionNumber}
          courseId={selectedSession.courseId}
          sessionTitle={selectedSession.session.title}
          courseTitle={selectedSession.courseTitle}
          session={selectedSession.session}
          onAttendanceSaved={handleAttendanceSaved}
        />
      )}
    </div>
  );
};

export default TrainerSchedulePage;
