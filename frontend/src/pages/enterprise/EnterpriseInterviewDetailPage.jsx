import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar, Clock, Video, Phone, Building, User, CheckCircle, XCircle,
  AlertCircle, ArrowLeft, Star, MessageSquare, ChevronRight
} from 'lucide-react';

import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@/components/ui';
import {
  fetchEnterpriseInterviewDetails,
  selectEnterpriseInterviewDetails
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  rescheduleInterviewEnterprise,
  cancelInterviewEnterprise,
  completeInterview
} from '@/apis/recruitmentAPI';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';

const interviewStatusConfig = {
  pending_confirmation: { label: 'Chờ xác nhận', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  no_show: { label: 'Vắng mặt', className: 'bg-red-100 text-red-700 border-red-200' }
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export default function EnterpriseInterviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const interview = useSelector(selectEnterpriseInterviewDetails);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [cancelModal, setCancelModal] = useState({ open: false, reason: '' });
  const [feedbackModal, setFeedbackModal] = useState({ open: false, rating: 5, comment: '', decision: '', salary: '', startDate: '' });
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, date: '', time: '09:00', reason: 'Thay đổi lịch' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(fetchEnterpriseInterviewDetails(id)).unwrap();
    } catch (err) {
      toast.error('Không thể tải thông tin phỏng vấn');
    } finally {
      setLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReschedule = async () => {
    if (!rescheduleModal.date || !rescheduleModal.time) {
      toast.error('Vui lòng chọn ngày và giờ mới');
      return;
    }
    const [hours, minutes] = rescheduleModal.time.split(':');
    const newDate = new Date(rescheduleModal.date);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    setActionLoading('reschedule');
    try {
      await rescheduleInterviewEnterprise(id, {
        reason: rescheduleModal.reason || 'Thay đổi lịch',
        newScheduledAt: newDate.toISOString()
      });
      toast.success('Đã cập nhật lịch phỏng vấn');
      setRescheduleModal({ open: false, date: '', time: '09:00', reason: 'Thay đổi lịch' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }
    setActionLoading('cancel');
    try {
      await cancelInterviewEnterprise(id);
      toast.success('Đã hủy lịch phỏng vấn');
      setCancelModal({ open: false, reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!feedbackModal.decision) {
      toast.error('Vui lòng chọn quyết định');
      return;
    }
    setActionLoading('complete');
    try {
      const payload = {
        enterpriseRating: feedbackModal.rating,
        enterpriseComment: feedbackModal.comment,
        enterpriseDecision: feedbackModal.decision
      };

      if (feedbackModal.decision === 'hire') {
        if (!feedbackModal.startDate) {
          toast.error('Vui lòng chọn ngày bắt đầu làm việc');
          setActionLoading(null);
          return;
        }
        payload.enterpriseStartDate = feedbackModal.startDate;
        
        if (interview?.job?.salary?.negotiable && feedbackModal.salary) {
          payload.enterpriseSalary = Number(feedbackModal.salary);
        }
      }

      await completeInterview(id, payload);
      toast.success('Đã cập nhật kết quả phỏng vấn');
      setFeedbackModal({ open: false, rating: 5, comment: '', decision: '', salary: '', startDate: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
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

  if (!interview) {
    return (
      <>
        <div className="text-center py-20">
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy lịch phỏng vấn</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft size={14} className="mr-2" /> Quay lại
          </Button>
        </div>
      </>
    );
  }

  const status = interviewStatusConfig[interview.status] || interviewStatusConfig.pending_confirmation;

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
                  Phỏng vấn
                </h1>
                <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
              </div>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                {interview.workerName || interview.worker?.name || 'Ứng viên'}
              </p>
              <p className="text-xs text-[hsl(var(--admin-text-faint))]">
                {interview.jobTitle || interview.job?.title}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {['pending_confirmation', 'confirmed'].includes(interview.status) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRescheduleModal({ open: true, date: '', time: '09:00', reason: 'Thay đổi lịch' })}
                  disabled={actionLoading === 'reschedule'}
                >
                  <AlertCircle size={14} className="mr-2" /> Hoãn lịch
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setCancelModal({ open: true, reason: '' })}
                >
                  <XCircle size={14} className="mr-2" /> Hủy
                </Button>
              </>
            )}
            {interview.status === 'confirmed' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setFeedbackModal({ open: true, rating: 5, comment: '', decision: '', salary: '', startDate: '' })}
              >
                <CheckCircle size={14} className="mr-2" /> Hoàn thành
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interview Info */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg">Thông tin phỏng vấn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngày giờ</p>
                      <p className="text-sm font-medium">{formatDateTime(interview.scheduledAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-[hsl(var(--admin-text-muted))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Thời lượng</p>
                      <p className="text-sm font-medium">{interview.duration || 60} phút</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {interview.meetingType === 'google_meet' ? (
                    <Video size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  ) : interview.meetingType === 'phone' ? (
                    <Phone size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  ) : (
                    <Building size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                      {interview.meetingType === 'google_meet' ? 'Google Meet' :
                       interview.meetingType === 'office' ? 'Tại văn phòng' : 'Điện thoại'}
                    </p>
                    {interview.meetingLink && (
                      <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer"
                         className="text-sm text-[hsl(var(--admin-accent))] hover:underline">
                        {interview.meetingLink}
                      </a>
                    )}
                    {interview.officeAddress && (
                      <p className="text-sm">{interview.officeAddress}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Worker Info */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg">Thông tin ứng viên</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--admin-accent-subtle))] flex items-center justify-center">
                    <span className="text-lg font-medium text-[hsl(var(--admin-accent))]">
                      {interview.workerName?.[0] || interview.worker?.name?.[0] || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[hsl(var(--admin-text-primary))]">
                      {interview.workerName || interview.worker?.name || '—'}
                    </p>
                    <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                      {interview.workerEmail || interview.worker?.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/enterprise/applications/${interview.applicationId || interview.application?._id}`)}
                  >
                    Xem hồ sơ <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            {interview.feedback && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare size={18} /> Kết quả đánh giá
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[hsl(var(--admin-text-muted))]">Đánh giá:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={16}
                          className={star <= (interview.feedback.enterpriseRating || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'}
                        />
                      ))}
                    </div>
                  </div>
                  {interview.feedback.enterpriseComment && (
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Nhận xét:</p>
                      <p className="text-sm">{interview.feedback.enterpriseComment}</p>
                    </div>
                  )}
                  {interview.feedback.enterpriseDecision && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[hsl(var(--admin-text-muted))]">Quyết định:</span>
                      <Badge className={
                        interview.feedback.enterpriseDecision === 'hire'
                          ? 'bg-emerald-100 text-emerald-700'
                          : interview.feedback.enterpriseDecision === 'reject'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }>
                        {interview.feedback.enterpriseDecision === 'hire' ? 'Đã Nhận' :
                         interview.feedback.enterpriseDecision === 'reject' ? 'Từ chối' : 'Chưa rõ'}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confirmation Status */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg">Xác nhận</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ứng viên:</span>
                  <Badge className={interview.workerConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                    {interview.workerConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Doanh nghiệp:</span>
                  <Badge className={interview.enterpriseConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                    {interview.enterpriseConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Interviewer Info */}
            {interview.enterpriseInterviewer && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Người phỏng vấn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {interview.enterpriseInterviewer.name && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-[hsl(var(--admin-text-muted))]" />
                      <span>{interview.enterpriseInterviewer.name}</span>
                    </div>
                  )}
                  {interview.enterpriseInterviewer.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-[hsl(var(--admin-text-muted))] ml-5">Email: </span>
                      <span>{interview.enterpriseInterviewer.email}</span>
                    </div>
                  )}
                  {interview.enterpriseInterviewer.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-[hsl(var(--admin-text-muted))] ml-5">ĐT: </span>
                      <span>{interview.enterpriseInterviewer.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {interview.notes && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Ghi chú</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{interview.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModal.open} onOpenChange={(open) => !open && setRescheduleModal({ open: false, date: '', time: '09:00', reason: 'Thay đổi lịch' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoãn lịch phỏng vấn</DialogTitle>
            <DialogDescription>
              Chọn ngày và giờ mới cho buổi phỏng vấn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày mới <span className="text-red-500">*</span></label>
                <Input
                  type="date"
                  value={rescheduleModal.date}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Giờ mới <span className="text-red-500">*</span></label>
                <Select
                  value={rescheduleModal.time}
                  onValueChange={(v) => setRescheduleModal(prev => ({ ...prev, time: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, '0');
                      return [
                        `${h}:00`, `${h}:15`, `${h}:30`, `${h}:45`
                      ];
                    }).flat().map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do / Ghi chú</label>
              <Textarea
                placeholder="VD: Lịch công tác, sự kiện bất khả kháng..."
                value={rescheduleModal.reason}
                onChange={(e) => setRescheduleModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModal({ open: false, date: '', time: '09:00', reason: 'Thay đổi lịch' })}>
              Hủy
            </Button>
            <Button onClick={handleReschedule} disabled={actionLoading === 'reschedule'} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
              Xác nhận hoãn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModal.open} onOpenChange={(open) => !open && setCancelModal({ open: false, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy lịch phỏng vấn</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy lịch phỏng vấn này?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do hủy <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="Nhập lý do hủy..."
                value={cancelModal.reason}
                onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModal({ open: false, reason: '' })}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading === 'cancel'}>
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={feedbackModal.open} onOpenChange={(open) => !open && setFeedbackModal({ open: false, rating: 5, comment: '', decision: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn thành phỏng vấn</DialogTitle>
            <DialogDescription>
              Nhập kết quả đánh giá phỏng vấn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Đánh giá</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackModal(prev => ({ ...prev, rating: star }))}
                    className="p-1"
                  >
                    <Star
                      size={28}
                      className={star <= feedbackModal.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300 hover:text-amber-300'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nhận xét</label>
              <Textarea
                placeholder="Nhận xét về buổi phỏng vấn..."
                value={feedbackModal.comment}
                onChange={(e) => setFeedbackModal(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quyết định <span className="text-red-500">*</span></label>
              <Select
                value={feedbackModal.decision}
                onValueChange={(v) => setFeedbackModal(prev => ({ ...prev, decision: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quyết định..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hire">Nhận ứng viên</SelectItem>
                  <SelectItem value="reject">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {feedbackModal.decision === 'hire' && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-100 mt-2">
                {interview?.job?.salary?.negotiable && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mức lương thỏa thuận (VND) <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      placeholder="VD: 15000000"
                      value={feedbackModal.salary}
                      onChange={(e) => setFeedbackModal(prev => ({ ...prev, salary: e.target.value }))}
                      min={0}
                    />
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Lương gốc đăng tuyển là thỏa thuận, vui lòng chốt mức lương cụ thể.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ngày bắt đầu làm việc <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={feedbackModal.startDate}
                    onChange={(e) => setFeedbackModal(prev => ({ ...prev, startDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackModal({ open: false, rating: 5, comment: '', decision: '', salary: '', startDate: '' })}>
              Hủy
            </Button>
            <Button onClick={handleComplete} disabled={actionLoading === 'complete'} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
