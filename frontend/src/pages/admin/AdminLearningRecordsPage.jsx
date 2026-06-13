import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminPageTitle } from '@/components/layout';
import {
  AdminLearningStats,
  AdminLearningFilters,
  AdminLearningTable,
  AdminDropoutRiskPanel,
} from '@/components/admin/learningRecords';
import { getLearningRecords, getDropoutRisk } from '@/apis';

const DEFAULT_LIMIT = 10;

const AdminLearningRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    enrollmentStatus: '',
    riskLevel: '',
    courseId: '',
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [activeTab, setActiveTab] = useState('records');

  const computeStats = useCallback((data) => {
    if (!Array.isArray(data)) return null;
    const totalRecords = data.length;
    const atRiskCount = data.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical').length;
    const completionRates = data.map((r) => r.completionRate || 0).filter((v) => typeof v === 'number');
    const avgCompletionRate = completionRates.length > 0
      ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
      : 0;
    const dropoutRate = totalRecords > 0 ? Math.round((atRiskCount / totalRecords) * 100) : 0;
    return { totalRecords, avgCompletionRate, atRiskCount, dropoutRate };
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLearningRecords(filters);
      const data = response.data || response || [];
      setRecords(Array.isArray(data) ? data : []);
      if (response.pagination) {
        setPagination((prev) => ({ ...prev, ...response.pagination }));
      } else {
        setPagination((prev) => ({ ...prev, totalRecords: data.length }));
      }
    } catch (err) {
      toast.error('Không thể tải learning records');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getLearningRecords({ limit: 500, page: 1 });
      const data = response.data || response || [];
      const computed = computeStats(Array.isArray(data) ? data : []);
      setStats(computed);
    } catch (err) {
      setStats({ totalRecords: 0, avgCompletionRate: 0, atRiskCount: 0, dropoutRate: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, [computeStats]);

  const fetchRiskData = useCallback(async () => {
    try {
      setRiskLoading(true);
      const response = await getDropoutRisk(filters);
      setRiskData(response.data || response || {});
    } catch (err) {
      setRiskData({ atRiskLearners: [], riskDistribution: {} });
    } finally {
      setRiskLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'risk') {
      fetchRiskData();
    }
  }, [activeTab, fetchRiskData]);

  const handleRefresh = () => {
    fetchRecords();
    fetchStats();
    if (activeTab === 'risk') fetchRiskData();
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const tabs = [
    { key: 'records', label: 'Danh sách Records' },
    { key: 'risk', label: 'Dropout Risk Analysis' },
  ];

  return (
    <>
      <div className="p-0 space-y-6">
        <div className="flex items-center justify-between">
          <AdminPageTitle
            title="Learning Records Analytics"
            subtitle="Theo dõi tiến độ học tập và phát hiện nguy cơ bỏ học"
          />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        <AdminLearningStats stats={stats} loading={statsLoading} />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'records' && (
          <>
            <AdminLearningFilters filters={filters} onChange={setFilters} />
            <AdminLearningTable
              records={records}
              loading={loading}
              onViewDetail={(record) => console.log('View detail', record)}
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                  Trang {pagination.currentPage} / {pagination.totalPages} — {pagination.totalRecords} records
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.currentPage <= 1}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'risk' && (
          <AdminDropoutRiskPanel riskData={riskData} loading={riskLoading} />
        )}
      </div>
    </>
  );
};

export default AdminLearningRecordsPage;
