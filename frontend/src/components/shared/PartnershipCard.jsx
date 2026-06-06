import { Card, CardContent, Badge, Button } from '@/components/ui';
import { Briefcase, Users, Calendar, ChevronRight } from 'lucide-react';

const statusMap = {
  pending: 'Chờ phản hồi',
  negotiating: 'Đang đàm phán',
  active: 'Đang hợp tác',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn'
};

const PartnershipCard = ({ partnership, onClick, actionLabel = 'Xem chi tiết' }) => {
  const recruitment = partnership?.recruitmentNeeds || {};
  const stats = partnership?.stats || {};
  const statusLabel = statusMap[partnership?.status] || partnership?.status || 'N/A';

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
          <Badge className="bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/20">{statusLabel}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-3">
            <div className="flex items-center gap-2 text-[hsl(var(--admin-text-secondary))] mb-1"><Briefcase size={14} /> Chỉ tiêu</div>
            <p className="font-bold text-[hsl(var(--admin-text-primary))]">{recruitment.jobQuantity || 0} học viên</p>
          </div>
          <div className="rounded-xl border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-3">
            <div className="flex items-center gap-2 text-[hsl(var(--admin-text-secondary))] mb-1"><Users size={14} /> Đã placement</div>
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
