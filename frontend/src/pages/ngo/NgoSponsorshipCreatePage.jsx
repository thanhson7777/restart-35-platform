import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { createSponsorship } from '@/apis/courseSponsorshipApi';
import { getCourses } from '@/apis/courseApi';
import { getMyWallet } from '@/apis/walletApi';
import toast from 'react-hot-toast';

export default function NgoSponsorshipCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courses, setCourses] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetLearners: 10,
    selectedCourses: searchParams.get('courseId') ? [searchParams.get('courseId')] : []
  });

  useEffect(() => {
    getCourses({ limit: 50, isFree: false, acceptsSponsorship: true })
      .then(res => {
        const paidCourses = (res.data?.data || []).filter(c => 
          c.fee > 0 && 
          c.funding_model !== 'enterprise_funded' && 
          c.sponsorshipData?.sponsorType !== 'enterprise'
        );
        setCourses(paidCourses);
      })
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
      
    getMyWallet()
      .then(res => {
        setWallet(res.data);
      })
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const toggleCourse = (id) => {
    setForm(f => ({
      ...f,
      selectedCourses: f.selectedCourses.includes(id) 
        ? f.selectedCourses.filter(c => c !== id) 
        : [...f.selectedCourses, id]
    }));
  };

  const calculatedBudget = useMemo(() => {
    const selectedCourseObjects = courses.filter(c => form.selectedCourses.includes(c._id));
    const totalFeePerLearner = selectedCourseObjects.reduce((sum, c) => sum + (c.fee || 0), 0);
    return totalFeePerLearner * (parseInt(form.targetLearners) || 0);
  }, [form.selectedCourses, form.targetLearners, courses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề.'); return; }
    if (form.selectedCourses.length === 0) { toast.error('Vui lòng chọn ít nhất 1 khóa học.'); return; }
    if (!form.targetLearners || parseInt(form.targetLearners) < 1) { toast.error('Số lượng học viên phải lớn hơn 0.'); return; }
    if (wallet && calculatedBudget > wallet.availableBalance) { toast.error('Số dư ví không đủ để lập quỹ.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        sponsorType: 'ngo',
        budget: calculatedBudget,
        targetLearners: parseInt(form.targetLearners),
        maxAmountPerLearner: null,
        coverageType: 'partial',
        disbursementModel: 'completion',
        linkedCourses: form.selectedCourses.map(id => ({ courseId: id, coverage: 'partial' }))
      };
      await createSponsorship(payload);
      toast.success('Đã tạo sponsorship thành công!');
      navigate('/ngo/sponsorships');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo sponsorship thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/ngo/sponsorships')} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Tạo Sponsorship</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Thiết lập chương trình tài trợ học bổng cho người lao động.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 space-y-5">
            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Tiêu đề *</Label>
              <Input value={form.title} onChange={set('title')} placeholder="VD: Học bổng NGO Việc làm 2026" className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Số lượng học viên mục tiêu *</Label>
                <Input type="number" min="1" value={form.targetLearners} onChange={set('targetLearners')} className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]" />
              </div>
              
              <div className="bg-[hsl(var(--admin-surface-hover))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium">TỔNG NGÂN SÁCH DỰ KIẾN</p>
                <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedBudget)}
                </p>
                {wallet && (
                  <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${calculatedBudget > wallet.availableBalance ? 'text-rose-500' : 'text-emerald-500'}`}>
                    <Wallet size={14} />
                    <span>Số dư ví: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.availableBalance || 0)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-1.5 block">Mô tả</Label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Mô tả chi tiết chương trình..."
                className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-[hsl(var(--admin-text-secondary))] mb-3 block">Chọn khóa học tài trợ *</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {courses.map(course => (
                  <label key={course._id} className="flex items-start gap-3 p-3 rounded-xl border border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))] cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={form.selectedCourses.includes(course._id)}
                      onChange={() => toggleCourse(course._id)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{course.title}</p>
                      <p className="text-xs text-[hsl(var(--admin-success))] font-bold mt-0.5">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(course.fee || 0)}
                      </p>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] line-clamp-1 mt-0.5">{course.skills?.join(', ')}</p>
                    </div>
                  </label>
                ))}
                {loadingCourses ? (
                  <p className="text-sm text-[hsl(var(--admin-text-muted))]">Đang tải danh sách khóa học...</p>
                ) : courses.length === 0 ? (
                  <p className="text-sm text-rose-500">Không tìm thấy khóa học nào đủ điều kiện nhận tài trợ (Cần là khóa học có phí và cho phép tài trợ).</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || (wallet && calculatedBudget > wallet.availableBalance) || form.selectedCourses.length === 0} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {submitting ? 'Đang tạo...' : 'Tạo Sponsorship'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/ngo/sponsorships')} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
              Hủy
            </Button>
          </div>
        </form>
      </div>
  );
}
