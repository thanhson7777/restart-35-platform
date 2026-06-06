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
    <Card className="border-slate-800 bg-[#111827] text-white shadow-xl shadow-black/10">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-200">
              {partnership?.enterprise?.displayName || partnership?.title || 'Partnership'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {recruitment.jobTitle || 'Chưa có vị trí tuyển dụng cụ thể'}
            </p>
          </div>
          <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/20">{statusLabel}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2 text-slate-400 mb-1"><Briefcase size={14} /> Chỉ tiêu</div>
            <p className="font-bold text-white">{recruitment.jobQuantity || 0} học viên</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2 text-slate-400 mb-1"><Users size={14} /> Đã placement</div>
            <p className="font-bold text-white">{stats.placedLearners || 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><Calendar size={12} /> {partnership?.signedAt ? new Date(partnership.signedAt).toLocaleDateString('vi-VN') : 'Chưa ký kết'}</span>
          <Button variant="ghost" size="sm" onClick={onClick} className="text-blue-300 hover:text-white hover:bg-slate-800 gap-1">
            {actionLabel} <ChevronRight size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PartnershipCard;
