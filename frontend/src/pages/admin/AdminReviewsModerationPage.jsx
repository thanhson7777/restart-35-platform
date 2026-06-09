import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import {
  AdminReviewModerationList,
  ReviewModerationModal,
} from '@/components/admin/reviews';
import { getPendingReviews, moderateReview } from '@/apis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const AdminReviewsModerationPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  });
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPendingReviews({ page: filters.page, limit: filters.limit });
      if (response.success) {
        setReviews(response.data || []);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách reviews');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleModerate = async (review, quickAction) => {
    setSelectedReview(review);
    if (quickAction) {
      try {
        const response = await moderateReview(review._id || review.id, { action: quickAction });
        if (response.success) {
          toast.success(quickAction === 'approve' ? 'Review đã được duyệt' : 'Review đã bị từ chối');
          fetchReviews();
        } else {
          toast.error(response.message || 'Thao tác thất bại');
        }
      } catch {
        toast.error('Thao tác thất bại');
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReview(null);
  };

  return (
    <AdminLayout>
      <AdminPageTitle
        title="Duyệt Reviews"
        subtitle="Kiểm duyệt reviews trước khi hiển thị công khai"
      />
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl">
          <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{reviews.length}</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">Chờ duyệt</p>
        </div>
      </div>

      <AdminReviewModerationList
        reviews={reviews}
        loading={loading}
        onModerate={handleModerate}
      />

      <ReviewModerationModal
        review={selectedReview}
        open={showModal}
        onClose={handleCloseModal}
        onModerated={() => { fetchReviews(); handleCloseModal(); }}
      />
    </AdminLayout>
  );
};

export default AdminReviewsModerationPage;
