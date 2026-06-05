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
    <AdminLayout className="bg-[#0b0f19] text-slate-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <AdminPageTitle
          title={
            <div className="flex items-center gap-2.5">
              <span className="text-white font-extrabold tracking-tight">Quản lý tuyển sinh</span>
              <div className="hidden sm:flex items-center gap-1 bg-[#3B82F6]/10 border border-[#3B82F6]/25 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-[#3B82F6]">
                <span>ENROLLMENTS</span>
              </div>
            </div>
          }
          subtitle="Theo dõi, quản lý và can thiệp kịp thời tiến trình học tập của học viên"
        />
        <div className="flex items-center gap-3 self-start md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsLoading || tableLoading}
            className="gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full"
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
              className="gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <FileDown className="w-4 h-4" />
              Xuất file
            </Button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden backdrop-blur-xl">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 font-mono transition-colors"
                >
                  Xuất CSV (.csv)
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 font-mono transition-colors"
                >
                  Xuất Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <AdminEnrollmentStats stats={stats} loading={statsLoading} />
      </div>

      {/* Filters & Table wrapped in BezelCard */}
      <BezelCard className="mb-8">
        <AdminEnrollmentFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExport={() => setExportMenuOpen(true)}
        />
        <AdminEnrollmentTable
          enrollments={enrollments}
          loading={tableLoading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onView={handleView}
          onUpdateProgress={handleUpdateProgress}
          onUpdateStatus={handleUpdateStatus}
        />
      </BezelCard>

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
