import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, BookOpen, Clock, Tag, FileText, CheckCircle2, Users, Star } from 'lucide-react';

import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Checkbox } from '@/components/ui';
import { getPublicTrainersAPI, getCategoriesAPI } from '@/apis';
import { createPartnership } from '@/apis/partnershipApi';
import { getCourses } from '@/apis/courseApi';
import toast from 'react-hot-toast';

function PreviewCard({ trainer }) {
  if (!trainer) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center text-[hsl(var(--admin-text-muted))] min-h-[300px]">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center mb-4">
          <User size={32} className="opacity-50" />
        </div>
        <p className="font-medium text-sm">Chưa chọn đối tác</p>
        <p className="text-xs mt-2">Vui lòng chọn Trainer để xem trước thông tin</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trainer Card */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden shadow-sm">
        <div className="h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
        <div className="px-5 pb-5">
          <div className="relative -mt-12 mb-3">
            <div className="w-24 h-24 rounded-2xl border-4 border-[hsl(var(--admin-surface))] bg-white overflow-hidden shadow-md">
              {trainer.avatar ? (
                <img src={trainer.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center text-3xl font-bold text-[hsl(var(--admin-text-muted))]">
                  {(trainer.displayName || trainer.email || 'T')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-xl text-[hsl(var(--admin-text-primary))]">{trainer.displayName || 'Chưa cập nhật tên'}</h3>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Users size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--admin-text-primary))]">Học viên đào tạo</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">{trainer.studentCount || 0} người đã tham gia</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--admin-text-primary))]">Sản phẩm giáo dục</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">{trainer.courseCount || 0} khóa học đang xuất bản</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Star size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--admin-text-primary))]">Chất lượng đào tạo</p>
                <p className="text-xs text-[hsl(var(--admin-text-muted))]">Đánh giá trung bình {(trainer.averageRating || 0).toFixed(1)} / 5.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnterprisePartnershipCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    jobTitle: '',
    jobQuantity: 5,
    salaryMin: '',
    salaryMax: '',
    requirements: '',
    message: ''
  });

  const [searchParams] = useSearchParams();
  const urlTrainerId = searchParams.get('trainerId');

  const [trainers, setTrainers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(urlTrainerId || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState('');

  const [isSponsoring, setIsSponsoring] = useState(false);
  const [sponsorshipForm, setSponsorshipForm] = useState({
    coverageType: 'FULL',
    fixedAmountPerLearner: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trainersRes, categoriesRes] = await Promise.all([
          getPublicTrainersAPI({ limit: 100 }),
          getCategoriesAPI()
        ]);
        setTrainers(trainersRes.users || trainersRes.data?.users || trainersRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu khởi tạo', err);
      }
    };
    fetchData();
  }, []);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrainer) { toast.error('Vui lòng chọn Trainer để hợp tác.'); return; }
    if (!form.jobTitle.trim()) { toast.error('Vui lòng nhập vị trí tuyển dụng.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        trainerId: selectedTrainer,
        title: form.title,
        requestedCourseIds: [],
        recruitmentNeeds: {
          jobTitle: form.jobTitle,
          jobQuantity: Number(form.jobQuantity) || 5,
          salaryRange: {
            min: Number(form.salaryMin) || null,
            max: Number(form.salaryMax) || null,
            currency: 'VND'
          },
          requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
          categoryId: selectedCategory || null,
          deliveryType: selectedDeliveryType || null
        },
        proposedSponsorship: isSponsoring ? {
          targetLearners: Number(form.jobQuantity) || 1,
          coverageType: sponsorshipForm.coverageType,
          budget: null,
          fixedAmountPerLearner: sponsorshipForm.coverageType === 'FIXED_AMOUNT'
            ? (Number(sponsorshipForm.fixedAmountPerLearner) || 0)
            : null
        } : null,
        message: form.message || null
      };
      await createPartnership(payload);
      toast.success('Đã gửi yêu cầu partnership thành công!');
      navigate('/enterprise/partnerships');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo partnership thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeTrainer = trainers.find(t => t._id === selectedTrainer);

  return (
    <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enterprise/partnerships')} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Tạo Partnership</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Gửi yêu cầu hợp tác đến các trainer trên nền tảng.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 space-y-5">
            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Chọn đối tác (Trainer) *</Label>
              <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                <SelectTrigger className="w-full h-auto bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))] p-2.5 rounded-xl">
                  <SelectValue placeholder="-- Chọn Trainer --" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="max-h-[200px] overflow-y-auto bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))]">
                  {trainers.map(t => (
                    <SelectItem key={t._id} value={t._id}>{t.displayName || t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Tiêu đề partnership</Label>
              <Input value={form.title} onChange={set('title')} placeholder="VD: Tuyển dụng lao động cho vị trí Bảo Vệ" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Vị trí tuyển dụng *</Label>
                <Input value={form.jobTitle} onChange={set('jobTitle')} placeholder="VD: Nhân viên Bảo Vệ" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Số lượng tuyển</Label>
                <Input type="number" min={1} value={form.jobQuantity} onChange={set('jobQuantity')} className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Mức lương tối thiểu (VND)</Label>
                <Input type="number" min={0} value={form.salaryMin} onChange={set('salaryMin')} placeholder="VD: 5000000" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Mức lương tối đa (VND)</Label>
                <Input type="number" min={0} value={form.salaryMax} onChange={set('salaryMax')} placeholder="VD: 10000000" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
            </div>

            <div className="pt-4 border-t border-[hsl(var(--admin-border))] space-y-4">
              <h3 className="font-semibold text-[hsl(var(--admin-text-primary))]">Yêu cầu thiết kế khóa học</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Danh mục chuyên môn</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]">
                      <SelectValue placeholder="Chọn danh mục..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Hình thức giảng dạy mong muốn</Label>
                  <Select value={selectedDeliveryType} onValueChange={setSelectedDeliveryType}>
                    <SelectTrigger className="w-full bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]">
                      <SelectValue placeholder="Chọn hình thức..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Học trực tuyến (Online Live)</SelectItem>
                      <SelectItem value="offline">Học trực tiếp (Offline)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Yêu cầu khác (mỗi dòng 1)</Label>
              <textarea
                value={form.requirements}
                onChange={set('requirements')}
                rows={4}
                placeholder="VD: Có CCCD&#10;Có kinh nghiệm từ 1 năm"
                className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="pt-4 border-t border-[hsl(var(--admin-border))]">
              <Checkbox
                checked={isSponsoring}
                onChange={setIsSponsoring}
                label="Đề xuất tài trợ chi phí học tập"
                description="Tài trợ học phí cho học viên (toàn phần hoặc bán phần) để thu hút ứng viên chất lượng."
              />

              {isSponsoring && (
                <div className="mt-4 p-5 rounded-xl bg-blue-50 border border-blue-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-blue-900 mb-1.5 block">Hình thức tài trợ *</Label>
                      <Select value={sponsorshipForm.coverageType} onValueChange={(val) => setSponsorshipForm(f => ({ ...f, coverageType: val }))}>
                        <SelectTrigger className="w-full bg-white border-blue-200">
                          <SelectValue placeholder="Chọn hình thức tài trợ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">Tài trợ toàn phần (100% học phí)</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">Hỗ trợ số tiền cố định</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {sponsorshipForm.coverageType === 'FIXED_AMOUNT' && (
                      <div>
                        <Label className="text-blue-900 mb-1.5 block">Số tiền hỗ trợ / 1 học viên (VND) *</Label>
                        <Input type="number" min={0} value={sponsorshipForm.fixedAmountPerLearner} onChange={(e) => setSponsorshipForm(f => ({ ...f, fixedAmountPerLearner: e.target.value }))} placeholder="VD: 5000000" className="bg-white border-blue-200" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-blue-800 bg-blue-100/50 p-3 rounded-lg flex items-start gap-2">
                    <span className="font-semibold whitespace-nowrap">💡 Lưu ý:</span>
                    <span>Hệ thống sẽ tự động đăng ký tài trợ cho <b>{form.jobQuantity || 0}</b> học viên (bằng với số lượng tuyển dụng). Tổng chi phí sẽ được tính toán sau khi Trainer báo giá khóa học.</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Lời nhắn cho trainer</Label>
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={3}
                placeholder="Giới thiệu thêm về nhu cầu tuyển dụng..."
                className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white gap-2">
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/enterprise/partnerships')} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
              Hủy
            </Button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <PreviewCard trainer={activeTrainer} />
        </div>
      </div>
    </div>
  );
}
