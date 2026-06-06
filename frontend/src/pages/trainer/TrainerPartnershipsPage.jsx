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
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: '⏳'
  },
  negotiating: {
    label: 'Đang đàm phán',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: '🤝'
  },
  active: {
    label: 'Đang hợp tác',
    color: 'bg-green-500/15 text-green-400 border-green-500/30',
    icon: '✅'
  },
  cancelled: {
    label: 'Đã hủy',
    color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: '❌'
  },
  expired: {
    label: 'Đã hết hạn',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
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
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Hợp tác doanh nghiệp</h1>
          <p className="text-gray-400 text-sm mt-1">
            Quản lý và theo dõi các yêu cầu hợp tác từ doanh nghiệp.
          </p>
        </div>
        <Button
          onClick={() => fetchPartnerships(pagination.currentPage)}
          variant="outline"
          className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { key: 'pending', label: 'Chờ phản hồi', icon: Users, color: 'text-amber-400' },
            { key: 'negotiating', label: 'Đang đàm phán', icon: TrendingUp, color: 'text-blue-400' },
            { key: 'active', label: 'Đang hợp tác', icon: Briefcase, color: 'text-green-400' },
            { key: 'cancelled', label: 'Đã hủy', icon: Users, color: 'text-slate-400' },
            { key: 'expired', label: 'Đã hết hạn', icon: GraduationCap, color: 'text-red-400' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left
                ${statusFilter === key
                  ? 'bg-blue-600/15 border-blue-500/40'
                  : 'bg-[#111827] border-slate-800 hover:border-slate-700'
                }`}
            >
              <Icon size={18} className={color} />
              <div>
                <p className="text-xl font-bold text-white">{summaryCounts[key]}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                statusFilter === filter.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500 ml-auto">
          {pagination.totalRecords > 0 ? `${pagination.totalRecords} yêu cầu` : ''}
        </span>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-[#111827] border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-400 font-medium mb-2">{error}</p>
          <Button onClick={() => fetchPartnerships(1)} variant="outline" size="sm" className="border-slate-800">Thử lại</Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && partnerships.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Chưa có yêu cầu hợp tác</h3>
          <p className="text-sm text-slate-400 max-w-sm">
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
                className="border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                Trước
              </Button>
              <span className="text-sm text-slate-400 px-3">
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
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
