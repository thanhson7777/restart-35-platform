import { Card, CardContent, Badge, Button } from '@/components/ui';
import { Briefcase, Users, Calendar, ChevronRight } from 'lucide-react';

const statusMap = {
  pending: 'Chờ phản hồi',
  negotiating: 'Đang đàm phán',
  active: 'Đang hợp tác',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn'
};

const statusColors = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  negotiating: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  expired: 'bg-slate-100 text-slate-800 border-slate-200'
};

const PartnershipCard = ({ partnership, onClick, actionLabel = 'Xem chi tiết' }) => {
  const recruitment = partnership?.recruitmentNeeds || {};
  const stats = partnership?.stats || {};
  const statusLower = (partnership?.status || '').toLowerCase();
  const statusLabel = statusMap[statusLower] || partnership?.status || 'N/A';

  return (
    <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] shadow-[var(--admin-shadow-lg)]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
              {partnership?.enterprise?.displayName || partnership?.title || 'Partnership'}
            </p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
              {recruitment.jobTitle || 'Chưa có vị trí tuyển dụng cụ thể'}
            </p>
          </div>
          <Badge className={`${statusColors[statusLower] || 'bg-gray-100 text-gray-800 border-gray-200'} whitespace-nowrap shrink-0 border`}>
            {statusLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-3">
            <div className="flex items-center gap-2 text-[hsl(var(--admin-text-secondary))] mb-1"><Briefcase size={14} /> Chỉ tiêu</div>
            <p className="font-bold text-[hsl(var(--admin-text-primary))]">{recruitment.jobQuantity || 0} học viên</p>
          </div>
          <div className="rounded-xl border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-3">
            <div className="flex items-center gap-2 text-[hsl(var(--admin-text-secondary))] mb-1"><Users size={14} /> Đã tuyển dụng</div>
            <p className="font-bold text-[hsl(var(--admin-text-primary))]">{stats.placedLearners || 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[hsl(var(--admin-text-muted))]">
          <span className="flex items-center gap-1"><Calendar size={12} /> {partnership?.signedAt ? new Date(partnership.signedAt).toLocaleDateString('vi-VN') : 'Chưa ký kết'}</span>
          <Button variant="ghost" size="sm" onClick={onClick} className="text-[hsl(var(--admin-accent))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] gap-1">
            {actionLabel} <ChevronRight size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PartnershipCard;
