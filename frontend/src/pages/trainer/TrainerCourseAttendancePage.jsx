import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, BookOpen, AlertCircle, Calendar } from 'lucide-react';
import { Button, Badge, Avatar, BezelCard } from '@/components/ui';
import { getAdminCourseSchedule, getCourseEnrollments } from '@/apis/trainerApi';
import { getSessionAttendance } from '@/apis/courseApi';
import toast from 'react-hot-toast';

const TrainerCourseAttendancePage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  // Page States
  const [schedule, setSchedule] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceMatrix, setAttendanceMatrix] = useState({}); // { sessionNumber: { userId: { status, note } } }
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Get Schedule & Session details
      const scheduleRes = await getAdminCourseSchedule(courseId);
      const scheduleObj = scheduleRes.data?.data || scheduleRes.data;
      setSchedule(scheduleObj);

      // 2. Get Enrolled Students
      const enrollRes = await getCourseEnrollments(courseId, { page: 1, limit: 1000 });
      const enrolls = enrollRes.data?.data || [];
      setEnrollments(enrolls);

      if (!scheduleObj || !scheduleObj.sessions) {
        setLoading(false);
        return;
      }

      // 3. Fetch attendance for all sessions concurrently
      const matrix = {};
      await Promise.all(
        scheduleObj.sessions.map(async (sess) => {
          try {
            const attendanceRes = await getSessionAttendance(scheduleObj._id, sess.sessionNumber);
            let existingAttendance = [];
            if (Array.isArray(attendanceRes?.data?.data)) {
              existingAttendance = attendanceRes.data.data;
            } else if (Array.isArray(attendanceRes?.data)) {
              existingAttendance = attendanceRes.data;
            } else if (Array.isArray(attendanceRes)) {
              existingAttendance = attendanceRes;
            }
            
            console.log(`[DEBUG] Session ${sess.sessionNumber} RAW:`, attendanceRes);
            console.log(`[DEBUG] Session ${sess.sessionNumber} EXTRA:`, existingAttendance);
            
            const sessionData = {};
            // Default based on session status
            enrolls.forEach(e => {
              if (e.user) {
                sessionData[e.user._id] = {
                  status: sess.status === 'completed' ? 'absent' : 'unrecorded',
                  note: ''
                };
              }
            });

            // Override with actual records
            existingAttendance.forEach(att => {
              console.log(`[DEBUG] Mapping att.userId=${att.userId} to status=${att.status}`);
              if (att.userId) {
                sessionData[att.userId] = {
                  status: att.status || 'present',
                  note: att.note || ''
                };
              }
            });

            matrix[sess.sessionNumber] = sessionData;
            console.log(`[DEBUG] Session ${sess.sessionNumber} Matrix:`, sessionData);
          } catch (err) {
            console.warn(`Failed to fetch attendance for session ${sess.sessionNumber}:`, err);
            matrix[sess.sessionNumber] = {};
          }
        })
      );

      setAttendanceMatrix(matrix);
    } catch (error) {
      console.error('Error loading attendance history:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu lịch sử điểm danh');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(e => {
      const term = searchTerm.toLowerCase();
      return (
        e.user?.displayName?.toLowerCase().includes(term) ||
        e.user?.email?.toLowerCase().includes(term) ||
        e.user?.phone?.includes(term)
      );
    });
  }, [enrollments, searchTerm]);

  // Render Status Badge
  const renderStatus = (status) => {
    switch (status) {
      case 'present':
        return <span className="inline-flex w-3 h-3 rounded-full bg-emerald-500 shadow-sm" title="Có mặt" />;
      case 'absent':
        return <span className="inline-flex w-3 h-3 rounded-full bg-red-500 shadow-sm" title="Vắng mặt" />;
      case 'late':
        return <span className="inline-flex w-3 h-3 rounded-full bg-amber-500 shadow-sm" title="Đi muộn" />;
      case 'excused':
        return <span className="inline-flex w-3 h-3 rounded-full bg-blue-500 shadow-sm" title="Có phép" />;
      default:
        return <span className="inline-flex w-3 h-3 rounded-full border-2 border-[hsl(var(--admin-border-strong))] bg-transparent" title="Chưa ghi nhận" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/trainer/courses/${courseId}/schedule`)}
            className="w-10 h-10 rounded-full bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] flex items-center justify-center text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:border-[hsl(var(--admin-border-strong))] transition-colors duration-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">Lịch sử điểm danh</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Xem lại quá trình tham gia của học viên qua các buổi học</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[hsl(var(--admin-accent))] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 flex-1 flex flex-col">
          {/* Filtering Row */}
          <BezelCard padding="sm" outerClassName="flex-shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search Box */}
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học viên theo tên, email, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/20 focus:border-[hsl(var(--admin-accent))] placeholder:text-[hsl(var(--admin-text-muted))] transition-all"
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs font-medium text-[hsl(var(--admin-text-secondary))] bg-[hsl(var(--admin-surface))] py-2 px-3 lg:px-4 rounded-xl border border-[hsl(var(--admin-border))]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-500 shadow-sm" />Có mặt</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-red-500 shadow-sm" />Vắng mặt</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-amber-500 shadow-sm" />Đi muộn</div>
              </div>
            </div>
          </BezelCard>

          {/* Matrix Table */}
          <div className="flex-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden flex flex-col min-h-[400px] shadow-sm">
            {filteredEnrollments.length === 0 ? (
              <div className="p-16 text-center flex-1 flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-[hsl(var(--admin-text-muted))] mx-auto mb-3 opacity-60" />
                <p className="text-sm text-[hsl(var(--admin-text-muted))] font-bold">Không tìm thấy học viên phù hợp</p>
              </div>
            ) : (
              <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-[hsl(var(--admin-surface-elevated))] shadow-sm">
                    <tr className="border-b border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] font-bold uppercase tracking-wider font-mono">
                      <th className="py-4 px-5 sticky left-0 z-20 bg-[hsl(var(--admin-surface-elevated))] shadow-[1px_0_0_0_hsl(var(--admin-border))]">Học viên</th>
                      {schedule?.sessions?.map((sess) => (
                        <th key={sess._id} className="py-4 px-4 text-center min-w-[80px] border-l border-[hsl(var(--admin-border))]/40">
                          <div className="flex flex-col items-center gap-1">
                            <span>Buổi {sess.sessionNumber}</span>
                            <span className="text-[10px] text-[hsl(var(--admin-text-muted))] lowercase font-normal flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(sess.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--admin-border))]/60">
                    {filteredEnrollments.map((enroll) => {
                      const user = enroll.user;
                      if (!user) return null;

                      return (
                        <tr key={user._id} className="group hover:bg-[hsl(var(--admin-surface-elevated))]/50 transition-colors">
                          <td className="py-3 px-5 sticky left-0 z-10 bg-[hsl(var(--admin-surface))] group-hover:bg-[hsl(var(--admin-surface-elevated))]/80 shadow-[1px_0_0_0_hsl(var(--admin-border))] transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={user.avatar}
                                fallback={user.displayName?.charAt(0) || 'U'}
                                className="w-8 h-8 border border-[hsl(var(--admin-border))]"
                              />
                              <div>
                                <h5 className="font-bold text-[hsl(var(--admin-text-primary))] text-sm leading-snug">{user.displayName}</h5>
                                <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate max-w-[150px]">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          {schedule?.sessions?.map((sess) => {
                            const sessData = attendanceMatrix[sess.sessionNumber] || {};
                            const userAtt = sessData[user._id] || { status: 'unrecorded' };
                            return (
                              <td key={sess._id} className="py-3 px-4 text-center border-l border-[hsl(var(--admin-border))]/40 hover:bg-[hsl(var(--admin-surface-elevated))] hover:shadow-[inset_0_0_0_1px_hsl(var(--admin-border))] transition-all cursor-crosshair">
                                <div className="flex justify-center items-center w-full h-full" title={userAtt.note || 'Không có ghi chú'}>
                                  {renderStatus(userAtt.status)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerCourseAttendancePage;
