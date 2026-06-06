import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, RefreshCw } from 'lucide-react';
import NgoLayout from '@/components/ngo/NgoLayout';
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
    <NgoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Quản lý Sponsorship</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Theo dõi các chương trình tài trợ học bổng của tổ chức.</p>
          </div>
          <Button onClick={() => navigate('/ngo/sponsorships/create')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus size={14} /> Tạo Sponsorship
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
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có sponsorship nào.</p>
            <Button onClick={() => navigate('/ngo/sponsorships/create')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus size={14} /> Tạo sponsorship đầu tiên
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
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-accent-subtle))] p-2.5">
                      <p className="text-[hsl(var(--admin-text-muted))] mb-0.5">Ngân sách</p>
                      <p className="font-semibold text-[hsl(var(--admin-text-primary))]">{formatCurrency(sp.budget)}</p>
                    </div>
                    <div className="rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-accent-subtle))] p-2.5">
                      <p className="text-[hsl(var(--admin-text-muted))] mb-0.5">Đã dùng</p>
                      <p className="font-semibold text-[hsl(var(--admin-warning))]">{formatCurrency(sp.spent)}</p>
                    </div>
                    <div className="rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-accent-subtle))] p-2.5">
                      <p className="text-[hsl(var(--admin-text-muted))] mb-0.5">Còn lại</p>
                      <p className="font-semibold text-[hsl(var(--admin-success))]">{formatCurrency(sp.remaining)}</p>
                    </div>
                  </div>
                  <div className="text-xs text-[hsl(var(--admin-text-muted))] flex justify-between">
                    <span>Link khóa: {(sp.linkedCourses || []).length}</span>
                    <span>Max/người: {formatCurrency(sp.maxAmountPerLearner)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NgoLayout>
  );
}
