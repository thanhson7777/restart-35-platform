import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EnterpriseLayout from '@/components/enterprise/EnterpriseLayout';
import { Button, Input, Label } from '@/components/ui';
import { createPartnership } from '@/apis/partnershipApi';
import toast from 'react-hot-toast';

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

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobTitle.trim()) { toast.error('Vui lòng nhập vị trí tuyển dụng.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        recruitmentNeeds: {
          jobTitle: form.jobTitle,
          jobQuantity: Number(form.jobQuantity) || 5,
          salaryRange: {
            min: Number(form.salaryMin) || null,
            max: Number(form.salaryMax) || null,
            currency: 'VND'
          },
          requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : []
        },
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

  return (
    <EnterpriseLayout>
      <div className="max-w-2xl space-y-6">
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
    </EnterpriseLayout>
  );
}
