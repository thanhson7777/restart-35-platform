import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { Button, Card, Input, Label, Textarea } from '@/components/ui';
import { submitCampaign, selectCampaignCreateLoading } from '@/redux/campaign/campaignSlice';
import { ArrowLeft, UploadCloud, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { authorizeAxiosInstance } from '~/utils/authorizeAxios'; // For getting NGO list directly

const WorkerCampaignCreatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoading = useSelector(selectCampaignCreateLoading);
  const [ngos, setNgos] = useState([]);

  const { register, handleSubmit, formState: { errors }, control } = useForm({
    defaultValues: {
      title: '',
      description: '',
      targetAmount: '',
      ngoId: '',
      deadline: ''
    }
  });

  useEffect(() => {
    // Fetch NGOs list for the dropdown
    const fetchNGOs = async () => {
      try {
        const response = await authorizeAxiosInstance.get('/v1/users/public/ngos', { params: { limit: 100 } });
        setNgos(response?.data?.data?.users || []);
      } catch (error) {
        console.error('Error fetching NGOs', error);
      }
    };
    fetchNGOs();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        targetAmount: Number(data.targetAmount),
        deadline: new Date(data.deadline).getTime()
      };

      await dispatch(submitCampaign(payload)).unwrap();
      toast.success('Gửi hồ sơ dự án lập nghiệp thành công! Vui lòng chờ NGO duyệt.');
      navigate('/worker/campaigns');
    } catch (error) {
      toast.error(error || 'Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 mb-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="p-0 hover:bg-transparent text-gray-500 hover:text-gray-900">
            <Link to="/worker/campaigns" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo dự án lập nghiệp</h1>
          <p className="text-sm text-gray-500 mt-1">Mô tả ý tưởng kinh doanh của bạn để nhận được sự bảo trợ và vốn từ cộng đồng</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="title">Tên dự án kinh doanh <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              placeholder="VD: Mở tiệm giặt ủi tại Tân Bình"
              {...register('title', { required: 'Vui lòng nhập tên dự án', minLength: { value: 10, message: 'Tên dự án tối thiểu 10 ký tự' } })}
            />
            {errors.title && <span className="text-sm text-red-500">{errors.title.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ngoId">Tổ chức NGO xin bảo lãnh <span className="text-red-500">*</span></Label>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> NGO sẽ trực tiếp thẩm định và giải ngân tiền cho bạn nếu dự án thành công.
            </p>
            <select
              id="ngoId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('ngoId', { required: 'Vui lòng chọn một tổ chức bảo lãnh' })}
            >
              <option value="">-- Chọn tổ chức NGO --</option>
              {ngos.map(ngo => (
                <option key={ngo._id} value={ngo._id}>{ngo.organization?.name || ngo.displayName || ngo.username}</option>
              ))}
            </select>
            {errors.ngoId && <span className="text-sm text-red-500">{errors.ngoId.message}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Số tiền cần gọi vốn (VNĐ) <span className="text-red-500">*</span></Label>
              <Input
                id="targetAmount"
                type="number"
                placeholder="VD: 15000000"
                {...register('targetAmount', {
                  required: 'Vui lòng nhập số tiền',
                  min: { value: 1000000, message: 'Số tiền tối thiểu 1.000.000đ' }
                })}
              />
              {errors.targetAmount && <span className="text-sm text-red-500">{errors.targetAmount.message}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Hạn chót gọi vốn <span className="text-red-500">*</span></Label>
              <Input
                id="deadline"
                type="date"
                {...register('deadline', { required: 'Vui lòng chọn hạn chót' })}
              />
              {errors.deadline && <span className="text-sm text-red-500">{errors.deadline.message}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Kế hoạch kinh doanh chi tiết <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              rows={8}
              placeholder="Vui lòng trình bày chi tiết về hoàn cảnh, ý tưởng kinh doanh, và bạn sẽ sử dụng số tiền gọi vốn như thế nào (VD: Mua 2 máy may, tiền thuê mặt bằng tháng đầu...)"
              {...register('description', { required: 'Vui lòng nhập kế hoạch chi tiết', minLength: { value: 50, message: 'Mô tả tối thiểu 50 ký tự' } })}
            />
            {errors.description && <span className="text-sm text-red-500">{errors.description.message}</span>}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button type="button" variant="outline" className="mr-3" asChild>
              <Link to="/worker/campaigns">Hủy</Link>
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Gửi hồ sơ thẩm định
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default WorkerCampaignCreatePage;
