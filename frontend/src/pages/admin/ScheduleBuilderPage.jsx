import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarRange, ShieldAlert } from 'lucide-react';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import ScheduleBuilder from '@/components/admin/schedule/ScheduleBuilder';
import {
  getCourseByIdAdmin,
  getAdminCourseSchedule,
  createSchedule,
  publishSchedule,
  deleteSchedule,
  addScheduleSession,
  updateScheduleSession,
  cancelScheduleSession
} from '@/apis/courseApi';

const ScheduleBuilderPage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  // Page States
  const [course, setCourse] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch course details and schedule
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load course details
      const courseRes = await getCourseByIdAdmin(courseId);
      if (courseRes.data) {
        setCourse(courseRes.data);
      }

      // Load schedule
      try {
        const scheduleRes = await getAdminCourseSchedule(courseId);
        if (scheduleRes.data && scheduleRes.data.data) {
          setSchedule(scheduleRes.data.data);
        } else if (scheduleRes.data && scheduleRes.data._id) {
          setSchedule(scheduleRes.data);
        } else {
          setSchedule(null);
        }
      } catch (err) {
        // A 404 error usually means the schedule hasn't been initialized yet
        setSchedule(null);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải thông tin khóa học hoặc lịch học');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler: Initialize Schedule
  const handleInitializeSchedule = async (scheduleData) => {
    try {
      setActionLoading(true);
      const response = await createSchedule({
        ...scheduleData,
        courseId
      });
      
      if (response.data) {
        toast.success('Khởi tạo lịch học cho khóa học thành công!');
        fetchData();
      }
    } catch (error) {
      console.error('Error initializing schedule:', error);
      toast.error(error.response?.data?.message || 'Không thể khởi tạo lịch học');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Save Session (Add / Edit)
  const handleSaveSession = async (sessionData, isEdit) => {
    if (!schedule) return;

    try {
      setActionLoading(true);
      let response;
      if (isEdit) {
        response = await updateScheduleSession(schedule._id, sessionData.sessionNumber, sessionData);
      } else {
        response = await addScheduleSession(schedule._id, sessionData);
      }

      if (response.data) {
        toast.success(isEdit ? 'Cập nhật buổi học thành công!' : 'Thêm buổi học thành công!');
        fetchData();
      }
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu buổi học');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Cancel Session
  const handleCancelSession = async (sessionNumber) => {
    if (!schedule) return;
    
    const confirmCancel = window.confirm(`Bạn có chắc chắn muốn hủy Buổi ${sessionNumber}?`);
    if (!confirmCancel) return;

    try {
      setActionLoading(true);
      const response = await cancelScheduleSession(schedule._id, sessionNumber, {
        reason: 'Hủy lịch định kỳ bởi Quản trị viên'
      });

      if (response.data) {
        toast.success(`Đã hủy Buổi ${sessionNumber} thành công!`);
        fetchData();
      }
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy buổi học');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Publish Schedule
  const handlePublishSchedule = async () => {
    if (!schedule) return;

    try {
      setActionLoading(true);
      const response = await publishSchedule(schedule._id);
      if (response.data) {
        toast.success('Đã công bố lịch học thành công đến tất cả học viên!');
        fetchData();
      }
    } catch (error) {
      console.error('Error publishing schedule:', error);
      toast.error(error.response?.data?.message || 'Không thể công bố lịch học');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Schedule
  const handleDeleteSchedule = async () => {
    if (!schedule) return;

    const confirmDelete = window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ lịch học và các buổi học của khóa học này không? Hành động này không thể hoàn tác!');
    if (!confirmDelete) return;

    try {
      setActionLoading(true);
      await deleteSchedule(schedule._id);
      toast.success('Đã xóa toàn bộ lịch học.');
      setSchedule(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Không thể xóa lịch học');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout className="bg-[#0b0f19] text-slate-100 min-h-screen">
      {/* Header Bar */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/courses')}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors duration-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AdminPageTitle
            title="Lập lịch giảng dạy"
            subtitle={course ? `Cấu hình thời khóa biểu chi tiết cho khóa: ${course.title}` : 'Đang tải thông tin khóa học...'}
          />
        </div>

        <div className="flex items-center gap-2 bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-4 py-2 rounded-full self-start sm:self-center">
          <CalendarRange className="w-4 h-4 text-[#3B82F6]" />
          <span className="text-xs font-mono text-[#3B82F6] font-bold">
            ScheduleBuilder v1.0
          </span>
        </div>
      </div>

      {/* Main Body Content */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      ) : (
        <ScheduleBuilder
          course={course}
          schedule={schedule}
          onSaveSession={handleSaveSession}
          onCancelSession={handleCancelSession}
          onPublishSchedule={handlePublishSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onInitializeSchedule={handleInitializeSchedule}
          loading={actionLoading}
        />
      )}
    </AdminLayout>
  );
};

export default ScheduleBuilderPage;
