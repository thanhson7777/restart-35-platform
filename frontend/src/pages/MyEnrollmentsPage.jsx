import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnrollmentList } from '@/components/enrollment/EnrollmentList';
import { Button, Skeleton } from '@/components/ui';
import { getMyEnrollments, cancelEnrollment } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import toast from 'react-hot-toast';
import { BookOpen, Plus } from 'lucide-react';

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchEnrollments = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getMyEnrollments();
      const raw = res.data;
      setEnrollments(
        Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : []
      );
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      toast.error('Không thể tải danh sách khóa học đã đăng ký.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleCancel = async (enrollment) => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn hủy đăng ký khóa học này?'
    );
    if (!confirmed) return;

    setCancellingId(enrollment._id);
    try {
      await cancelEnrollment(enrollment._id, {
        reason: 'Hủy đăng ký từ trang người dùng',
      });
      toast.success('Đã hủy đăng ký thành công.');
      fetchEnrollments();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Hủy đăng ký thất bại.';
      toast.error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewProgress = (enrollment) => {
    navigate(`/my-enrollments/${enrollment._id}`);
  };

  const handleViewDetail = (enrollment) => {
    navigate(`/courses/${enrollment.courseId || enrollment.course?._id}`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Vui lòng đăng nhập</h1>
          <p className="text-muted-foreground mb-6">
            Bạn cần đăng nhập để xem các khóa học đã đăng ký.
          </p>
          <Button onClick={() => navigate('/auth')}>Đăng nhập ngay</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Khóa của tôi</h1>
              <p className="text-primary-foreground/80">
                {loading
                  ? 'Đang tải...'
                  : `${enrollments.length} khóa đã đăng ký`}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/courses')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Khám phá thêm
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <EnrollmentList
          enrollments={enrollments}
          loading={loading}
          onCancel={handleCancel}
          onViewProgress={handleViewProgress}
          onViewDetail={handleViewDetail}
        />
      </main>
    </div>
  );
}
