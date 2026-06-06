import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EnterpriseLayout from '@/components/enterprise/EnterpriseLayout';
import { Button, Input, Label } from '@/components/ui';
import { createSponsorship } from '@/apis/courseSponsorshipApi';
import toast from 'react-hot-toast';

const COVERAGE_OPTIONS = [
  { value: 'full', label: '100% học phí' },
  { value: 'partial', label: 'Một phần học phí' }
];

export default function EnterpriseSponsorshipCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    budget: '',
    maxAmountPerLearner: '',
    coverageType: 'partial',
    disbursementModel: 'completion'
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề sponsorship.'); return; }
    if (!form.budget || Number(form.budget) <= 0) { toast.error('Vui lòng nhập ngân sách hợp lệ.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        budget: Number(form.budget),
        maxAmountPerLearner: form.maxAmountPerLearner ? Number(form.maxAmountPerLearner) : null,
        coverageType: form.coverageType,
        disbursementModel: form.disbursementModel
      };
      await createSponsorship(payload);
      toast.success('Đã tạo sponsorship thành công!');
      navigate('/enterprise/sponsorships');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo sponsorship thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EnterpriseLayout>
      <div className="max-w-2xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enterprise/sponsorships')} className="text-slate-400 hover:text-white pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        <div>
          <h1 className="text-3xl font-extrabold text-white">Tạo Sponsorship</h1>
          <p className="text-slate-400 text-sm mt-1">Thiết lập chương trình tài trợ học phí cho người lao động.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <Label className="text-slate-300 mb-1.5 block">Tiêu đề *</Label>
              <Input value={form.title} onChange={set('title')} placeholder="VD: Học bổng doanh nghiệp Bảo Vệ 2026" className="bg-slate-900 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 mb-1.5 block">Mô tả</Label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Mô tả chi tiết chương trình tài trợ..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Tổng ngân sách (VND) *</Label>
                <Input type="number" min={1} value={form.budget} onChange={set('budget')} placeholder="VD: 50000000" className="bg-slate-900 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Tối đa/người (VND)</Label>
                <Input type="number" min={0} value={form.maxAmountPerLearner} onChange={set('maxAmountPerLearner')} placeholder="VD: 5000000" className="bg-slate-900 border-slate-700 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Mức tài trợ</Label>
                <select
                  value={form.coverageType}
                  onChange={set('coverageType')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {COVERAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Hình thức giải ngân</Label>
                <select
                  value={form.disbursementModel}
                  onChange={set('disbursementModel')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="upfront">Upfront (trước)</option>
                  <option value="milestone">Milestone</option>
                  <option value="completion">Khi hoàn thành</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {submitting ? 'Đang tạo...' : 'Tạo Sponsorship'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/enterprise/sponsorships')} className="border-slate-800 text-slate-300">
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </EnterpriseLayout>
  );
}
