import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationList } from '@/components/application/ApplicationList';
import { getMyApplications, deleteApplication } from '@/apis/applicationApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import toast from 'react-hot-toast';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchApplications = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getMyApplications();
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setApplications(list);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Không thể tải danh sách đơn.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleView = (app) => {
    navigate(`/my-applications/${app._id}`);
  };

  const handleCancel = async (app) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa đơn này?');
    if (!confirmed) return;
    setDeletingId(app._id);
    try {
      await deleteApplication(app._id);
      toast.success('Đã xóa đơn.');
      fetchApplications();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Xóa thất bại.';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = (app) => {
    navigate(`/my-applications/${app._id}`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground mb-4">
          Vui lòng đăng nhập để xem đơn xin học bổng
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-white py-10">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-2">Đơn xin học bổng của tôi</h1>
            <p className="text-primary-foreground/80">
              Theo dõi trạng thái các đơn đã nộp
            </p>
          </div>
        </div>

      <main className="container mx-auto px-4 py-8">
        <ApplicationList
          applications={applications}
          loading={loading}
          onView={handleView}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </main>
      </div>
      <Footer />
    </>
  );
}
