import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DollarSign, Calendar, User, ArrowLeft, CheckCircle, XCircle,
  Clock, RefreshCw, AlertTriangle, Award
} from 'lucide-react';

import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Textarea } from '@/components/ui';
import { getEnterpriseOfferById, withdrawOffer } from '@/apis/recruitmentAPI';
import {
  fetchEnterpriseOffers,
  fetchEnterpriseOfferDetails,
  selectEnterpriseOfferDetails
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';

const offerStatusConfig = {
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  accepted: { label: 'Đã chấp nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Đã từ chối', className: 'bg-red-100 text-red-700 border-red-200' },
  expired: { label: 'Hết hạn', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  withdrawn: { label: 'Đã rút', className: 'bg-slate-200 text-slate-600 border-slate-300' }
};

const formatCurrency = (amount) => {
  if (!amount) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
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

const getDaysRemaining = (date) => {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};

export default function EnterpriseOfferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const offer = useSelector(selectEnterpriseOfferDetails);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState({ open: false, reason: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      await dispatch(fetchEnterpriseOfferDetails(id)).unwrap();
    } catch (err) {
      toast.error('Không thể tải thông tin offer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dispatch, id]);

  const handleWithdraw = async () => {
    if (!withdrawModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do thu hồi');
      return;
    }
    setActionLoading('withdraw');
    try {
      await withdrawOffer(id);
      toast.success('Đã thu hồi offer');
      setWithdrawModal({ open: false, reason: '' });
      navigate('/enterprise/offers');
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

  if (!offer) {
    return (
      <>
        <div className="text-center py-20">
          <p className="text-[hsl(var(--admin-text-muted))]">Không tìm thấy offer.</p>
          <Button variant="outline" onClick={() => navigate('/enterprise/offers')} className="mt-4">
            <ArrowLeft size={14} className="mr-2" /> Quay lại
          </Button>
        </div>
      </>
    );
  }

  const status = offerStatusConfig[offer.status] || offerStatusConfig.pending;
  const daysRemaining = getDaysRemaining(offer.expiresAt);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" onClick={() => navigate('/enterprise/offers')} className="mt-1">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">
                  Chi tiết Offer
                </h1>
                <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
              </div>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                {offer.workerName || offer.worker?.name || 'Ứng viên'}
              </p>
              <p className="text-xs text-[hsl(var(--admin-text-faint))]">
                {offer.position || offer.job?.title}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {['pending'].includes(offer.status) && (
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setWithdrawModal({ open: true, reason: '' })}
                disabled={actionLoading === 'withdraw'}
              >
                <XCircle size={14} className="mr-2" /> Thu hồi
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Info */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User size={18} /> Thông tin ứng viên
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--admin-accent-subtle))] flex items-center justify-center shrink-0">
                    <span className="text-lg font-medium text-[hsl(var(--admin-accent))]">
                      {offer.workerName?.[0] || offer.worker?.name?.[0] || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[hsl(var(--admin-text-primary))]">
                      {offer.workerName || offer.worker?.name || '—'}
                    </p>
                    {offer.worker?.email && (
                      <p className="text-sm text-[hsl(var(--admin-text-muted))]">{offer.worker.email}</p>
                    )}
                    {offer.worker?.phone && (
                      <p className="text-sm text-[hsl(var(--admin-text-muted))]">{offer.worker.phone}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/enterprise/applications/${offer.applicationId || offer.application?._id}`)}
                  >
                    Xem đơn ứng tuyển
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Offer Details */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award size={18} /> Chi tiết Offer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Salary */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <DollarSign size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Mức lương</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {formatCurrency(offer.salary?.amount)}
                      <span className="text-sm font-normal text-[hsl(var(--admin-text-muted))]">
                        {' '}/{offer.salary?.paymentType === 'monthly' ? 'tháng' :
                         offer.salary?.paymentType === 'hourly' ? 'giờ' : 'dự án'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Start Date & Probation */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Calendar size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngày bắt đầu</p>
                      <p className="text-sm font-medium">{formatDate(offer.startDate)}</p>
                    </div>
                  </div>
                  {offer.probationPeriod?.months > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Clock size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">Thử việc</p>
                        <p className="text-sm font-medium">
                          {offer.probationPeriod.months} tháng
                          {offer.probationPeriod.salaryDuringProbation && (
                            <span className="text-[hsl(var(--admin-text-muted))] font-normal ml-1">
                              ({formatCurrency(offer.probationPeriod.salaryDuringProbation)}/tháng)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expiry */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isExpiringSoon ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>
                    <Clock size={20} className={isExpiringSoon ? 'text-amber-600' : 'text-slate-600'} />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Hạn trả lời</p>
                    <p className={`text-sm font-medium ${isExpiringSoon ? 'text-amber-600' : ''}`}>
                      {formatDateTime(offer.expiresAt)}
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <span className="ml-2 text-xs font-normal">({daysRemaining} ngày còn lại)</span>
                      )}
                      {daysRemaining !== null && daysRemaining <= 0 && (
                        <span className="ml-2 text-xs font-normal text-red-600">(Đã hết hạn)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                {offer.benefits?.length > 0 && (
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-2">Phúc lợi</p>
                    <div className="flex flex-wrap gap-2">
                      {offer.benefits.map((benefit, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--admin-surface-elevated))] rounded-lg text-sm text-[hsl(var(--admin-text-secondary))]"
                        >
                          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms */}
                {offer.terms && (
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-2">Điều khoản</p>
                    <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] rounded-xl">
                      <p className="text-sm whitespace-pre-wrap text-[hsl(var(--admin-text-secondary))]">
                        {offer.terms}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Response from Worker */}
            {offer.status === 'accepted' && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                    <CheckCircle size={18} /> Phản hồi của ứng viên
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-emerald-700">
                    Ứng viên đã chấp nhận offer này vào {formatDateTime(offer.acceptedAt)}.
                  </p>
                  {offer.responseNote && (
                    <div className="p-3 bg-white rounded-lg border border-emerald-200">
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Lời nhắn:</p>
                      <p className="text-sm text-emerald-800">{offer.responseNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {offer.status === 'rejected' && (
              <Card className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <XCircle size={18} /> Phản hồi của ứng viên
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-red-700">
                    Ứng viên đã từ chối offer này vào {formatDateTime(offer.rejectedAt)}.
                  </p>
                  {offer.responseNote && (
                    <div className="p-3 bg-white rounded-lg border border-red-200">
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Lý do từ chối:</p>
                      <p className="text-sm text-red-800">{offer.responseNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {offer.status === 'withdrawn' && (
              <Card className="bg-slate-50 border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-600">
                    <AlertTriangle size={18} /> Offer đã bị thu hồi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {offer.withdrawReason && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Lý do thu hồi:</p>
                      <p className="text-sm text-slate-800">{offer.withdrawReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info */}
            {offer.job && (
              <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <CardHeader>
                  <CardTitle className="text-base">Công việc</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium text-[hsl(var(--admin-text-primary))]">
                    {offer.job.title}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/enterprise/recruitment/${offer.job._id}`)}
                    className="w-full mt-2"
                  >
                    Xem tin tuyển dụng
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <CardTitle className="text-base">Lịch sử</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--admin-accent))] mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDateTime(offer.createdAt)}</p>
                    <p className="text-sm">Gửi offer</p>
                  </div>
                </div>
                {offer.acceptedAt && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDateTime(offer.acceptedAt)}</p>
                      <p className="text-sm text-emerald-700">Ứng viên chấp nhận</p>
                    </div>
                  </div>
                )}
                {offer.rejectedAt && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDateTime(offer.rejectedAt)}</p>
                      <p className="text-sm text-red-700">Ứng viên từ chối</p>
                    </div>
                  </div>
                )}
                {offer.withdrawnAt && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDateTime(offer.withdrawnAt)}</p>
                      <p className="text-sm text-slate-600">Thu hồi offer</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      <Dialog open={withdrawModal.open} onOpenChange={(open) => !open && setWithdrawModal({ open: false, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle size={20} /> Thu hồi Offer
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn thu hồi offer này? Hành động này không thể hoàn tác và ứng viên sẽ nhận được thông báo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do thu hồi <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="VD: Đã tuyển ứng viên khác, thay đổi yêu cầu..."
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
              disabled={actionLoading === 'withdraw'}
            >
              Xác nhận thu hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
