import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import AdminPlacementStats from '@/components/admin/placements/AdminPlacementStats';
import AdminPlacementTable from '@/components/admin/placements/AdminPlacementTable';
import AdminPlacementDetailModal from '@/components/admin/placements/AdminPlacementDetailModal';
import { getEnterprisePartnerships } from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminPlacementsPage = () => {
  const [partnerships, setPartnerships] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const computeStats = (data) => {
    if (!Array.isArray(data)) return null;
    const totalPartnerships = data.length;
    let totalLearners = 0;
    let totalPlaced = 0;

    data.forEach((p) => {
      totalLearners += (p.stats?.enrolledLearners || 0);
      totalPlaced += (p.stats?.placedLearners || 0);
    });

    const placementRate = totalLearners > 0 ? Math.round((totalPlaced / totalLearners) * 100) : 0;
    
    return { totalPartnerships, totalLearners, placementRate, totalPlaced };
  };

  const fetchPartnerships = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      const { data: result } = await getEnterprisePartnerships(params);
      if (result.success) {
        setPartnerships(result.data || []);
        setPagination(result.pagination || {
          currentPage: 1, limit: DEFAULT_LIMIT, totalRecords: 0, totalPages: 0,
        });
      }
    } catch (error) {
      toast.error('Không thể tải danh sách hợp tác');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const { data: result } = await getEnterprisePartnerships({ limit: 1000, page: 1 });
      if (result.success) {
        const all = result.data || [];
        setStats(computeStats(all));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPartnerships(); }, [fetchPartnerships]);

  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }));
  const handleView = (partnership) => { setSelectedPartnership(partnership); setShowDetailModal(true); };
  const handleRefresh = () => { fetchStats(); fetchPartnerships(); };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Dự án Hợp tác & Việc làm (Placements)"
        subtitle="Quản lý các chương trình hợp tác giữa Doanh nghiệp và Giảng viên, theo dõi tiến độ việc làm của học viên."
      />
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <AdminPlacementStats stats={stats} loading={loading} />

      <AdminPlacementTable
        placements={partnerships}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
      />

      <AdminPlacementDetailModal
        placement={selectedPartnership}
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedPartnership(null); }}
      />
    </AdminLayout>
  );
};

export default AdminPlacementsPage;
