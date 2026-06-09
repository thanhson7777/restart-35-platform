import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminOrganizationStats,
  AdminOrganizationFilters,
  AdminOrganizationTable,
  AdminOrganizationModal,
  AdminOrganizationDetailModal,
} from '@/components/admin/organizations';
import * as organizationApi from '@/apis/organizationApi';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminOrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
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
    type: '',
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await organizationApi.getOrganizations({ limit: 1 });
      if (res.success) {
        setStats({
          total: res.pagination?.totalRecords || 0,
          byType: { enterprise: 0, ngo: 0 },
          quotaUsage: 0,
          usedQuota: 0,
          totalQuota: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      const res = await organizationApi.getOrganizations(params);
      if (res.success) {
        setOrganizations(res.data || []);

        // Build stats from first response
        if (!stats && res.pagination?.totalRecords !== undefined) {
          setStats((s) => ({
            ...s,
            total: res.pagination.totalRecords,
          }));
        }

        setPagination(res.pagination || {
          currentPage: 1,
          limit: DEFAULT_LIMIT,
          totalRecords: 0,
          totalPages: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Không thể tải danh sách đối tác');
    } finally {
      setLoading(false);
    }
  }, [filters, stats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    fetchOrganizations();
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleView = (org) => {
    setSelectedOrg(org);
    setShowDetailModal(true);
  };

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setShowFormModal(true);
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đối tác "${org.name}"?`)) return;
    try {
      setDeleteLoading(true);
      await organizationApi.deleteOrganization(org._id);
      toast.success('Xóa đối tác thành công');
      fetchOrganizations();
      fetchStats();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Không thể xóa đối tác');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedOrg(null);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setFormLoading(true);
      if (selectedOrg?._id) {
        await organizationApi.updateOrganization(selectedOrg._id, formData);
        toast.success('Cập nhật đối tác thành công');
      } else {
        await organizationApi.createOrganization(formData);
        toast.success('Tạo đối tác thành công');
      }
      setShowFormModal(false);
      fetchOrganizations();
      fetchStats();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('Không thể lưu đối tác');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchOrganizations();
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý đối tác"
        subtitle="Quản lý tài khoản đối tác doanh nghiệp và tổ chức NGO trên nền tảng"
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
        <Button size="sm" onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm đối tác
        </Button>
      </div>

      <AdminOrganizationStats stats={stats} loading={statsLoading} />

      <AdminOrganizationFilters
        filters={filters}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      <AdminOrganizationTable
        organizations={organizations}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AdminOrganizationDetailModal
        organization={selectedOrg}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrg(null);
        }}
        onRefresh={fetchOrganizations}
      />

      <AdminOrganizationModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        organization={selectedOrg}
        loading={formLoading}
      />
    </AdminLayout>
  );
};

export default AdminOrganizationsPage;
