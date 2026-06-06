import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import EnterpriseLayout from '@/components/enterprise/EnterpriseLayout';
import GraduateList from '@/components/shared/GraduateList';
import { Button, Badge } from '@/components/ui';
import { getPartnershipDetail, getPartnershipGraduates } from '@/apis/partnershipApi';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui';

const statusConfig = {
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  negotiating: { label: 'Đang đàm phán', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  active: { label: 'Đang hợp tác', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-500 border-slate-300' },
  expired: { label: 'Hết hạn', className: 'bg-red-100 text-red-700 border-red-200' }
};

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—';

export default function EnterprisePartnershipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partnership, setPartnership] = useState(null);
  const [graduates, setGraduates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [pRes, gRes] = await Promise.all([
          getPartnershipDetail(id).catch(() => ({ data: { data: {} } })),
          getPartnershipGraduates(id, { limit: 20 }).catch(() => ({ data: { data: [] } }))
        ]);
        setPartnership(pRes.data?.data || {});
        setGraduates(gRes.data?.data || []);
      } catch {
        toast.error('Không thể tải chi tiết partnership.');
        navigate('/enterprise/partnerships');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  if (loading) {
    return <EnterpriseLayout><Skeleton className="h-96 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" /></EnterpriseLayout>;
  }

  if (!partnership) return null;

  const config = statusConfig[partnership.status] || statusConfig.pending;
  const stats = partnership.stats || {};
  const recruitment = partnership.recruitmentNeeds || {};

  return (
    <EnterpriseLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enterprise/partnerships')} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">{partnership.trainer?.displayName || 'Partnership'}</h1>
              <Badge className={config.className}>{config.label}</Badge>
            </div>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm">{recruitment.jobTitle || '—'} · {recruitment.jobQuantity || 0} vị trí</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tổng Learner', value: stats.enrolledLearners ?? 0 },
            { label: 'Đang học', value: stats.activeLearners ?? 0 },
            { label: 'Tốt nghiệp', value: stats.completedLearners ?? 0 },
            { label: 'Được tuyển', value: stats.placedLearners ?? 0 }
          ].map(item => (
            <div key={item.label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-2">{item.label}</p>
              <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] text-sm">Thông tin Partnership</h3>
            <div className="space-y-3 text-sm">
              <div><p className="text-[hsl(var(--admin-text-muted))] text-xs">Vị trí</p><p className="text-[hsl(var(--admin-text-primary))] font-medium">{recruitment.jobTitle || '—'}</p></div>
              <div><p className="text-[hsl(var(--admin-text-muted))] text-xs">Số lượng</p><p className="text-[hsl(var(--admin-text-primary))] font-medium">{recruitment.jobQuantity || 0} người</p></div>
              <div><p className="text-[hsl(var(--admin-text-muted))] text-xs">Mức lương</p><p className="text-[hsl(var(--admin-success))] font-medium">{formatCurrency(recruitment.salaryRange?.min)} — {formatCurrency(recruitment.salaryRange?.max)}</p></div>
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--admin-text-muted))]"><Calendar size={12} /> {partnership.signedAt ? new Date(partnership.signedAt).toLocaleDateString('vi-VN') : 'Chưa ký kết'}</div>
            </div>
            {partnership.message && (
              <div className="pt-3 border-t border-[hsl(var(--admin-border))]">
                <p className="text-[hsl(var(--admin-text-muted))] text-xs mb-1">Lời nhắn</p>
                <p className="text-[hsl(var(--admin-text-secondary))] text-sm">{partnership.message}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Học viên tốt nghiệp</h3>
            <GraduateList graduates={graduates} emptyText="Chưa có học viên tốt nghiệp từ partnership này." />
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
