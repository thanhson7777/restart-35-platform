import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Badge, Skeleton } from '@/components/ui';
import { getSponsorshipById, getSponsorshipLearners, decideSponsorshipLearner } from '@/apis/courseSponsorshipApi';
import toast from 'react-hot-toast';

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
      
      // Cập nhật trạng thái học viên cục bộ
      setLearners(prev => prev.map(lr => 
        lr._id === enrollmentId ? { ...lr, status } : lr
      ));
      
      // Cập nhật thống kê của quỹ nếu duyệt
      if (status === 'approved') {
        setSponsorship(prev => ({
          ...prev,
          stats: {
            ...prev?.stats,
            approvedLearners: (prev?.stats?.approvedLearners || 0) + 1
          }
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  return (
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

            {/* Thống kê Tổng quan */}
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="font-bold text-[hsl(var(--admin-text-primary))]">Tiến độ Cấp phát Học bổng</h3>
                  <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1">Đã duyệt {sponsorship?.stats?.approvedLearners || 0} suất trên tổng số {sponsorship?.targetLearners || 1} suất mục tiêu.</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[hsl(var(--admin-text-primary))]">
                    {Math.min(100, Math.round(((sponsorship?.stats?.approvedLearners || 0) / (sponsorship?.targetLearners || 1)) * 100))}%
                  </p>
                </div>
              </div>
              <div className="h-4 w-full bg-[hsl(var(--admin-surface-hover))] rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${Math.min(100, Math.round(((sponsorship?.stats?.approvedLearners || 0) / (sponsorship?.targetLearners || 1)) * 100)) >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.min(100, Math.round(((sponsorship?.stats?.approvedLearners || 0) / (sponsorship?.targetLearners || 1)) * 100))}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl p-4 text-center">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 uppercase tracking-wider font-bold">Mục tiêu</p>
                  <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{sponsorship?.targetLearners || 0} suất</p>
                </div>
                <div className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl p-4 text-center">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 uppercase tracking-wider font-bold">Đã duyệt</p>
                  <p className="text-xl font-bold text-[hsl(var(--admin-success))]">{sponsorship?.stats?.approvedLearners || 0} suất</p>
                </div>
                <div className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl p-4 text-center">
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 uppercase tracking-wider font-bold">Còn lại</p>
                  <p className="text-xl font-bold text-[hsl(var(--admin-warning))]">{(sponsorship?.targetLearners || 0) - (sponsorship?.stats?.approvedLearners || 0)} suất</p>
                </div>
              </div>
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
                        <Badge variant="outline" className={`mt-1 ${learner.status === 'matched' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : learner.status === 'approved' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : 'border-rose-500/30 text-rose-500 bg-rose-500/10'}`}>
                          {learner.status === 'matched' ? 'Chờ duyệt' : learner.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                        </Badge>
                        {learner.status === 'matched' && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => handleDecision(learner._id, 'approved')} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none">Phê duyệt</Button>
                            <Button size="sm" variant="outline" onClick={() => handleDecision(learner._id, 'rejected')} className="h-8 text-xs border-[hsl(var(--admin-border))] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-[hsl(var(--admin-text-secondary))]">Từ chối</Button>
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
  );
}
