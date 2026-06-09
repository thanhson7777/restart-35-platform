import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Eye, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { getAllApplications, approveApplication, rejectApplication } from '@/apis/applicationApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const statusConfig = {
  submitted: { label: 'Đã nộp', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  pending: { label: 'Chờ duyệt', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  approved: { label: 'Đã duyệt', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  rejected: { label: 'Từ chối', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  waitlisted: { label: 'Danh sách chờ', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'submitted', label: 'Đã nộp' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'waitlisted', label: 'Danh sách chờ' },
];

const AdminApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
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
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getAllApplications({ limit: 1 });
      if (res.success) {
        setStats({
          total: res.pagination?.totalRecords || 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
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

      const res = await getAllApplications(params);
      if (res.success) {
        setApplications(res.data || []);

        const statsData = res.stats || {};
        setStats((s) => ({
          ...s,
          total: res.pagination?.totalRecords || 0,
          pending: statsData.pending || 0,
          approved: statsData.approved || 0,
          rejected: statsData.rejected || 0,
        }));

        setPagination(res.pagination || {
          currentPage: 1,
          limit: DEFAULT_LIMIT,
          totalRecords: 0,
          totalPages: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Không thể tải danh sách đơn ứng tuyển');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    fetchApplications();
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleApprove = async (app) => {
    try {
      setActionLoading(true);
      await approveApplication(app._id, { notes: 'Approved by admin' });
      toast.success('Duyệt đơn thành công');
      fetchApplications();
      fetchStats();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Không thể duyệt đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (app) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await rejectApplication(app._id, { reason });
      toast.success('Từ chối đơn thành công');
      fetchApplications();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Không thể từ chối đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchApplications();
  };

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.currentPage || 1;
  const totalRecords = pagination?.totalRecords || 0;

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý đơn ứng tuyển"
        subtitle="Theo dõi và duyệt các đơn ứng tuyển học bổng trên nền tảng"
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'total', label: 'Tổng đơn', value: stats?.total || 0, color: 'text-[hsl(var(--admin-accent))]' },
          { key: 'pending', label: 'Chờ duyệt', value: stats?.pending || 0, color: 'text-amber-500', urgent: true },
          { key: 'approved', label: 'Đã duyệt', value: stats?.approved || 0, color: 'text-emerald-500' },
          { key: 'rejected', label: 'Từ chối', value: stats?.rejected || 0, color: 'text-rose-500' },
        ].map((item) => (
          <div key={item.key} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
            <p className={`text-2xl font-extrabold tabular-nums ${item.color}`}>{item.value}</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{item.label}</p>
            {item.urgent && item.value > 0 && (
              <p className="text-xs text-amber-500 mt-1">{item.value} đơn đang chờ bạn duyệt</p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-4 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
              bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
              placeholder:text-[hsl(var(--admin-text-muted))]
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
          />
          <Button onClick={handleSearch} size="sm" className="h-10">Tìm kiếm</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = (tab.key === 'all' && !filters.status) || filters.status === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleFiltersChange({ ...filters, status: tab.key === 'all' ? '' : tab.key, page: 1 })}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-[hsl(var(--admin-accent))] text-white'
                    : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
              <tr>
                {['Học viên', 'Khóa học', 'Học bổng', 'Trạng thái', 'Ngày nộp', 'Thao tác'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-[hsl(var(--admin-surface-elevated))] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-[hsl(var(--admin-text-muted))] mb-4 opacity-60" />
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] mb-2">Chưa có đơn nào</h3>
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy đơn ứng tuyển nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                <tr>
                  {['Học viên', 'Khóa học', 'Học bổng', 'Trạng thái', 'Ngày nộp', 'Thao tác'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                {applications.map((app) => {
                  const statusInfo = statusConfig[app.status] || { label: app.status, className: '' };
                  return (
                    <tr key={app._id} className="hover:bg-[hsl(var(--admin-surface-hover))] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                            {app.workerId?.displayName || app.workerName || 'N/A'}
                          </p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                            {app.workerId?.email || app.workerEmail || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                          {app.courseId?.title || app.courseName || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                          {app.scholarshipId?.title || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[hsl(var(--admin-text-muted))]">
                          {formatDate(app.submittedAt || app.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="p-1.5 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                          </button>
                          {(app.status === 'submitted' || app.status === 'pending') && (
                            <>
                              <button
                                onClick={() => handleApprove(app)}
                                disabled={actionLoading}
                                className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Duyệt"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              </button>
                              <button
                                onClick={() => handleReject(app)}
                                disabled={actionLoading}
                                className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Từ chối"
                              >
                                <XCircle className="w-4 h-4 text-rose-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[hsl(var(--admin-border))] flex items-center justify-between">
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                Hiển thị {(currentPage - 1) * (pagination?.limit || 10) + 1} -{' '}
                {Math.min(currentPage * (pagination?.limit || 10), totalRecords)} trong {totalRecords} đơn
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1 border-[hsl(var(--admin-border))]"
                >
                  Trước
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) { pageNum = i + 1; }
                  else if (currentPage <= 3) { pageNum = i + 1; }
                  else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                  else { pageNum = currentPage - 2 + i; }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 text-sm rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-[hsl(var(--admin-accent))] text-white'
                          : 'border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1 border-[hsl(var(--admin-border))]"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedApp(null)} />
          <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Chi tiết đơn ứng tuyển</h2>
              <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg">
                <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Học viên</p>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                    {selectedApp.workerId?.displayName || 'N/A'}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">{selectedApp.workerId?.email}</p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Trạng thái</p>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${
                    statusConfig[selectedApp.status]?.className || ''
                  }`}>
                    {statusConfig[selectedApp.status]?.label || selectedApp.status}
                  </span>
                </div>
              </div>
              {selectedApp.courseId && (
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Khóa học</p>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                    {selectedApp.courseId.title || '-'}
                  </p>
                </div>
              )}
              {selectedApp.answers && Object.keys(selectedApp.answers).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Câu trả lời</p>
                  <div className="space-y-2">
                    {Object.entries(selectedApp.answers).map(([question, answer]) => (
                      <div key={question} className="p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">{question}</p>
                        <p className="text-sm text-[hsl(var(--admin-text-primary))]">{String(answer)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
              {(selectedApp.status === 'submitted' || selectedApp.status === 'pending') && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { handleReject(selectedApp); setSelectedApp(null); }}
                    disabled={actionLoading}
                    className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                  >
                    Từ chối
                  </Button>
                  <Button
                    onClick={() => { handleApprove(selectedApp); setSelectedApp(null); }}
                    disabled={actionLoading}
                    className="gap-2 rounded-xl"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Duyệt đơn
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminApplicationsPage;
