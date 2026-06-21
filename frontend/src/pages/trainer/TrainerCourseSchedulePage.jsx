import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Calendar, 
  Plus, 
  Play, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  Edit, 
  AlertTriangle,
  ArrowRight,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Label, 
  Textarea, 
  Card, 
  CardContent, 
  Badge 
} from '@/components/ui';
import { getAdminCourseSchedule,
  createSchedule,
  publishSchedule,
  addScheduleSession,
  updateScheduleSession,
  cancelScheduleSession,
  rescheduleSession,
  markSessionComplete,
  autoGenerateSchedule,
  updateCourse
} from '@/apis/trainerApi';
import { getCourseById } from '@/apis/courseApi';
import toast from 'react-hot-toast';

const TrainerCourseSchedulePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasNoSchedule, setHasNoSchedule] = useState(false);

  // Modals state
  const [showInitModal, setShowInitModal] = useState(false);
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [autoGenForm, setAutoGenForm] = useState({
    startDate: '',
    sessionsPerWeek: 1,
    preferredDays: [],
    startTime: '18:00',
    endTime: '20:00'
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Active session for edit/cancel
  const [activeSession, setActiveSession] = useState(null);

  // Form states
  const [initForm, setInitForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    locationType: 'online',
    locationAddress: '',
    locationLink: ''
  });

  const [sessionForm, setSessionForm] = useState({
    sessionNumber: 1,
    title: '',
    date: '',
    startTime: '08:00',
    endTime: '10:00',
    topic: '',
    locationType: 'online',
    locationAddress: '',
    locationLink: ''
  });

  const [cancelReason, setCancelReason] = useState('');

  // Reschedule & Complete modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: '', newStartTime: '08:00', newEndTime: '10:00', reason: '' });
  const [completeForm, setCompleteForm] = useState({ notes: '' });

  // Fetch course and schedule
  const fetchData = useCallback(async () => {
    setLoading(true);
    setHasNoSchedule(false);
      try {
        const courseRes = await getCourseById(id);
        setCourse(courseRes.data?.data || null);

        try {
          const scheduleRes = await getAdminCourseSchedule(id);
          const schedData = scheduleRes.data?.data;
          if (!schedData) {
            setHasNoSchedule(true);
          } else {
            setSchedule(schedData);
          }
        } catch (scheduleErr) {
          if (scheduleErr.response?.status === 404) {
            setHasNoSchedule(true);
          } else {
            throw scheduleErr;
          }
        }
      } catch (err) {
      console.error('Error fetching schedule page details:', err);
      toast.error('Không thể tải thông tin lịch học.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepopulate init form when course is loaded
  useEffect(() => {
    if (course) {
      setInitForm({
        title: `Lịch học - ${course.title}`,
        startDate: '',
        endDate: '',
        locationType: course.location?.type || 'online',
        locationAddress: course.location?.address || '',
        locationLink: course.location?.link || ''
      });
    }
  }, [course]);

  // Helper: Calculate duration in minutes
  const calculateDuration = (start, end) => {
    if (!start || !end) return 60;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const diffMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return diffMinutes > 0 ? diffMinutes : 60;
  };

  // Helper: Format date
  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    return new Date(dateVal).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // 1. Initialize Schedule
  const handleInitSchedule = async () => {
    if (!initForm.startDate || !initForm.endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và ngày kết thúc');
      return;
    }
    try {
      const payload = {
        courseId: id,
        title: initForm.title,
        startDate: new Date(initForm.startDate).getTime(),
        endDate: new Date(initForm.endDate).getTime(),
        location: {
          type: initForm.locationType,
          address: initForm.locationAddress,
          link: initForm.locationLink
        },
        sessions: []
      };
      await createSchedule(payload);
      toast.success('Khởi tạo lịch học thành công!');
      setShowInitModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating schedule:', err);
      toast.error(err.response?.data?.message || 'Không thể tạo lịch học.');
    }
  };

  const WEEKDAYS = [
    { value: 'Monday', label: 'Thứ 2' },
    { value: 'Tuesday', label: 'Thứ 3' },
    { value: 'Wednesday', label: 'Thứ 4' },
    { value: 'Thursday', label: 'Thứ 5' },
    { value: 'Friday', label: 'Thứ 6' },
    { value: 'Saturday', label: 'Thứ 7' },
    { value: 'Sunday', label: 'Chủ nhật' }
  ];

  const handleOpenAutoGenerateModal = () => {
    const config = course?.scheduleConfig;
    let startDate = '';
    if (config?.expectedStartDate) {
      startDate = new Date(config.expectedStartDate).toISOString().split('T')[0];
    }
    
    let startTime = '18:00';
    let endTime = '20:00';
    if (config?.preferredTime && config.preferredTime.includes(' - ')) {
       const parts = config.preferredTime.split(' - ');
       startTime = parts[0];
       endTime = parts[1];
    }

    setAutoGenForm({
      startDate,
      sessionsPerWeek: config?.sessionsPerWeek || 1,
      preferredDays: config?.preferredDays || [],
      startTime,
      endTime
    });
    setShowAutoGenerateModal(true);
  };

  const submitAutoGenerate = async () => {
    if (!autoGenForm.startDate || !autoGenForm.preferredDays.length || !autoGenForm.startTime || !autoGenForm.endTime || !autoGenForm.sessionsPerWeek) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (autoGenForm.preferredDays.length < autoGenForm.sessionsPerWeek) {
      toast.error('Số ngày chọn trong tuần phải lớn hơn hoặc bằng số buổi học một tuần.');
      return;
    }

    const loadingToast = toast.loading('Đang lưu cấu hình và xếp lịch...');
    try {
      const payload = new FormData();
      
      const [startH, startM] = autoGenForm.startTime.split(':').map(Number);
      const [endH, endM] = autoGenForm.endTime.split(':').map(Number);
      const durationMin = (endH * 60 + endM) - (startH * 60 + startM);
      
      payload.append('scheduleConfig', JSON.stringify({
        totalSessions: course?.totalSessions || 0,
        sessionsPerWeek: Number(autoGenForm.sessionsPerWeek),
        sessionDurationMinutes: durationMin > 0 ? durationMin : 60,
        preferredDays: autoGenForm.preferredDays,
        preferredTime: autoGenForm.startTime + ' - ' + autoGenForm.endTime,
        expectedStartDate: new Date(autoGenForm.startDate).getTime()
      }));

      await updateCourse(id, payload);
      await autoGenerateSchedule(id);
      
      toast.success('Tự động xếp lịch thành công!', { id: loadingToast });
      setShowAutoGenerateModal(false);
      fetchData();
    } catch (err) {
      console.error('Error auto-generating schedule:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.', { id: loadingToast });
    }
  };

  // 2. Publish Schedule
  const handlePublishSchedule = async () => {
    if (!schedule) return;
    if (schedule.sessions.length === 0) {
      toast.error('Lịch học phải có ít nhất 1 buổi học trước khi công bố!');
      return;
    }
    try {
      await publishSchedule(schedule._id);
      toast.success('Công bố lịch học thành công!');
      fetchData();
    } catch (err) {
      console.error('Error publishing schedule:', err);
      toast.error(err.response?.data?.message || 'Không thể công bố lịch học.');
    }
  };

  // 3. Add Session
  const handleAddSession = async () => {
    if (!sessionForm.title || !sessionForm.date) {
      toast.error('Vui lòng nhập tiêu đề và chọn ngày học');
      return;
    }
    try {
      const duration = calculateDuration(sessionForm.startTime, sessionForm.endTime);
      const payload = {
        sessionNumber: Number(sessionForm.sessionNumber),
        title: sessionForm.title,
        date: new Date(sessionForm.date).getTime(),
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
        duration,
        topic: sessionForm.topic,
        location: {
          type: sessionForm.locationType,
          address: sessionForm.locationAddress,
          link: sessionForm.locationLink
        }
      };

      await addScheduleSession(schedule._id, payload);
      toast.success('Thêm buổi học thành công!');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      console.error('Error adding session:', err);
      toast.error(err.response?.data?.message || 'Không thể thêm buổi học.');
    }
  };

  // 4. Edit Session
  const handleEditSession = async () => {
    if (!sessionForm.title || !sessionForm.date) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và ngày học');
      return;
    }
    try {
      const duration = calculateDuration(sessionForm.startTime, sessionForm.endTime);
      const payload = {
        title: sessionForm.title,
        date: new Date(sessionForm.date).getTime(),
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
        duration,
        topic: sessionForm.topic,
        location: {
          type: sessionForm.locationType,
          address: sessionForm.locationAddress,
          link: sessionForm.locationLink
        }
      };

      await updateScheduleSession(schedule._id, activeSession.sessionNumber, payload);
      toast.success('Cập nhật buổi học thành công!');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error('Error editing session:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật buổi học.');
    }
  };

  // 5. Cancel Session
  const handleCancelSession = async () => {
    try {
      await cancelScheduleSession(schedule._id, activeSession.sessionNumber, {
        reason: cancelReason
      });
      toast.success(`Đã hủy buổi học số ${activeSession.sessionNumber}!`);
      setShowCancelModal(false);
      fetchData();
    } catch (err) {
      console.error('Error cancelling session:', err);
      toast.error(err.response?.data?.message || 'Không thể hủy buổi học.');
    }
  };

  // Pre-fill Add Session Form
  const openAddModal = () => {
    const nextNumber = schedule?.sessions ? schedule.sessions.length + 1 : 1;
    setSessionForm({
      sessionNumber: nextNumber,
      title: `Buổi học ${nextNumber}`,
      date: '',
      startTime: '08:00',
      endTime: '10:00',
      topic: '',
      locationType: schedule?.location?.type || 'online',
      locationAddress: schedule?.location?.address || '',
      locationLink: schedule?.location?.link || ''
    });
    setShowAddModal(true);
  };

  // Pre-fill Edit Session Form
  const openEditModal = (sess) => {
    setActiveSession(sess);
    let dateStr = '';
    if (sess.date) {
      dateStr = new Date(sess.date).toISOString().split('T')[0];
    }
    setSessionForm({
      sessionNumber: sess.sessionNumber,
      title: sess.title,
      date: dateStr,
      startTime: sess.startTime || '08:00',
      endTime: sess.endTime || '10:00',
      topic: sess.topic || '',
      locationType: sess.location?.type || 'online',
      locationAddress: sess.location?.address || '',
      locationLink: sess.location?.link || ''
    });
    setShowEditModal(true);
  };

  const openCancelModal = (sess) => {
    setActiveSession(sess);
    setCancelReason('');
    setShowCancelModal(true);
  };

  // 6. Reschedule Session
  const handleRescheduleSession = async () => {
    if (!rescheduleForm.newDate || !rescheduleForm.newStartTime || !rescheduleForm.newEndTime) {
      toast.error('Vui lòng nhập đầy đủ ngày và giờ mới.');
      return;
    }
    try {
      await rescheduleSession(schedule._id, activeSession.sessionNumber, {
        newDate: new Date(rescheduleForm.newDate).getTime(),
        newStartTime: rescheduleForm.newStartTime,
        newEndTime: rescheduleForm.newEndTime,
        reason: rescheduleForm.reason
      });
      toast.success('Đổi lịch thành công!');
      setShowRescheduleModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đổi lịch.');
    }
  };

  // 7. Mark Session Complete
  const handleMarkComplete = async () => {
    try {
      await markSessionComplete(schedule._id, activeSession.sessionNumber, {
        notes: completeForm.notes
      });
      toast.success('Đã đánh dấu hoàn thành buổi học!');
      setShowCompleteModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đánh dấu hoàn thành.');
    }
  };

  const openRescheduleModal = (sess) => {
    setActiveSession(sess);
    let dateStr = '';
    if (sess.date) dateStr = new Date(sess.date).toISOString().split('T')[0];
    setRescheduleForm({ newDate: dateStr, newStartTime: sess.startTime || '08:00', newEndTime: sess.endTime || '10:00', reason: '' });
    setShowRescheduleModal(true);
  };

  const openCompleteModal = (sess) => {
    setActiveSession(sess);
    setCompleteForm({ notes: '' });
    setShowCompleteModal(true);
  };

  const getDynamicSessionStatus = (session) => {
    if (!session) return 'scheduled';
    if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'rescheduled') {
      return session.status;
    }
    if (!session.date || !session.startTime || !session.endTime) return session.status || 'scheduled';

    const now = new Date();
    const sessionDate = new Date(session.date);
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const [endHour, endMin] = session.endTime.split(':').map(Number);
    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    if (now > endDateTime) return 'overdue';
    if (now >= startDateTime && now <= endDateTime) return 'in_progress';
    return 'scheduled';
  };

  // Status mapping for sessions
  const getSessionBadge = (session) => {
    const status = getDynamicSessionStatus(session);
    const statusMap = {
      scheduled: { text: 'Chờ diễn ra', className: 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/20 border' },
      completed: { text: 'Đã hoàn thành', className: 'bg-[hsl(var(--admin-success-subtle))] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success))]/20 border' },
      cancelled: { text: 'Đã hủy', className: 'bg-[hsl(var(--admin-danger-subtle))] text-[hsl(var(--admin-danger))] border-[hsl(var(--admin-danger))]/20 border' },
      rescheduled: { text: 'Đổi lịch', className: 'bg-[hsl(var(--admin-warning)_/_10%)] text-[hsl(var(--admin-warning))] border-[hsl(var(--admin-warning))]/20 border' },
      in_progress: { text: 'Đang diễn ra', className: 'bg-purple-500/10 text-purple-500 border border-purple-500/20' },
      overdue: { text: 'Chưa hoàn thành', className: 'bg-orange-500/10 text-orange-500 border border-orange-500/20' }
    };
    const current = statusMap[status] || statusMap.scheduled;
    
    if (status === 'in_progress') {
      return (
        <Badge variant="outline" className={`${current.className} flex items-center gap-1.5`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          {current.text}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={current.className}>
        {current.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/trainer/courses')}
          className="border-[hsl(var(--admin-border))] bg-transparent hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))]"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quay lại khóa học
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-500" />
            Lịch học chi tiết
          </h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-0.5">
            {course ? `Khóa học: ${course.title}` : 'Đang tải thông tin khóa học...'}
          </p>
        </div>
      </div>

      {!loading && course?.status === 'pending' && (
        <div className="p-4 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-600">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong className="block font-bold">Khóa học đang chờ duyệt</strong>
            <p className="mt-1 text-amber-600/90 leading-relaxed">
              Bạn có thể tạo và sắp xếp lịch học bình thường. Lịch học này sẽ chỉ hiển thị với học viên <strong>sau khi khóa học được Quản trị viên phê duyệt</strong>.
              Nếu khóa học bị từ chối duyệt, lịch học có thể cần được điều chỉnh lại cho phù hợp.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-96 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl flex items-center justify-center text-[hsl(var(--admin-text-muted))] animate-pulse">
          Đang tải thông tin lịch học...
        </div>
      ) : hasNoSchedule ? (
        /* Empty State: Create Schedule */
        <div className="border border-dashed border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] rounded-xl p-16 text-center text-[hsl(var(--admin-text-muted))] flex flex-col items-center justify-center space-y-4">
          <Calendar className="h-16 w-16 text-[hsl(var(--admin-text-faint))] animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Khóa học chưa được tạo lịch dạy</h3>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">Khởi tạo lịch để thêm các buổi học và điểm danh học viên.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowInitModal(true)}
              variant="outline"
              className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))] font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Tạo thủ công
            </Button>
            <Button
              onClick={handleOpenAutoGenerateModal}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold border-none"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Tự động xếp lịch
            </Button>
          </div>
        </div>
      ) : (
        /* Schedule details */
        <div className="space-y-6">
          {/* Schedule Info Panel */}
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))] pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{schedule.title}</h2>
                    <Badge variant="outline" className={
                      schedule.status === 'published' 
                        ? 'bg-[hsl(var(--admin-success-subtle))] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success))]/20 border' 
                        : 'bg-[hsl(var(--admin-text-muted)_/_10%)] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-text-muted))]/20 border'
                    }>
                      {schedule.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
                    </Badge>
                  </div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-1">
                    Thời gian: {new Date(schedule.startDate).toLocaleDateString('vi-VN')} - {new Date(schedule.endDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => navigate(`/trainer/courses/${id}/attendance`)}
                    className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none font-semibold flex items-center gap-1.5"
                  >
                    <BookOpen className="h-4 w-4" />
                    Lịch sử điểm danh
                  </Button>
                </div>
              </div>

              {/* Schedule Stats & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[hsl(var(--admin-text-secondary))]">
                <div className="space-y-2">
                  <div className="text-[hsl(var(--admin-text-muted))] text-xs font-semibold uppercase">Tổng số buổi</div>
                  <div className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">
                    {schedule.completedSessions} / {schedule.totalSessions} hoàn thành
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-[hsl(var(--admin-text-muted))] text-xs font-semibold uppercase">Hình thức học</div>
                  <div className="flex items-center gap-1.5 text-[hsl(var(--admin-text-primary))] font-medium capitalize">
                    <MapPin className="h-4 w-4 text-[hsl(var(--admin-accent))]" />
                    {schedule.location?.type === 'online' ? 'Trực tuyến (Online)' : 'Trực tiếp (Offline)'}
                  </div>
                </div>

                {schedule.location?.address && (
                  <div className="space-y-2">
                    <div className="text-[hsl(var(--admin-text-muted))] text-xs font-semibold uppercase">Địa chỉ</div>
                    <div className="text-[hsl(var(--admin-text-primary))] font-medium truncate max-w-xs" title={schedule.location.address}>
                      {schedule.location.address}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline of Sessions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--admin-accent))]" />
              Lịch trình các buổi học ({schedule.sessions?.length || 0})
            </h3>
            
            {(!schedule.sessions || schedule.sessions.length === 0) ? (
              <div className="border border-dashed border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] rounded-xl p-12 text-center text-[hsl(var(--admin-text-muted))]">
                Chưa có buổi học nào được lên lịch. Hãy nhấn "Thêm buổi học" để bắt đầu.
              </div>
            ) : (
              <div className="relative border-l border-[hsl(var(--admin-border))] ml-4 pl-6 space-y-6">
                {schedule.sessions
                  .slice()
                  .sort((a, b) => a.sessionNumber - b.sessionNumber)
                  .map((sess) => {
                    const sessionStatus = getDynamicSessionStatus(sess);
                    const isActionDisabled = sessionStatus === 'in_progress' || sessionStatus === 'overdue' || sessionStatus === 'completed' || (sess.attendance && sess.attendance.length > 0);
                    
                    return (
                    <div key={sess.sessionNumber} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[hsl(var(--admin-surface))] ${
                        sess.status === 'completed' ? 'bg-[hsl(var(--admin-success))]' : sess.status === 'cancelled' ? 'bg-[hsl(var(--admin-danger))]' : 'bg-[hsl(var(--admin-accent))]'
                      }`} />

                      {/* Session Card */}
                      <Card className={`bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] ${sess.status === 'cancelled' ? 'opacity-60 border-dashed' : ''}`}>
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-subtle))] px-2 py-0.5 rounded">
                                Buổi {sess.sessionNumber}
                              </span>
                              <h4 className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">{sess.title}</h4>
                              {getSessionBadge(sess)}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[hsl(var(--admin-text-muted))]">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-[hsl(var(--admin-text-muted))]" />
                                <span>{formatDate(sess.date)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-[hsl(var(--admin-text-muted))]" />
                                <span>{sess.startTime} - {sess.endTime} ({sess.duration} phút)</span>
                              </div>
                            </div>
                            
                            {sess.topic && (
                              <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                                <strong>Chủ đề:</strong> {sess.topic}
                              </p>
                            )}

                            {sess.notes && (
                              <p className="text-xs text-[hsl(var(--admin-danger))] bg-[hsl(var(--admin-danger-subtle))] p-2 rounded border border-[hsl(var(--admin-danger))]/10 max-w-lg">
                                <strong>Ghi chú:</strong> {sess.notes}
                              </p>
                            )}
                          </div>

                          {/* Session actions */}
                          {sess.status !== 'cancelled' && (
                            <div className="flex items-center gap-1.5 self-end md:self-auto">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionDisabled}
                                  onClick={() => openEditModal(sess)}
                                  className={`flex items-center gap-1 ${isActionDisabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'}`}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  Sửa
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionDisabled}
                                  onClick={() => openCancelModal(sess)}
                                  className={`flex items-center gap-1 ${isActionDisabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300'}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Hủy buổi
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionDisabled}
                                  onClick={() => openRescheduleModal(sess)}
                                  className={`flex items-center gap-1 ${isActionDisabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400' : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300'}`}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Đổi lịch
                                </Button>


                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )})}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. INITIALIZE SCHEDULE MODAL */}
      {showInitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Khởi tạo lịch học</h3>
              <p className="text-[hsl(var(--admin-text-muted))] text-xs">Tạo tài liệu khung lịch học ban đầu cho khóa học.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Tiêu đề lịch học</Label>
                <Input
                  value={initForm.title}
                  onChange={(e) => setInitForm({ ...initForm, title: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Ngày bắt đầu</Label>
                  <Input
                    type="date"
                    value={initForm.startDate}
                    onChange={(e) => setInitForm({ ...initForm, startDate: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Ngày kết thúc</Label>
                  <Input
                    type="date"
                    value={initForm.endDate}
                    onChange={(e) => setInitForm({ ...initForm, endDate: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Hình thức học</Label>
                <select
                  value={initForm.locationType}
                  onChange={(e) => setInitForm({ ...initForm, locationType: e.target.value })}
                  className="w-full rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none"
                >
                  <option value="online">Trực tuyến (Online)</option>
                  <option value="offline">Trực tiếp (Offline)</option>
                  <option value="hybrid">Học kết hợp (Hybrid)</option>
                </select>
              </div>

              {initForm.locationType !== 'online' && (
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Địa chỉ trung tâm</Label>
                  <Input
                    placeholder="Nhập địa chỉ"
                    value={initForm.locationAddress}
                    onChange={(e) => setInitForm({ ...initForm, locationAddress: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              )}
              {initForm.locationType !== 'offline' && (
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Link phòng học (Meet, Zoom...)</Label>
                  <Input
                    placeholder="https://meet.google.com/..."
                    value={initForm.locationLink}
                    onChange={(e) => setInitForm({ ...initForm, locationLink: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowInitModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleInitSchedule}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none font-semibold"
              >
                Khởi tạo lịch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO GENERATE MODAL */}
      {showAutoGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Tự động xếp lịch</h3>
              <p className="text-[hsl(var(--admin-text-muted))] text-xs">Cấu hình các tham số để tự động sinh lịch học.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Tổng số buổi học</Label>
                <Input
                  value={course?.totalSessions || 0}
                  disabled
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Ngày khai giảng dự kiến</Label>
                <Input
                  type="date"
                  value={autoGenForm.startDate}
                  onChange={(e) => setAutoGenForm({ ...autoGenForm, startDate: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Số buổi học trong tuần</Label>
                <Input
                  type="number"
                  min="1"
                  max={Math.min(course?.totalSessions || 7, 7)}
                  value={autoGenForm.sessionsPerWeek}
                  onChange={(e) => setAutoGenForm({ ...autoGenForm, sessionsPerWeek: Number(e.target.value) })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Các ngày học trong tuần</Label>
                <div className="grid grid-cols-3 gap-2">
                  {WEEKDAYS.map(day => (
                    <label key={day.value} className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-primary))]">
                      <input
                        type="checkbox"
                        checked={autoGenForm.preferredDays.includes(day.value)}
                        onChange={(e) => {
                          const newDays = e.target.checked 
                            ? [...autoGenForm.preferredDays, day.value] 
                            : autoGenForm.preferredDays.filter(d => d !== day.value);
                          setAutoGenForm({ ...autoGenForm, preferredDays: newDays });
                        }}
                        className="rounded border-[hsl(var(--admin-border))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))]"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={autoGenForm.startTime}
                    onChange={(e) => setAutoGenForm({ ...autoGenForm, startTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={autoGenForm.endTime}
                    onChange={(e) => setAutoGenForm({ ...autoGenForm, endTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAutoGenerateModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Hủy
              </Button>
              <Button
                onClick={submitAutoGenerate}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none font-semibold"
              >
                Xác nhận & Tự động tạo lịch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD SESSION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Thêm buổi học mới</h3>
              <p className="text-[hsl(var(--admin-text-muted))] text-xs">Cấu hình thời gian và tiêu đề cho buổi học mới.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Buổi số</Label>
                  <Input
                    type="number"
                    min="1"
                    value={sessionForm.sessionNumber}
                    onChange={(e) => setSessionForm({ ...sessionForm, sessionNumber: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Tiêu đề buổi học</Label>
                  <Input
                    placeholder="Ví dụ: Hướng dẫn cài đặt NodeJS"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Ngày học</Label>
                  <Input
                    type="date"
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Hình thức học</Label>
                  <select
                    value={sessionForm.locationType}
                    onChange={(e) => setSessionForm({ ...sessionForm, locationType: e.target.value })}
                    className="w-full rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none"
                  >
                    <option value="online">Trực tuyến (Online)</option>
                    <option value="offline">Trực tiếp (Offline)</option>
                    <option value="hybrid">Học kết hợp (Hybrid)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {sessionForm.locationType !== 'online' && (
                    <>
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Địa chỉ</Label>
                      <Input
                        placeholder="Nhập địa chỉ"
                        value={sessionForm.locationAddress}
                        onChange={(e) => setSessionForm({ ...sessionForm, locationAddress: e.target.value })}
                        className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                      />
                    </>
                  )}
                  {sessionForm.locationType !== 'offline' && (
                    <>
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Link phòng học</Label>
                      <Input
                        placeholder="https://meet.google.com/..."
                        value={sessionForm.locationLink}
                        onChange={(e) => setSessionForm({ ...sessionForm, locationLink: e.target.value })}
                        className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Chủ đề chi tiết</Label>
                <Input
                  placeholder="Nhập chủ đề/nội dung dạy học..."
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleAddSession}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none font-semibold"
              >
                Thêm buổi học
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT SESSION MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Chỉnh sửa buổi học {activeSession?.sessionNumber}</h3>
              <p className="text-[hsl(var(--admin-text-muted))] text-xs">Cập nhật thông tin chi tiết hoặc dời thời gian buổi học.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Tiêu đề buổi học</Label>
                <Input
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Ngày học</Label>
                  <Input
                    type="date"
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Hình thức học</Label>
                  <select
                    value={sessionForm.locationType}
                    onChange={(e) => setSessionForm({ ...sessionForm, locationType: e.target.value })}
                    className="w-full rounded-md border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] px-3 py-2 text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none"
                  >
                    <option value="online">Trực tuyến (Online)</option>
                    <option value="offline">Trực tiếp (Offline)</option>
                    <option value="hybrid">Học kết hợp (Hybrid)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {sessionForm.locationType !== 'online' && (
                    <>
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Địa chỉ</Label>
                      <Input
                        placeholder="Nhập địa chỉ"
                        value={sessionForm.locationAddress}
                        onChange={(e) => setSessionForm({ ...sessionForm, locationAddress: e.target.value })}
                        className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                      />
                    </>
                  )}
                  {sessionForm.locationType !== 'offline' && (
                    <>
                      <Label className="text-[hsl(var(--admin-text-secondary))]">Link phòng học</Label>
                      <Input
                        placeholder="https://meet.google.com/..."
                        value={sessionForm.locationLink}
                        onChange={(e) => setSessionForm({ ...sessionForm, locationLink: e.target.value })}
                        className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Chủ đề chi tiết</Label>
                <Input
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleEditSession}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none font-semibold"
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CANCEL SESSION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-[hsl(var(--admin-danger))] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Hủy buổi học số {activeSession?.sessionNumber}</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-1">
                  Xác nhận hủy buổi học: <strong>{activeSession?.title}</strong>. Học viên sẽ được thông báo.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-[hsl(var(--admin-text-secondary))]">Lý do hủy buổi học</Label>
              <Textarea
                id="cancelReason"
                placeholder="Ví dụ: Giảng viên bận công tác đột xuất, dời lịch sang tuần sau..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-danger))]"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Quay lại
              </Button>
              <Button
                onClick={handleCancelSession}
                className="bg-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger))] text-white border-none font-semibold"
              >
                Hủy buổi học
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RESCHEDULE SESSION MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div className="flex items-start gap-3">
              <Calendar className="h-6 w-6 text-[hsl(var(--admin-accent))] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Đổi lịch buổi số {activeSession?.sessionNumber}</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-1">
                  Cập nhật thời gian mới cho buổi học: <strong>{activeSession?.title}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Ngày mới</Label>
                <Input
                  type="date"
                  value={rescheduleForm.newDate}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={rescheduleForm.newStartTime}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, newStartTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(var(--admin-text-secondary))]">Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={rescheduleForm.newEndTime}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, newEndTime: e.target.value })}
                    className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(var(--admin-text-secondary))]">Lý do đổi lịch</Label>
                <Textarea
                  placeholder="Ví dụ: Trùng lịch học, nghỉ lễ..."
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                  className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-accent))]"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleRescheduleSession}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none font-semibold"
              >
                Xác nhận đổi lịch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MARK COMPLETE MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-6 space-y-6 shadow-[var(--admin-shadow-lg)]">
            <div className="flex items-start gap-3">
              <Check className="h-6 w-6 text-[hsl(var(--admin-success))] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Hoàn thành buổi số {activeSession?.sessionNumber}</h3>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-1">
                  Đánh dấu buổi học <strong>{activeSession?.title}</strong> đã hoàn thành.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(var(--admin-text-secondary))]">Ghi chú buổi học (tùy chọn)</Label>
              <Textarea
                placeholder="Nhập ghi chú về buổi học, nội dung đã giảng dạy..."
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] focus:border-[hsl(var(--admin-success))]"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleMarkComplete}
                className="bg-[hsl(var(--admin-success))] hover:bg-[hsl(var(--admin-success))] text-white border-none font-semibold"
              >
                Hoàn thành
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerCourseSchedulePage;
