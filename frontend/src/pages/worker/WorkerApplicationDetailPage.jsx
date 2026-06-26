import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, MapPin, DollarSign, Calendar, CheckCircle,
  Clock, AlertTriangle, Briefcase, Building, XCircle
} from 'lucide-react';

import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Textarea } from '@/components/ui';
import {
  fetchMyApplicationDetails,
  fetchJobDetails,
  fetchMyInterviewDetails,
  selectMyApplicationDetails,
  selectSelectedJob,
  selectMyInterviewDetails,
  acceptMyOffer,
  rejectMyOffer
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { withdrawApplication, acceptOffer, rejectOffer } from '@/apis/recruitmentAPI';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';
import {
  applicationStatusConfig,
  APPLICATION_STATUS_STEPS_LABELED,
  getStatusStepIndex,
  formatApplicationDateTime,
} from './workerRecruitmentConstants';

const formatDateTime = formatApplicationDateTime;

const MAJOR_STEPS = [
  { key: 'received', label: 'Tiếp nhận hồ sơ' },
  { key: 'interview', label: 'Phỏng vấn' },
  { key: 'result', label: 'Kết quả' },
];

const formatSalary = (salary) => {
  if (!salary) return 'Thoả thuận';
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  if (salary.min && salary.max) return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
  if (salary.min) return `Từ ${formatter.format(salary.min)}`;
  return formatter.format(salary);
};



export default function WorkerApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const application = useSelector(selectMyApplicationDetails);
  const jobDetails = useSelector(selectSelectedJob);
  const applicationInterview = useSelector(selectMyInterviewDetails);

  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState({ open: false, reason: '' });
  const [acceptOfferModal, setAcceptOfferModal] = useState({ open: false, note: '' });
  const [rejectOfferModal, setRejectOfferModal] = useState({ open: false, reason: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(fetchMyApplicationDetails(id)).unwrap();
    } catch (err) {
      toast.error('Không thể tải thông tin đơn ứng tuyển');
    } finally {
      setLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (application?.jobId || application?.job?._id) {
      const jobId = application.jobId || application.job._id;
      dispatch(fetchJobDetails(jobId));
    }
    if (application?.interviewId) {
      dispatch(fetchMyInterviewDetails(application.interviewId)).unwrap().catch(() => {});
    }
  }, [application, dispatch]);

  const handleWithdraw = async () => {
    setActionLoading(true);
    try {
      await withdrawApplication(id);
      toast.success('Đã rút đơn ứng tuyển');
      setWithdrawModal({ open: false, reason: '' });
      navigate('/my/applications');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    setActionLoading('accept');
    try {
      const offerId = application.offerId || application.offer?._id;
      await dispatch(acceptMyOffer({ offerId, responseNote: acceptOfferModal.note })).unwrap();
      toast.success('Bạn đã chấp nhận offer! Chúc mừng bạn!');
      setAcceptOfferModal({ open: false, note: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi chấp nhận offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectOfferModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading('reject');
    try {
      const offerId = application.offerId || application.offer?._id;
      await dispatch(rejectMyOffer({ offerId, reason: rejectOfferModal.reason })).unwrap();
      toast.success('Đã từ chối offer');
      setRejectOfferModal({ open: false, reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi từ chối offer');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="max-w-6xl space-y-6">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full" />
          </div>
        </div>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <div className="max-w-6xl space-y-6">
          <div className="text-center py-16">
            <p className="text-[hsl(var(--muted-foreground))]">Không tìm thấy đơn ứng tuyển.</p>
            <Button variant="outline" onClick={() => navigate('/my/applications')} className="mt-4">
              <ArrowLeft size={14} className="mr-2" /> Quay lại
            </Button>
          </div>
        </div>
      </>
    );
  }

  const status = applicationStatusConfig[application.status] || applicationStatusConfig.new;
  
  let currentMajorStep = 0;
  if (['interview_scheduled', 'interviewed'].includes(application.status)) {
    currentMajorStep = 1;
  } else if (['offered', 'hired', 'rejected', 'withdrawn'].includes(application.status)) {
    currentMajorStep = 2;
  }

  return (
    <>
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <Button variant="ghost" onClick={() => navigate('/my/applications')}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {application.jobTitle || application.job?.title || jobDetails?.job?.title || 'Đang cập nhật'}
                </h1>
                <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
              </div>
              <p className="text-[hsl(var(--muted-foreground))]">
                {application.enterpriseName || application.enterprise?.name || jobDetails?.enterpriseInfo?.name || 'Đang cập nhật'}
              </p>
            </div>
          </div>
          {!['rejected', 'withdrawn', 'hired'].includes(application.status) && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setWithdrawModal({ open: true, reason: '' })}
            >
              Rút đơn
            </Button>
          )}
        </div>

        {/* Progress Timeline */}
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))] mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {MAJOR_STEPS.map((step, idx) => {
                const isActive = idx <= currentMajorStep;
                const isCurrent = idx === currentMajorStep;
                const isError = isCurrent && ['rejected', 'withdrawn'].includes(application.status);
                
                return (
                  <div key={step.key} className="flex items-center w-full last:w-auto">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isError
                            ? 'bg-red-100 text-red-600 ring-4 ring-red-100/50'
                            : isActive
                            ? 'bg-[hsl(var(--primary))] text-white'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                        } ${isCurrent && !isError ? 'ring-4 ring-[hsl(var(--primary)/30)]' : ''}`}
                      >
                        {isError ? <XCircle size={20} /> : isActive ? <CheckCircle size={20} /> : idx + 1}
                      </div>
                      <span className={`text-xs mt-3 font-semibold text-center whitespace-nowrap ${
                        isError ? 'text-red-600' : isActive ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < MAJOR_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                          idx < currentMajorStep ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details */}
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Thông tin công việc</CardTitle>
                  <div className="flex gap-1">
                    {['overview', 'description'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          activeTab === tab
                            ? 'bg-[hsl(var(--primary))] text-white'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                        }`}
                      >
                        {tab === 'overview' ? 'Thông tin' : 'Mô tả'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-[hsl(var(--muted-foreground))]" />
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Địa điểm</p>
                          <p className="text-sm">{application.job?.location?.province || application.job?.province || jobDetails?.location?.province || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign size={18} className="text-[hsl(var(--muted-foreground))]" />
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Lương</p>
                          <p className="text-sm">{formatSalary(application.job?.salary || jobDetails?.job?.salary)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-[hsl(var(--muted-foreground))]" />
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Hạn nộp</p>
                          <p className="text-sm">{formatDateTime(application.job?.deadline || jobDetails?.deadline)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock size={18} className="text-[hsl(var(--muted-foreground))]" />
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Ngày ứng tuyển</p>
                          <p className="text-sm">{formatDateTime(application.appliedAt)}</p>
                        </div>
                      </div>
                    </div>
                    {application.job?.requirements?.skills?.length > 0 && (
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">Kỹ năng yêu cầu</p>
                        <div className="flex flex-wrap gap-2">
                          {application.job.requirements.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'description' && (
                  <div className="space-y-6">
                    {(application.job?.description || jobDetails?.job?.description) && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Mô tả công việc</h4>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
                          {application.job?.description || jobDetails?.job?.description}
                        </p>
                      </div>
                    )}
                    {(application.job?.requirements?.length > 0 || jobDetails?.requirements?.skills?.length > 0) && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Yêu cầu</h4>
                        <ul className="list-disc list-inside text-sm text-[hsl(var(--muted-foreground))] space-y-1">
                          {(application.job?.requirements || jobDetails?.requirements?.skills || []).map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(application.job?.benefits?.length > 0 || jobDetails?.job?.benefits?.length > 0) && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Quyền lợi</h4>
                        <ul className="list-disc list-inside text-sm text-[hsl(var(--muted-foreground))] space-y-1">
                          {(application.job?.benefits || jobDetails?.job?.benefits || []).map((benefit, index) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!application.job?.description && !jobDetails?.job?.description && !(application.job?.requirements?.length || jobDetails?.requirements?.skills?.length) && !(application.job?.benefits?.length || jobDetails?.job?.benefits?.length) && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Không có mô tả chi tiết.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cover Letter */}
            {application.coverLetter && (
              <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText size={18} /> Thư xin việc
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-[hsl(var(--muted-foreground))]">
                    {application.coverLetter}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {application.notes && (
              <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Ghi chú</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-[hsl(var(--muted-foreground))]">
                    {application.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Rejection Reason */}
            {application.status === 'rejected' && application.rejectionReason && (
              <Card className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <AlertTriangle size={18} /> Lý do từ chối
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700">{application.rejectionReason}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enterprise Info */}
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
              <CardHeader>
                <CardTitle className="text-lg">Doanh nghiệp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                    <Building size={18} className="text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {application.enterpriseName || application.enterprise?.name || jobDetails?.enterpriseInfo?.name || 'Đang cập nhật'}
                    </p>
                    {(application.enterprise?.industry || jobDetails?.enterpriseInfo?.industry) && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {application.enterprise?.industry || jobDetails?.enterpriseInfo?.industry}
                      </p>
                    )}
                    {(application.enterprise?.size || jobDetails?.enterpriseInfo?.size) && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {application.enterprise?.size || jobDetails?.enterpriseInfo?.size}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Offer Info */}
            {(application.offerId || application.offer) && (
              <Card className={application.offer?.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                    <CheckCircle size={18} /> Offer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.offer?.position && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Vị trí</p>
                      <p className="text-sm font-medium">{application.offer.position}</p>
                    </div>
                  )}
                  {application.offer?.salary?.amount && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Lương</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(application.offer.salary.amount)}
                      </p>
                    </div>
                  )}
                  {application.offer?.startDate && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Ngày bắt đầu</p>
                      <p className="text-sm">{formatDateTime(application.offer.startDate)}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge className={application.offer?.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : application.offer?.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}>
                      {application.offer?.status === 'pending' ? 'Chờ phản hồi' :
                       application.offer?.status === 'accepted' ? 'Đã chấp nhận' :
                       application.offer?.status === 'rejected' ? 'Đã từ chối' :
                       application.offer?.status === 'expired' ? 'Hết hạn' : 'Đã gửi'}
                    </Badge>
                  </div>
                  {application.offer?.status === 'pending' ? (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setRejectOfferModal({ open: true, reason: '' })}
                      >
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setAcceptOfferModal({ open: true, note: '' })}
                      >
                        Chấp nhận
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/my/offers/${application.offerId || application.offer?._id}`)}
                    >
                      Xem chi tiết
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      <Dialog open={withdrawModal.open} onOpenChange={(open) => !open && setWithdrawModal({ open: false, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rút đơn ứng tuyển</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn rút đơn ứng tuyển này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do (tùy chọn)</label>
              <Textarea
                placeholder="Nhập lý do rút đơn..."
                value={withdrawModal.reason}
                onChange={(e) => setWithdrawModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawModal({ open: false, reason: '' })}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={actionLoading}
            >
              Xác nhận rút đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Offer Modal */}
      <Dialog open={acceptOfferModal.open} onOpenChange={(open) => !open && setAcceptOfferModal({ open: false, note: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-emerald-700 flex items-center gap-2">
              <CheckCircle size={20} /> Chấp nhận Offer
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn chấp nhận offer này?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lời nhắn (tùy chọn)</label>
              <Textarea
                placeholder="Cảm ơn doanh nghiệp đã tin tưởng..."
                value={acceptOfferModal.note}
                onChange={(e) => setAcceptOfferModal(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOfferModal({ open: false, note: '' })}>
              Hủy
            </Button>
            <Button
              onClick={handleAcceptOffer}
              disabled={actionLoading === 'accept'}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Xác nhận chấp nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Offer Modal */}
      <Dialog open={rejectOfferModal.open} onOpenChange={(open) => !open && setRejectOfferModal({ open: false, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <XCircle size={20} /> Từ chối Offer
            </DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối để thông báo cho doanh nghiệp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="VD: Điều kiện không phù hợp, đã nhận offer khác..."
                value={rejectOfferModal.reason}
                onChange={(e) => setRejectOfferModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOfferModal({ open: false, reason: '' })}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectOffer}
              disabled={actionLoading === 'reject'}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
