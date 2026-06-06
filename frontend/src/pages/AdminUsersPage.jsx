import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminUserStats,
  AdminUserTabs,
  AdminUserFilters,
  AdminUserTable,
  AdminUserModal,
  AdminUserEditModal
} from '@/components/admin/users';
import { Button } from '@/components/ui';
import { getUserStatsAPI, getUsersAPI, updateUserStatusAPI } from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState(searchParams.get('role') || 'all');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('isActive') || 'ALL');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || DEFAULT_PAGE);

  // Selection
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modals
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getUserStatsAPI();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const role = activeTab === 'all' ? 'ALL' : activeTab;
      const response = await getUsersAPI({
        page,
        limit: DEFAULT_LIMIT,
        role,
        isActive: status
      });

      if (response.success) {
        setUsers(response.data.users || []);
        setPagination(response.data.pagination || null);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, status]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update URL when filters change
  useEffect(() => {
    const params = {};
    if (activeTab !== 'all') params.role = activeTab;
    if (search) params.search = search;
    if (status !== 'ALL') params.isActive = status;
    if (page !== DEFAULT_PAGE) params.page = page;

    setSearchParams(params);
  }, [activeTab, search, status, page]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(DEFAULT_PAGE);
    setSelectedUsers([]);
  };

  // Handle search
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(DEFAULT_PAGE);
  };

  // Handle status filter
  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(DEFAULT_PAGE);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setPage(newPage);
    }
  };

  // Handle view user
  const handleViewUser = (user) => {
    setViewUser(user);
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setEditUser(user);
  };

  // Handle save edit
  const handleSaveEdit = async (userId, data) => {
    try {
      setEditLoading(true);
      const response = await updateUserStatusAPI(userId, data);

      if (response.success) {
        toast.success('Cập nhật thành công');
        setEditUser(null);
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (user) => {
    try {
      const response = await updateUserStatusAPI(user._id, {
        isActive: !user.isActive
      });

      if (response.success) {
        toast.success(
          user.isActive
            ? 'Đã vô hiệu hóa tài khoản'
            : 'Đã kích hoạt tài khoản'
        );
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Cập nhật thất bại');
    }
  };

  // Handle delete
  const handleDelete = (user) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${user.displayName}"?`)) {
      // TODO: Implement delete API
      toast.error('Tính năng xóa đang được phát triển');
    }
  };

  // Handle select user
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all
  const handleSelectAll = (checked, usersList) => {
    if (checked) {
      setSelectedUsers(usersList.map((u) => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý người dùng"
        subtitle="Quản lý và theo dõi tài khoản người dùng trên nền tảng"
      />

      {/* Stats */}
      <AdminUserStats
        stats={stats}
        activeTab={activeTab}
        loading={statsLoading}
      />

      {/* Tabs */}
      <div className="mt-6">
        <AdminUserTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={stats}
        />
      </div>

      {/* Filters */}
      <div className="mt-6">
        <AdminUserFilters
          search={search}
          status={status}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Table */}
      <div className="mt-6">
        <AdminUserTable
          users={users}
          loading={loading}
          onView={handleViewUser}
          onEdit={handleEditUser}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          selectedUsers={selectedUsers}
          onSelectUser={handleSelectUser}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">
            Hiển thị{' '}
            <span className="font-medium">
              {(pagination.currentPage - 1) * pagination.limit + 1}
            </span>{' '}
            -{' '}
            <span className="font-medium">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
            </span>{' '}
            trong{' '}
            <span className="font-medium">{pagination.totalRecords}</span> người dùng
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                      pagination.currentPage === pageNum
                        ? 'bg-[hsl(var(--admin-accent))] text-white'
                        : 'text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="gap-1"
            >
              Sau
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Modal */}
      <AdminUserModal
        user={viewUser}
        open={!!viewUser}
        onClose={() => setViewUser(null)}
      />

      {/* Edit Modal */}
      <AdminUserEditModal
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={handleSaveEdit}
        loading={editLoading}
      />
    </AdminLayout>
  );
};

export default AdminUsersPage;
