import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, RefreshCw } from 'lucide-react';
import SponsorshipBadge from '@/components/shared/SponsorshipBadge';
import { Button, Badge } from '@/components/ui';
import { getSponsorships } from '@/apis/courseSponsorshipApi';
import toast from 'react-hot-toast';

const statusConfig = {
  draft: { label: 'Bản nháp', className: 'bg-slate-500/15 text-slate-300 border-slate-500/20' },
  active: { label: 'Đang hoạt động', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  paused: { label: 'Tạm dừng', className: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  exhausted: { label: 'Hết ngân sách', className: 'bg-red-500/15 text-red-300 border-red-500/20' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' }
};

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—';

export default function NgoSponsorshipsPage() {
  const navigate = useNavigate();
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSponsorships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSponsorships({ limit: 50 });
      setSponsorships(res.data?.data || []);
    } catch {
      toast.error('Không thể tải danh sách sponsorship.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSponsorships(); }, [fetchSponsorships]);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Quản lý tài trợ</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Theo dõi các chương trình tài trợ học bổng của tổ chức.</p>
          </div>
          <Button onClick={() => navigate('/ngo/sponsorships/create')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus size={14} /> Tạo gói tài trợ
          </Button>
        </div>

        <Button variant="outline" onClick={fetchSponsorships} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] gap-2">
          <RefreshCw size={13} /> Làm mới
        </Button>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl animate-pulse" />)}
          </div>
        ) : sponsorships.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Heart size={40} className="text-[hsl(var(--admin-text-faint))] mb-4" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có gói tài trợ nào.</p>
            <Button onClick={() => navigate('/ngo/sponsorships/create')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus size={14} /> Tạo gói tài trợ đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sponsorships.map(sp => {
              const config = statusConfig[sp.status] || statusConfig.draft;
              return (
                <div key={sp._id} className="bg-[hsl(var(--admin-surface))] border border-emerald-500/30 rounded-2xl p-5 space-y-4 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{sp.title}</p>
                      <SponsorshipBadge type="ngo" />
                    </div>
                    <Badge className={`${config.className} text-xs`}>{config.label}</Badge>
                  </div>
                  {/* Tiết độ tài trợ */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-[hsl(var(--admin-text-secondary))]">Đã duyệt {sp.stats?.approvedLearners || 0} suất</span>
                      <span className="text-[hsl(var(--admin-text-primary))]">{Math.min(100, Math.round(((sp.stats?.approvedLearners || 0) / (sp.targetLearners || 1)) * 100))}%</span>
                    </div>
                    <div className="h-3 w-full bg-[hsl(var(--admin-surface-hover))] rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${Math.min(100, Math.round(((sp.stats?.approvedLearners || 0) / (sp.targetLearners || 1)) * 100)) >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, Math.round(((sp.stats?.approvedLearners || 0) / (sp.targetLearners || 1)) * 100))}%` }}
                      />
                    </div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] text-right pt-1">
                      Mục tiêu: {sp.targetLearners || 0} suất
                    </p>
                  </div>

                  <div className="text-xs text-[hsl(var(--admin-text-muted))] flex justify-between pt-2 border-t border-[hsl(var(--admin-border))] items-center mt-4">
                    <div className="flex flex-col gap-1">
                      <span>Mức tài trợ: {sp.maxAmountPerLearner ? `${formatCurrency(sp.maxAmountPerLearner)}/người` : (sp.coverageType === 'full' ? 'Toàn phần' : 'Không giới hạn')}</span>
                      <span>Ngân sách: {formatCurrency(sp.budget)}</span>
                    </div>
                    <Button 
                      onClick={() => navigate(`/ngo/sponsorships/${sp._id}/learners`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4"
                    >
                      Duyệt học viên
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
