import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, QrCode, Save, RefreshCw, UserCheck, UserX, Clock, Clipboard, Search, AlertCircle, Eye, X, Loader2 } from 'lucide-react';
import { Button, Badge, Avatar } from '@/components/ui';
import { BezelCard } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { getAdminCourseSchedule, getCourseEnrollments, getSessionAttendance, recordAttendance } from '@/apis/courseApi';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/formatter';
import { motion, AnimatePresence } from 'framer-motion';

const AttendancePage = () => {
  const { id: courseId, sessionNumber } = useParams();
  const navigate = useNavigate();

  // Page States
  const [schedule, setSchedule] = useState(null);
  const [session, setSession] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // map userId -> { status, note }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Modal QR State
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Get Schedule & Session details
      const scheduleRes = await getAdminCourseSchedule(courseId);
      const scheduleObj = scheduleRes.data?.data || scheduleRes.data;
      setSchedule(scheduleObj);

      const sessNum = parseInt(sessionNumber, 10);
      const sessionObj = scheduleObj?.sessions?.find(s => s.sessionNumber === sessNum);
      if (!sessionObj) {
        toast.error(`Không tìm thấy Buổi học số ${sessionNumber}`);
        navigate(`/admin/courses/${courseId}/schedule`);
        return;
      }
      setSession(sessionObj);

      // 2. Get Enrolled Students
      const enrollRes = await getCourseEnrollments(courseId, { page: 1, limit: 1000 });
      const enrolls = enrollRes.data?.enrollments || enrollRes.data || [];
      setEnrollments(enrolls);

      // 3. Get existing session attendance
      let existingAttendance = [];
      try {
        const attendanceRes = await getSessionAttendance(scheduleObj._id, sessNum);
        existingAttendance = attendanceRes.data || attendanceRes || [];
      } catch (err) {
        console.warn('No existing attendance or failed to fetch:', err);
      }

      // 4. Map into state
      const initialMap = {};
      
      // Default all enrolled students to absent if session is already completed, otherwise present (or unrecorded)
      enrolls.forEach(e => {
        if (e.user) {
          initialMap[e.user._id] = {
            status: sessionObj.status === 'completed' ? 'absent' : 'present',
            note: ''
          };
        }
      });

      // Override with existing records from schedule session
      existingAttendance.forEach(att => {
        if (att.userId) {
          initialMap[att.userId] = {
            status: att.status || 'present',
            note: att.note || ''
          };
        }
      });

      setAttendanceData(initialMap);
    } catch (error) {
      console.error('Error loading attendance page:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  }, [courseId, sessionNumber, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler: Change single student status
  const handleStatusChange = (userId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        status
      }
    }));
  };

  // Handler: Change single student note
  const handleNoteChange = (userId, note) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        note
      }
    }));
  };

  // Handler: Mark all visible students status
  const handleMarkAllStatus = (status) => {
    const updated = { ...attendanceData };
    filteredEnrollments.forEach(e => {
      if (e.user) {
        updated[e.user._id] = {
          ...updated[e.user._id],
          status
        };
      }
    });
    setAttendanceData(updated);
    toast.success(`Đã đổi trạng thái tất cả học viên đang hiển thị thành: ${
      status === 'present' ? 'Có mặt' :
      status === 'absent' ? 'Vắng mặt' :
      status === 'late' ? 'Muộn' : 'Có phép'
    }`);
  };

  // Handler: Save Attendance
  const handleSaveAttendance = async () => {
    if (!schedule || !session) return;
    
    setSaving(true);
    try {
      const payload = Object.entries(attendanceData).map(([userId, val]) => ({
        userId,
        status: val.status,
        note: val.note || ''
      }));

      await recordAttendance(schedule._id, session.sessionNumber, { attendance: payload });
      toast.success('Ghi điểm danh thành công!');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể lưu điểm danh');
    } finally {
      setSaving(false);
    }
  };

  // Filtering enrollments
  const filteredEnrollments = enrollments.filter(e => {
    const term = searchTerm.toLowerCase();
    return (
      e.user?.displayName?.toLowerCase().includes(term) ||
      e.user?.email?.toLowerCase().includes(term) ||
      e.user?.phone?.includes(term)
    );
  });

  // Calculate stats for current screen
  const getStats = () => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    Object.values(attendanceData).forEach(val => {
      if (val.status === 'present') presentCount++;
      if (val.status === 'absent') absentCount++;
      if (val.status === 'late') lateCount++;
      if (val.status === 'excused') excusedCount++;
    });

    return { presentCount, absentCount, lateCount, excusedCount };
  };

  const { presentCount, absentCount, lateCount, excusedCount } = getStats();

  const expectedPin = session?._id ? session._id.toString().substring(18).toUpperCase() : '';
  const checkinUrl = schedule && session
    ? `${window.location.origin}/my-enrollments/${courseId}/checkin?pin=${expectedPin}&scheduleId=${schedule._id}&session=${session.sessionNumber}`
    : '';
  const qrCodeSrc = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(checkinUrl)}`
    : '';

  return (
    <AdminLayout className="bg-[#0b0f19] text-slate-100 min-h-screen">
      {/* Header Area */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/courses/${courseId}/schedule`)}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors duration-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AdminPageTitle
            title={`Sổ điểm danh - Buổi ${sessionNumber}`}
            subtitle={session ? `Buổi: ${session.title} | Thời gian: ${session.startTime} - ${session.endTime} (${formatDate(session.date)})` : 'Đang tải thông tin buổi học...'}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setQrModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-550 border-purple-500 text-white rounded-full px-5 py-2 text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center gap-1.5"
            disabled={loading}
          >
            <QrCode className="w-4 h-4" />
            Trình chiếu QR Code
          </Button>

          <Button
            onClick={handleSaveAttendance}
            className="bg-blue-600 hover:bg-blue-550 border-blue-500 text-white rounded-full px-5 py-2 text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all flex items-center gap-1.5"
            disabled={loading || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu bảng điểm danh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats Panel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Có mặt</p>
                <p className="text-xl font-extrabold text-white mt-0.5 font-mono">{presentCount} học viên</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-450">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Vắng mặt</p>
                <p className="text-xl font-extrabold text-white mt-0.5 font-mono">{absentCount} học viên</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-450">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Đi muộn</p>
                <p className="text-xl font-extrabold text-white mt-0.5 font-mono">{lateCount} học viên</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Clipboard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Nghỉ phép</p>
                <p className="text-xl font-extrabold text-white mt-0.5 font-mono">{excusedCount} học viên</p>
              </div>
            </div>
          </div>

          {/* Filtering & Quick Actions Row */}
          <BezelCard className="p-4 bg-slate-950/20 border border-slate-850 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search Box */}
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học viên theo tên, email, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-850 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder:text-slate-500"
                />
              </div>

              {/* Quick status change tags */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono mr-1">Duyệt nhanh tất cả:</span>
                <button
                  onClick={() => handleMarkAllStatus('present')}
                  className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-450 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all font-bold cursor-pointer"
                >
                  Có mặt
                </button>
                <button
                  onClick={() => handleMarkAllStatus('absent')}
                  className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-450 hover:bg-rose-500/20 border border-rose-500/20 transition-all font-bold cursor-pointer"
                >
                  Vắng mặt
                </button>
                <button
                  onClick={() => handleMarkAllStatus('late')}
                  className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-450 hover:bg-amber-500/20 border border-amber-500/20 transition-all font-bold cursor-pointer"
                >
                  Đi muộn
                </button>
              </div>
            </div>
          </BezelCard>

          {/* Student Sheet Table */}
          <BezelCard className="overflow-hidden">
            {filteredEnrollments.length === 0 ? (
              <div className="p-16 text-center">
                <AlertCircle className="w-12 h-12 text-slate-650 mx-auto mb-3 opacity-60" />
                <p className="text-sm text-slate-450 font-bold">Không tìm thấy học viên phù hợp</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-450 font-bold uppercase tracking-wider font-mono">
                      <th className="py-4 px-5">Học viên</th>
                      <th className="py-4 px-5">Email & SĐT</th>
                      <th className="py-4 px-5 text-center">Trạng thái điểm danh</th>
                      <th className="py-4 px-5">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {filteredEnrollments.map((enroll) => {
                      const user = enroll.user;
                      if (!user) return null;
                      const currentVal = attendanceData[user._id] || { status: 'present', note: '' };

                      return (
                        <tr key={user._id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-4.5 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={user.avatar}
                                fallback={user.displayName?.charAt(0) || 'U'}
                                className="w-9 h-9 border border-slate-800"
                              />
                              <div>
                                <h5 className="font-extrabold text-white text-sm leading-snug">{user.displayName}</h5>
                                <Badge className="mt-1 bg-slate-900 border border-slate-850 text-slate-450 font-mono text-[9px] px-1.5 py-0">
                                  Học viên
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="py-4.5 px-5">
                            <div className="space-y-0.5 font-mono text-slate-400">
                              <p className="font-medium">{user.email}</p>
                              <p className="text-[10px] text-slate-500">{user.phone || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-4.5 px-5">
                            <div className="flex items-center justify-center gap-1">
                              {/* Present Button */}
                              <button
                                onClick={() => handleStatusChange(user._id, 'present')}
                                className={`px-3.5 py-1.5 rounded-l-full font-bold transition-all cursor-pointer border ${
                                  currentVal.status === 'present'
                                    ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-900'
                                }`}
                              >
                                Có mặt
                              </button>
                              
                              {/* Late Button */}
                              <button
                                onClick={() => handleStatusChange(user._id, 'late')}
                                className={`px-3.5 py-1.5 font-bold transition-all cursor-pointer border-t border-b ${
                                  currentVal.status === 'late'
                                    ? 'bg-amber-500/10 text-amber-450 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-900'
                                }`}
                              >
                                Đi muộn
                              </button>

                              {/* Excused Button */}
                              <button
                                onClick={() => handleStatusChange(user._id, 'excused')}
                                className={`px-3.5 py-1.5 font-bold transition-all cursor-pointer border-t border-b border-l border-r ${
                                  currentVal.status === 'excused'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-900'
                                }`}
                              >
                                Phép
                              </button>

                              {/* Absent Button */}
                              <button
                                onClick={() => handleStatusChange(user._id, 'absent')}
                                className={`px-3.5 py-1.5 rounded-r-full font-bold transition-all cursor-pointer border ${
                                  currentVal.status === 'absent'
                                    ? 'bg-rose-500/10 text-rose-450 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
                                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-900'
                                }`}
                              >
                                Vắng
                              </button>
                            </div>
                          </td>
                          <td className="py-4.5 px-5">
                            <input
                              type="text"
                              placeholder="Ghi chú thêm..."
                              value={currentVal.note}
                              onChange={(e) => handleNoteChange(user._id, e.target.value)}
                              className="w-full max-w-xs px-3 py-1.5 bg-slate-950 border border-slate-850 text-slate-300 rounded-lg text-[11px] focus:outline-none focus:border-blue-500/40"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </BezelCard>
        </div>
      )}

      {/* QR Projection Modal */}
      <AnimatePresence>
        {qrModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-[28px] bg-slate-900 border border-slate-800 p-2 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Core Screen */}
              <div className="p-8 rounded-[22px] bg-slate-950 border border-slate-850 flex flex-col items-center text-center space-y-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    <span className="font-extrabold text-sm text-white font-mono uppercase tracking-wider">CỔNG ĐIỂM DANH TỰ ĐỘNG</span>
                  </div>
                  <button
                    onClick={() => setQrModalOpen(false)}
                    className="p-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white leading-tight">Buổi {sessionNumber}: {session?.title}</h3>
                  <p className="text-xs text-slate-450 font-medium">Học viên quét mã QR bên dưới hoặc truy cập trang check-in và nhập mã PIN.</p>
                </div>

                {/* QR Code Graphic Box */}
                <div className="bg-white p-5 rounded-2xl shadow-xl w-72 h-72 flex items-center justify-center border border-slate-800">
                  {qrCodeSrc ? (
                    <img src={qrCodeSrc} alt="Checkin QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* PIN Info display */}
                <div className="w-full p-4 bg-slate-900 border border-slate-850 rounded-2xl space-y-1 leading-relaxed">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">MÃ PIN ĐIỂM DANH THỦ CÔNG</p>
                  <span className="text-4xl font-extrabold text-blue-450 tracking-wider font-mono select-all">
                    {expectedPin}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Hệ thống ghi nhận điểm danh thời gian thực và tự động cập nhật thống kê khóa học.</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AttendancePage;
