import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Card, Badge, Input, Textarea, Avatar } from '@/components/ui';
import { Navbar } from '@/components/landing';
import { fetchCampaignDetails, selectCampaignDetails, selectCampaignLoading, submitDonation } from '@/redux/campaign/campaignSlice';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { ArrowLeft, Rocket, MapPin, Users, Calendar, Flag, Heart, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/utils/formatter';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

const CampaignDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const campaign = useSelector(selectCampaignDetails);
  const loading = useSelector(selectCampaignLoading);
  const currentUser = useSelector(selectCurrentUser);
  
  const [donationAmount, setDonationAmount] = useState('50000');
  const [donationMessage, setDonationMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchCampaignDetails(id));
    }
  }, [dispatch, id]);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Vui lòng đăng nhập để thực hiện quyên góp');
      return;
    }
    
    if (Number(donationAmount) < 10000) {
      toast.error('Số tiền quyên góp tối thiểu là 10.000 VNĐ');
      return;
    }
    
    try {
      const payload = {
        amount: Number(donationAmount),
        message: donationMessage
      };
      const res = await dispatch(submitDonation({ campaignId: id, data: payload })).unwrap();
      
      toast.success('Ghi nhận đóng góp thành công! Chuyển hướng đến cổng thanh toán VNPAY...');
      setIsModalOpen(false);
      
      // Giả lập chuyển hướng thanh toán thành công (Trong thực tế sẽ dùng res.paymentUrl)
      setTimeout(() => {
        dispatch(fetchCampaignDetails(id));
      }, 2000);
      
    } catch (error) {
      toast.error(error || 'Có lỗi xảy ra khi quyên góp');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-[88px]">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-[88px]">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy dự án</h2>
          <p className="text-gray-500 mb-6">Dự án này không tồn tại hoặc đã bị xóa.</p>
          <Button asChild><Link to="/community?tab=campaigns">Quay lại danh sách</Link></Button>
        </div>
      </div>
    );
  }

  const progress = campaign.targetAmount > 0 ? Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100)) : 0;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-[88px]">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" className="text-gray-500 hover:text-gray-900 pl-0" asChild>
            <Link to="/community?tab=campaigns">
              <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại quỹ khởi nghiệp
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="aspect-[16/9] bg-gray-100">
                {campaign.images && campaign.images[0] ? (
                  <img src={campaign.images[0]} alt={campaign.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-300">
                    <Rocket className="w-24 h-24 mb-4" />
                    <span className="font-medium">Chưa có hình ảnh dự án</span>
                  </div>
                )}
              </div>
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={progress >= 100 ? 'success' : 'primary'}>
                    {progress >= 100 ? 'Đã thành công' : 'Đang gọi vốn'}
                  </Badge>
                  <span className="text-sm font-medium text-gray-500 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" /> Hạn: {dayjs(campaign.deadline).format('DD/MM/YYYY')}
                  </span>
                </div>
                
                <h1 className="text-3xl font-black text-gray-900 mb-6 leading-tight">{campaign.title}</h1>
                
                <div className="flex items-center gap-4 py-4 border-y border-gray-100 mb-8">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={campaign.workerAvatar} 
                      fallback={campaign.workerName?.charAt(0) || 'W'}
                      className="h-12 w-12 border-2 border-white shadow-sm" 
                    />
                    <div>
                      <p className="text-sm text-gray-500">Khởi xướng bởi</p>
                      <p className="font-bold text-gray-900">{campaign.workerName}</p>
                    </div>
                  </div>
                </div>

                <div className="prose prose-blue max-w-none">
                  <h3 className="text-xl font-bold mb-4">Câu chuyện và Kế hoạch kinh doanh</h3>
                  <div className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                    {campaign.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones / Báo cáo tiến độ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Flag className="w-5 h-5 text-blue-600" />
                Báo cáo tiến độ từ NGO
              </h3>
              
              {!campaign.milestones || campaign.milestones.length === 0 ? (
                <p className="text-gray-500 italic text-center py-6">Chưa có báo cáo tiến độ nào được cập nhật.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {campaign.milestones.map((milestone, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-gray-900">{milestone.title}</div>
                          <time className="font-medium text-xs text-blue-600">{dayjs(milestone.createdAt).format('DD/MM/YYYY')}</time>
                        </div>
                        <div className="text-gray-600 text-sm">{milestone.description}</div>
                        {milestone.disbursedAmount > 0 && (
                          <div className="mt-2 text-xs font-semibold text-green-600 bg-green-50 inline-block px-2 py-1 rounded">
                            Giải ngân: {formatCurrency(milestone.disbursedAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-24 border-gray-200 shadow-xl shadow-blue-900/5">
              <div className="mb-6">
                <div className="text-3xl font-black text-blue-600 mb-1">{formatCurrency(campaign.raisedAmount)}</div>
                <div className="text-sm text-gray-500 font-medium">quyên góp được trên tổng mục tiêu <span className="text-gray-900">{formatCurrency(campaign.targetAmount)}</span></div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                  style={{ width: `${progress}%` }} 
                />
              </div>

              <div className="flex justify-between text-sm font-bold text-gray-700 mb-8">
                <span>{progress}%</span>
                <span className="flex items-center text-gray-500 font-medium">
                  <Users className="w-4 h-4 mr-1" /> {campaign.totalDonors || 0} lượt quyên góp
                </span>
              </div>

              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
                    disabled={campaign.status !== 'funding'}
                  >
                    <Heart className="w-5 h-5 mr-2 fill-white" />
                    {campaign.status !== 'funding' ? 'Đã ngừng nhận quỹ' : 'Ủng hộ ngay'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Ủng hộ dự án</DialogTitle>
                    <DialogDescription>
                      Bạn đang quyên góp cho: <span className="font-bold text-gray-900">{campaign.title}</span>
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleDonate} className="space-y-5 pt-4">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-900">Chọn mức đóng góp</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['50000', '100000', '500000'].map(amt => (
                          <div 
                            key={amt}
                            onClick={() => setDonationAmount(amt)}
                            className={`cursor-pointer text-center py-2 px-1 rounded-lg border text-sm font-bold transition-all ${donationAmount === amt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            {formatCurrency(Number(amt))}
                          </div>
                        ))}
                      </div>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={donationAmount} 
                          onChange={(e) => setDonationAmount(e.target.value)} 
                          className="pl-4 font-bold text-lg"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">VNĐ</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900">Lời chúc (Tùy chọn)</label>
                      <Textarea 
                        placeholder="Gửi lời động viên đến người lao động..." 
                        rows={3}
                        value={donationMessage}
                        onChange={(e) => setDonationMessage(e.target.value)}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700">
                      Chuyển đến VNPAY
                    </Button>
                    <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Giao dịch được bảo mật và xử lý qua VNPAY
                    </p>
                  </form>
                </DialogContent>
              </Dialog>
            </Card>

            <Card className="p-6 border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Bảo lãnh uy tín
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Dự án này đã được thẩm định và cam kết giám sát giải ngân bởi tổ chức NGO.
              </p>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tổ chức bảo lãnh</p>
                <p className="font-bold text-gray-900">{campaign.ngoName}</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CampaignDetailPage;
