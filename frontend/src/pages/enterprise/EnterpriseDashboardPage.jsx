import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import EnterpriseLayout from '@/components/enterprise/EnterpriseLayout';
import ImpactChart from '@/components/shared/ImpactChart';
import GraduateList from '@/components/shared/GraduateList';
import { getEnterpriseDashboard, getEnterpriseDashboardGraduates } from '@/apis/enterpriseDashboardApi';
import { Skeleton } from '@/components/ui';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
    <div className={`p-3 rounded-2xl bg-slate-900`}>
      <Icon size={22} className={color} />
    </div>
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-white">{value ?? 0}</p>
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
    <EnterpriseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Enterprise Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Tổng quan partnership, sponsorship và kết quả đầu ra của bạn.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-slate-800" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Partnerships đang hoạt động" value={stats.activePartnerships} color="text-blue-400" />
            <StatCard icon={TrendingUp} label="Học viên được tuyển" value={stats.placedLearners} color="text-emerald-400" />
            <StatCard icon={Users} label="Học viên đang học" value={stats.activeLearners} color="text-amber-400" />
            <StatCard icon={CheckCircle2} label="Tốt nghiệp" value={stats.completedLearners} color="text-green-400" />
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
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/enterprise/partnerships')} className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 transition-colors">
                  Xem danh sách Partnership
                </button>
                <button onClick={() => navigate('/enterprise/sponsorships')} className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 transition-colors">
                  Quản lý Sponsorship
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Học viên tốt nghiệp gần đây</h3>
            <button onClick={() => navigate('/enterprise/partnerships')} className="text-sm text-blue-400 hover:text-blue-300">Xem tất cả →</button>
          </div>
          <GraduateList graduates={graduates} />
        </div>
      </div>
    </EnterpriseLayout>
  );
}
