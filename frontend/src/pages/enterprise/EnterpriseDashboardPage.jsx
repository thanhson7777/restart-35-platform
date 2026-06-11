import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

import ImpactChart from '@/components/shared/ImpactChart';
import GraduateList from '@/components/shared/GraduateList';
import { getEnterpriseDashboard, getEnterpriseDashboardGraduates } from '@/apis/enterpriseDashboardApi';
import { Skeleton } from '@/components/ui';

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

export default function EnterpriseDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [graduates, setGraduates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, gradRes] = await Promise.all([
        getEnterpriseDashboard().catch(() => ({ data: { data: {} } })),
        getEnterpriseDashboardGraduates({ limit: 20 }).catch(() => ({ data: { data: [] } }))
      ]);
      setStats(dashRes.data?.data || {});
      setGraduates(gradRes.data?.data || []);
    } catch (err) {
      console.error('Enterprise dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Enterprise Dashboard</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Tổng quan partnership, sponsorship và kết quả đầu ra của bạn.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Partnerships đang hoạt động" value={stats.activePartnerships} color="text-[hsl(var(--admin-accent))]" />
            <StatCard icon={TrendingUp} label="Học viên được tuyển" value={stats.placedLearners} color="text-[hsl(var(--admin-success))]" />
            <StatCard icon={Users} label="Học viên đang học" value={stats.activeLearners} color="text-[hsl(var(--admin-warning))]" />
            <StatCard icon={CheckCircle2} label="Tốt nghiệp" value={stats.completedLearners} color="text-[hsl(var(--admin-success))]" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ImpactChart
              data={stats.monthlyTrend || []}
              title="Xu hướng tuyển dụng theo tháng"
              description="Số lượng learner được placement qua các tháng"
            />
          </div>
          <div className="space-y-4">
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
              <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/enterprise/partnerships')} className="w-full text-left px-3 py-2.5 rounded-xl bg-[hsl(var(--admin-surface-elevated))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm text-[hsl(var(--admin-text-secondary))] transition-colors">
                  Xem danh sách Partnership
                </button>
                <button onClick={() => navigate('/enterprise/sponsorships')} className="w-full text-left px-3 py-2.5 rounded-xl bg-[hsl(var(--admin-surface-elevated))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm text-[hsl(var(--admin-text-secondary))] transition-colors">
                  Quản lý Sponsorship
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[hsl(var(--admin-text-primary))]">Học viên tốt nghiệp gần đây</h3>
            <button onClick={() => navigate('/enterprise/partnerships')} className="text-sm text-[hsl(var(--admin-accent))] hover:text-[hsl(var(--admin-accent))] opacity-80">Xem tất cả →</button>
          </div>
          <GraduateList graduates={graduates} />
        </div>
      </div>
    </>
  );
}
