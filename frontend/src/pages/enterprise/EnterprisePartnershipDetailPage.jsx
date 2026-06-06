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
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  negotiating: { label: 'Đang đàm phán', className: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  active: { label: 'Đang hợp tác', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  expired: { label: 'Hết hạn', className: 'bg-red-500/15 text-red-300 border-red-500/20' }
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
    return <EnterpriseLayout><Skeleton className="h-96 rounded-2xl bg-slate-800" /></EnterpriseLayout>;
  }

  if (!partnership) return null;

  const config = statusConfig[partnership.status] || statusConfig.pending;
  const stats = partnership.stats || {};
  const recruitment = partnership.recruitmentNeeds || {};

  return (
    <EnterpriseLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enterprise/partnerships')} className="text-slate-400 hover:text-white pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-white">{partnership.trainer?.displayName || 'Partnership'}</h1>
              <Badge className={config.className}>{config.label}</Badge>
            </div>
            <p className="text-slate-400 text-sm">{recruitment.jobTitle || '—'} · {recruitment.jobQuantity || 0} vị trí</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tổng Learner', value: stats.enrolledLearners ?? 0 },
            { label: 'Đang học', value: stats.activeLearners ?? 0 },
            { label: 'Tốt nghiệp', value: stats.completedLearners ?? 0 },
            { label: 'Được tuyển', value: stats.placedLearners ?? 0 }
          ].map(item => (
            <div key={item.label} className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-2">{item.label}</p>
              <p className="text-2xl font-extrabold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white text-sm">Thông tin Partnership</h3>
            <div className="space-y-3 text-sm">
              <div><p className="text-slate-500 text-xs">Vị trí</p><p className="text-white font-medium">{recruitment.jobTitle || '—'}</p></div>
              <div><p className="text-slate-500 text-xs">Số lượng</p><p className="text-white font-medium">{recruitment.jobQuantity || 0} người</p></div>
              <div><p className="text-slate-500 text-xs">Mức lương</p><p className="text-emerald-400 font-medium">{formatCurrency(recruitment.salaryRange?.min)} — {formatCurrency(recruitment.salaryRange?.max)}</p></div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><Calendar size={12} /> {partnership.signedAt ? new Date(partnership.signedAt).toLocaleDateString('vi-VN') : 'Chưa ký kết'}</div>
            </div>
            {partnership.message && (
              <div className="pt-3 border-t border-slate-800">
                <p className="text-slate-500 text-xs mb-1">Lời nhắn</p>
                <p className="text-slate-300 text-sm">{partnership.message}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-semibold text-white mb-4">Học viên tốt nghiệp</h3>
            <GraduateList graduates={graduates} emptyText="Chưa có học viên tốt nghiệp từ partnership này." />
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
