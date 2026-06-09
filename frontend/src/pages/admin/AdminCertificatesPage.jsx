import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminCertificateStats,
  AdminCertificateFilters,
  AdminCertificateTable,
  AdminCertificateDetailModal,
} from '@/components/admin/certificates';
import { getCertificates } from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminCertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
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
  const [selectedCert, setSelectedCert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const computeStats = (data) => {
    if (!Array.isArray(data)) return null;
    const total = data.length;
    const active = data.filter((c) => c.status === 'active').length;
    const revoked = data.filter((c) => c.status === 'revoked').length;
    const uniqueCourses = new Set(data.map((c) => c.courseId).filter(Boolean)).size;
    return { total, active, revoked, byCourse: uniqueCourses };
  };

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const response = await getCertificates(params);
      if (response.success) {
        setCertificates(response.data || []);
        setPagination(response.pagination || {
          currentPage: 1, limit: DEFAULT_LIMIT, totalRecords: 0, totalPages: 0,
        });
      }
    } catch (error) {
      toast.error('Không thể tải danh sách chứng chỉ');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getCertificates({ limit: 1000, page: 1 });
      if (response.success) {
        setStats(computeStats(response.data));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  const handleFiltersChange = (newFilters) => setFilters(newFilters);
  const handleSearch = () => fetchCertificates();
  const handleView = (cert) => { setSelectedCert(cert); setShowDetailModal(true); };
  const handleRefresh = () => { fetchStats(); fetchCertificates(); };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Chứng chỉ"
        subtitle="Quản lý và xác minh chứng chỉ trên nền tảng"
      />
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <AdminCertificateStats stats={stats} loading={loading} />
      <AdminCertificateFilters filters={filters} onChange={handleFiltersChange} onSearch={handleSearch} />
      <AdminCertificateTable
        certificates={certificates}
        loading={loading}
        onView={handleView}
      />

      <AdminCertificateDetailModal
        certificate={selectedCert}
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedCert(null); }}
        onRevoked={fetchCertificates}
      />
    </AdminLayout>
  );
};

export default AdminCertificatesPage;
