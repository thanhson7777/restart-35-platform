import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminIsaStats,
  AdminIsaFilters,
  AdminIsaTable,
  AdminIsaDetailModal,
} from '@/components/admin/isa';
import {
  getAllIsaRepayments,
} from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminIsaRepaymentsPage = () => {
  const [isaList, setIsaList] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });
  const [selectedIsa, setSelectedIsa] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const computeStats = (data) => {
    if (!Array.isArray(data)) return null;
    const totalISA = data.length;
    const totalActive = data.filter((i) => i.status === 'active').length;
    const totalCompleted = data.filter((i) => i.status === 'completed').length;
    const totalDefault = data.filter((i) => i.status === 'default').length;
    const totalCollected = data.reduce((sum, i) => sum + (i.totalPaid || 0), 0);
    const totalPending = data
      .filter((i) => i.status === 'active' || i.status === 'pending')
      .reduce((sum, i) => sum + ((i.totalAmount || 0) - (i.totalPaid || 0)), 0);
    const defaultRate = totalISA > 0 ? Math.round((totalDefault / totalISA) * 100) : 0;
    return { totalISA, totalActive, totalCompleted, totalCollected, totalPending, defaultRate };
  };

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getAllIsaRepayments({ limit: 1000, page: 1 });
      if (response.success) {
        const all = response.data || [];
        setStats(computeStats(all));
      }
    } catch (error) {
      toast.error('Không thể tải thống kê');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchIsaList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;
      const response = await getAllIsaRepayments(params);
      if (response.success) {
        setIsaList(response.data || []);
        setPagination(response.pagination || {
          currentPage: 1, limit: DEFAULT_LIMIT, totalRecords: 0, totalPages: 0,
        });
      }
    } catch (error) {
      toast.error('Không thể tải danh sách ISA');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchIsaList(); }, [fetchIsaList]);

  const handleFiltersChange = (newFilters) => setFilters(newFilters);
  const handleSearch = () => fetchIsaList();
  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }));
  const handleView = (isa) => { setSelectedIsa(isa); setShowDetailModal(true); };
  const handleRefresh = () => { fetchStats(); fetchIsaList(); };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="ISA Repayments"
        subtitle="Quản lý và theo dõi các ISA (Income Share Agreement) trên nền tảng"
      />
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

      <AdminIsaStats stats={stats} loading={statsLoading} />
      <AdminIsaFilters filters={filters} onChange={handleFiltersChange} onSearch={handleSearch} />
      <AdminIsaTable
        isaList={isaList}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
      />

      <AdminIsaDetailModal
        isa={selectedIsa}
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedIsa(null); }}
        onActivated={fetchIsaList}
      />
    </AdminLayout>
  );
};

export default AdminIsaRepaymentsPage;
