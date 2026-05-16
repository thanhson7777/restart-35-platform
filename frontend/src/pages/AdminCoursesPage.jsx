import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminCourseStats,
  AdminCourseFilters,
  AdminCourseTable,
  AdminCourseDetailModal,
  AdminCourseRejectModal,
} from '@/components/admin/courses';
import {
  getAdminCourses,
  getAdminPendingCourses,
  getAdminCourseStats,
  approveCourse,
} from '@/apis/courseApi';

const AdminCoursesPage = () => {
  // States
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    category: '',
    level: '',
    location: '',
    fee: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getAdminCourseStats();
      if (response.data) {
        // Handle different response formats
        const stats = response.data.data || response.data;
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      let response;

      if (filters.status === 'pending') {
        response = await getAdminPendingCourses({
          page: filters.page,
          limit: filters.limit,
          search: filters.search,
        });
      } else {
        response = await getAdminCourses({
          page: filters.page,
          limit: filters.limit,
          search: filters.search,
          status: filters.status !== 'all' ? filters.status : undefined,
          category: filters.category || undefined,
          level: filters.level || undefined,
          location: filters.location || undefined,
          isFree: filters.fee === 'free' ? true : filters.fee === 'paid' ? false : undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });
      }

      if (response.data) {
        // Handle different response formats
        let courses = [];
        if (Array.isArray(response.data)) {
          courses = response.data;
        } else if (response.data.courses) {
          courses = response.data.courses;
        } else if (response.data.data) {
          courses = response.data.data;
        }
        
        setCourses(courses);
        const total = response.data.pagination?.total ||
                      response.data.pagination?.totalRecords ||
                      (Array.isArray(response.data) ? response.data.length : courses.length);
        const totalPages = Math.ceil(total / filters.limit);
        setPagination({
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages,
        });
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Handlers
  const handleView = (course) => {
    setSelectedCourse(course);
    setShowDetailModal(true);
  };

  const handleApprove = async (course) => {
    try {
      setApproveLoading(true);
      const response = await approveCourse(course._id, { status: 'approved' });
      
      if (response.data?.success !== false) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Đã duyệt khóa học "{course.title}"</span>
          </div>
        );
        
        // Close detail modal if open
        if (showDetailModal) {
          setShowDetailModal(false);
        }
        
        // Refresh data
        fetchCourses();
        fetchStats();
      }
    } catch (error) {
      console.error('Error approving course:', error);
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Không thể duyệt khóa học. Vui lòng thử lại.</span>
        </div>
      );
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = (course) => {
    setSelectedCourse(course);
    setShowRejectModal(true);
    if (showDetailModal) {
      setShowDetailModal(false);
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
            <CheckCircle className="w-5 h-5" />
            <span>Đã từ chối khóa học "{selectedCourse.title}"</span>
          </div>
        );
        
        setShowRejectModal(false);
        setSelectedCourse(null);
        
        // Refresh data
        fetchCourses();
        fetchStats();
      }
    } catch (error) {
      console.error('Error rejecting course:', error);
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Không thể từ chối khóa học. Vui lòng thử lại.</span>
        </div>
      );
    } finally {
      setRejectLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý khóa học"
        subtitle="Xem xét và duyệt khóa học từ các trung tâm đào tạo"
      />

      {/* Stats */}
      <AdminCourseStats stats={stats} loading={statsLoading} />

      {/* Filters */}
      <AdminCourseFilters
        filters={filters}
        onChange={setFilters}
        onSearch={fetchCourses}
        stats={stats}
      />

      {/* Table */}
      <AdminCourseTable
        courses={courses}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
        onApprove={handleApprove}
        onReject={handleReject}
      />

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

export default AdminCoursesPage;
