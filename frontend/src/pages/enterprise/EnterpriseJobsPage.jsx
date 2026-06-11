import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, RefreshCw, Search, Eye, Edit, Trash2, Send, XCircle, MoreVertical, Clock } from 'lucide-react';

import { Button, Badge, Input } from '@/components/ui';
import {
  fetchEnterpriseJobs,
  selectEnterpriseJobs,
  selectEnterpriseJobsTotal,
  selectEnterpriseJobsLoading
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  deleteJob as deleteJobAPI,
  submitJobForApproval as submitJobAPI,
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

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, jobId: null });
  const [actionLoading, setActionLoading] = useState(null);

  const fetchJobs = useCallback(async () => {
    const params = { limit: 50 };
    if (activeTab !== 'all') params.status = activeTab;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchEnterpriseJobs(params));
  }, [dispatch, activeTab, searchQuery]);

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

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.job?.title?.toLowerCase().includes(query)
    );
  });

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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng tin', value: total, color: 'text-[hsl(var(--admin-accent))]' },
            { label: 'Đã đăng', value: jobs.filter(j => j.status === 'published').length, color: 'text-emerald-600' },
            { label: 'Chờ duyệt', value: jobs.filter(j => j.status === 'pending_approval').length, color: 'text-amber-600' },
            { label: 'Bản nháp', value: jobs.filter(j => j.status === 'draft').length, color: 'text-slate-500' }
          ].map(stat => (
            <div key={stat.label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-4">
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
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
                      >
                        <Eye size={18} />
                      </Button>
                      {(job.status === 'draft' || job.status === 'published') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/enterprise/recruitment/${job._id}/edit`)}
                          className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))]"
                        >
                          <Edit size={18} />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-[hsl(var(--admin-text-muted))]">
                            <MoreVertical size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {job.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleSubmitForApproval(job._id)}
                              disabled={actionLoading === job._id}
                              className="text-emerald-600"
                            >
                              <Send size={14} className="mr-2" /> Gửi duyệt
                            </DropdownMenuItem>
                          )}
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
                    </div>
                  </div>
                </div>
              );
            })}
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
