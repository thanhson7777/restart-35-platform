import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminScholarshipStats,
  AdminScholarshipFilters,
  AdminScholarshipTable,
  AdminScholarshipDetailModal,
} from '@/components/admin/scholarships';
import {
  getAdminScholarships,
  getAdminScholarshipStats,
} from '@/apis/scholarshipApi';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminScholarshipsPage = () => {
  // States
  const [scholarships, setScholarships] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });

  // Selection & Modals
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getAdminScholarshipStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Không thể tải thống kê');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch scholarships
  const fetchScholarships = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      const response = await getAdminScholarships(params);
      if (response.success) {
        setScholarships(response.data || []);
        setPagination(response.pagination || {
          currentPage: 1,
          limit: DEFAULT_LIMIT,
          totalRecords: 0,
          totalPages: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      toast.error('Không thể tải danh sách học bổng');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchScholarships();
  }, [fetchScholarships]);

  // Handlers
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    fetchScholarships();
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleView = (scholarship) => {
    setSelectedScholarship(scholarship);
    setShowDetailModal(true);
  };

  const handleRefresh = () => {
    fetchStats();
    fetchScholarships();
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý học bổng"
        subtitle="Theo dõi và quản lý các chương trình học bổng trên nền tảng"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={statsLoading || loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(statsLoading || loading) ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <AdminScholarshipStats stats={stats} loading={statsLoading} />

      {/* Filters */}
      <AdminScholarshipFilters
        filters={filters}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      {/* Table */}
      <AdminScholarshipTable
        scholarships={scholarships}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
      />

      {/* Detail Modal */}
      <AdminScholarshipDetailModal
        scholarship={selectedScholarship}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedScholarship(null);
        }}
      />
    </AdminLayout>
  );
};

export default AdminScholarshipsPage;
