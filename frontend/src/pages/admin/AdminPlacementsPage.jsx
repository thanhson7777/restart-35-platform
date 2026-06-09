import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminPlacementStats,
  AdminPlacementFilters,
  AdminPlacementTable,
  AdminPlacementDetailModal,
  AdminPlacementAnalyticsChart,
} from '@/components/admin/placements';
import { getPlacements } from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminPlacementsPage = () => {
  const [placements, setPlacements] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const computeStats = (data) => {
    if (!Array.isArray(data)) return null;
    const total = data.length;
    const activeCount = data.filter((p) => p.status === 'active').length;
    const successRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const salaries = data.map((p) => p.salary).filter((s) => typeof s === 'number' && s > 0);
    const avgSalary = salaries.length > 0
      ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
      : 0;
    const industries = data.map((p) => p.industry).filter(Boolean);
    const industryCounts = {};
    industries.forEach((ind) => { industryCounts[ind] = (industryCounts[ind] || 0) + 1; });
    const topIndustries = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([ind]) => ind)
      .slice(0, 3);
    return { total, successRate, avgSalary, topIndustries };
  };

  const buildChartData = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const byMonth = {};
    data.forEach((p) => {
      const month = p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }) : 'Unknown';
      if (!byMonth[month]) byMonth[month] = { month, active: 0, resigned: 0, promoted: 0 };
      if (p.status === 'active') byMonth[month].active += 1;
      else if (p.status === 'resigned') byMonth[month].resigned += 1;
      else if (p.status === 'promoted') byMonth[month].promoted += 1;
    });
    return Object.values(byMonth).slice(-12);
  };

  const fetchPlacements = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const response = await getPlacements(params);
      if (response.success) {
        setPlacements(response.data || []);
        setPagination(response.pagination || {
          currentPage: 1, limit: DEFAULT_LIMIT, totalRecords: 0, totalPages: 0,
        });
      }
    } catch (error) {
      toast.error('Không thể tải danh sách placements');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getPlacements({ limit: 1000, page: 1 });
      if (response.success) {
        const all = response.data || [];
        setStats(computeStats(all));
        setChartData(buildChartData(all));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPlacements(); }, [fetchPlacements]);

  const handleFiltersChange = (newFilters) => setFilters(newFilters);
  const handleSearch = () => fetchPlacements();
  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }));
  const handleView = (placement) => { setSelectedPlacement(placement); setShowDetailModal(true); };
  const handleRefresh = () => { fetchStats(); fetchPlacements(); };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Placements"
        subtitle="Theo dõi và phân tích placement (việc làm sau tốt nghiệp)"
      />
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <AdminPlacementStats stats={stats} loading={loading} />

      <div className="mb-6">
        <AdminPlacementAnalyticsChart data={chartData} />
      </div>

      <AdminPlacementFilters filters={filters} onChange={handleFiltersChange} onSearch={handleSearch} />
      <AdminPlacementTable
        placements={placements}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
      />

      <AdminPlacementDetailModal
        placement={selectedPlacement}
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedPlacement(null); }}
        onUpdated={fetchPlacements}
      />
    </AdminLayout>
  );
};

export default AdminPlacementsPage;
