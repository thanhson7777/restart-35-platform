import React from 'react';
import { Briefcase, ChevronRight, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui';

const STATUS_CONFIG = {
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-500/15 text-[hsl(var(--admin-warning))] border-amber-500/30' },
  negotiating: { label: 'Đang đàm phán', className: 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/30' },
  active: { label: 'Đang hợp tác', className: 'bg-[hsl(var(--admin-success-subtle))] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success))]/30' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-500/15 text-[hsl(var(--admin-text-muted))] border-slate-500/30' },
  expired: { label: 'Đã hết hạn', className: 'bg-[hsl(var(--admin-danger-subtle))] text-[hsl(var(--admin-danger))] border-[hsl(var(--admin-danger))]/30' }
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const TrainerPartnershipCard = ({ partnership, onClick }) => {
  const config = STATUS_CONFIG[partnership.status] || STATUS_CONFIG.pending;
  const recruitment = partnership.recruitmentNeeds || {};

  return (
    <button
      type="button"
      onClick={() => onClick?.(partnership)}
      className="w-full text-left bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden hover:border-[hsl(var(--admin-accent))]/40 hover:shadow-lg hover:shadow-[hsl(var(--admin-accent))]/5 transition-all duration-200 group flex flex-col"
    >
      <div className="p-5 border-b border-[hsl(var(--admin-border))]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-[hsl(var(--admin-accent))]/20 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase size={16} className="text-[hsl(var(--admin-accent))]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[hsl(var(--admin-text-primary))] text-sm truncate">
                {partnership.enterprise?.displayName || 'Doanh nghiệp'}
              </p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate">
                {partnership.enterprise?.email || ''}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[hsl(var(--admin-text-faint))] group-hover:text-[hsl(var(--admin-accent))] shrink-0 transition-colors" />
        </div>

        <Badge className={`${config.className} border text-xs font-semibold`}>
          {config.label}
        </Badge>
      </div>

      <div className="p-5 space-y-3 flex-1">
        {recruitment.jobTitle && (
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Vị trí tuyển dụng</p>
            <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{recruitment.jobTitle}</p>
          </div>
        )}

        {recruitment.salaryRange && (recruitment.salaryRange.min || recruitment.salaryRange.max) && (
          <div>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Mức lương</p>
            <p className="text-sm font-medium text-[hsl(var(--admin-success))]">
              {formatCurrency(recruitment.salaryRange.min)}
              {recruitment.salaryRange.max ? ` - ${formatCurrency(recruitment.salaryRange.max)}` : '+'}
            </p>
          </div>
        )}

        {recruitment.jobQuantity && (
          <div className="flex items-center gap-2">
            <Users size={13} className="text-[hsl(var(--admin-text-muted))] shrink-0" />
            <p className="text-xs text-[hsl(var(--admin-text-muted))]">Cần tuyển {recruitment.jobQuantity} người</p>
          </div>
        )}

        {partnership.linkedCourses?.length > 0 && (
          <div className="flex items-center gap-2">
            <GraduationCap size={13} className="text-[hsl(var(--admin-text-muted))] shrink-0" />
            <p className="text-xs text-[hsl(var(--admin-text-muted))]">{partnership.linkedCourses.length} khóa học liên kết</p>
          </div>
        )}
      </div>
    </button>
  );
};

export default TrainerPartnershipCard;
