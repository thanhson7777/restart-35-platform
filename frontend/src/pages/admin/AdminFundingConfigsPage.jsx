import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminFundingStats,
  AdminFundingFilters,
  AdminFundingList,
  AdminFundingForm,
  AdminFundingCalculator,
} from '@/components/admin/funding';
import { getFundingConfigs } from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminFundingConfigsPage = () => {
  const [configs, setConfigs] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });
  const [showForm, setShowForm] = useState(false);
  const [editConfig, setEditConfig] = useState(null);

  const computeStats = (data) => {
    if (!Array.isArray(data)) return null;
    const totalConfigs = data.length;
    const activeConfigs = data.filter((c) => c.isActive).length;
    const isaCount = data.filter((c) => c.type === 'isa' || c.type === 'full_isa').length;
    const incomeBasedCount = data.filter((c) => c.type === 'income_based').length;
    const avgPercentage = data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + (c.percentage || 0), 0) / data.length)
      : 0;
    return { totalConfigs, activeConfigs, isaCount, incomeBasedCount, avgPercentage };
  };

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      const response = await getFundingConfigs(params);
      if (response.success) {
        setConfigs(response.data || []);
        setPagination(response.pagination || {
          currentPage: 1, limit: DEFAULT_LIMIT, totalRecords: 0, totalPages: 0,
        });
      }
    } catch (error) {
      toast.error('Không thể tải danh sách funding configs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getFundingConfigs({ limit: 1000, page: 1 });
      if (response.success) {
        setStats(computeStats(response.data));
      }
    } catch (error) {
      // silent
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleFiltersChange = (newFilters) => setFilters(newFilters);
  const handleSearch = () => fetchConfigs();
  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }));
  const handleRefresh = () => { fetchStats(); fetchConfigs(); };
  const handleView = (config) => { setEditConfig(config); setShowForm(true); };
  const handleEdit = (config) => { setEditConfig(config); setShowForm(true); };
  const handleAddNew = () => { setEditConfig(null); setShowForm(true); };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Funding Configs"
        subtitle="Cấu hình ISA/income-based funding theo khóa học"
      />
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
        <Button size="sm" onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm Config
        </Button>
      </div>

      <AdminFundingStats stats={stats} loading={loading} />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <AdminFundingFilters filters={filters} onChange={handleFiltersChange} onSearch={handleSearch} />
          <AdminFundingList
            configs={configs}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
          />
        </div>
        <div>
          <AdminFundingCalculator />
        </div>
      </div>

      <AdminFundingForm
        config={editConfig}
        open={showForm}
        onClose={() => { setShowForm(false); setEditConfig(null); }}
        onSaved={() => { fetchConfigs(); fetchStats(); }}
      />
    </AdminLayout>
  );
};

export default AdminFundingConfigsPage;
