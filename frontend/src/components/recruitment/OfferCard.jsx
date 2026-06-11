import React from 'react';
import { DollarSign, Calendar, Clock, Check, X } from 'lucide-react';
import ApplicationStatusBadge from './ApplicationStatusBadge';

const formatCurrency = (amount) => {
  if (!amount) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysRemaining = (date) => {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function OfferCard({ offer, onAccept, onReject, onClick, compact = false }) {
  if (!offer) return null;

  const daysRemaining = getDaysRemaining(offer.expiresAt);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;

  if (compact) {
    return (
      <div
        className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 ${
          onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-colors' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[hsl(var(--foreground))]">
              {offer.position || offer.job?.title}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {offer.enterpriseName || offer.enterprise?.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {formatCurrency(offer.salary?.amount)}
            </p>
            <ApplicationStatusBadge status={offer.status} size="sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[hsl(var(--card))] border rounded-xl p-6 ${
        offer.status === 'pending' && isExpiringSoon
          ? 'border-amber-400 shadow-amber-100'
          : offer.status === 'accepted'
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-[hsl(var(--border))]'
      } ${onClick ? 'cursor-pointer hover:border-[hsl(var(--primary))] transition-all' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {offer.position || offer.job?.title}
            </h3>
            <ApplicationStatusBadge status={offer.status} />
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

      {/* Info Grid */}
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
      {offer.status === 'pending' && (onAccept || onReject) && (
        <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
          <p className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Clock size={14} />
            {isExpiringSoon
              ? `Còn ${daysRemaining} ngày để phản hồi`
              : `Hết hạn ${formatDate(offer.expiresAt)}`}
          </p>
          <div className="flex gap-2">
            {onReject && (
              <button
                onClick={(e) => { e.stopPropagation(); onReject(offer); }}
                className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <X size={14} /> Từ chối
              </button>
            )}
            {onAccept && (
              <button
                onClick={(e) => { e.stopPropagation(); onAccept(offer); }}
                className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <Check size={14} /> Chấp nhận
              </button>
            )}
          </div>
        </div>
      )}

      {offer.status === 'accepted' && (
        <div className="flex items-center justify-between pt-4 border-t border-emerald-200">
          <p className="text-sm text-emerald-600 flex items-center gap-1">
            <Check size={14} /> Bạn đã chấp nhận offer này
          </p>
        </div>
      )}

      {offer.status === 'rejected' && (
        <div className="flex items-center justify-between pt-4 border-t border-red-200">
          <p className="text-sm text-red-600 flex items-center gap-1">
            <X size={14} /> Bạn đã từ chối offer này
          </p>
        </div>
      )}
    </div>
  );
}
