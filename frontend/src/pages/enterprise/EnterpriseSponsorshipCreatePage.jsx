import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

import { Button, Input, Label } from '@/components/ui';
import { createSponsorship } from '@/apis/courseSponsorshipApi';
import { getEnterpriseJobs } from '@/apis/recruitmentAPI';
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
    disbursementModel: 'completion',
    linkedJobId: '',
    guaranteedPlacements: ''
  });
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await getEnterpriseJobs({ limit: 100 });
        setJobs(res.data?.jobs || res.data?.data || []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách tin tuyển dụng', err);
      }
    };
    fetchJobs();
  }, []);

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
        disbursementModel: form.disbursementModel,
        linkedJobId: form.linkedJobId || null,
        guaranteedPlacements: form.guaranteedPlacements ? Number(form.guaranteedPlacements) : null
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
    <>
      <div className="max-w-2xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enterprise/sponsorships')} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Tạo Sponsorship</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Thiết lập chương trình tài trợ học phí cho người lao động.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 space-y-5">
            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Tiêu đề *</Label>
              <Input value={form.title} onChange={set('title')} placeholder="VD: Học bổng doanh nghiệp Bảo Vệ 2026" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
            </div>
            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Mô tả</Label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Mô tả chi tiết chương trình tài trợ..."
                className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Tổng ngân sách (VND) *</Label>
                <Input type="number" min={1} value={form.budget} onChange={set('budget')} placeholder="VD: 50000000" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Tối đa/người (VND)</Label>
                <Input type="number" min={0} value={form.maxAmountPerLearner} onChange={set('maxAmountPerLearner')} placeholder="VD: 5000000" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Mức tài trợ</Label>
                <select
                  value={form.coverageType}
                  onChange={set('coverageType')}
                  className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {COVERAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Hình thức giải ngân</Label>
                <select
                  value={form.disbursementModel}
                  onChange={set('disbursementModel')}
                  className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="upfront">Upfront (trước)</option>
                  <option value="milestone">Milestone</option>
                  <option value="completion">Khi hoàn thành</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4 border-t border-[hsl(var(--admin-border))]">
              <h3 className="text-[hsl(var(--admin-text-primary))] font-semibold mb-1">Cam kết việc làm (Tùy chọn)</h3>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mb-4">Gắn gói tài trợ với một vị trí công việc cụ thể. Những học viên xuất sắc nhất sẽ được tự động nộp hồ sơ ứng tuyển.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Vị trí tuyển dụng</Label>
                  <select
                    value={form.linkedJobId}
                    onChange={set('linkedJobId')}
                    className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Không liên kết --</option>
                    {jobs.map(job => (
                      <option key={job._id} value={job._id}>{job.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Số lượng cam kết tuyển</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={form.guaranteedPlacements} 
                    onChange={set('guaranteedPlacements')} 
                    placeholder="VD: 5, 10..." 
                    disabled={!form.linkedJobId}
                    className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))] disabled:opacity-50" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white gap-2">
              {submitting ? 'Đang tạo...' : 'Tạo Sponsorship'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/enterprise/sponsorships')} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
