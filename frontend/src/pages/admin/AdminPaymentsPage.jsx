import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminPaymentStats,
  AdminPaymentFilters,
  AdminPaymentTable,
  AdminPaymentDetailModal,
  AdminRefundModal,
} from '@/components/admin/payments';
import * as paymentApi from '@/apis/paymentApi';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_LIMIT,
    totalRecords: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    gateway: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await paymentApi.getPayments({ limit: 1, status: '' });
      if (res.success) {
        const allRes = await paymentApi.getPayments({ limit: 1 });
        const pendingRes = await paymentApi.getPayments({ limit: 1, status: 'pending' });
        const refundRes = await paymentApi.getPayments({ limit: 1, status: 'refunded' });
        const completedRes = await paymentApi.getPayments({ limit: 1, status: 'completed' });

        setStats({
          totalRevenue: res.data?.[0]?.totalRevenue || 0,
          pending: pendingRes.pagination?.totalRecords || 0,
          completed: completedRes.pagination?.totalRecords || 0,
          totalRefund: refundRes.pagination?.totalRecords || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.gateway) params.gateway = filters.gateway;
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      const res = await paymentApi.getPayments(params);
      if (res.success) {
        setPayments(res.data || []);
        setPagination(res.pagination || {
          currentPage: 1,
          limit: DEFAULT_LIMIT,
          totalRecords: 0,
          totalPages: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Không thể tải danh sách thanh toán');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    fetchPayments();
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const handleApprove = async (payment) => {
    try {
      setActionLoading(true);
      await paymentApi.updatePaymentStatus(payment._id, { status: 'completed' });
      toast.success('Duyệt thanh toán thành công');
      setShowDetailModal(false);
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Không thể duyệt thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (payment) => {
    try {
      setActionLoading(true);
      await paymentApi.updatePaymentStatus(payment._id, { status: 'failed' });
      toast.success('Từ chối thanh toán thành công');
      setShowDetailModal(false);
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Không thể từ chối thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(false);
    setShowRefundModal(true);
  };

  const handleRefundConfirm = async ({ reason }) => {
    if (!selectedPayment) return;
    try {
      setActionLoading(true);
      await paymentApi.refundPayment(selectedPayment._id, { reason });
      toast.success('Hoàn tiền thành công');
      setShowRefundModal(false);
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error refunding payment:', error);
      toast.error('Không thể hoàn tiền');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchPayments();
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Quản lý thanh toán"
        subtitle="Theo dõi và quản lý các giao dịch thanh toán trên nền tảng"
      />

      <div className="flex items-center justify-end gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={statsLoading || loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(statsLoading || loading) ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <AdminPaymentStats stats={stats} loading={statsLoading} />

      <AdminPaymentFilters
        filters={filters}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      <AdminPaymentTable
        payments={payments}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onView={handleView}
        onApprove={handleApprove}
        onReject={handleReject}
        onRefund={handleRefund}
      />

      <AdminPaymentDetailModal
        payment={selectedPayment}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onRefund={handleRefund}
      />

      <AdminRefundModal
        payment={selectedPayment}
        open={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onConfirm={handleRefundConfirm}
        loading={actionLoading}
      />
    </AdminLayout>
  );
};

export default AdminPaymentsPage;
