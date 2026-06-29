import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Badge } from '@/components/ui';
import { fetchCampaigns, ngoApproveCampaign, ngoRejectCampaign, selectCampaigns, selectCampaignLoading } from '@/redux/campaign/campaignSlice';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/utils/formatter';
import dayjs from 'dayjs';
import { useSocket } from '@/contexts/SocketContext';

const NgoCampaignApprovalPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const campaigns = useSelector(selectCampaigns);
  const loading = useSelector(selectCampaignLoading);
  const { socket } = useSocket();

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(fetchCampaigns({ ngoId: currentUser._id }));
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    if (!socket || !currentUser?._id) return;
    const handleNewNotification = (notification) => {
      if (notification?.type === 'NEW_CAMPAIGN_REQUEST') {
        dispatch(fetchCampaigns({ ngoId: currentUser._id }));
      }
    };
    socket.on('NEW_NOTIFICATION', handleNewNotification);
    return () => socket.off('NEW_NOTIFICATION', handleNewNotification);
  }, [socket, dispatch, currentUser]);

  const handleApprove = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn bảo lãnh cho dự án lập nghiệp này?')) {
      try {
        await dispatch(ngoApproveCampaign(id)).unwrap();
        toast.success('Đã bảo lãnh thành công! Dự án hiện đang gọi vốn.');
        dispatch(fetchCampaigns({ ngoId: currentUser._id }));
      } catch (error) {
        toast.error(error || 'Có lỗi xảy ra khi bảo lãnh');
      }
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn từ chối dự án này?')) {
      try {
        await dispatch(ngoRejectCampaign(id)).unwrap();
        toast.success('Đã từ chối dự án.');
        dispatch(fetchCampaigns({ ngoId: currentUser._id }));
      } catch (error) {
        toast.error(error || 'Có lỗi xảy ra khi từ chối');
      }
    }
  };

  const pendingCampaigns = campaigns.filter(c => c.status === 'pending_ngo');
  const approvedCampaigns = campaigns.filter(c => c.status !== 'pending_ngo');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Dự án lập nghiệp</h1>
        <p className="text-sm text-gray-500">Xem xét và bảo lãnh cho các ý tưởng kinh doanh của người lao động</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Chờ duyệt */}
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Hồ sơ đang chờ thẩm định ({pendingCampaigns.length})
          </h2>

          {loading ? (
            <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : pendingCampaigns.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">Không có hồ sơ nào đang chờ duyệt.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingCampaigns.map(camp => (
                <Card key={camp._id} className="p-5 flex flex-col hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="warning">Chờ thẩm định</Badge>
                    <span className="text-xs text-gray-500">{dayjs(camp.createdAt).format('DD/MM/YYYY')}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{camp.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">{camp.description}</p>

                  <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500">Mục tiêu:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(camp.targetAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Người đăng:</span>
                      <span className="font-medium">{camp.workerName}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(camp._id)}>
                      <XCircle className="w-4 h-4 mr-2" /> Từ chối
                    </Button>
                    <Button className="flex-1" onClick={() => handleApprove(camp._id)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Bảo lãnh
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Đã duyệt */}
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4 pt-6 border-t border-gray-100">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Dự án đã bảo lãnh ({approvedCampaigns.length})
          </h2>

          {approvedCampaigns.length === 0 ? (
            <p className="text-gray-500">Bạn chưa bảo lãnh dự án nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedCampaigns.map(camp => (
                <Card key={camp._id} className="p-5 flex flex-col border-l-4 border-l-green-500">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={camp.status === 'funded' ? 'success' : 'primary'}>
                      {camp.status === 'funded' ? 'Đã đủ vốn' : 'Đang gọi vốn'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-base mb-1">{camp.title}</h3>
                  <div className="text-sm text-gray-500 mb-4 line-clamp-2">{camp.description}</div>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(camp.raisedAmount)} / {formatCurrency(camp.targetAmount)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default NgoCampaignApprovalPage;
