import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Calendar, CheckCircle2, UserPlus, Building2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import { getEnterpriseDashboard } from '@/apis/enterpriseDashboardApi';
import { Skeleton } from '@/components/ui';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 flex items-center gap-4 hover:border-[hsl(var(--admin-accent))] transition-colors shadow-sm">
    <div className={`p-4 rounded-2xl ${color.bg}`}>
      <Icon size={24} className={color.text} />
    </div>
    <div>
      <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-1 font-medium">{label}</p>
      <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">{value ?? 0}</p>
    </div>
  </div>
);

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24'];

export default function EnterpriseDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dashRes = await getEnterpriseDashboard().catch(() => ({ data: { data: {} } }));
      setStats(dashRes.data?.data || {});
    } catch (err) {
      console.error('Enterprise dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const funnelData = stats.applicationFunnel || [];
  const trendData = stats.applicationTrend || [];
  const sourceData = stats.applicationSource || [];
  const jobStatusData = stats.jobStatusData || [];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Tuyển dụng & Đào tạo</h1>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
          Theo dõi tổng quan hiệu quả tuyển dụng và các chương trình hợp tác của doanh nghiệp.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={Briefcase} 
            label="Tổng tin tuyển dụng" 
            value={stats.totalJobs} 
            color={{ bg: 'bg-blue-100/50', text: 'text-blue-600' }} 
          />
          <StatCard 
            icon={Users} 
            label="Tổng ứng viên" 
            value={stats.totalApplications} 
            color={{ bg: 'bg-purple-100/50', text: 'text-purple-600' }} 
          />
          <StatCard 
            icon={Calendar} 
            label="Phỏng vấn sắp tới" 
            value={stats.totalInterviews} 
            color={{ bg: 'bg-amber-100/50', text: 'text-amber-600' }} 
          />
          <StatCard 
            icon={CheckCircle2} 
            label="Đã tuyển thành công" 
            value={stats.totalHired} 
            color={{ bg: 'bg-emerald-100/50', text: 'text-emerald-600' }} 
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <div className="lg:col-span-2 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Phễu chuyển đổi ứng viên</h3>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">Tỷ lệ ứng viên đi qua các vòng tuyển dụng</p>
          </div>
          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl bg-[hsl(var(--admin-surface-elevated))]" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" name="Số lượng" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={32}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Job Status Chart */}
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Trạng thái tin tuyển dụng</h3>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">Phân bổ tin tuyển dụng theo trạng thái</p>
          </div>
          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl bg-[hsl(var(--admin-surface-elevated))]" />
          ) : (
            <div className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobStatusData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" name="Số lượng" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={32}>
                    {jobStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Lưu lượng ứng tuyển (7 ngày qua)</h3>
          <p className="text-sm text-[hsl(var(--admin-text-muted))]">Số lượng đơn ứng tuyển mới nộp vào mỗi ngày</p>
        </div>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl bg-[hsl(var(--admin-surface-elevated))]" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="count" name="Số đơn nộp" stroke="#38bdf8" strokeWidth={3} fill="url(#trendArea)" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom Row - Training & Partnerships */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-[hsl(var(--admin-text-primary))] mb-4">Hoạt động Đào tạo & Tài trợ</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Partnership đang hoạt động</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalPartnerships || 0}</p>
                </div>
                <Building2 size={32} className="text-slate-300" />
             </div>
             <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Học viên đang tài trợ</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalLearners || 0}</p>
                </div>
                <Users size={32} className="text-slate-300" />
             </div>
          </div>
        </div>

        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-[hsl(var(--admin-text-primary))] mb-4">Thao tác nhanh</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/enterprise/recruitment/jobs/create')} className="w-full text-left px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
              <UserPlus size={18} /> Đăng tin tuyển dụng mới
            </button>
            <button onClick={() => navigate('/enterprise/recruitment/interviews')} className="w-full text-left px-4 py-3 rounded-xl bg-[hsl(var(--admin-surface-elevated))] hover:bg-slate-100 text-[hsl(var(--admin-text-secondary))] font-medium transition-colors border border-slate-200">
              Xem lịch phỏng vấn
            </button>
            <button onClick={() => navigate('/enterprise/sponsorships')} className="w-full text-left px-4 py-3 rounded-xl bg-[hsl(var(--admin-surface-elevated))] hover:bg-slate-100 text-[hsl(var(--admin-text-secondary))] font-medium transition-colors border border-slate-200">
              Quản lý tài trợ học phí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
