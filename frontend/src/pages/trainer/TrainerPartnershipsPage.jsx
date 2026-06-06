import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Users, Briefcase, GraduationCap, TrendingUp, RefreshCw, ChevronRight } from 'lucide-react';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Textarea } from '@/components/ui';
import PartnershipCard from '@/components/shared/PartnershipCard';
import {
  getTrainerPartnerships
} from '@/apis/partnershipApi';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Chờ phản hồi',
    color: 'bg-[hsl(var(--admin-warning)_/_15%)] text-[hsl(var(--admin-warning))] border-[hsl(var(--admin-warning)_/_30%)] border',
    icon: '⏳'
  },
  negotiating: {
    label: 'Đang đàm phán',
    color: 'bg-[hsl(var(--admin-accent)_/_15%)] text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent)_/_30%)] border',
    icon: '🤝'
  },
  active: {
    label: 'Đang hợp tác',
    color: 'bg-[hsl(var(--admin-success)_/_15%)] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success)_/_30%)] border',
    icon: '✅'
  },
  cancelled: {
    label: 'Đã hủy',
    color: 'bg-[hsl(var(--admin-text-muted)_/_15%)] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-text-muted)_/_30%)] border',
    icon: '❌'
  },
  expired: {
    label: 'Đã hết hạn',
    color: 'bg-[hsl(var(--admin-danger)_/_15%)] text-[hsl(var(--admin-danger))] border-[hsl(var(--admin-danger)_/_30%)] border',
    icon: '⏰'
  }
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ phản hồi' },
  { value: 'negotiating', label: 'Đang đàm phán' },
  { value: 'active', label: 'Đang hợp tác' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'expired', label: 'Đã hết hạn' }
];

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
};

export default function TrainerPartnershipsPage() {
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });

  const fetchPartnerships = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      const res = await getTrainerPartnerships(params);
      const data = res.data?.data || [];
      const paginationData = res.data?.pagination || {};
      setPartnerships(data);
      setPagination({
        currentPage: paginationData.currentPage || page,
        totalPages: paginationData.totalPages || 1,
        totalRecords: paginationData.totalRecords || data.length
      });
    } catch (err) {
      console.error('Error fetching partnerships:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách partnership.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPartnerships(1);
  }, [fetchPartnerships]);

  const handlePageChange = (page) => {
    fetchPartnerships(page);
  };

  const summaryCounts = React.useMemo(() => {
    const counts = { pending: 0, negotiating: 0, active: 0, cancelled: 0, expired: 0 };
    partnerships.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [partnerships]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">Hợp tác doanh nghiệp</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
            Quản lý và theo dõi các yêu cầu hợp tác từ doanh nghiệp.
          </p>
        </div>
        <Button
          onClick={() => fetchPartnerships(pagination.currentPage)}
          variant="outline"
          className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { key: 'pending', label: 'Chờ phản hồi', icon: Users, color: 'text-[hsl(var(--admin-warning))]' },
            { key: 'negotiating', label: 'Đang đàm phán', icon: TrendingUp, color: 'text-[hsl(var(--admin-accent))]' },
            { key: 'active', label: 'Đang hợp tác', icon: Briefcase, color: 'text-[hsl(var(--admin-success))]' },
            { key: 'cancelled', label: 'Đã hủy', icon: Users, color: 'text-[hsl(var(--admin-text-muted))]' },
            { key: 'expired', label: 'Đã hết hạn', icon: GraduationCap, color: 'text-[hsl(var(--admin-danger))]' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left
                ${statusFilter === key
                  ? 'bg-[hsl(var(--admin-accent)_/_15%)] border-[hsl(var(--admin-accent)_/_40%)]'
                  : 'bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))]'
                }`}
            >
              <Icon size={18} className={color} />
              <div>
                <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{summaryCounts[key]}</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">{label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] rounded-xl p-1 gap-1">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                statusFilter === filter.value
                  ? 'bg-[hsl(var(--admin-accent))] text-white shadow-sm'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-[hsl(var(--admin-text-muted))] ml-auto">
          {pagination.totalRecords > 0 ? `${pagination.totalRecords} yêu cầu` : ''}
        </span>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[hsl(var(--admin-danger))] font-medium mb-2">{error}</p>
          <Button onClick={() => fetchPartnerships(1)} variant="outline" size="sm" className="border-[hsl(var(--admin-border))]">Thử lại</Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && partnerships.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-[hsl(var(--admin-text-muted))]" />
          </div>
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] mb-1">Chưa có yêu cầu hợp tác</h3>
          <p className="text-sm text-[hsl(var(--admin-text-muted))] max-w-sm">
            Các yêu cầu hợp tác từ doanh nghiệp sẽ xuất hiện tại đây khi có doanh nghiệp gửi yêu cầu đến bạn.
          </p>
        </div>
      )}

      {/* Partnership List */}
      {!loading && !error && partnerships.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerships.map((partnership) => (
              <PartnershipCard
                key={partnership._id}
                partnership={partnership}
                onClick={() => navigate(`/trainer/partnerships/${partnership._id}`)}
                actionLabel={partnership.status === 'pending' ? 'Xem & phản hồi' : 'Xem chi tiết'}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage <= 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] disabled:opacity-40"
              >
                Trước
              </Button>
              <span className="text-sm text-[hsl(var(--admin-text-muted))] px-3">
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] disabled:opacity-40"
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
