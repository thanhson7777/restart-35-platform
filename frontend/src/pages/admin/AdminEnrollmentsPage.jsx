import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  getAdminEnrollmentStats,
  getAllEnrollments,
  exportEnrollments
} from '@/apis/courseApi';
import {
  AdminEnrollmentStats,
  AdminEnrollmentFilters,
  AdminEnrollmentTable,
  AdminEnrollmentDetailModal
} from '@/components/admin/enrollments';

const AdminEnrollmentsPage = () => {
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10
  });
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getAdminEnrollmentStats();
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Khong the tai thong ke');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchEnrollments = useCallback(async (currentFilters = filters) => {
    try {
      setTableLoading(true);
      const params = {
        page: currentFilters.page,
        limit: currentFilters.limit
      };
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.courseId) params.courseId = currentFilters.courseId;
      if (currentFilters.startDate) params.startDate = currentFilters.startDate;
      if (currentFilters.endDate) params.endDate = currentFilters.endDate;

      const response = await getAllEnrollments(params);
      if (response.data?.success) {
        setEnrollments(response.data.data);
        setPagination({
          page: response.data.pagination.currentPage,
          limit: response.data.pagination.limit,
          total: response.data.pagination.totalRecords
        });
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      toast.error('Khong the tai danh sach dang ky');
    } finally {
      setTableLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchEnrollments();
  }, [filters]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleView = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setDetailModalOpen(true);
  };

  const handleUpdateProgress = (enrollment) => {
    toast.info('Tính năng đang phát triển');
  };

  const handleUpdateStatus = (enrollment) => {
    toast.info('Tính năng đang phát triển');
  };

  const handleExport = async (format = 'csv') => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.courseId) params.courseId = filters.courseId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      params.format = format;

      const response = await exportEnrollments(params);

      const blob = new Blob([response.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enrollments_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Xuất file ${format.toUpperCase()} thành công!`);
      setExportMenuOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Không thể xuất file');
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchEnrollments();
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý tuyển sinh"
        subtitle="Theo dõi và quản lý đăng ký khóa học của học viên"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={statsLoading || tableLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(statsLoading || tableLoading) ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>

        {/* Export Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export
          </Button>
          {exportMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 rounded-t-lg"
              >
                Xuất CSV
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 rounded-b-lg"
              >
                Xuất Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <AdminEnrollmentStats stats={stats} loading={statsLoading} />

      {/* Filters */}
      <AdminEnrollmentFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onExport={() => setExportMenuOpen(true)}
      />

      {/* Table */}
      <AdminEnrollmentTable
        enrollments={enrollments}
        loading={tableLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
        onUpdateProgress={handleUpdateProgress}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Detail Modal */}
      <AdminEnrollmentDetailModal
        enrollment={selectedEnrollment}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </AdminLayout>
  );
};

export default AdminEnrollmentsPage;
