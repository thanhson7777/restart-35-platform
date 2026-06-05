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
  BookOpen
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
import { 
  getCourseById, 
  getAdminCourseSchedule, 
  createSchedule, 
  publishSchedule,
  addScheduleSession, 
  updateScheduleSession, 
  cancelScheduleSession 
} from '@/apis/courseApi';
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

  // Fetch course and schedule
  const fetchData = useCallback(async () => {
    setLoading(true);
    setHasNoSchedule(false);
    try {
      const courseRes = await getCourseById(id);
      setCourse(courseRes.data?.data || null);

      try {
        const scheduleRes = await getAdminCourseSchedule(id);
        setSchedule(scheduleRes.data || null);
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

  // Status mapping for sessions
  const getSessionBadge = (status) => {
    const statusMap = {
      scheduled: { text: 'Chờ diễn ra', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      completed: { text: 'Đã hoàn thành', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      cancelled: { text: 'Đã hủy', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
      rescheduled: { text: 'Đổi lịch', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
    };
    const current = statusMap[status] || statusMap.scheduled;
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
          className="border-[#1f2937] bg-transparent hover:bg-slate-800 text-gray-300"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quay lại khóa học
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-500" />
            Lịch học chi tiết
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {course ? `Khóa học: ${course.title}` : 'Đang tải thông tin khóa học...'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-[#111827] border border-[#1f2937] rounded-xl flex items-center justify-center text-gray-500 animate-pulse">
          Đang tải thông tin lịch học...
        </div>
      ) : hasNoSchedule ? (
        /* Empty State: Create Schedule */
        <div className="border border-dashed border-[#1f2937] bg-[#111827] rounded-xl p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-4">
          <Calendar className="h-16 w-16 text-gray-600 animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Khóa học chưa được tạo lịch dạy</h3>
            <p className="text-sm text-gray-500">Khởi tạo lịch để thêm các buổi học và điểm danh học viên.</p>
          </div>
          <Button
            onClick={() => setShowInitModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold border-none"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Khởi tạo lịch học
          </Button>
        </div>
      ) : (
        /* Schedule details */
        <div className="space-y-6">
          {/* Schedule Info Panel */}
          <Card className="bg-[#111827] border-[#1f2937]">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2937] pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{schedule.title}</h2>
                    <Badge variant="outline" className={
                      schedule.status === 'published' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }>
                      {schedule.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Thời gian: {new Date(schedule.startDate).toLocaleDateString('vi-VN')} - {new Date(schedule.endDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {schedule.status === 'draft' && (
                    <Button
                      onClick={handlePublishSchedule}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-none font-semibold"
                    >
                      Công bố lịch học
                    </Button>
                  )}
                  <Button
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm buổi học
                  </Button>
                </div>
              </div>

              {/* Schedule Stats & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-300">
                <div className="space-y-2">
                  <div className="text-gray-500 text-xs font-semibold uppercase">Tổng số buổi</div>
                  <div className="text-lg font-bold text-white">
                    {schedule.completedSessions} / {schedule.totalSessions} hoàn thành
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-gray-500 text-xs font-semibold uppercase">Hình thức học</div>
                  <div className="flex items-center gap-1.5 text-white font-medium capitalize">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    {schedule.location?.type === 'online' ? 'Trực tuyến (Online)' : 'Trực tiếp (Offline)'}
                  </div>
                </div>

                {schedule.location?.address && (
                  <div className="space-y-2">
                    <div className="text-gray-500 text-xs font-semibold uppercase">Địa chỉ</div>
                    <div className="text-white font-medium truncate max-w-xs" title={schedule.location.address}>
                      {schedule.location.address}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline of Sessions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Lịch trình các buổi học ({schedule.sessions?.length || 0})
            </h3>
            
            {(!schedule.sessions || schedule.sessions.length === 0) ? (
              <div className="border border-dashed border-[#1f2937] bg-[#111827] rounded-xl p-12 text-center text-gray-500">
                Chưa có buổi học nào được lên lịch. Hãy nhấn "Thêm buổi học" để bắt đầu.
              </div>
            ) : (
              <div className="relative border-l border-[#1f2937] ml-4 pl-6 space-y-6">
                {schedule.sessions
                  .slice()
                  .sort((a, b) => a.sessionNumber - b.sessionNumber)
                  .map((sess) => (
                    <div key={sess.sessionNumber} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[#0b0f19] ${
                        sess.status === 'completed' ? 'bg-emerald-500' : sess.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />

                      {/* Session Card */}
                      <Card className={`bg-[#111827] border-[#1f2937] ${sess.status === 'cancelled' ? 'opacity-60 border-dashed' : ''}`}>
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
                                Buổi {sess.sessionNumber}
                              </span>
                              <h4 className="text-base font-semibold text-white">{sess.title}</h4>
                              {getSessionBadge(sess.status)}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                <span>{formatDate(sess.date)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-gray-500" />
                                <span>{sess.startTime} - {sess.endTime} ({sess.duration} phút)</span>
                              </div>
                            </div>
                            
                            {sess.topic && (
                              <p className="text-xs text-gray-500">
                                <strong>Chủ đề:</strong> {sess.topic}
                              </p>
                            )}

                            {sess.notes && (
                              <p className="text-xs text-red-400 bg-red-950/20 p-2 rounded border border-red-900/10 max-w-lg">
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
                                onClick={() => openEditModal(sess)}
                                className="border-[#1f2937] hover:bg-slate-800 text-gray-300 flex items-center gap-1"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Sửa
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCancelModal(sess)}
                                className="border-[#1f2937] hover:bg-red-500/10 hover:text-red-400 text-gray-500 flex items-center gap-1"
                              >
                                <X className="h-3.5 w-3.5" />
                                Hủy buổi
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. INITIALIZE SCHEDULE MODAL */}
      {showInitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Khởi tạo lịch học</h3>
              <p className="text-gray-400 text-xs">Tạo tài liệu khung lịch học ban đầu cho khóa học.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Tiêu đề lịch học</Label>
                <Input
                  value={initForm.title}
                  onChange={(e) => setInitForm({ ...initForm, title: e.target.value })}
                  className="bg-slate-900 border-[#1f2937] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Ngày bắt đầu</Label>
                  <Input
                    type="date"
                    value={initForm.startDate}
                    onChange={(e) => setInitForm({ ...initForm, startDate: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Ngày kết thúc</Label>
                  <Input
                    type="date"
                    value={initForm.endDate}
                    onChange={(e) => setInitForm({ ...initForm, endDate: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Hình thức học</Label>
                <select
                  value={initForm.locationType}
                  onChange={(e) => setInitForm({ ...initForm, locationType: e.target.value })}
                  className="w-full rounded-md border border-[#1f2937] bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="online">Trực tuyến (Online)</option>
                  <option value="offline">Trực tiếp (Offline)</option>
                  <option value="hybrid">Học kết hợp (Hybrid)</option>
                </select>
              </div>

              {initForm.locationType !== 'online' && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Địa chỉ trung tâm</Label>
                  <Input
                    placeholder="Nhập địa chỉ"
                    value={initForm.locationAddress}
                    onChange={(e) => setInitForm({ ...initForm, locationAddress: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowInitModal(false)}
                className="border-[#1f2937] text-gray-300 hover:bg-slate-800"
              >
                Hủy
              </Button>
              <Button
                onClick={handleInitSchedule}
                className="bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold"
              >
                Khởi tạo lịch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD SESSION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Thêm buổi học mới</h3>
              <p className="text-gray-400 text-xs">Cấu hình thời gian và tiêu đề cho buổi học mới.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label className="text-gray-300">Buổi số</Label>
                  <Input
                    type="number"
                    min="1"
                    value={sessionForm.sessionNumber}
                    onChange={(e) => setSessionForm({ ...sessionForm, sessionNumber: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-gray-300">Tiêu đề buổi học</Label>
                  <Input
                    placeholder="Ví dụ: Hướng dẫn cài đặt NodeJS"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Ngày học</Label>
                  <Input
                    type="date"
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Chủ đề chi tiết</Label>
                <Input
                  placeholder="Nhập chủ đề/nội dung dạy học..."
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  className="bg-slate-900 border-[#1f2937] text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="border-[#1f2937] text-gray-300 hover:bg-slate-800"
              >
                Hủy
              </Button>
              <Button
                onClick={handleAddSession}
                className="bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold"
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
          <div className="w-full max-w-lg bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Chỉnh sửa buổi học {activeSession?.sessionNumber}</h3>
              <p className="text-gray-400 text-xs">Cập nhật thông tin chi tiết hoặc dời thời gian buổi học.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Tiêu đề buổi học</Label>
                <Input
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  className="bg-slate-900 border-[#1f2937] text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Ngày học</Label>
                  <Input
                    type="date"
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="bg-slate-900 border-[#1f2937] text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Chủ đề chi tiết</Label>
                <Input
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  className="bg-slate-900 border-[#1f2937] text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="border-[#1f2937] text-gray-300 hover:bg-slate-800"
              >
                Hủy
              </Button>
              <Button
                onClick={handleEditSession}
                className="bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold"
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
          <div className="w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-white">Hủy buổi học số {activeSession?.sessionNumber}</h3>
                <p className="text-gray-400 text-xs mt-1">
                  Xác nhận hủy buổi học: <strong>{activeSession?.title}</strong>. Học viên sẽ được thông báo.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-gray-300">Lý do hủy buổi học</Label>
              <Textarea
                id="cancelReason"
                placeholder="Ví dụ: Giảng viên bận công tác đột xuất, dời lịch sang tuần sau..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-slate-900 border-[#1f2937] text-white focus:border-red-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                className="border-[#1f2937] text-gray-300 hover:bg-slate-800"
              >
                Quay lại
              </Button>
              <Button
                onClick={handleCancelSession}
                className="bg-red-600 hover:bg-red-750 text-white border-none font-semibold"
              >
                Hủy buổi học
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerCourseSchedulePage;
