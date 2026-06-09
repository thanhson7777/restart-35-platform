import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminInteractionStats,
  AdminInteractionChart,
  AdminTopContent,
  AdminUserEngagement,
} from '@/components/admin/interactions';
import { getInteractionStatsAPI } from '@/apis/interactionAPI';

const AdminInteractionsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getInteractionStatsAPI({ range: dateRange });
      setStats(response.data || response || {});
    } catch (err) {
      toast.error('Không thể tải interaction stats');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'top', label: 'Top Content' },
    { key: 'engagement', label: 'User Engagement' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <AdminPageTitle
            title="Interactions Stats"
            subtitle="Theo dõi hành vi người dùng trên nền tảng"
          />
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none focus:border-[hsl(var(--admin-accent))]"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="90d">90 ngày</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        <AdminInteractionStats stats={stats} loading={loading} />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <AdminInteractionChart data={stats} loading={loading} />
        )}
        {activeTab === 'top' && (
          <AdminTopContent data={stats} loading={loading} />
        )}
        {activeTab === 'engagement' && (
          <AdminUserEngagement data={stats?.userEngagement || stats} loading={loading} />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInteractionsPage;
