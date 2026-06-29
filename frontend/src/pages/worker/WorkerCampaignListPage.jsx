import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '@/components/ui';
import { fetchCampaigns, selectCampaigns, selectCampaignLoading } from '@/redux/campaign/campaignSlice';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { PlusCircle, Info, Rocket, DollarSign, Upload, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/utils/formatter';
import dayjs from 'dayjs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/Dialog';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { toast } from 'react-toastify';
import { authorizeAxiosInstance } from '@/utils/authorizeAxios';
import { useSocket } from '@/contexts/SocketContext';

const WorkerCampaignListPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const campaigns = useSelector(selectCampaigns);
  const loading = useSelector(selectCampaignLoading);
  const { socket } = useSocket();

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(fetchCampaigns({ workerId: currentUser._id }));
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    if (!socket || !currentUser?._id) return;
    const handleNewNotification = (notification) => {
      if (['CAMPAIGN_APPROVED', 'CAMPAIGN_REJECTED'].includes(notification?.type)) {
        dispatch(fetchCampaigns({ workerId: currentUser._id }));
      }
    };
    socket.on('NEW_NOTIFICATION', handleNewNotification);
    return () => socket.off('NEW_NOTIFICATION', handleNewNotification);
  }, [socket, dispatch, currentUser]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickViewCampaign, setQuickViewCampaign] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', proofImageFile: null, proofImagePreview: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (campaignId) => {
    setSelectedCampaignId(campaignId);
    setMilestoneForm({ title: '', description: '', proofImageFile: null, proofImagePreview: '' });
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return toast.error('Vui lòng chọn file hình ảnh');
      }
      const preview = URL.createObjectURL(file);
      setMilestoneForm({ ...milestoneForm, proofImageFile: file, proofImagePreview: preview });
    }
  };

  const handleMilestoneSubmit = async () => {
    if (!milestoneForm.title || !milestoneForm.description) {
      return toast.error('Vui lòng nhập tiêu đề và mô tả');
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', milestoneForm.title);
      formData.append('description', milestoneForm.description);
      if (milestoneForm.proofImageFile) {
        formData.append('proofImage', milestoneForm.proofImageFile);
      }

      await authorizeAxiosInstance.post(`/v1/campaigns/${selectedCampaignId}/milestones`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Cập nhật tiến độ thành công');
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật tiến độ');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Dự án lập nghiệp của tôi</h1>
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">Bạn chưa có dự án lập nghiệp nào</h3>
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
            const actualProgress = camp.targetAmount > 0 ? Math.round((camp.raisedAmount / camp.targetAmount) * 100) : 0;
            const visualProgress = Math.min(100, actualProgress);
            const isFundingPhase = !['pending_ngo', 'rejected_ngo'].includes(camp.status);

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

                  {isFundingPhase ? (
                    <div className="space-y-2 mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Đã gọi được:</span>
                        <span className="font-bold text-blue-700 text-base">{formatCurrency(camp.raisedAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Mục tiêu:</span>
                        <span className="font-medium text-gray-700">{formatCurrency(camp.targetAmount)}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-blue-100 flex justify-end items-center text-xs text-gray-500">
                        <span>Hạn: {dayjs(camp.deadline).format('DD/MM/YYYY')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg mb-4">
                      <p className="text-sm text-amber-700 text-center">
                        {camp.status === 'pending_ngo' ? 'Đang chờ tổ chức bảo lãnh thẩm định hồ sơ...' : 'Hồ sơ đã bị từ chối'}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      <span>Bảo lãnh bởi: <strong className="text-gray-900">{camp.ngoName}</strong></span>
                    </div>
                    <div className="flex gap-2 w-full">
                      {['funding', 'funded', 'disbursing', 'completed'].includes(camp.status) && (
                        <Button variant="outline" size="sm" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleOpenModal(camp._id)}>
                          Cập nhật tiến độ
                        </Button>
                      )}
                      <Button variant="default" size="sm" className="flex-1 bg-blue-600 text-white hover:bg-blue-700" onClick={() => setQuickViewCampaign(camp)}>
                        Xem nhanh
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Milestone Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật tiến độ dự án</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề tiến độ <span className="text-red-500">*</span></Label>
              <Input
                placeholder="VD: Đã thuê được mặt bằng..."
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả chi tiết <span className="text-red-500">*</span></Label>
              <Textarea
                rows={4}
                placeholder="Mô tả chi tiết công việc đã thực hiện..."
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hình ảnh minh chứng (nếu có)</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative overflow-hidden group hover:border-blue-500 transition-colors bg-gray-50">
                {milestoneForm.proofImagePreview ? (
                  <div className="relative w-full text-center">
                    <img
                      src={milestoneForm.proofImagePreview}
                      alt="Preview"
                      className="mx-auto h-48 rounded-md object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-white bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">Thay đổi ảnh</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 p-1"
                      >
                        <span>Tải ảnh lên</span>
                        <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                      </label>
                      <p className="pl-1 py-1">hoặc kéo thả vào đây</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF lên tới 5MB</p>
                  </div>
                )}
                {/* Ẩn input đi khi đã có preview (vì label ở trong preview sẽ trỏ tới input này) */}
                {milestoneForm.proofImagePreview && (
                  <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleMilestoneSubmit} isLoading={isSubmitting}>Lưu tiến độ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick View Modal */}
      <Dialog open={!!quickViewCampaign} onOpenChange={(open) => !open && setQuickViewCampaign(null)}>
        <DialogContent className="max-w-md">
          {quickViewCampaign && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mr-6 mb-2">
                  <DialogTitle className="text-xl">Tổng quan dự án</DialogTitle>
                  {getStatusBadge(quickViewCampaign.status)}
                </div>
              </DialogHeader>
              <div className="space-y-6 py-2">
                <div>
                  <h3 className="font-bold text-lg mb-2">{quickViewCampaign.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">{quickViewCampaign.description}</p>
                </div>

                {!['pending_ngo', 'rejected_ngo'].includes(quickViewCampaign.status) ? (
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Số tiền đã huy động:</span>
                      <span className="font-bold text-blue-700 text-xl">{formatCurrency(quickViewCampaign.raisedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Mục tiêu kêu gọi:</span>
                      <span className="font-medium text-gray-700 text-base">{formatCurrency(quickViewCampaign.targetAmount)}</span>
                    </div>

                    <div className="pt-3 mt-1 border-t border-blue-100 flex justify-end items-center text-sm text-gray-500">
                      <span>Hạn: {dayjs(quickViewCampaign.deadline).format('DD/MM/YYYY')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                    <p className="text-sm text-amber-700 text-center">
                      {quickViewCampaign.status === 'pending_ngo' ? 'Đang chờ tổ chức bảo lãnh thẩm định hồ sơ...' : 'Hồ sơ đã bị từ chối'}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>Được bảo lãnh bởi: <strong className="text-gray-900">{quickViewCampaign.ngoName}</strong></span>
                </div>
              </div>
              <DialogFooter className="sm:justify-between flex-row items-center pt-2">
                <Button variant="ghost" onClick={() => setQuickViewCampaign(null)}>
                  Đóng
                </Button>
                <Button asChild className="gap-2">
                  <Link to={`/community/campaigns/${quickViewCampaign._id}`}>
                    Đi tới trang gọi vốn
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerCampaignListPage;
