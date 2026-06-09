import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { syncEscoData, getEscoSyncStatus } from '@/apis';

const AdminEscoSyncPage = () => {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getEscoSyncStatus();
      setStatus(response.data || response || {});
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await syncEscoData();
      toast.success('ESCO sync started successfully');
      await fetchStatus();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'ESCO sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const syncHistory = status?.history || [];
  const latestSync = status?.lastSyncAt || status?.lastSync || null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <AdminPageTitle
          title="ESCO Sync"
          subtitle="Đồng bộ ESCO skills framework với dữ liệu việc làm"
        />

        {/* Sync status card */}
        <div className="p-6 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">Trạng thái ESCO Sync</h3>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
                {latestSync
                  ? `Lần sync cuối: ${new Date(latestSync).toLocaleString('vi-VN')}`
                  : 'Chưa có lần sync nào'}
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Đang sync...' : 'Sync ESCO Data'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Skills đã sync', value: status?.skillsCount || status?.skillsCount || 0 },
              { label: 'Occupations', value: status?.occupationsCount || status?.occupationsCount || 0 },
              { label: 'Languages', value: status?.languagesCount || status?.languagesCount || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-4 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl">
                <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{loading ? '—' : value.toLocaleString('vi-VN')}</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sync history */}
        <div className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Lịch sử Sync</h3>
          {syncHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-10 h-10 text-[hsl(var(--admin-text-muted))] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">Chưa có lịch sử sync.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {syncHistory.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[hsl(var(--admin-text-primary))]">{entry.status === 'success' ? 'Sync thành công' : 'Sync thất bại'}</p>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                      {entry.recordsSync || entry.count || 0} records • {new Date(entry.timestamp || entry.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {entry.error && (
                    <span className="text-xs text-rose-500 shrink-0">{entry.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEscoSyncPage;
