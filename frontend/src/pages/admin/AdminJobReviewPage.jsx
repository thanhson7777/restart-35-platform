import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase, CheckCircle, XCircle, Clock, ArrowLeft,
  MapPin, DollarSign, Users, Loader2, Building
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Textarea } from '@/components/ui';
import { getJobForReview, approveJob, rejectJob } from '@/apis/recruitmentAPI';
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
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const JOB_TYPE_LABELS = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  temporary: 'Tạm thời',
  freelance: 'Freelance',
  internship: 'Thực tập',
};

export default function AdminJobReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await getJobForReview(id);
        setJob(res?.data?.data || res?.data || res);
      } catch (err) {
        toast.error('Không thể tải thông tin tin tuyển dụng');
        navigate('/admin/jobs/pending');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchJob();
  }, [id, navigate]);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await approveJob(id);
      toast.success('Đã duyệt tin tuyển dụng!');
      navigate('/admin/jobs/pending');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
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
      await rejectJob(id, rejectReason);
      toast.success('Đã từ chối tin tuyển dụng');
      navigate('/admin/jobs/pending');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--admin-bg))] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--admin-accent))]" />
      </div>
    );
  }

  if (!job) return null;

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
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin/jobs/pending')}>
                  <ArrowLeft size={20} className="mr-2" />
                </Button>
                <div>
                  <h2 className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">
                    Xem trước tin tuyển dụng
                  </h2>
                  <p className="text-[hsl(var(--admin-text-muted))] text-sm">
                    ID: {job._id}
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1.5">
                <Clock size={14} className="mr-1" /> Chờ duyệt
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Enterprise Info */}
                <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                  <CardHeader>
                    <CardTitle className="text-lg">Thông tin doanh nghiệp</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-[hsl(var(--admin-border))] flex items-center justify-center overflow-hidden shrink-0">
                        {job.enterpriseInfo?.logo ? (
                          <img src={job.enterpriseInfo.logo} alt={job.enterpriseInfo?.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building size={24} className="text-[hsl(var(--admin-text-muted))]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[hsl(var(--admin-text-primary))] text-lg">
                            {job.enterpriseInfo?.name || 'Doanh nghiệp'}
                          </p>
                          {job.enterpriseInfo?.verified && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              <CheckCircle size={12} className="mr-1" /> Đã xác minh
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                          {job.enterpriseInfo?.industry}
                          {job.enterpriseInfo?.size && ` • ${job.enterpriseInfo.size}`}
                        </p>
                        {job.enterpriseInfo?.address && (
                          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                            {job.enterpriseInfo.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Title */}
                <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))] mb-2">
                          {job.job?.title || job.title || 'Không có tiêu đề'}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {JOB_TYPE_LABELS[job.job?.type] || job.type || 'Toàn thời gian'}
                          </Badge>
                          {job.location?.type && (
                            <Badge variant="outline" className="text-xs">
                              {job.location.type === 'onsite' ? 'Tại văn phòng' :
                               job.location.type === 'remote' ? 'Từ xa' : 'Kết hợp'}
                            </Badge>
                          )}
                          {job.job?.quantity && (
                            <Badge variant="outline" className="text-xs">
                              <Users size={10} className="mr-1" /> {job.job.quantity} vị trí
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                      <div className="p-3 bg-[hsl(var(--admin-surface-elevated))] rounded-xl text-center">
                        <DollarSign size={16} className="mx-auto text-emerald-600 mb-1" />
                        <p className="text-sm font-semibold">
                          {formatSalary(job.salary || job.job?.salary)}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">Lương</p>
                      </div>
                      <div className="p-3 bg-[hsl(var(--admin-surface-elevated))] rounded-xl text-center">
                        <MapPin size={16} className="mx-auto text-blue-600 mb-1" />
                        <p className="text-sm font-semibold">
                          {job.location?.province || '—'}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">Địa điểm</p>
                      </div>
                      <div className="p-3 bg-[hsl(var(--admin-surface-elevated))] rounded-xl text-center">
                        <Clock size={16} className="mx-auto text-orange-600 mb-1" />
                        <p className="text-sm font-semibold">
                          {formatDate(job.deadline)}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">Hạn nộp</p>
                      </div>
                      <div className="p-3 bg-[hsl(var(--admin-surface-elevated))] rounded-xl text-center">
                        <Briefcase size={16} className="mx-auto text-purple-600 mb-1" />
                        <p className="text-sm font-semibold">
                          {formatDate(job.createdAt)}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngày tạo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Description */}
                {job.job?.description && (
                  <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                    <CardHeader>
                      <CardTitle className="text-base">Mô tả công việc</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-[hsl(var(--admin-text-secondary))] leading-relaxed">
                        {job.job.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Requirements */}
                {(job.job?.requirements?.length > 0 || job.requirements?.skills?.length > 0) && (
                  <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                    <CardHeader>
                      <CardTitle className="text-base">Yêu cầu công việc</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {[
                          ...(job.job?.requirements || []),
                          ...(job.requirements?.skills || []),
                        ].map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle size={16} className="text-[hsl(var(--admin-accent))] shrink-0 mt-0.5" />
                            <span className="text-[hsl(var(--admin-text-secondary))]">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Skills */}
                {(job.requirements?.skills?.length > 0 || job.job?.requirements?.skills?.length > 0) && (
                  <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                    <CardHeader>
                      <CardTitle className="text-base">Kỹ năng yêu cầu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(job.requirements?.skills || job.job?.requirements?.skills || []).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Benefits */}
                {job.job?.benefits?.length > 0 && (
                  <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                    <CardHeader>
                      <CardTitle className="text-base">Phúc lợi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {job.job.benefits.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-[hsl(var(--admin-text-secondary))]">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Location Details */}
                <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Địa điểm làm việc</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                      {job.location?.address || '—'}
                      {job.location?.district && `, ${job.location.district}`}
                      {job.location?.province && `, ${job.location.province}`}
                    </p>
                    {job.location?.type && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {job.location.type === 'onsite' ? 'Tại văn phòng' :
                         job.location.type === 'remote' ? 'Từ xa' : 'Kết hợp'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Interview Config */}
                {job.interviewConfig && (
                  <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                    <CardHeader>
                      <CardTitle className="text-base">Cấu hình phỏng vấn</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {job.interviewConfig.meetingType && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[hsl(var(--admin-text-muted))] w-36">Hình thức:</span>
                          <span className="font-medium">
                            {job.interviewConfig.meetingType === 'google_meet' ? 'Google Meet' :
                             job.interviewConfig.meetingType === 'office' ? 'Tại văn phòng' : 'Điện thoại'}
                          </span>
                        </div>
                      )}
                      {job.interviewConfig.duration && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[hsl(var(--admin-text-muted))] w-36">Thời lượng:</span>
                          <span className="font-medium">{job.interviewConfig.duration} phút</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[hsl(var(--admin-text-muted))] w-36">Cho phép hoãn:</span>
                        <span className="font-medium">
                          {job.interviewConfig.allowReschedule ? 'Có' : 'Không'}
                          {job.interviewConfig.allowReschedule && job.interviewConfig.maxReschedules && (
                            ` (tối đa ${job.interviewConfig.maxReschedules} lần)`
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar - Actions */}
              <div className="space-y-6">
                {/* Action Card */}
                <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                  <CardHeader>
                    <CardTitle className="text-lg">Hành động</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actionLoading === 'approve' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Duyệt tin
                    </Button>

                    {!showRejectForm ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(true)}
                        disabled={actionLoading}
                        className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={14} />
                        Từ chối
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="VD: Mô tả không đầy đủ, thông tin không chính xác..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={4}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                            className="flex-1"
                          >
                            Hủy
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleReject}
                            disabled={actionLoading === 'reject'}
                            className="flex-1 gap-1"
                          >
                            {actionLoading === 'reject' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <XCircle size={12} />
                            )}
                            Xác nhận
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Job Info */}
                <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                  <CardHeader>
                    <CardTitle className="text-base">Thông tin bổ sung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--admin-text-muted))]">Ngày tạo</span>
                      <span className="font-medium">{formatDate(job.createdAt)}</span>
                    </div>
                    {job.deadline && (
                      <div className="flex justify-between">
                        <span className="text-[hsl(var(--admin-text-muted))]">Hạn nộp</span>
                        <span className="font-medium">{formatDate(job.deadline)}</span>
                      </div>
                    )}
                    {job.job?.education && (
                      <div className="flex justify-between">
                        <span className="text-[hsl(var(--admin-text-muted))]">Trình độ</span>
                        <span className="font-medium">{job.job.education}</span>
                      </div>
                    )}
                    {job.job?.experience !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[hsl(var(--admin-text-muted))]">Kinh nghiệm</span>
                        <span className="font-medium">{job.job.experience} năm</span>
                      </div>
                    )}
                    {job.job?.gender && job.job.gender !== 'any' && (
                      <div className="flex justify-between">
                        <span className="text-[hsl(var(--admin-text-muted))]">Giới tính</span>
                        <span className="font-medium">
                          {job.job.gender === 'male' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
