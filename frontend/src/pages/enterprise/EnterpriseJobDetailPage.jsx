import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase, MapPin, Clock, Users, Eye, Edit, Send, XCircle,
  DollarSign, CheckCircle, AlertCircle, Calendar, Video, Building2
} from 'lucide-react';

import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  fetchEnterpriseJobDetails,
  fetchJobApplications,
  fetchJobStats,
  selectEnterpriseJobDetails,
  selectJobApplications,
  selectJobStats,
  selectJobApplicationsLoading
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  submitJobForApproval as submitJobAPI,
  closeJob as closeJobAPI
} from '@/apis/recruitmentAPI';

const statusConfig = {
  draft: { label: 'Bản nháp', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  pending_approval: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  published: { label: 'Đã đăng', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: 'Đã đóng', className: 'bg-red-100 text-red-700 border-red-200' },
  expired: { label: 'Hết hạn', className: 'bg-slate-200 text-slate-500 border-slate-300' }
};

const applicationStatusConfig = {
  new: { label: 'Mới', className: 'bg-blue-100 text-blue-700' },
  reviewing: { label: 'Đang xem', className: 'bg-amber-100 text-amber-700' },
  shortlisted: { label: 'Shortlist', className: 'bg-purple-100 text-purple-700' },
  interview_scheduled: { label: 'Đã lên lịch PV', className: 'bg-indigo-100 text-indigo-700' },
  interviewed: { label: 'Đã PV', className: 'bg-teal-100 text-teal-700' },
  offered: { label: 'Đã offer', className: 'bg-emerald-100 text-emerald-700' },
  hired: { label: 'Đã tuyển', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Rút đơn', className: 'bg-slate-200 text-slate-600' }
};

const formatSalary = (salary) => {
  if (!salary) return 'Thoả thuận';
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

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export default function EnterpriseJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const job = useSelector(selectEnterpriseJobDetails);
  const applications = useSelector(selectJobApplications);
  const stats = useSelector(selectJobStats);
  const loading = useSelector(selectJobApplicationsLoading);

  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async () => {
    dispatch(fetchEnterpriseJobDetails(id));
    dispatch(fetchJobApplications({ jobId: id }));
    dispatch(fetchJobStats(id));
  }, [dispatch, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitForApproval = async () => {
    setActionLoading('submit');
    try {
      await submitJobAPI(id);
      toast.success('Đã gửi tin để duyệt');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseJob = async () => {
    setActionLoading('close');
    try {
      await closeJobAPI(id);
      toast.success('Đã đóng tin tuyển dụng');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đóng thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  if (!job) {
    return (
      <>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[hsl(var(--admin-accent))] border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  const status = statusConfig[job.status] || statusConfig.draft;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[hsl(var(--admin-accent-subtle))]">
              <Briefcase size={24} className="text-[hsl(var(--admin-accent))]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">
                  {job.title || job.job?.title}
                </h1>
                <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
              </div>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                {job.location?.province} • {job.location?.address} • {job.job?.type || job.type}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(job.status === 'draft' || job.status === 'published') && (
              <Button
                variant="outline"
                onClick={() => navigate(`/enterprise/recruitment/${id}/edit`)}
                className="border-[hsl(var(--admin-border))]"
              >
                <Edit size={14} className="mr-2" /> Chỉnh sửa
              </Button>
            )}
            {job.status === 'draft' && (
              <Button
                onClick={handleSubmitForApproval}
                disabled={actionLoading === 'submit'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send size={14} className="mr-2" /> Gửi duyệt
              </Button>
            )}
            {job.status === 'published' && (
              <Button
                variant="destructive"
                onClick={handleCloseJob}
                disabled={actionLoading === 'close'}
              >
                <XCircle size={14} className="mr-2" /> Đóng tin
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lượt xem', value: stats?.views || job.stats?.views || 0, icon: Eye, color: 'text-blue-600' },
            { label: 'Ứng viên', value: stats?.applications || job.stats?.applications || 0, icon: Users, color: 'text-purple-600' },
            { label: 'Shortlist', value: stats?.shortlisted || job.stats?.shortlisted || 0, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Đã tuyển', value: stats?.hires || job.stats?.hires || 0, icon: Building2, color: 'text-teal-600' }
          ].map(stat => (
            <div key={stat.label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-4 flex items-center gap-3">
              <stat.icon size={20} className={stat.color} />
              <div>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">{stat.label}</p>
                <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg">Mô tả công việc</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[hsl(var(--admin-text-secondary))] whitespace-pre-wrap">
                  {job.description || job.job?.description}
                </p>
              </CardContent>
            </Card>

            {/* Requirements */}
            {(Array.isArray(job.requirements) ? job.requirements : job.job?.requirements || []).length > 0 && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Yêu cầu công việc</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(Array.isArray(job.requirements) ? job.requirements : job.job?.requirements || []).map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {(Array.isArray(job.benefits) ? job.benefits : job.job?.benefits || []).length > 0 && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Phúc lợi</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(Array.isArray(job.benefits) ? job.benefits : job.job?.benefits || []).map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {(Array.isArray(job.skills) ? job.skills : job.requirements?.skills || []).length > 0 && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Kỹ năng yêu cầu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(job.skills) ? job.skills : job.requirements?.skills || []).map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="border-[hsl(var(--admin-border))]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg">Thông tin nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Lương</p>
                    <p className="text-sm font-medium">{formatSalary(job.salary)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Địa điểm</p>
                    <p className="text-sm font-medium">{job.location?.province}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Hạn nộp</p>
                    <p className="text-sm font-medium">{formatDate(job.deadline)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Số lượng</p>
                    <p className="text-sm font-medium">{job.quantity || 1} người</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interview Config */}
            {job.interviewConfig && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Cấu hình phỏng vấn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <span>
                      {job.interviewConfig.meetingType === 'google_meet' ? 'Jitsi Meet' :
                       job.interviewConfig.meetingType === 'office' ? 'Tại văn phòng' : 'Điện thoại'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <span>{job.interviewConfig.duration || 60} phút</span>
                  </div>
                  {job.interviewConfig.allowReschedule && (
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-emerald-500" />
                      <span>Cho phép hoãn lịch (tối đa {job.interviewConfig.maxReschedules || 2} lần)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Applications List */}
        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Danh sách ứng viên ({applications.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/enterprise/applications?jobId=${id}`)}
              className="border-[hsl(var(--admin-border))]"
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[hsl(var(--admin-surface-elevated))] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <Users size={40} className="text-[hsl(var(--admin-text-faint))] mx-auto mb-3" />
                <p className="text-[hsl(var(--admin-text-muted))]">Chưa có ứng viên nào.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map(app => {
                  const appStatus = applicationStatusConfig[app.status] || applicationStatusConfig.new;
                  return (
                    <div
                      key={app._id}
                      className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--admin-surface-elevated))] hover:bg-[hsl(var(--admin-surface-hover))] transition-colors cursor-pointer"
                      onClick={() => navigate(`/enterprise/applications/${app._id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[hsl(var(--admin-accent-subtle))] flex items-center justify-center">
                          <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">
                            {app.workerName?.[0] || app.worker?.name?.[0] || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--admin-text-primary))]">
                            {app.workerName || app.worker?.name || 'Ứng viên'}
                          </p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                            Ứng tuyển {formatDateTime(app.appliedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${appStatus.className} text-xs`}>{appStatus.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
