import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Calendar, RefreshCw, Search, Plus, Eye } from 'lucide-react';

import { Button, Badge, Card, CardContent, Input } from '@/components/ui';
import {
  fetchEnterpriseOffers,
  selectEnterpriseOffers,
  selectEnterpriseOffersTotal,
  selectEnterpriseOffersLoading
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

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
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function EnterpriseOffersPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const offers = useSelector(selectEnterpriseOffers);
  const total = useSelector(selectEnterpriseOffersTotal);
  const loading = useSelector(selectEnterpriseOffersLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOffers = useCallback(async () => {
    const params = { limit: 50 };
    if (statusFilter !== 'all') params.status = statusFilter;
    dispatch(fetchEnterpriseOffers(params));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const filteredOffers = offers.filter(offer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      offer.workerName?.toLowerCase().includes(query) ||
      offer.worker?.name?.toLowerCase().includes(query) ||
      offer.position?.toLowerCase().includes(query)
    );
  });

  const statusStats = offers.reduce((acc, offer) => {
    acc[offer.status] = (acc[offer.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Quản lý Offer</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              Theo dõi và quản lý các offer đã gửi.
            </p>
          </div>
          <Button
            onClick={() => navigate('/enterprise/offers/create')}
            className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white"
          >
            <Plus size={14} /> Tạo offer mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'all', label: 'Tất cả', className: 'bg-slate-100 text-slate-700' },
            { key: 'pending', label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700' },
            { key: 'accepted', label: 'Đã chấp nhận', className: 'bg-emerald-100 text-emerald-700' },
            { key: 'rejected', label: 'Đã từ chối', className: 'bg-red-100 text-red-700' }
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setStatusFilter(stat.key)}
              className={`p-3 rounded-xl text-center transition-all ${
                statusFilter === stat.key
                  ? `${stat.className} ring-2 ring-[hsl(var(--admin-accent))]`
                  : `${stat.className} opacity-70 hover:opacity-100`
              }`}
            >
              <p className="text-xl font-bold">{stat.key === 'all' ? total : (statusStats[stat.key] || 0)}</p>
              <p className="text-xs">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
            <Input
              placeholder="Tìm theo tên ứng viên, vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]"
            />
          </div>
          <Button variant="outline" onClick={fetchOffers} className="border-[hsl(var(--admin-border))] gap-2">
            <RefreshCw size={13} /> Làm mới
          </Button>
        </div>

        {/* Offers List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <FileText size={40} className="text-[hsl(var(--admin-text-faint))] mb-4" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có offer nào.</p>
            <Button
              onClick={() => navigate('/enterprise/offers/create')}
              className="mt-4 gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white"
            >
              <Plus size={14} /> Tạo offer đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map(offer => {
              const status = offerStatusConfig[offer.status] || offerStatusConfig.pending;
              return (
                <div
                  key={offer._id}
                  className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 hover:border-[hsl(var(--admin-border-strong))] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--admin-accent-subtle))] flex items-center justify-center">
                        <span className="text-lg font-medium text-[hsl(var(--admin-accent))]">
                          {offer.workerName?.[0] || offer.worker?.name?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-[hsl(var(--admin-text-primary))]">
                          {offer.workerName || offer.worker?.name || 'Ứng viên'}
                        </p>
                        <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                          {offer.position || offer.job?.title} • {offer.jobTitle || offer.job?.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                          {formatCurrency(offer.salary?.amount)}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                          {offer.salary?.paymentType === 'monthly' ? '/tháng' :
                           offer.salary?.paymentType === 'hourly' ? '/giờ' : '/dự án'}
                        </p>
                      </div>
                      <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/enterprise/offers/${offer._id}`)}
                        className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))]"
                      >
                        <Eye size={18} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[hsl(var(--admin-border))] text-sm text-[hsl(var(--admin-text-muted))]">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> Bắt đầu: {formatDate(offer.startDate)}
                    </span>
                    <span>Hết hạn: {formatDate(offer.expiresAt)}</span>
                    {offer.probationPeriod?.months > 0 && (
                      <span>Thử việc: {offer.probationPeriod.months} tháng</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
