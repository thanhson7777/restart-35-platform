import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NgoLayout from '@/components/ngo/NgoLayout';
import { Button } from '@/components/ui';
import { getSponsorshipById, getSponsorshipLearners } from '@/apis/courseSponsorshipApi';
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

  return (
    <NgoLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/ngo/sponsorships')} className="text-slate-400 hover:text-white pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        {loading ? (
          <Skeleton className="h-96 rounded-2xl bg-slate-800" />
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-extrabold text-white">{sponsorship?.title || 'Sponsorship'}</h1>
              <p className="text-slate-400 text-sm mt-1">Danh sách học viên được tài trợ bởi chương trình này.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Ngân sách', value: formatCurrency(sponsorship?.budget) },
                { label: 'Đã giải ngân', value: formatCurrency(sponsorship?.spent) },
                { label: 'Còn lại', value: formatCurrency(sponsorship?.remaining) }
              ].map(item => (
                <div key={item.label} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 text-center">
                  <p className="text-xs text-slate-500 mb-2">{item.label}</p>
                  <p className="text-xl font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h3 className="font-semibold text-white">Danh sách học viên ({learners.length})</h3>
              </div>
              {learners.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">Chưa có học viên nào được tài trợ.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {learners.map(learner => (
                    <div key={learner._id || learner.enrollmentId} className="flex items-center justify-between px-5 py-4 hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm text-slate-300 font-medium">
                          {learner.user?.displayName?.charAt(0)?.toUpperCase() || 'H'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{learner.user?.displayName || 'Học viên'}</p>
                          <p className="text-xs text-slate-500">{learner.user?.email || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-400">{formatCurrency(learner.fundedAmount || sponsorship?.maxAmountPerLearner)}</p>
                        <p className="text-xs text-slate-500">{learner.status || 'active'}</p>
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
