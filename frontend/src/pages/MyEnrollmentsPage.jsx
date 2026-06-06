import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnrollmentList } from '@/components/enrollment/EnrollmentList';
import { Button, Skeleton } from '@/components/ui';
import { getMyEnrollments, cancelEnrollment } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Sparkles } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';

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
      `Bạn có chắc chắn muốn hủy đăng ký khóa học "${enrollment.course?.title}"?`
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
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold mb-2">Vui lòng đăng nhập</h1>
            <p className="text-muted-foreground mb-6">
              Bạn cần đăng nhập để xem các khóa học đã đăng ký.
            </p>
            <Button onClick={() => navigate('/auth')}>Đăng nhập ngay</Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Light Gradient Header */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] shadow-sm py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_45%)] pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Không gian học tập cá nhân</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-[hsl(var(--admin-text-primary))]">
                  Lộ trình học của tôi
                </h1>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-2 font-medium">
                  {loading
                    ? 'Đang tính toán tiến độ...'
                    : `Bạn đang tham gia ${enrollments.length} chương trình đào tạo`
                  }
                </p>
              </div>
              
              <Button
                variant="secondary"
                onClick={() => navigate('/courses')}
                className="gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white border-0 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Khám phá thêm khóa học
              </Button>
            </div>
          </div>
        </div>

      {/* Content Area */}
      <main className="container mx-auto px-4 py-10 max-w-7xl">
        <EnrollmentList
          enrollments={enrollments}
          loading={loading}
          onCancel={handleCancel}
          onViewProgress={handleViewProgress}
          onViewDetail={handleViewDetail}
        />
      </main>
      </div>
      <Footer />
    </>
  );
}
