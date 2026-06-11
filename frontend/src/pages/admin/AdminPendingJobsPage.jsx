import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, XCircle, Clock, Eye, Loader2, RefreshCw, Search, MapPin, DollarSign, Users } from 'lucide-react';
import { Button, Badge, Card, CardContent } from '@/components/ui';
import { getPendingJobs, getJobForReview, approveJob, rejectJob } from '@/apis/recruitmentAPI';
import AdminHeader from '@/components/layout/AdminHeader';
import AdminSidebar from '@/components/layout/AdminSidebar';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';

const formatSalary = (salary) => {
  if (!salary || (!salary.min && !salary.max)) return 'Thoả thuận';
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  if (salary.min && salary.max) return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
  if (salary.min) return `Từ ${formatter.format(salary.min)}`;
  if (salary.max) return `Đến ${formatter.format(salary.max)}`;
  return 'Thoả thuận';
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDaysAgo = (date) => {
  if (!date) return '';
  const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
};

const JOB_TYPE_LABELS = {
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  temporary: 'Tạm thời',
  freelance: 'Freelance',
  internship: 'Thực tập',
};

const ReviewModal = ({ job, onClose, onAction }) => {
  if (!job) return null;
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await onAction('approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading('reject');
    try {
      await onAction('reject', rejectReason);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Xem trước tin tuyển dụng</h2>
            <button onClick={onClose} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Enterprise Info */}
          <div className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-surface))] rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-[hsl(var(--admin-border))] flex items-center justify-center overflow-hidden">
              {job.enterpriseInfo?.logo ? (
                <img src={job.enterpriseInfo.logo} alt={job.enterpriseInfo?.name} className="w-full h-full object-cover" />
              ) : (
                <Briefcase size={20} className="text-[hsl(var(--admin-text-muted))]" />
              )}
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--admin-text-primary))]">
                {job.enterpriseInfo?.name || 'Doanh nghiệp'}
              </p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                {job.enterpriseInfo?.industry} {job.enterpriseInfo?.size && `• ${job.enterpriseInfo.size}`}
              </p>
            </div>
            {job.enterpriseInfo?.verified && (
              <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200 text-xs">
                <CheckCircle size={12} className="mr-1" /> Đã xác minh
              </Badge>
            )}
          </div>

          {/* Job Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">
                  {job.job?.title || job.title}
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {JOB_TYPE_LABELS[job.job?.type] || job.type || 'Toàn thời gian'}
                  </Badge>
                  {job.location?.type && (
                    <Badge variant="outline" className="text-xs">
                      {job.location.type === 'onsite' ? 'Tại văn phòng' : job.location.type === 'remote' ? 'Từ xa' : 'Kết hợp'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[hsl(var(--admin-surface))] rounded-lg text-center">
                <DollarSign size={16} className="mx-auto text-emerald-600 mb-1" />
                <p className="text-sm font-semibold">{formatSalary(job.salary || job.job?.salary)}</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Lương</p>
              </div>
              <div className="p-3 bg-[hsl(var(--admin-surface))] rounded-lg text-center">
                <MapPin size={16} className="mx-auto text-blue-600 mb-1" />
                <p className="text-sm font-semibold">{job.location?.province || '—'}</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Địa điểm</p>
              </div>
              <div className="p-3 bg-[hsl(var(--admin-surface))] rounded-lg text-center">
                <Users size={16} className="mx-auto text-purple-600 mb-1" />
                <p className="text-sm font-semibold">{job.job?.quantity || 1} người</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Số lượng</p>
              </div>
              <div className="p-3 bg-[hsl(var(--admin-surface))] rounded-lg text-center">
                <Clock size={16} className="mx-auto text-orange-600 mb-1" />
                <p className="text-sm font-semibold">{formatDaysAgo(job.createdAt)}</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngày tạo</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.job?.description && (
            <div className="p-4 bg-[hsl(var(--admin-surface))] rounded-xl">
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] mb-2">Mô tả công việc</p>
              <p className="text-sm text-[hsl(var(--admin-text-muted))] whitespace-pre-wrap">
                {job.job.description.length > 500 ? job.job.description.slice(0, 500) + '...' : job.job.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {(job.job?.requirements?.length > 0 || job.requirements?.skills?.length > 0) && (
            <div className="p-4 bg-[hsl(var(--admin-surface))] rounded-xl">
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] mb-2">Yêu cầu & Kỹ năng</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ...(job.job?.requirements || []),
                  ...(job.requirements?.skills || []),
                ].map((req, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{req}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.job?.benefits?.length > 0 && (
            <div className="p-4 bg-[hsl(var(--admin-surface))] rounded-xl">
              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] mb-2">Phúc lợi</p>
              <div className="flex flex-wrap gap-2">
                {job.job.benefits.map((b, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{b}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reject Reason Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
              Lý do từ chối (bắt buộc nếu từ chối)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-[hsl(var(--admin-border))] rounded-lg bg-[hsl(var(--admin-surface))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]"
              rows={3}
              placeholder="VD: Mô tả không đầy đủ, thông tin không chính xác..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-[hsl(var(--admin-border))] flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={actionLoading}
          >
            Đóng
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={actionLoading === 'approve'}
            className="gap-2"
          >
            {actionLoading === 'reject' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <XCircle size={14} />
            )}
            Từ chối
          </Button>
          <Button
            onClick={handleApprove}
            disabled={actionLoading === 'reject'}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {actionLoading === 'approve' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            Duyệt tin
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPendingJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPendingJobs({ limit: 50 });
      const data = res?.data?.data || res?.data || {};
      setJobs(data.jobs || data || []);
    } catch (err) {
      toast.error('Không thể tải danh sách tin chờ duyệt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleReview = async (job) => {
    setReviewLoading(true);
    try {
      const res = await getJobForReview(job._id);
      setSelectedJob(res?.data?.data || res?.data || job);
    } catch (err) {
      toast.error('Không thể tải chi tiết tin');
      setSelectedJob(job);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAction = async (action, reason) => {
    if (!selectedJob) return;
    try {
      if (action === 'approve') {
        await approveJob(selectedJob._id);
        toast.success('Đã duyệt tin tuyển dụng!');
      } else {
        await rejectJob(selectedJob._id, reason);
        toast.success('Đã từ chối tin tuyển dụng');
      }
      setSelectedJob(null);
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const title = (job.job?.title || '').toLowerCase();
    const enterprise = (job.enterpriseInfo?.name || '').toLowerCase();
    return title.includes(q) || enterprise.includes(q);
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={cn(
        'min-h-screen transition-all duration-300',
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      )}>
        <AdminHeader
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="pt-16 min-h-screen">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">
                  Tin tuyển dụng chờ duyệt
                </h1>
                <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
                  Danh sách tin chờ bạn duyệt trước khi hiển thị công khai.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1.5">
                  <Clock size={14} className="mr-1" />
                  {jobs.length} tin chờ duyệt
                </Badge>
                <Button variant="outline" onClick={fetchJobs} className="gap-2 border-[hsl(var(--admin-border))]">
                  <RefreshCw size={13} /> Làm mới
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                <input
                  type="text"
                  placeholder="Tìm theo tên công việc, doanh nghiệp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl bg-[hsl(var(--admin-surface))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]"
                />
              </div>
            </div>

            {/* Jobs List */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-28 bg-[hsl(var(--admin-surface))] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <CheckCircle size={48} className="text-[hsl(var(--admin-text-faint))] mb-4" />
                <p className="text-[hsl(var(--admin-text-muted))] font-medium">
                  {searchQuery ? 'Không tìm thấy tin nào phù hợp.' : 'Không có tin nào chờ duyệt!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map(job => (
                  <div
                    key={job._id}
                    className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 hover:border-[hsl(var(--admin-accent))] transition-all cursor-pointer"
                    onClick={() => navigate(`/admin/jobs/${job._id}/review`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-[hsl(var(--admin-border))] flex items-center justify-center overflow-hidden shrink-0">
                          {job.enterpriseInfo?.logo ? (
                            <img src={job.enterpriseInfo.logo} alt={job.enterpriseInfo?.name} className="w-full h-full object-cover" />
                          ) : (
                            <Briefcase size={20} className="text-[hsl(var(--admin-text-muted))]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] truncate">
                              {job.job?.title || 'Không có tiêu đề'}
                            </h3>
                            {job.enterpriseInfo?.verified && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs shrink-0">
                                <CheckCircle size={10} className="mr-0.5" /> Đã xác minh
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                            {job.enterpriseInfo?.name || 'Doanh nghiệp'}
                            {job.enterpriseInfo?.industry && ` • ${job.enterpriseInfo.industry}`}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[hsl(var(--admin-text-muted))]">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {job.location?.province || '—'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign size={12} />
                              {formatSalary(job.salary || job.job?.salary)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDaysAgo(job.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          <Clock size={10} className="mr-0.5" /> Chờ duyệt
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/jobs/${job._id}/review`); }}
                        >
                          <Eye size={13} /> Xem & Duyệt
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Review Modal */}
      {selectedJob && (
        <ReviewModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
