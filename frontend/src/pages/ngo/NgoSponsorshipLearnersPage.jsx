import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NgoLayout from '@/components/ngo/NgoLayout';
import { Button } from '@/components/ui';
import { getSponsorshipById, getSponsorshipLearners, decideSponsorshipLearner } from '@/apis/courseSponsorshipApi';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui';

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—';

export default function NgoSponsorshipLearnersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sponsorship, setSponsorship] = useState(null);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [spRes, lrRes] = await Promise.all([
          getSponsorshipById(id).catch(() => ({ data: { data: {} } })),
          getSponsorshipLearners(id, { limit: 50 }).catch(() => ({ data: { data: [] } }))
        ]);
        setSponsorship(spRes.data?.data || {});
        setLearners(lrRes.data?.data || []);
      } catch {
        toast.error('Không thể tải chi tiết sponsorship.');
        navigate('/ngo/sponsorships');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  const handleDecision = async (enrollmentId, status) => {
    try {
      await decideSponsorshipLearner(id, enrollmentId, status);
      toast.success(status === 'approved' ? 'Đã chấp nhận học viên!' : 'Đã từ chối học viên!');
      // Refresh list
      const lrRes = await getSponsorshipLearners(id, { limit: 50 });
      setLearners(lrRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  return (
    <NgoLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/ngo/sponsorships')} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        {loading ? (
          <Skeleton className="h-96 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">{sponsorship?.title || 'Sponsorship'}</h1>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Danh sách học viên được tài trợ bởi chương trình này.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Ngân sách', value: formatCurrency(sponsorship?.budget) },
                { label: 'Đã giải ngân', value: formatCurrency(sponsorship?.spent) },
                { label: 'Còn lại', value: formatCurrency(sponsorship?.remaining) }
              ].map(item => (
                <div key={item.label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 text-center">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-2">{item.label}</p>
                  <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="font-semibold text-[hsl(var(--admin-text-primary))]">Danh sách học viên ({learners.length})</h3>
              </div>
              {learners.length === 0 ? (
                <div className="p-8 text-center text-[hsl(var(--admin-text-muted))] text-sm">Chưa có học viên nào được tài trợ.</div>
              ) : (
                <div className="divide-y divide-[hsl(var(--admin-border))]">
                  {learners.map(learner => (
                    <div key={learner._id || learner.enrollmentId} className="flex items-center justify-between px-5 py-4 hover:bg-[hsl(var(--admin-accent-subtle))] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[hsl(var(--admin-surface-elevated))] flex items-center justify-center text-sm text-[hsl(var(--admin-text-secondary))] font-medium">
                          {learner.user?.displayName?.charAt(0)?.toUpperCase() || 'H'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{learner.user?.displayName || 'Học viên'}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">{learner.user?.email || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[hsl(var(--admin-success))]">{formatCurrency(learner.fundedAmount || sponsorship?.maxAmountPerLearner)}</p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">{learner.status === 'pending_review' ? 'Chờ duyệt' : learner.status}</p>
                        {learner.status === 'pending_review' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => handleDecision(learner._id, 'approved')} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Chấp nhận</Button>
                            <Button size="sm" variant="outline" onClick={() => handleDecision(learner._id, 'rejected')} className="h-7 text-xs border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">Từ chối</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </NgoLayout>
  );
}
