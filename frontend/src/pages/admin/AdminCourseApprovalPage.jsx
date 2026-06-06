import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { AdminApprovalList } from '@/components/admin/AdminApprovalList';
import {
  AdminCourseDetailModal,
  AdminCourseRejectModal,
} from '@/components/admin/courses';
import {
  getAdminPendingCourses,
  approveCourse,
} from '@/apis/courseApi';

const AdminCourseApprovalPage = () => {
  const navigate = useNavigate();

  // States
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  // Fetch pending courses
  const fetchPendingCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminPendingCourses({
        page: 1,
        limit: 50,
      });

      if (response.data) {
        let pending = [];
        if (Array.isArray(response.data)) {
          pending = response.data;
        } else if (response.data.courses) {
          pending = response.data.courses;
        } else if (response.data.data) {
          pending = response.data.data;
        }
        setCourses(pending);
      }
    } catch (error) {
      console.error('Error fetching pending courses:', error);
      toast.error('Không thể tải danh sách khóa học chờ duyệt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCourses();
  }, [fetchPendingCourses]);

  // Handlers
  const handleView = (course) => {
    setSelectedCourse(course);
    setShowDetailModal(true);
  };

  const handleApprove = async (course) => {
    try {
      const response = await approveCourse(course._id, { status: 'approved' });
      
      if (response.data?.success !== false) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Đã duyệt khóa học "{course.title}" thành công!</span>
          </div>
        );
        
        if (showDetailModal) {
          setShowDetailModal(false);
        }
        
        fetchPendingCourses();
      }
    } catch (error) {
      console.error('Error approving course:', error);
      toast.error('Không thể duyệt khóa học');
    }
  };

  const handleReject = (course) => {
    setSelectedCourse(course);
    setShowRejectModal(true);
    if (showDetailModal) {
      setShowRejectModal(false);
    }
  };

  const handleRejectConfirm = async (data) => {
    try {
      setRejectLoading(true);
      const response = await approveCourse(selectedCourse._id, {
        status: 'rejected',
        rejectionReason: data.rejectionReason,
      });

      if (response.data?.success !== false) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span>Đã từ chối và gửi lý do cho giảng viên khóa "{selectedCourse.title}"</span>
          </div>
        );
        
        setShowRejectModal(false);
        setSelectedCourse(null);
        fetchPendingCourses();
      }
    } catch (error) {
      console.error('Error rejecting course:', error);
      toast.error('Không thể từ chối khóa học');
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/courses')}
            className="w-10 h-10 rounded-full bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] flex items-center justify-center text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:border-[hsl(var(--admin-border-strong))] transition-colors duration-200 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AdminPageTitle
            title="Duyệt khóa học"
            subtitle="Xem xét hồ sơ giảng dạy, đề cương bài học và phê duyệt phát hành lên hệ thống"
          />
        </div>

        <div className="flex items-center gap-2 bg-[hsl(var(--admin-accent-subtle))] border border-[hsl(var(--admin-accent))]/30 px-4 py-2 rounded-full self-start sm:self-center">
          <ShieldCheck className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
          <span className="text-xs font-mono text-[hsl(var(--admin-accent))] font-bold">
            {courses.length} Khóa học chờ duyệt
          </span>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-96 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
          <div className="h-96 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
          <div className="h-96 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
        </div>
      ) : (
        <AdminApprovalList
          courses={courses}
          onApprove={handleApprove}
          onReject={handleReject}
          onView={handleView}
        />
      )}

      {/* Modals */}
      {showDetailModal && selectedCourse && (
        <AdminCourseDetailModal
          course={selectedCourse}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCourse(null);
          }}
          onApprove={() => handleApprove(selectedCourse)}
          onReject={() => handleReject(selectedCourse)}
        />
      )}

      {showRejectModal && selectedCourse && (
        <AdminCourseRejectModal
          course={selectedCourse}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedCourse(null);
          }}
          onConfirm={handleRejectConfirm}
          loading={rejectLoading}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCourseApprovalPage;
