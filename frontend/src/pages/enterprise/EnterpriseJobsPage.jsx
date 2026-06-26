import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, RefreshCw, Search, Eye, Edit, Trash2, Send, XCircle, MoreVertical, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, Badge, Input } from '@/components/ui';
import {
  fetchEnterpriseJobs,
  selectEnterpriseJobs,
  selectEnterpriseJobsTotal,
  selectEnterpriseJobsLoading,
  selectEnterpriseJobsStats
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useSocket } from '@/contexts/SocketContext';
import {
  deleteJob as deleteJobAPI,
  submitJobForApproval as submitJobAPI,
  cancelJobApproval as cancelJobApprovalAPI,
  closeJob as closeJobAPI
} from '@/apis/recruitmentAPI';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';

const statusConfig = {
  draft: { label: 'Bản nháp', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  pending_approval: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  published: { label: 'Đã đăng', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: 'Đã đóng', className: 'bg-red-100 text-red-700 border-red-200' },
  expired: { label: 'Hết hạn', className: 'bg-slate-200 text-slate-500 border-slate-300' }
};

const tabs = [
  { id: 'all', label: 'Tất cả' },
  { id: 'draft', label: 'Bản nháp' },
  { id: 'pending_approval', label: 'Chờ duyệt' },
  { id: 'published', label: 'Đã đăng' },
  { id: 'closed', label: 'Đã đóng' }
];

const formatSalary = (min, max, negotiable) => {
  if (negotiable) return 'Thoả thuận';
  if (!min && !max) return 'Thoả thuận';
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
  return min ? `Từ ${formatter.format(min)}` : `Đến ${formatter.format(max)}`;
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function EnterpriseJobsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const jobs = useSelector(selectEnterpriseJobs);
  const total = useSelector(selectEnterpriseJobsTotal);
  const loading = useSelector(selectEnterpriseJobsLoading);
  const statsCounts = useSelector(selectEnterpriseJobsStats) || {};

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [deleteModal, setDeleteModal] = useState({ open: false, jobId: null });
  const [actionLoading, setActionLoading] = useState(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const fetchJobs = useCallback(async () => {
    const params = { page, limit };
    if (activeTab !== 'all') params.status = activeTab;
    if (debouncedSearch) params.search = debouncedSearch;
    dispatch(fetchEnterpriseJobs(params));
  }, [dispatch, activeTab, debouncedSearch, page, limit]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      if (notification.type === 'JOB_APPROVED' || notification.type === 'JOB_REJECTED') {
        fetchJobs();
      }
    };
    socket.on('NEW_NOTIFICATION', handleNewNotification);
    return () => socket.off('NEW_NOTIFICATION', handleNewNotification);
  }, [socket, fetchJobs]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async () => {
    if (!deleteModal.jobId) return;
    setActionLoading(deleteModal.jobId);
    try {
      await deleteJobAPI(deleteModal.jobId);
      toast.success('Xóa tin tuyển dụng thành công');
      setDeleteModal({ open: false, jobId: null });
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitForApproval = async (jobId) => {
    setActionLoading(jobId);
    try {
      await submitJobAPI(jobId);
      toast.success('Đã gửi tin để duyệt');
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelApproval = async (jobId) => {
    if (!window.confirm('Bạn có chắc muốn hủy gửi duyệt? Tin sẽ trở về trạng thái nháp.')) return;
    setActionLoading(jobId);
    try {
      await cancelJobApprovalAPI(jobId);
      toast.success('Đã hủy duyệt, tin chuyển về trạng thái nháp');
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hủy thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseJob = async (jobId) => {
    setActionLoading(jobId);
    try {
      await closeJobAPI(jobId);
      toast.success('Đã đóng tin tuyển dụng');
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đóng thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  // We no longer need local filtering since the API handles the search and pagination
  const filteredJobs = jobs;
  
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Quản lý Tin Tuyển Dụng</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Tạo và quản lý tin tuyển dụng của doanh nghiệp.</p>
          </div>
          <Button
            onClick={() => navigate('/enterprise/recruitment/create')}
            className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white"
          >
            <Plus size={14} /> Tạo tin mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Tổng tin', value: statsCounts.total || 0, color: 'text-[hsl(var(--admin-accent))]' },
            { label: 'Đã đăng', value: statsCounts.published || 0, color: 'text-emerald-600' },
            { label: 'Chờ duyệt', value: statsCounts.pending_approval || 0, color: 'text-amber-600' },
            { label: 'Bản nháp', value: statsCounts.draft || 0, color: 'text-slate-500' },
            { label: 'Đã đóng', value: statsCounts.closed || 0, color: 'text-red-600' }
          ].map(stat => (
            <div key={stat.label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-4">
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[hsl(var(--admin-accent))] text-white'
                    : 'bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
            <Input
              placeholder="Tìm kiếm tin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]"
            />
          </div>
        </div>

        {/* Jobs List */}
        <Button variant="outline" onClick={fetchJobs} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] gap-2">
          <RefreshCw size={13} /> Làm mới
        </Button>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Briefcase size={40} className="text-[hsl(var(--admin-text-faint))] mb-4" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có tin tuyển dụng nào.</p>
            <Button
              onClick={() => navigate('/enterprise/recruitment/create')}
              className="mt-4 gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white"
            >
              <Plus size={14} /> Tạo tin đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const status = statusConfig[job.status] || statusConfig.draft;
              return (
                <div
                  key={job._id}
                  className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 hover:border-[hsl(var(--admin-border-strong))] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] truncate">
                          {job.title || job.job?.title}
                        </h3>
                        <Badge className={`${status.className} text-xs shrink-0`}>{status.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--admin-text-muted))]">
                        <span>{job.location?.address || job.location?.province || '—'}</span>
                        <span>{job.job?.type || job.type || '—'}</span>
                        <span>{formatSalary(job.salary?.min, job.salary?.max, job.salary?.negotiable)}</span>
                        {job.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Hạn nộp: {formatDate(job.deadline)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-[hsl(var(--admin-text-muted))]">
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {job.stats?.views || 0} lượt xem
                        </span>
                        <span>{job.stats?.applications || 0} ứng viên</span>
                        <span>{job.stats?.shortlisted || 0} shortlisted</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/enterprise/recruitment/${job._id}`)}
                        className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))]"
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </Button>
                      {(job.status === 'draft' || job.status === 'published') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/enterprise/recruitment/${job._id}/edit`)}
                          className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))]"
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </Button>
                      )}

                      {job.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteModal({ open: true, jobId: job._id })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Xóa bản nháp"
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}

                      {job.status === 'pending_approval' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelApproval(job._id)}
                          disabled={actionLoading === job._id}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Hủy duyệt"
                        >
                          <XCircle size={18} />
                        </Button>
                      )}

                      {(job.status !== 'draft' && job.status !== 'pending_approval') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[hsl(var(--admin-text-muted))]">
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {job.status === 'published' && (
                              <DropdownMenuItem
                                onClick={() => handleCloseJob(job._id)}
                                disabled={actionLoading === job._id}
                                className="text-red-600"
                              >
                                <XCircle size={14} className="mr-2" /> Đóng tin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => navigate(`/enterprise/recruitment/${job._id}`)}
                            >
                              <Eye size={14} className="mr-2" /> Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/enterprise/recruitment/${job._id}/edit`)}
                            >
                              <Edit size={14} className="mr-2" /> Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/enterprise/applications?jobId=${job._id}`)}
                            >
                              Xem ứng viên
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteModal({ open: true, jobId: job._id })}
                              className="text-red-600"
                            >
                              <Trash2 size={14} className="mr-2" /> Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-[hsl(var(--admin-border))]">
                <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                  Hiển thị <span className="font-medium text-[hsl(var(--admin-text-primary))]">{((page - 1) * limit) + 1}</span> đến <span className="font-medium text-[hsl(var(--admin-text-primary))]">{Math.min(page * limit, total)}</span> trong số <span className="font-medium text-[hsl(var(--admin-text-primary))]">{total}</span> kết quả
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 w-8 text-[hsl(var(--admin-text-secondary))]"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      // Only show a few pages around current page to avoid clutter
                      if (
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        (pageNum >= page - 1 && pageNum <= page + 1)
                      ) {
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            onClick={() => setPage(pageNum)}
                            className={`h-8 w-8 p-0 ${
                              page === pageNum 
                                ? 'bg-[hsl(var(--admin-accent))] text-white hover:bg-[hsl(var(--admin-accent-hover))]' 
                                : 'text-[hsl(var(--admin-text-secondary))]'
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      if (
                        pageNum === page - 2 || 
                        pageNum === page + 2
                      ) {
                        return <span key={pageNum} className="text-[hsl(var(--admin-text-muted))] px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 w-8 text-[hsl(var(--admin-text-secondary))]"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, jobId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tin tuyển dụng</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tin tuyển dụng này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, jobId: null })}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
