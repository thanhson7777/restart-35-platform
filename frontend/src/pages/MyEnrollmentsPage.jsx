import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnrollmentList } from '@/components/enrollment/EnrollmentList';
import { Button, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input } from '@/components/ui';
import { getMyEnrollments, cancelEnrollment, dropEnrollment } from '@/apis/courseApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Sparkles, AlertTriangle } from 'lucide-react';

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [cancelDialog, setCancelDialog] = useState({ isOpen: false, enrollment: null, isSubmitting: false });
  const [dropDialog, setDropDialog] = useState({ isOpen: false, enrollment: null, reason: '', isSubmitting: false });

  const fetchEnrollments = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
      
    }
    setLoading(true);
    try {
      const res = await getMyEnrollments({ limit: 1000 });
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

  const handleCancel = (enrollment) => {
    setCancelDialog({ isOpen: true, enrollment, isSubmitting: false });
  };

  const confirmCancel = async () => {
    const enrollment = cancelDialog.enrollment;
    if (!enrollment) return;

    setCancelDialog(prev => ({ ...prev, isSubmitting: true }));
    try {
      await cancelEnrollment(enrollment._id, {
        reason: 'Hủy đăng ký từ trang người dùng',
      });
      toast.success('Đã hủy đăng ký thành công.');
      fetchEnrollments();
      setCancelDialog({ isOpen: false, enrollment: null, isSubmitting: false });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Hủy đăng ký thất bại.';
      toast.error(msg);
      setCancelDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDrop = (enrollment) => {
    setDropDialog({ isOpen: true, enrollment, reason: '', isSubmitting: false });
  };

  const confirmDrop = async () => {
    const { enrollment, reason } = dropDialog;
    if (!enrollment) return;
    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do rút khỏi khóa học.');
      return;
    }

    setDropDialog(prev => ({ ...prev, isSubmitting: true }));
    try {
      await dropEnrollment(enrollment._id, { dropReason: reason });
      toast.success('Đã rút khỏi khóa học thành công.');
      fetchEnrollments();
      setDropDialog({ isOpen: false, enrollment: null, reason: '', isSubmitting: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rút khỏi khóa học thất bại.');
      setDropDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleViewProgress = (enrollment) => {
    let idStr = enrollment._id || enrollment.id;
    if (typeof idStr === 'object') {
      idStr = idStr.$oid || idStr._id || String(idStr);
    }
    navigate(`/my-enrollments/${idStr}`);
  };

  const handleViewDetail = (enrollment) => {
    const courseId = enrollment.courseId || enrollment.course?._id;
    if (courseId) {
      navigate(`/courses/${courseId}`);
    } else {
      console.error('[ERROR] handleViewDetail: courseId is undefined', enrollment);
    }
  };

  if (!currentUser) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <div className="py-6 border-b border-[hsl(var(--admin-border))]">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Khóa học của tôi
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {loading
                  ? 'Đang tải...'
                  : `Bạn đang tham gia ${enrollments.length} chương trình đào tạo`
                }
              </p>
            </div>
            

          </div>
        </div>
      </div>

    {/* Content Area */}
    <main className="container mx-auto px-4 py-10 max-w-7xl">
      <EnrollmentList
        enrollments={enrollments}
        loading={loading}
        onCancel={handleCancel}
        onDrop={handleDrop}
        onViewProgress={handleViewProgress}
        onViewDetail={handleViewDetail}
      />
    </main>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.isOpen} onOpenChange={(open) => !cancelDialog.isSubmitting && setCancelDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận hủy đăng ký
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy đăng ký khóa học <strong>"{cancelDialog.enrollment?.course?.title}"</strong> không? 
              Hành động này không thể hoàn tác và bạn sẽ không thể truy cập khóa học này nữa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" disabled={cancelDialog.isSubmitting} onClick={() => setCancelDialog(prev => ({ ...prev, isOpen: false }))}>
              Đóng
            </Button>
            <Button variant="destructive" disabled={cancelDialog.isSubmitting} onClick={confirmCancel}>
              {cancelDialog.isSubmitting ? 'Đang xử lý...' : 'Đồng ý hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop Dialog */}
      <Dialog open={dropDialog.isOpen} onOpenChange={(open) => !dropDialog.isSubmitting && setDropDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Rút khỏi khóa học
            </DialogTitle>
            <DialogDescription>
              Bạn đang yêu cầu rút khỏi khóa học <strong>"{dropDialog.enrollment?.course?.title}"</strong>. 
              Vui lòng cho chúng tôi biết lý do tại sao bạn quyết định dừng học.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={dropDialog.reason}
              onChange={(e) => setDropDialog(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Nhập lý do rút khỏi khóa học..."
              disabled={dropDialog.isSubmitting}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={dropDialog.isSubmitting} onClick={() => setDropDialog(prev => ({ ...prev, isOpen: false }))}>
              Đóng
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white" 
              disabled={dropDialog.isSubmitting || !dropDialog.reason.trim()} 
              onClick={confirmDrop}
            >
              {dropDialog.isSubmitting ? 'Đang xử lý...' : 'Xác nhận rút'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
