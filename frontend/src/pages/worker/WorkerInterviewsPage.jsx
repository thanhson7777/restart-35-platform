import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Video, Phone, Building, Check, RefreshCw, Clock, AlertCircle, ChevronRight, ArrowLeft, ExternalLink, CalendarX } from 'lucide-react';

import { Button, Badge, Card, CardContent } from '@/components/ui';
import {
  fetchMyInterviews,
  fetchMyInterviewDetails,
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
  pending_confirmation: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rescheduled: { label: 'Đã dời lịch', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
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

/** Trả về class border cho card interview theo trạng thái */
const getInterviewCardClass = (status) => {
  if (status === 'confirmed') return 'border-emerald-200 hover:border-emerald-400';
  if (status === 'pending_confirmation') return 'border-amber-200 hover:border-amber-400';
  return 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]';
};

/** Trả về class màu icon theo trạng thái */
const getInterviewIconClass = (status) => {
  if (status === 'confirmed') return 'text-emerald-600';
  if (status === 'pending_confirmation' || status === 'rescheduled') return 'text-amber-600';
  if (status === 'completed') return 'text-blue-600';
  return 'text-[hsl(var(--muted-foreground))]';
};

/** Trả về class bg icon theo trạng thái */
const getInterviewIconBgClass = (status) => {
  if (status === 'confirmed') return 'bg-emerald-100';
  if (status === 'pending_confirmation' || status === 'rescheduled') return 'bg-amber-100';
  if (status === 'completed') return 'bg-blue-100';
  return 'bg-slate-100';
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
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [confirmModal, setConfirmModal] = useState({ open: false, interview: null });
  const [confirming, setConfirming] = useState(false);

  const fetchInterviews = useCallback(async () => {
    dispatch(fetchMyInterviews({ limit: 100 }));
  }, [dispatch]);

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



  const openConfirmModal = (e, interview) => {
    e.stopPropagation();
    setConfirmModal({ open: true, interview });
  };



  // Client-side filtering
  const displayedInterviews = interviews.filter(interview => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') {
      return ['pending_confirmation', 'rescheduled', 'confirmed'].includes(interview.status);
    }
    if (statusFilter === 'pending_confirmation') {
      return ['pending_confirmation', 'rescheduled'].includes(interview.status);
    }
    return interview.status === statusFilter;
  });

  // Calculate stats
  const stats = interviews.reduce((acc, interview) => {
    acc.all++;
    if (['pending_confirmation', 'rescheduled', 'confirmed'].includes(interview.status)) {
      acc.upcoming++;
    }
    if (['pending_confirmation', 'rescheduled'].includes(interview.status)) {
      acc.pending_confirmation++;
    }
    if (interview.status === 'completed') {
      acc.completed++;
    }
    return acc;
  }, { all: 0, upcoming: 0, pending_confirmation: 0, completed: 0 });

  // Group by date
  const groupedByDate = displayedInterviews.reduce((acc, interview) => {
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
          loading={loading}
          onBack={() => navigate('/my/interviews')}
          onOpenConfirmModal={(interview) => setConfirmModal({ open: true, interview })}
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
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                statusFilter === filter.key
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <span>{filter.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                statusFilter === filter.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]'
              }`}>
                {stats[filter.key] || 0}
              </span>
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
        ) : displayedInterviews.length === 0 ? (
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
                          getInterviewCardClass(interview.status)
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${getInterviewIconBgClass(interview.status)}`}>
                              <MeetingIcon size={24} className={getInterviewIconClass(interview.status)} />
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
                            {['pending_confirmation'].includes(interview.status) && !isPast && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => openConfirmModal(e, interview)}
                                  className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Check size={14} /> Xác nhận
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


    </>
  );
}

// Detail view component for when :id param exists
function InterviewDetailView({ interview, loading, onBack, onOpenConfirmModal }) {
  // dùng trực tiếp module-level constant, không cần nhận qua props
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
            <p className="text-sm text-emerald-800 font-medium">
              {interview.feedback.enterpriseDecision === 'hire' ? 'Đã trúng tuyển' :
               interview.feedback.enterpriseDecision === 'proceed_to_offer' ? 'Tiến tới offer' :
               interview.feedback.enterpriseDecision === 'reject' ? 'Không đạt' : 'Cần thêm phỏng vấn'}
            </p>
            {interview.feedback.enterpriseComment && (
              <p className="text-sm text-emerald-700 mt-2">{interview.feedback.enterpriseComment}</p>
            )}
            {interview.feedback.enterpriseDecision === 'hire' && interview.feedback.enterpriseStartDate && (
              <p className="text-sm text-emerald-800 mt-2">
                <span className="font-semibold">Ngày bắt đầu làm việc:</span> {new Date(interview.feedback.enterpriseStartDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            )}
            {interview.feedback.enterpriseDecision === 'hire' && interview.feedback.enterpriseSalary && (
              <p className="text-sm text-emerald-800 mt-1">
                <span className="font-semibold">Mức lương thỏa thuận:</span> {Number(interview.feedback.enterpriseSalary).toLocaleString('vi-VN')} VND
              </p>
            )}
          </div>
        )}

        {['pending_confirmation'].includes(interview.status) && !isPast && (
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
