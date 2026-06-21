import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  UserCheck, 
  UserX, 
  Clock, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { 
  Button, 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Avatar, 
  Input 
} from '@/components/ui';
import { getSessionAttendance, getCourseEnrollments, recordAttendance } from '@/apis/trainerApi';
import toast from 'react-hot-toast';

export const TrainerAttendanceModal = ({
  isOpen,
  onClose,
  scheduleId,
  sessionNumber,
  courseId,
  sessionTitle,
  courseTitle,
  session,
  onAttendanceSaved
}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && scheduleId && sessionNumber && courseId) {
      fetchAttendanceData();
    }
  }, [isOpen, scheduleId, sessionNumber, courseId]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch recorded attendance for the session
      let recordedAttendance = [];
      try {
        const attendanceRes = await getSessionAttendance(scheduleId, sessionNumber);
        recordedAttendance = attendanceRes.data?.data || [];
      } catch (attErr) {
        // If 404, it means no attendance recorded yet
        if (attErr.response?.status !== 404) {
          throw attErr;
        }
      }

      // 2. Fetch course enrollments to get the list of ALL students in the class
      const enrollmentsRes = await getCourseEnrollments(courseId, { limit: 1000 });
      const enrollments = enrollmentsRes.data?.data || [];
      
      // Filter to only include active/in_progress/enrolled students
      const activeEnrollments = enrollments.filter(
        e => e.status === 'enrolled' || e.status === 'in_progress' || e.status === 'active'
      );

      // 3. Map students and combine with existing attendance
      const mappedStudents = activeEnrollments.map(enroll => {
        const userId = enroll.userId;
        const user = enroll.user || {};
        
        // Check if there is already a recorded attendance for this student
        const record = recordedAttendance.find(a => a.userId === userId);
        
        return {
          userId,
          displayName: user.displayName || 'Học viên',
          email: user.email || '',
          phone: user.phone || 'N/A',
          avatar: user.avatar || '',
          status: record ? record.status : 'present', // Default to present
          note: record ? (record.note || '') : ''
        };
      });

      setStudents(mappedStudents);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      toast.error('Không thể tải danh sách học viên để điểm danh.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (userId, status) => {
    setStudents(prev => 
      prev.map(s => s.userId === userId ? { ...s, status } : s)
    );
  };

  const handleNoteChange = (userId, note) => {
    setStudents(prev => 
      prev.map(s => s.userId === userId ? { ...s, note } : s)
    );
  };

  const handleMarkAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
    toast.success('Đã chọn có mặt cho tất cả học viên!');
  };

  const handleSave = async () => {
    if (students.length === 0) {
      toast.error('Không có học viên nào để điểm danh');
      return;
    }
    setSaving(true);
    try {
      const attendancePayload = students.map(s => ({
        userId: s.userId,
        status: s.status,
        note: s.note
      }));

      await recordAttendance(scheduleId, sessionNumber, { attendance: attendancePayload });
      toast.success('Ghi nhận điểm danh thành công!');
      if (onAttendanceSaved) {
        onAttendanceSaved();
      }
      onClose();
    } catch (err) {
      console.error('Error saving attendance:', err);
      toast.error(err.response?.data?.message || 'Không thể lưu điểm danh.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--admin-border))] p-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[hsl(var(--admin-success))]" />
              Điểm danh học viên
            </h3>
            <p className="text-xs text-[hsl(var(--admin-text-muted))]">
              {courseTitle} &bull; Buổi {sessionNumber}: {sessionTitle}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center text-[hsl(var(--admin-text-muted))] space-y-4">
              <div className="h-10 w-10 border-4 border-[hsl(var(--admin-border))] border-t-[hsl(var(--admin-accent))] rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Đang tải danh sách học viên...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-[hsl(var(--admin-text-muted))] space-y-3">
              <AlertCircle className="h-12 w-12 text-[hsl(var(--admin-text-faint))] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[hsl(var(--admin-text-muted))]">Không tìm thấy học viên hoạt động</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Khóa học này chưa có học viên nào ở trạng thái học tập tích cực.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Action Header */}
              <div className="flex items-center justify-between bg-[hsl(var(--admin-surface-elevated))]/40 border border-[hsl(var(--admin-border))]/80 rounded-xl p-3.5">
                <div className="text-xs text-[hsl(var(--admin-text-muted))] font-medium">
                  Sỹ số lớp: <strong className="text-[hsl(var(--admin-text-primary))]">{students.length}</strong> học viên đăng học.
                </div>
                <Button
                  onClick={handleMarkAllPresent}
                  size="sm"
                  className="bg-[hsl(var(--admin-surface-elevated))] hover:bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-success))] hover:text-[hsl(var(--admin-success))] font-semibold border border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))] text-xs py-1"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Có mặt tất cả
                </Button>
              </div>

              {/* Attendance Table */}
              <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[hsl(var(--admin-surface-elevated))]/40 border-b border-[hsl(var(--admin-border))]">
                      <TableRow className="hover:bg-transparent border-[hsl(var(--admin-border))]">
                        <TableHead className="text-[hsl(var(--admin-text-muted))] font-semibold py-3 text-xs w-[240px]">Học viên</TableHead>
                        <TableHead className="text-[hsl(var(--admin-text-muted))] font-semibold py-3 text-xs w-[320px] text-center">Trạng thái điểm danh</TableHead>
                        <TableHead className="text-[hsl(var(--admin-text-muted))] font-semibold py-3 text-xs">Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.userId} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]/20">
                          {/* Student Info */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar 
                                src={student.avatar} 
                                alt={student.displayName}
                                className="h-9 w-9 border border-[hsl(var(--admin-border))]"
                              />
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[hsl(var(--admin-text-primary))] truncate">{student.displayName}</h4>
                                <span className="text-[10px] text-[hsl(var(--admin-text-muted))] block truncate">{student.email}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Attendance Status Buttons */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Present Button */}
                              <button
                                onClick={() => handleStatusChange(student.userId, 'present')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all duration-150 ${
                                  student.status === 'present'
                                    ? 'bg-[hsl(var(--admin-success))]/15 border-[hsl(var(--admin-success))]/30 text-[hsl(var(--admin-success))]'
                                    : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))]/40 text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Có mặt
                              </button>



                              {/* Absent Button */}
                              <button
                                onClick={() => handleStatusChange(student.userId, 'absent')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all duration-150 ${
                                  student.status === 'absent'
                                    ? 'bg-red-600/15 border-red-500/30 text-[hsl(var(--admin-danger))]'
                                    : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))]/40 text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
                                }`}
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Vắng
                              </button>
                            </div>
                          </TableCell>

                          {/* Notes input */}
                          <TableCell className="py-3.5">
                            <Input
                              value={student.note}
                              onChange={(e) => handleNoteChange(student.userId, e.target.value)}
                              placeholder="Nhập ghi chú (nếu có)..."
                              className="bg-[hsl(var(--admin-surface-elevated))]/60 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] text-xs py-1.5 rounded-lg focus:ring-1 focus:ring-[hsl(var(--admin-success))]/30 focus:border-[hsl(var(--admin-success))]/40"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--admin-border))] p-5">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] text-xs py-2 px-4 font-semibold"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || students.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-xs py-2 px-5 font-bold flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Lưu điểm danh
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
