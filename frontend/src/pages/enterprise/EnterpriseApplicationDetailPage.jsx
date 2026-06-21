import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, Calendar, Clock, CheckCircle, XCircle,
  CalendarPlus, Briefcase, GraduationCap, Award, FileText, ArrowLeft, AlertCircle
} from 'lucide-react';

import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Textarea } from '@/components/ui';
import {
  fetchEnterpriseApplicationDetails,
  fetchWorkerProfileForEnterprise,
  selectEnterpriseApplicationDetails,
  selectWorkerProfileForEnterprise,
  fetchApplicationInterview,
  selectCurrentApplicationInterview
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  shortlistApplication,
  rejectApplication,
  createInterview,
  updateInterviewEnterprise
} from '@/apis/recruitmentAPI';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';
import ScheduleInterviewForm from '@/components/enterprise/ScheduleInterviewForm';
import { VIETNAM_PROVINCES, EDUCATION_OPTIONS } from '@/data/profileData';
const applicationStatusConfig = {
  new: { label: 'Mới', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  reviewing: { label: 'Đang xem', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shortlisted: { label: 'Shortlist', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  interview_scheduled: { label: 'Đã lên lịch PV', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  interviewed: { label: 'Đã PV', className: 'bg-teal-100 text-teal-700 border-teal-200' },
  offered: { label: 'Đã offer', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  hired: { label: 'Đã tuyển', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 border-red-200' },
  withdrawn: { label: 'Rút đơn', className: 'bg-slate-200 text-slate-600 border-slate-300' }
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const GENDER_LABELS = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác'
};

const MARITAL_STATUS_LABELS = {
  single: 'Độc thân',
  married: 'Đã kết hôn',
  divorced: 'Ly hôn'
};

const getProvinceLabel = (value) => {
  if (!value) return null;
  const province = VIETNAM_PROVINCES.find(p => p.value === value);
  return province ? province.label : value;
};

const getEducationLabel = (value) => {
  if (!value) return null;
  const oldLabels = {
    primary: 'Tiểu học',
    lower_secondary: 'Trung học cơ sở',
    upper_secondary: 'Trung học phổ thông',
    college: 'Cao đẳng / Trung cấp',
    university: 'Đại học',
    master: 'Thạc sĩ / Tiến sĩ'
  };
  const edu = EDUCATION_OPTIONS.find(e => e.value === value);
  return edu ? edu.label : (oldLabels[value] || value);
};

export default function EnterpriseApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const application = useSelector(selectEnterpriseApplicationDetails);
  const workerProfile = useSelector(selectWorkerProfileForEnterprise);
  const currentInterview = useSelector(selectCurrentApplicationInterview);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, reason: '' });
  const [scheduleModal, setScheduleModal] = useState({ open: false, mode: null }); // mode: 'shortlist-first' | 'schedule-only' | 'update'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(fetchEnterpriseApplicationDetails(id)).unwrap();
      dispatch(fetchWorkerProfileForEnterprise(id));
      dispatch(fetchApplicationInterview(id));
    } catch (err) {
      toast.error('Không thể tải thông tin đơn ứng tuyển');
    } finally {
      setLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReject = async () => {
    if (!rejectModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading('reject');
    try {
      await rejectApplication(id, { reason: rejectModal.reason });
      toast.success('Đã từ chối ứng viên');
      setRejectModal({ open: false, reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle shortlist + schedule flow
  const handleShortlistAndSchedule = () => {
    setScheduleModal({ open: true, mode: 'shortlist-first' });
  };

  // Handle schedule only (retry after failed step 2)
  const handleScheduleOnly = () => {
    setScheduleModal({ open: true, mode: 'schedule-only' });
  };

  // Handle update existing interview
  const handleUpdateSchedule = () => {
    setScheduleModal({ open: true, mode: 'update' });
  };

  // Submit interview schedule
  const handleScheduleSubmit = async (formData) => {
    setActionLoading('schedule');
    try {
      // Step 1: Shortlist if in shortlist-first mode
      if (scheduleModal.mode === 'shortlist-first') {
        await shortlistApplication(id, { reason: '' });
      }

      // Step 2: Create or update interview
      if (scheduleModal.mode === 'update') {
        await updateInterviewEnterprise(currentInterview._id, {
          scheduledAt: formData.scheduledAt,
          reason: 'Cập nhật lịch phỏng vấn'
        });
        toast.success('Đã cập nhật lịch phỏng vấn');
      } else {
        await createInterview(formData);
        toast.success('Đã tạo lịch phỏng vấn');
      }

      setScheduleModal({ open: false, mode: null });
      fetchData();
    } catch (err) {
      // Step 2 failed: keep status as shortlisted, allow retry
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[hsl(var(--admin-accent))] border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <div className="text-center py-20">
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy đơn ứng tuyển</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft size={14} className="mr-2" /> Quay lại
          </Button>
        </div>
      </>
    );
  }

  const status = applicationStatusConfig[application.status] || applicationStatusConfig.new;
  const profileData = workerProfile?.profile || application.workerProfile || {};
  const userData = workerProfile?.user || application.worker || {};

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mt-1">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">
                  {application.workerName || application.worker?.name || 'Ứng viên'}
                </h1>
                <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
              </div>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                Ứng tuyển: {application.jobTitle || application.job?.title}
              </p>
              <p className="text-xs text-[hsl(var(--admin-text-faint))]">
                Ngày ứng tuyển: {formatDateTime(application.appliedAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Shortlist + Schedule */}
            {['new', 'reviewing'].includes(application.status) && (
              <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleShortlistAndSchedule}
                >
                  <CalendarPlus size={14} className="mr-2" /> Shortlist
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setRejectModal({ open: true, reason: '' })}
                >
                  <XCircle size={14} className="mr-2" /> Từ chối
                </Button>
              </>
            )}
            {/* Schedule only (retry after failed step 2) */}
            {application.status === 'shortlisted' && !application.interviewId && !currentInterview && (
              <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleScheduleOnly}
                >
                  <CalendarPlus size={14} className="mr-2" /> Đặt lịch phỏng vấn
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setRejectModal({ open: true, reason: '' })}
                >
                  <XCircle size={14} className="mr-2" /> Từ chối
                </Button>
              </>
            )}
            {/* Update existing interview */}
            {application.interviewId && currentInterview && (
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={handleUpdateSchedule}
              >
                <Calendar size={14} className="mr-2" /> Cập nhật lịch PV
              </Button>
            )}
            {/* Create offer after interviewed */}
            {application.status === 'interviewed' && (
              <Button
                variant="outline"
                onClick={() => navigate(`/enterprise/offers/create`, { state: { applicationId: id, applicationName: application.worker?.name || application.workerName } })}
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Award size={14} className="mr-2" /> Tạo Offer
              </Button>
            )}
          </div>
        </div>

        {/* Application Timeline */}
        <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
          <CardHeader>
            <CardTitle className="text-lg">Lịch sử trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(application.statusHistory || []).map((history, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--admin-accent))] mt-2" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                      {applicationStatusConfig[history.status]?.label || history.status}
                    </p>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                      {formatDateTime(history.changedAt)}
                      {history.note && ` - ${history.note}`}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                    Đã nộp đơn
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                    {formatDateTime(application.appliedAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Worker Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User size={18} /> Thông tin cá nhân
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Email</p>
                      <p className="text-sm">{userData.email || application.workerEmail || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Điện thoại</p>
                      <p className="text-sm">{userData.phone || profileData.basicInfo?.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Tuổi</p>
                      <p className="text-sm">{userData.age ? `${userData.age} tuổi` : (profileData.basicInfo?.age ? `${profileData.basicInfo.age} tuổi` : '—')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Địa chỉ</p>
                      <p className="text-sm">{getProvinceLabel(profileData.basicInfo?.province || profileData.province) || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Giới tính</p>
                      <p className="text-sm">{GENDER_LABELS[profileData.basicInfo?.gender] || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <GraduationCap size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Học vấn</p>
                      <p className="text-sm">{getEducationLabel(profileData.basicInfo?.education) || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Hôn nhân</p>
                      <p className="text-sm">{MARITAL_STATUS_LABELS[profileData.basicInfo?.maritalStatus] || '—'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment History */}
            {(profileData.employmentHistory && Array.isArray(profileData.employmentHistory) && profileData.employmentHistory.length > 0 && !profileData.employmentHistory.some(h => h.status === 'không có')) && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase size={18} /> Kinh nghiệm làm việc
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileData.employmentHistory.map((job, idx) => (
                      <div key={idx} className="relative pl-4 border-l-2 border-[hsl(var(--admin-border))] pb-2 last:pb-0">
                        <div className="absolute w-2 h-2 rounded-full bg-[hsl(var(--admin-accent))] -left-[5px] top-1.5"></div>
                        <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
                          {typeof job.occupation === 'object' ? job.occupation?.titleVi || job.occupation?.titleEn || 'Vị trí công việc' : job.occupation || 'Vị trí công việc'}
                        </h4>
                        <p className="text-xs font-medium text-[hsl(var(--admin-text-secondary))] mt-0.5">{job.companyName || 'Công ty/Tổ chức'}</p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                          {job.duration ? `${Math.floor(job.duration / 12) > 0 ? Math.floor(job.duration / 12) + ' năm ' : ''}${job.duration % 12 > 0 ? (job.duration % 12) + ' tháng' : ''}`.trim() : '—'}
                          {job.jobType ? ` • ${job.jobType}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {((profileData.aspirations?.skills?.length > 0) || (profileData.employmentHistory?.[0]?.skills?.length > 0)) && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award size={18} /> Kỹ năng
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(profileData.aspirations?.skills?.length > 0 ? profileData.aspirations.skills : (profileData.employmentHistory?.[0]?.skills || [])).map((skill, idx) => {
                      const skillName = typeof skill === 'object' ? skill.titleVi || skill.titleEn || skill.uri : skill;
                      return (
                        <Badge key={idx} variant="outline" className="border-[hsl(var(--admin-border))]">
                          {skillName}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aspirations */}
            {(profileData.aspirations) && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase size={18} /> Mong muốn nghề nghiệp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Vị trí mong muốn</p>
                    <p className="text-sm">
                      {typeof profileData.aspirations.targetJob === 'object'
                        ? profileData.aspirations.targetJob?.titleVi || profileData.aspirations.targetJob?.titleEn || 'Không có'
                        : profileData.aspirations.targetJob || 'Không có'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Loại hình công việc</p>
                    <p className="text-sm">{profileData.aspirations.preferredJobType || 'Không có'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Mức lương mong muốn</p>
                    <p className="text-sm">{profileData.aspirations.targetSalary ? `${profileData.aspirations.targetSalary.toLocaleString()} VND` : 'Không có'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Barriers */}
            {(profileData.barriers && Object.values(profileData.barriers).some(v => v === true || (typeof v === 'string' && v.length > 0))) && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle size={18} /> Rào cản
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {profileData.barriers.family && (
                      <li className="flex items-start gap-2 text-sm">
                        <XCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        Trách nhiệm gia đình
                      </li>
                    )}
                    {profileData.barriers.health && (
                      <li className="flex items-start gap-2 text-sm">
                        <XCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        Vấn đề sức khỏe
                      </li>
                    )}
                    {profileData.barriers.location && (
                      <li className="flex items-start gap-2 text-sm">
                        <XCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        Khó khăn di chuyển
                      </li>
                    )}
                    {profileData.barriers.techGap && (
                      <li className="flex items-start gap-2 text-sm">
                        <XCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        Hạn chế công nghệ
                      </li>
                    )}
                    {profileData.barriers.other && (
                      <li className="flex items-start gap-2 text-sm">
                        <XCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        Khác: {profileData.barriers.otherDescription}
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg">Công việc ứng tuyển</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">Vị trí</p>
                  <p className="text-sm font-medium">{application.jobTitle || application.job?.title}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">Doanh nghiệp</p>
                  <p className="text-sm">{application.enterpriseName || application.enterprise?.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/enterprise/recruitment/${application.jobId || application.job?._id}`)}
                >
                  Xem chi tiết tin
                </Button>
              </CardContent>
            </Card>

            {/* Cover Letter */}
            {application.coverLetter && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText size={18} /> Thư xin việc
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-[hsl(var(--admin-text-secondary))]">
                    {application.coverLetter}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {application.notes && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Ghi chú</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-[hsl(var(--admin-text-secondary))]">
                    {application.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối ứng viên</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối để thông báo cho ứng viên.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do từ chối <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="VD: Hồ sơ chưa phù hợp với yêu cầu..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, reason: '' })}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Modal */}
      <Dialog open={scheduleModal.open} onOpenChange={(open) => !open && setScheduleModal({ open: false, mode: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {scheduleModal.mode === 'update' ? 'Cập nhật lịch phỏng vấn' : 'Đặt lịch phỏng vấn'}
            </DialogTitle>
            <DialogDescription>
              {scheduleModal.mode === 'shortlist-first'
                ? 'Ứng viên sẽ được shortlisted và đặt lịch phỏng vấn.'
                : scheduleModal.mode === 'update'
                  ? 'Cập nhật thông tin lịch phỏng vấn.'
                  : 'Đặt lịch phỏng vấn cho ứng viên.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ScheduleInterviewForm
              applicationId={id}
              jobId={application?.jobId || application?.job?._id}
              initialData={scheduleModal.mode === 'update' ? currentInterview : null}
              onSubmit={handleScheduleSubmit}
              onCancel={() => setScheduleModal({ open: false, mode: null })}
              loading={actionLoading === 'schedule'}
              submitLabel={scheduleModal.mode === 'update' ? 'Cập nhật' : 'Xác nhận đặt lịch'}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
