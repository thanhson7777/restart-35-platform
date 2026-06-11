import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NgoLayout from '@/components/ngo/NgoLayout';
import { Button, Input, Label } from '@/components/ui';
import { createSponsorship } from '@/apis/courseSponsorshipApi';
import { getCourses } from '@/apis/courseApi';
import toast from 'react-hot-toast';

export default function NgoSponsorshipCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    selectedCourses: searchParams.get('courseId') ? [searchParams.get('courseId')] : []
  });

  useEffect(() => {
    getCourses({ limit: 50, isFree: false })
      .then(res => {
        const paidCourses = (res.data?.data || []).filter(c => c.fee > 0);
        setCourses(paidCourses);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề.'); return; }
    if (form.selectedCourses.length === 0) { toast.error('Vui lòng chọn ít nhất 1 khóa học.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        sponsorType: 'ngo',
        budget: 100000000, // Dummy value
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
    <NgoLayout>
      <div className="max-w-2xl space-y-6">
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
                {courses.length === 0 && <p className="text-sm text-[hsl(var(--admin-text-muted))]">Đang tải danh sách khóa học...</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {submitting ? 'Đang tạo...' : 'Tạo Sponsorship'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/ngo/sponsorships')} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </NgoLayout>
  );
}
