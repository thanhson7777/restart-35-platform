import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '@/components/ui';
import { fetchCampaigns, selectCampaigns, selectCampaignLoading } from '@/redux/campaign/campaignSlice';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { PlusCircle, Info, Rocket, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatter';
import dayjs from 'dayjs';

const WorkerCampaignListPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const campaigns = useSelector(selectCampaigns);
  const loading = useSelector(selectCampaignLoading);

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(fetchCampaigns({ workerId: currentUser._id }));
    }
  }, [dispatch, currentUser]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_ngo': return <Badge variant="warning">Chờ NGO duyệt</Badge>;
      case 'rejected_ngo': return <Badge variant="destructive">NGO từ chối</Badge>;
      case 'funding': return <Badge variant="primary">Đang gọi vốn</Badge>;
      case 'funded': return <Badge variant="success">Đã đủ vốn</Badge>;
      case 'disbursing': return <Badge variant="info">Đang giải ngân</Badge>;
      case 'completed': return <Badge variant="secondary">Hoàn thành</Badge>;
      case 'cancelled': return <Badge variant="destructive">Đã hủy</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dự án khởi nghiệp của tôi</h1>
          <p className="text-sm text-gray-500">Quản lý và theo dõi tiến độ gọi vốn cộng đồng cho các ý tưởng kinh doanh của bạn</p>
        </div>
        <Button asChild>
          <Link to="/worker/campaigns/create" className="flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            Tạo dự án mới
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns?.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center bg-gray-50/50">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Rocket className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Bạn chưa có dự án khởi nghiệp nào</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Hãy hiện thực hóa ý tưởng kinh doanh của bạn bằng cách đăng ký một dự án và kêu gọi quỹ từ cộng đồng cùng sự bảo trợ của các tổ chức NGO.
          </p>
          <Button asChild size="lg">
            <Link to="/worker/campaigns/create">Bắt đầu gọi vốn ngay</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map((camp) => {
            const progress = camp.targetAmount > 0 ? Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100)) : 0;
            return (
              <Card key={camp._id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {camp.images && camp.images[0] ? (
                    <img src={camp.images[0]} alt={camp.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                      <Rocket className="w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(camp.status)}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg mb-1 line-clamp-2">{camp.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-2">{camp.description}</p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-blue-600">{formatCurrency(camp.raisedAmount)}</span>
                      <span className="text-gray-500">Mục tiêu: {formatCurrency(camp.targetAmount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{progress}% hoàn thành</span>
                      <span>Hạn: {dayjs(camp.deadline).format('DD/MM/YYYY')}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Info className="w-3.5 h-3.5" />
                      NGO: <span className="font-semibold">{camp.ngoName}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/campaigns/${camp._id}`}>Xem chi tiết</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkerCampaignListPage;
