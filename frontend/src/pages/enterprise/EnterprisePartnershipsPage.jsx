import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, Plus, RefreshCw } from 'lucide-react';
import EnterpriseLayout from '@/components/enterprise/EnterpriseLayout';
import PartnershipCard from '@/components/shared/PartnershipCard';
import { Button } from '@/components/ui';
import { getEnterprisePartnerships } from '@/apis/partnershipApi';
import toast from 'react-hot-toast';

const statusFilters = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ phản hồi' },
  { value: 'negotiating', label: 'Đang đàm phán' },
  { value: 'active', label: 'Đang hợp tác' },
  { value: 'cancelled', label: 'Đã hủy' }
];

export default function EnterprisePartnershipsPage() {
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });

  const fetchPartnerships = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      const res = await getEnterprisePartnerships(params);
      setPartnerships(res.data?.data || []);
      setPagination(res.data?.pagination || {});
    } catch (err) {
      toast.error('Không thể tải danh sách partnership.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchPartnerships(1); }, [fetchPartnerships]);

  return (
    <EnterpriseLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Danh sách Partnership</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              Theo dõi các yêu cầu hợp tác đã gửi và trạng thái phản hồi từ trainer.
            </p>
          </div>
          <Button onClick={() => navigate('/enterprise/partnerships/create')} className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white">
            <Plus size={14} /> Tạo Partnership
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl p-1 gap-1">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === f.value ? 'bg-[hsl(var(--admin-accent))] text-white' : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => fetchPartnerships(1)} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] gap-2 ml-auto">
            <RefreshCw size={13} /> Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : partnerships.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Handshake size={40} className="text-[hsl(var(--admin-text-faint))] mb-4" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có partnership nào.</p>
            <Button onClick={() => navigate('/enterprise/partnerships/create')} className="mt-4 gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white">
              <Plus size={14} /> Tạo partnership đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerships.map(p => (
              <PartnershipCard
                key={p._id}
                partnership={p}
                onClick={() => navigate(`/enterprise/partnerships/${p._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
