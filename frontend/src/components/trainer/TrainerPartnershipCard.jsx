import React from 'react';
import { Briefcase, ChevronRight, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui';

const STATUS_CONFIG = {
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  negotiating: { label: 'Đang đàm phán', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  active: { label: 'Đang hợp tác', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  expired: { label: 'Đã hết hạn', className: 'bg-red-500/15 text-red-400 border-red-500/30' }
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
      className="w-full text-left bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 group flex flex-col"
    >
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase size={16} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">
                {partnership.enterprise?.displayName || 'Doanh nghiệp'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {partnership.enterprise?.email || ''}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 shrink-0 transition-colors" />
        </div>

        <Badge className={`${config.className} border text-xs font-semibold`}>
          {config.label}
        </Badge>
      </div>

      <div className="p-5 space-y-3 flex-1">
        {recruitment.jobTitle && (
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Vị trí tuyển dụng</p>
            <p className="text-sm font-semibold text-white">{recruitment.jobTitle}</p>
          </div>
        )}

        {recruitment.salaryRange && (recruitment.salaryRange.min || recruitment.salaryRange.max) && (
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Mức lương</p>
            <p className="text-sm font-medium text-green-400">
              {formatCurrency(recruitment.salaryRange.min)}
              {recruitment.salaryRange.max ? ` - ${formatCurrency(recruitment.salaryRange.max)}` : '+'}
            </p>
          </div>
        )}

        {recruitment.jobQuantity && (
          <div className="flex items-center gap-2">
            <Users size={13} className="text-slate-500 shrink-0" />
            <p className="text-xs text-slate-400">Cần tuyển {recruitment.jobQuantity} người</p>
          </div>
        )}

        {partnership.linkedCourses?.length > 0 && (
          <div className="flex items-center gap-2">
            <GraduationCap size={13} className="text-slate-500 shrink-0" />
            <p className="text-xs text-slate-400">{partnership.linkedCourses.length} khóa học liên kết</p>
          </div>
        )}
      </div>
    </button>
  );
};

export default TrainerPartnershipCard;
