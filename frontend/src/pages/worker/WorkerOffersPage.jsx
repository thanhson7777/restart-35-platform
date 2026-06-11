import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, CheckCircle, XCircle, Clock, RefreshCw, ArrowLeft, ExternalLink, AlertCircle } from 'lucide-react';

import { Button, Badge, Card, CardContent, Textarea } from '@/components/ui';
import {
  fetchMyOffers,
  fetchMyOfferDetails,
  selectMyOffers,
  selectMyOffersTotal,
  selectMyOffersLoading,
  selectMyOfferDetails
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { acceptOffer, rejectOffer } from '@/apis/recruitmentAPI';
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

const getDaysRemaining = (date) => {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};

export default function WorkerOffersPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const offers = useSelector(selectMyOffers);
  const total = useSelector(selectMyOffersTotal);
  const loading = useSelector(selectMyOffersLoading);
  const offerDetail = useSelector(selectMyOfferDetails);
  const detailLoading = useSelector(selectMyOffersLoading);

  const [acceptModal, setAcceptModal] = useState({ open: false, offerId: null, note: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, offerId: null, reason: '' });
  const [actionLoading, setActionLoading] = useState(null);

  const fetchOffers = useCallback(async () => {
    dispatch(fetchMyOffers({ limit: 50 }));
  }, [dispatch]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    if (id) {
      dispatch(fetchMyOfferDetails(id));
    }
  }, [dispatch, id]);

  const handleAccept = async () => {
    setActionLoading('accept');
    try {
      await acceptOffer(acceptModal.offerId, { responseNote: acceptModal.note });
      toast.success('Bạn đã chấp nhận offer! Chúc mừng bạn!');
      setAcceptModal({ open: false, offerId: null, note: '' });
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading('reject');
    try {
      await rejectOffer(rejectModal.offerId, { reason: rejectModal.reason });
      toast.success('Đã từ chối offer');
      setRejectModal({ open: false, offerId: null, reason: '' });
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  // Show detail view when id param exists
  if (id) {
    return (
      <>
        <OfferDetailView
          offer={offerDetail}
          loading={detailLoading}
          onBack={() => navigate('/my/offers')}
          acceptModal={acceptModal}
          setAcceptModal={setAcceptModal}
          rejectModal={rejectModal}
          setRejectModal={setRejectModal}
          actionLoading={actionLoading}
          handleAccept={handleAccept}
          handleReject={handleReject}
          offerStatusConfig={offerStatusConfig}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getDaysRemaining={getDaysRemaining}
        />
      </>
    );
  }

  return (
    <>
      <div className="max-w-6xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Offers của tôi</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Theo dõi và quản lý các offer bạn đã nhận được.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { key: 'all', label: 'Tổng', className: 'bg-slate-100 text-slate-700' },
            { key: 'pending', label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700' },
            { key: 'accepted', label: 'Đã chấp nhận', className: 'bg-emerald-100 text-emerald-700' },
            { key: 'rejected', label: 'Đã từ chối', className: 'bg-red-100 text-red-700' }
          ].map(stat => (
            <div
              key={stat.key}
              className={`p-4 rounded-xl text-center ${stat.className}`}
            >
              <p className="text-2xl font-bold">{stat.key === 'all' ? total : offers.filter(o => o.status === stat.key).length}</p>
              <p className="text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Offers List */}
        <Button variant="outline" onClick={fetchOffers} className="mb-6 gap-2">
          <RefreshCw size={13} /> Làm mới
        </Button>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-[hsl(var(--muted))] mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Bạn chưa nhận được offer nào.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map(offer => {
              const status = offerStatusConfig[offer.status] || offerStatusConfig.pending;
              const daysRemaining = getDaysRemaining(offer.expiresAt);
              const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;
              
              return (
                <Card
                  key={offer._id}
                  className={`bg-[hsl(var(--card))] border transition-all ${
                    offer.status === 'pending' && isExpiringSoon
                      ? 'border-amber-400 shadow-amber-100'
                      : offer.status === 'accepted'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-[hsl(var(--border))]'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                            {offer.position || offer.job?.title}
                          </h3>
                          <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                        </div>
                        <p className="text-[hsl(var(--muted-foreground))]">
                          {offer.enterpriseName || offer.enterprise?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[hsl(var(--foreground))]">
                          {formatCurrency(offer.salary?.amount)}
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {offer.salary?.paymentType === 'monthly' ? '/tháng' :
                           offer.salary?.paymentType === 'hourly' ? '/giờ' : '/dự án'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Ngày bắt đầu</p>
                        <p className="text-sm font-medium">{formatDate(offer.startDate)}</p>
                      </div>
                      {offer.probationPeriod?.months > 0 && (
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Thử việc</p>
                          <p className="text-sm font-medium">{offer.probationPeriod.months} tháng</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Hết hạn</p>
                        <p className={`text-sm font-medium ${
                          offer.status === 'pending' && isExpiringSoon ? 'text-amber-600' : ''
                        }`}>
                          {formatDate(offer.expiresAt)}
                          {isExpiringSoon && (
                            <span className="ml-1 text-amber-600">
                              ({daysRemaining} ngày)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Nhận lúc</p>
                        <p className="text-sm font-medium">{formatDate(offer.createdAt)}</p>
                      </div>
                    </div>

                    {/* Benefits */}
                    {offer.benefits?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">Phúc lợi:</p>
                        <div className="flex flex-wrap gap-2">
                          {offer.benefits.map((benefit, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Terms */}
                    {offer.terms && (
                      <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--muted))]">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Điều khoản:</p>
                        <p className="text-sm whitespace-pre-wrap">{offer.terms}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {offer.status === 'pending' && (
                      <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                            <Clock size={14} />
                            {isExpiringSoon
                              ? `Còn ${daysRemaining} ngày để phản hồi`
                              : `Hết hạn ${formatDate(offer.expiresAt)}`}
                          </p>
                          {(offer.jobId || offer.job?._id) && (
                            <button
                              onClick={() => navigate(`/community/jobs/${offer.jobId || offer.job?._id}`)}
                              className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs transition-colors"
                            >
                              <ExternalLink size={12} /> Xem tin
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectModal({ open: true, offerId: offer._id, reason: '' })}
                          >
                            <XCircle size={14} className="mr-2" /> Từ chối
                          </Button>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setAcceptModal({ open: true, offerId: offer._id, note: '' })}
                          >
                            <CheckCircle size={14} className="mr-2" /> Chấp nhận
                          </Button>
                        </div>
                      </div>
                    )}

                    {offer.status === 'expired' && (
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                        <AlertCircle size={14} className="text-slate-500" />
                        <p className="text-sm text-slate-500">Offer này đã hết hạn phản hồi.</p>
                        {(offer.jobId || offer.job?._id) && (
                          <button
                            onClick={() => navigate(`/community/jobs/${offer.jobId || offer.job?._id}`)}
                            className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs transition-colors ml-auto"
                          >
                            <ExternalLink size={12} /> Xem tin
                          </button>
                        )}
                      </div>
                    )}

                    {offer.status === 'accepted' && (
                      <div className="flex items-center justify-between pt-4 border-t border-emerald-200">
                        <p className="text-sm text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={14} /> Bạn đã chấp nhận offer này
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/my/applications/${offer.applicationId || offer.application?._id}`)}
                        >
                          Xem đơn ứng tuyển
                        </Button>
                      </div>
                    )}

                    {offer.status === 'rejected' && offer.responseNote && (
                      <div className="pt-4 border-t border-red-200">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Lý do từ chối của bạn:</p>
                        <p className="text-sm">{offer.responseNote}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// Detail view component for when :id param exists
function OfferDetailView({
  offer, loading, onBack,
  acceptModal, setAcceptModal,
  rejectModal, setRejectModal,
  actionLoading, handleAccept, handleReject,
  offerStatusConfig, formatCurrency, formatDate, getDaysRemaining
}) {
  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="h-64 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="container-page py-8 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Không tìm thấy offer.</p>
        <Button onClick={onBack} className="mt-4">Quay lại</Button>
      </div>
    );
  }

  const status = offerStatusConfig[offer.status] || offerStatusConfig.pending;
  const daysRemaining = getDaysRemaining(offer.expiresAt);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;

  return (
    <div className="container-page py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-emerald-500 mb-6 transition-colors">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">{offer.position || offer.job?.title}</h2>
            <p className="text-[hsl(var(--muted-foreground))]">{offer.enterpriseName || offer.enterprise?.name}</p>
          </div>
          <Badge className={`${status.className} text-sm`}>{status.label}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Lương</p>
            <p className="font-bold text-lg">{formatCurrency(offer.salary?.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Ngày bắt đầu</p>
            <p className="font-medium">{formatDate(offer.startDate)}</p>
          </div>
          {offer.probationPeriod?.months > 0 && (
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Thử việc</p>
              <p className="font-medium">{offer.probationPeriod.months} tháng</p>
            </div>
          )}
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Hết hạn</p>
            <p className={`font-medium ${isExpiringSoon ? 'text-amber-600' : ''}`}>
              {formatDate(offer.expiresAt)}
              {isExpiringSoon && <span className="ml-1">({daysRemaining} ngày)</span>}
            </p>
          </div>
        </div>

        {offer.benefits?.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">Phúc lợi</p>
            <div className="flex flex-wrap gap-2">
              {offer.benefits.map((b, i) => (
                <span key={i} className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--muted))]">{b}</span>
              ))}
            </div>
          </div>
        )}

        {offer.terms && (
          <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--muted))]">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Điều khoản</p>
            <p className="text-sm whitespace-pre-wrap">{offer.terms}</p>
          </div>
        )}

        {offer.status === 'pending' && (
          <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setRejectModal({ open: true, offerId: offer._id, reason: '' })}
            >
              <XCircle size={14} className="mr-2" /> Từ chối
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setAcceptModal({ open: true, offerId: offer._id, note: '' })}
            >
              <CheckCircle size={14} className="mr-2" /> Chấp nhận
            </Button>
          </div>
        )}

        {offer.status === 'accepted' && (
          <div className="pt-4 border-t border-emerald-200">
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle size={14} /> Bạn đã chấp nhận offer này
            </p>
          </div>
        )}

        {offer.status === 'rejected' && offer.responseNote && (
          <div className="pt-4 border-t border-red-200">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Lý do từ chối của bạn:</p>
            <p className="text-sm">{offer.responseNote}</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, offerId: null, reason: '' })}>
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
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, offerId: null, reason: '' })}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading === 'reject'}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Modal */}
      <Dialog open={acceptModal.open} onOpenChange={(open) => !open && setAcceptModal({ open: false, offerId: null, note: '' })}>
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
                value={acceptModal.note}
                onChange={(e) => setAcceptModal(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptModal({ open: false, offerId: null, note: '' })}>
              Hủy
            </Button>
            <Button onClick={handleAccept} disabled={actionLoading === 'accept'} className="bg-emerald-600 hover:bg-emerald-700">
              Xác nhận chấp nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
