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
import { updateUserStatusAPI } from '@/apis';

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
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await organizationApi.getOrganizationStats();
      if (res.success) {
        setStats(res.data);
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

  const handleToggleStatus = (org) => {
    if (!org.ownerId) {
      toast.error('Không tìm thấy tài khoản chủ để thay đổi trạng thái!');
      return;
    }
    
    const newStatus = org.status === 'active' ? false : true;
    
    setConfirmAction({
      title: newStatus ? 'Kích hoạt đối tác' : 'Vô hiệu hóa đối tác',
      message: `Bạn có chắc muốn ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} đối tác "${org.name}"? Đối tác ${newStatus ? 'sẽ có thể' : 'sẽ không thể'} truy cập vào hệ thống.`,
      isDestructive: !newStatus,
      onConfirm: async () => {
        try {
          setLoading(true);
          await updateUserStatusAPI(org.ownerId, { isActive: newStatus });
          toast.success(`${newStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} đối tác thành công!`);
          fetchOrganizations();
        } catch (error) {
          console.error('Error toggling organization status:', error);
          toast.error(`Không thể ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} đối tác`);
        } finally {
          setLoading(false);
          setConfirmAction(null);
        }
      }
    });
  };

  const handleApprove = (org) => {
    if (!org.ownerId) {
      toast.error('Không tìm thấy tài khoản chủ để duyệt!');
      return;
    }
    
    setConfirmAction({
      title: 'Duyệt đối tác',
      message: `Bạn có chắc muốn phê duyệt đối tác "${org.name}"? Hệ thống sẽ gửi email thông báo và kích hoạt tài khoản này.`,
      isDestructive: false,
      onConfirm: async () => {
        try {
          setLoading(true);
          await updateUserStatusAPI(org.ownerId, { adminApprovalStatus: 'approved' });
          toast.success('Duyệt đối tác thành công! Đã gửi email thông báo.');
          fetchOrganizations();
          fetchStats();
        } catch (error) {
          console.error('Error approving organization:', error);
          toast.error('Không thể duyệt đối tác');
        } finally {
          setLoading(false);
          setConfirmAction(null);
        }
      }
    });
  };

  const handleReject = (org) => {
    if (!org.ownerId) {
      toast.error('Không tìm thấy tài khoản chủ để từ chối!');
      return;
    }
    
    setConfirmAction({
      title: 'Từ chối đối tác',
      message: `Bạn có chắc muốn từ chối phê duyệt đối tác "${org.name}"? Hệ thống sẽ gửi email thông báo từ chối.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await updateUserStatusAPI(org.ownerId, { adminApprovalStatus: 'rejected' });
          toast.success('Đã từ chối đối tác và gửi email thông báo.');
          fetchOrganizations();
          fetchStats();
        } catch (error) {
          console.error('Error rejecting organization:', error);
          toast.error('Không thể từ chối đối tác');
        } finally {
          setLoading(false);
          setConfirmAction(null);
        }
      }
    });
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
        subtitle="Quản lý tài khoản đối tác doanh nghiệp, tổ chức NGO và trung tâm đào tạo trên nền tảng"
      />



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
        onToggleStatus={handleToggleStatus}
        onApprove={handleApprove}
        onReject={handleReject}
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[hsl(var(--admin-surface))] rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-[hsl(var(--admin-border))] animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))] mb-2">
                {confirmAction.title}
              </h3>
              <p className="text-[hsl(var(--admin-text-secondary))] text-sm">
                {confirmAction.message}
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-[hsl(var(--admin-surface-elevated))] border-t border-[hsl(var(--admin-border))]">
              <Button 
                variant="outline" 
                onClick={() => setConfirmAction(null)}
                disabled={loading || deleteLoading}
              >
                Hủy
              </Button>
              <Button 
                onClick={confirmAction.onConfirm} 
                disabled={loading || deleteLoading}
                className={confirmAction.isDestructive ? 'bg-rose-500 hover:bg-rose-600 text-white border-transparent' : ''}
              >
                {loading || deleteLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrganizationsPage;
