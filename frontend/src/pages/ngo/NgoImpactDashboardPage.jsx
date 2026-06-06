import { useState, useEffect, useCallback } from 'react';
import NgoLayout from '@/components/ngo/NgoLayout';
import ImpactChart from '@/components/shared/ImpactChart';
import { Users, TrendingUp, CheckCircle2, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { getNgoImpactDashboard } from '@/apis/ngoDashboardApi';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 flex items-center gap-4">
    <div className={`p-3 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]`}>
      <Icon size={22} className={color} />
    </div>
    <div>
      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">{value ?? 0}</p>
    </div>
  </div>
);

export default function NgoImpactDashboardPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNgoImpactDashboard().catch(() => ({ data: { data: {} } }));
      setStats(res.data?.data || {});
    } catch (err) {
      console.error('NGO impact dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <NgoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Impact Dashboard</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Theo dõi tác động của các chương trình tài trợ học bổng của tổ chức bạn.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Wallet} label="Tổng ngân sách giải ngân" value={stats.totalDisbursed} color="text-[hsl(var(--admin-success))]" />
            <StatCard icon={Users} label="Học viên được tài trợ" value={stats.totalRecipients} color="text-[hsl(var(--admin-accent))]" />
            <StatCard icon={CheckCircle2} label="Hoàn thành khóa học" value={stats.completedLearners} color="text-[hsl(var(--admin-success))]" />
            <StatCard icon={TrendingUp} label="Tỷ lệ hoàn thành" value={`${stats.completionRate || 0}%`} color="text-[hsl(var(--admin-warning))]" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ImpactChart
              data={stats.monthlyTrend || []}
              title="Xu hướng giải ngân theo tháng"
              description="Số tiền đã giải ngân qua các tháng"
            />
          </div>
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] text-sm">Sponsorships đang hoạt động</h3>
            {(stats.activeSponsorships || []).map(sp => (
              <div key={sp._id} className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--admin-text-secondary))]">{sp.title}</span>
                <span className="text-[hsl(var(--admin-success))] font-medium">{sp.remaining} slot</span>
              </div>
            ))}
            {!(stats.activeSponsorships || []).length && (
              <p className="text-[hsl(var(--admin-text-muted))] text-xs">Chưa có sponsorship nào đang hoạt động.</p>
            )}
          </div>
        </div>

        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
          <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-4 text-sm">Chi tiết sponsorship</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Tổng sponsorships', value: stats.totalSponsorships },
              { label: 'Ngân sách còn lại', value: stats.totalRemaining },
              { label: 'Clawback', value: stats.totalClawback }
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-[hsl(var(--admin-border))] p-4 text-center">
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-2">{item.label}</p>
                <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{item.value ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NgoLayout>
  );
}
