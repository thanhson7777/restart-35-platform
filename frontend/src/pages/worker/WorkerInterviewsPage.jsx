import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Video, Phone, Building, Check, RefreshCw, Clock, AlertCircle, ChevronRight, ArrowLeft, ExternalLink, CalendarX } from 'lucide-react';

import { Button, Badge, Card, CardContent } from '@/components/ui';
import {
  fetchMyInterviews,
  fetchMyInterviewDetails,
  rescheduleMyInterview,
  selectMyInterviews,
  selectMyInterviewsTotal,
  selectMyInterviewsLoading,
  selectMyInterviewDetails
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { confirmInterview } from '@/apis/recruitmentAPI';
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
  rescheduled: { label: 'Đã hoãn', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  no_show: { label: 'Vắng mặt', className: 'bg-red-100 text-red-700 border-red-200' }
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

const getMeetingIcon = (type) => {
  switch (type) {
    case 'google_meet': return Video;
    case 'phone': return Phone;
    case 'office': return Building;
    default: return Video;
  }
};

const getCountdown = (scheduledAt) => {
  if (!scheduledAt) return null;
  const diff = new Date(scheduledAt) - new Date();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (diff <= 0) return null;
  if (hours < 1) return `${minutes} phút`;
  if (hours < 24) return `${hours}h ${minutes}p`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
};

export default function WorkerInterviewsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const interviews = useSelector(selectMyInterviews);
  const total = useSelector(selectMyInterviewsTotal);
  const loading = useSelector(selectMyInterviewsLoading);
  const interviewDetail = useSelector(selectMyInterviewDetails);
  const detailLoading = useSelector(selectMyInterviewsLoading);

  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [confirmModal, setConfirmModal] = useState({ open: false, interview: null });
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, interview: null, reason: '', preferredTime: '' });
  const [confirming, setConfirming] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchInterviews = useCallback(async () => {
    const params = { limit: 50 };
    if (statusFilter === 'upcoming') {
      params.status = 'pending_confirmation,confirmed';
    } else if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    dispatch(fetchMyInterviews(params));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  useEffect(() => {
    if (id) {
      dispatch(fetchMyInterviewDetails(id));
    }
  }, [dispatch, id]);

  const handleConfirm = async () => {
    if (!confirmModal.interview) return;
    setConfirming(true);
    try {
      await dispatch(confirmInterview(confirmModal.interview._id)).unwrap();
      toast.success('Đã xác nhận tham gia phỏng vấn');
      setConfirmModal({ open: false, interview: null });
      fetchInterviews();
    } catch (err) {
      toast.error(err || 'Không thể xác nhận. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleModal.interview) return;
    setRescheduling(true);
    try {
      await dispatch(rescheduleMyInterview({
        interviewId: rescheduleModal.interview._id,
        reason: rescheduleModal.reason,
        newPreferredTime: rescheduleModal.preferredTime,
      })).unwrap();
      toast.success('Đã gửi yêu cầu hoãn lịch. Nhà tuyển dụng sẽ liên hệ lại.');
      setRescheduleModal({ open: false, interview: null, reason: '', preferredTime: '' });
      fetchInterviews();
    } catch (err) {
      toast.error(err || 'Không thể gửi yêu cầu hoãn. Vui lòng thử lại.');
    } finally {
      setRescheduling(false);
    }
  };

  const openConfirmModal = (e, interview) => {
    e.stopPropagation();
    setConfirmModal({ open: true, interview });
  };

  const openRescheduleModal = (e, interview) => {
    e.stopPropagation();
    setRescheduleModal({ open: true, interview, reason: '', preferredTime: '' });
  };

  // Group by date
  const groupedByDate = interviews.reduce((acc, interview) => {
    const dateKey = new Date(interview.scheduledAt).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(interview);
    return acc;
  }, {});

  // Show detail view when id param exists
  if (id) {
    return (
      <>
        <InterviewDetailView
          interview={interviewDetail}
          loading={detailLoading}
          onBack={() => navigate('/my/interviews')}
          onOpenConfirmModal={(interview) => setConfirmModal({ open: true, interview })}
          interviewStatusConfig={interviewStatusConfig}
        />
      </>
    );
  }

  return (
    <>
      <div className="max-w-6xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Lịch phỏng vấn</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Theo dõi và quản lý các lịch phỏng vấn của bạn.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'upcoming', label: 'Sắp tới' },
            { key: 'pending_confirmation', label: 'Chờ xác nhận' },
            { key: 'completed', label: 'Đã hoàn thành' },
            { key: 'all', label: 'Tất cả' }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.key
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Interviews List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto text-[hsl(var(--muted))] mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Chưa có lịch phỏng vấn nào.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([dateKey, dateInterviews]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-3">
                  {new Date(dateKey).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="space-y-3">
                  {dateInterviews.map(interview => {
                    const status = interviewStatusConfig[interview.status] || interviewStatusConfig.pending_confirmation;
                    const MeetingIcon = getMeetingIcon(interview.meetingType);
                    const isPast = new Date(interview.scheduledAt) < new Date();
                    const countdown = getCountdown(interview.scheduledAt);
                    const isConfirmed = interview.status === 'confirmed';
                    const showCountdown = countdown && !isPast && !isConfirmed;
                    const showMeetLink = isConfirmed && interview.meetingType === 'google_meet' && interview.meetingLink;

                    return (
                      <div
                        key={interview._id}
                        className={`bg-[hsl(var(--card))] border rounded-xl p-5 transition-all ${
                          isConfirmed
                            ? 'border-emerald-200 hover:border-emerald-400'
                            : interview.status === 'pending_confirmation'
                            ? 'border-amber-200 hover:border-amber-400'
                            : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${
                              isConfirmed
                                ? 'bg-emerald-100'
                                : interview.status === 'pending_confirmation'
                                ? 'bg-amber-100'
                                : interview.status === 'completed'
                                ? 'bg-blue-100'
                                : 'bg-slate-100'
                            }`}>
                              <MeetingIcon size={24} className={
                                isConfirmed ? 'text-emerald-600' :
                                interview.status === 'pending_confirmation' ? 'text-amber-600' :
                                interview.status === 'completed' ? 'text-blue-600' :
                                'text-[hsl(var(--muted-foreground))]'
                              } />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-[hsl(var(--foreground))]">
                                  {interview.jobTitle || interview.job?.title}
                                </h4>
                                {isConfirmed && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    <Check size={10} /> Đã xác nhận
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {interview.enterpriseName || interview.enterprise?.name}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                                <span className="flex items-center gap-1">
                                  <Clock size={14} />
                                  {new Date(interview.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {new Date(new Date(interview.scheduledAt).getTime() + (interview.duration || 60) * 60000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span>{interview.duration || 60} phút</span>
                              </div>
                              {showCountdown && (
                                <p className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium">
                                  <Clock size={10} /> Còn {countdown}
                                </p>
                              )}
                              {showMeetLink && (
                                <a
                                  href={interview.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium hover:underline"
                                >
                                  <Video size={10} /> Mở Google Meet
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                            {interview.status === 'pending_confirmation' && !isPast && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => openConfirmModal(e, interview)}
                                  className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Check size={14} /> Xác nhận
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => openRescheduleModal(e, interview)}
                                  className="gap-1"
                                >
                                  <CalendarX size={14} /> Hoãn
                                </Button>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/my/interviews/${interview._id}`)}
                              className="gap-1"
                            >
                              Chi tiết <ChevronRight size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Interview Dialog */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => !open && setConfirmModal({ open: false, interview: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check size={18} className="text-emerald-500" />
              Xác nhận tham gia phỏng vấn
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xác nhận tham gia phỏng vấn "{confirmModal.interview?.jobTitle || confirmModal.interview?.job?.title}" vào lúc {confirmModal.interview ? new Date(confirmModal.interview.scheduledAt).toLocaleString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''} không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmModal({ open: false, interview: null })}>
              Hủy
            </Button>
            <Button onClick={handleConfirm} disabled={confirming} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {confirming ? 'Đang xác nhận...' : 'Xác nhận tham gia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Request Dialog */}
      <Dialog open={rescheduleModal.open} onOpenChange={(open) => !open && setRescheduleModal({ open: false, interview: null, reason: '', preferredTime: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarX size={18} className="text-orange-500" />
              Yêu cầu hoãn lịch phỏng vấn
            </DialogTitle>
            <DialogDescription>
              Gửi yêu cầu hoãn lịch phỏng vấn cho nhà tuyển dụng. Vui lòng cung cấp lý do và thời gian mong muốn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Thời gian mong muốn mới</label>
              <input
                type="datetime-local"
                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                value={rescheduleModal.preferredTime}
                onChange={(e) => setRescheduleModal(prev => ({ ...prev, preferredTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do hoãn</label>
              <textarea
                className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm min-h-[80px]"
                placeholder="VD: Có việc đột xuất, lịch hẹn trùng..."
                value={rescheduleModal.reason}
                onChange={(e) => setRescheduleModal(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRescheduleModal({ open: false, interview: null, reason: '', preferredTime: '' })}
            >
              Hủy
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduling || !rescheduleModal.reason.trim()}
              className="gap-2"
            >
              {rescheduling ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Detail view component for when :id param exists
function InterviewDetailView({ interview, loading, onBack, onOpenConfirmModal, interviewStatusConfig }) {
  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="h-64 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="container-page py-8 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Không tìm thấy lịch phỏng vấn.</p>
        <Button onClick={onBack} className="mt-4">Quay lại</Button>
      </div>
    );
  }

  const status = interviewStatusConfig[interview.status] || interviewStatusConfig.pending_confirmation;
  const MeetingIcon = getMeetingIcon(interview.meetingType);
  const isPast = new Date(interview.scheduledAt) < new Date();

  return (
    <div className="container-page py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-emerald-500 mb-6 transition-colors">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-[hsl(var(--primary)/10]">
              <MeetingIcon size={32} className="text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">{interview.jobTitle || interview.job?.title}</h2>
              <p className="text-[hsl(var(--muted-foreground))]">{interview.enterpriseName || interview.enterprise?.name}</p>
              {interview.status === 'confirmed' && interview.meetingType === 'google_meet' && interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Video size={14} /> Mở Google Meet
                </a>
              )}
            </div>
          </div>
          <Badge className={`${status.className} text-sm`}>{status.label}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Thời gian</p>
              <p className="font-medium">
                {new Date(interview.scheduledAt).toLocaleString('vi-VN', {
                  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Thời lượng</p>
              <p className="font-medium">{interview.duration || 60} phút</p>
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Hình thức</p>
              <p className="font-medium">
                {interview.meetingType === 'google_meet' ? 'Google Meet' :
                 interview.meetingType === 'phone' ? 'Điện thoại' : 'Tại văn phòng'}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {interview.enterpriseInterviewer?.name && (
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Người phỏng vấn</p>
                <p className="font-medium">{interview.enterpriseInterviewer.name}</p>
                {interview.enterpriseInterviewer.email && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{interview.enterpriseInterviewer.email}</p>
                )}
              </div>
            )}
            {interview.meetingLink && (
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Link phỏng vấn</p>
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[hsl(var(--primary))] hover:underline break-all"
                >
                  {interview.meetingLink}
                </a>
              </div>
            )}
            {interview.officeAddress && (
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Địa điểm</p>
                <p className="font-medium">{interview.officeAddress}</p>
              </div>
            )}
          </div>
        </div>

        {interview.notes && (
          <div className="mb-6 p-4 rounded-lg bg-[hsl(var(--muted))]">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Ghi chú</p>
            <p className="text-sm whitespace-pre-wrap">{interview.notes}</p>
          </div>
        )}

        {interview.feedback?.enterpriseDecision && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-700 font-medium mb-1">Kết quả phỏng vấn</p>
            <p className="text-sm text-emerald-800">
              {interview.feedback.enterpriseDecision === 'proceed_to_offer' ? 'Tiến tới offer' :
               interview.feedback.enterpriseDecision === 'reject' ? 'Không đạt' : 'Cần thêm phỏng vấn'}
            </p>
            {interview.feedback.enterpriseComment && (
              <p className="text-sm text-emerald-700 mt-1">{interview.feedback.enterpriseComment}</p>
            )}
          </div>
        )}

        {interview.status === 'pending_confirmation' && !isPast && (
          <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button onClick={() => onOpenConfirmModal(interview)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Check size={16} /> Xác nhận tham gia
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
