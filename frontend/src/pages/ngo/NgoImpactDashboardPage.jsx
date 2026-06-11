import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import NgoLayout from '@/components/ngo/NgoLayout';
import ImpactChart from '@/components/shared/ImpactChart';
import { Users, TrendingUp, CheckCircle2, Wallet, X } from 'lucide-react';
import { Skeleton, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from '@/components/ui';
import { getNgoImpactDashboard } from '@/apis/ngoDashboardApi';
import { getCourses } from '@/apis/courseApi';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 flex items-center gap-4">
    <div className={`p-3 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]`}>
      <Icon size={22} className={color} />
    </div>
    <div>
      <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))]">{value ?? 0}</p>
    </div>
  </div>
);

export default function NgoImpactDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNgoImpactDashboard().catch(() => ({ data: { data: {} } }));
      setStats(res.data?.data || {});

      // Lấy danh sách khóa học cần tài trợ (có học phí)
      const coursesRes = await getCourses({ limit: 50, isFree: false }).catch(() => ({ data: { data: [] } }));
      const paidCourses = (coursesRes.data?.data || []).filter(c => c.fee > 0).slice(0, 4);
      setCourses(paidCourses);
    } catch (err) {
      console.error('NGO impact dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <NgoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Impact Dashboard</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Theo dõi tác động của các chương trình tài trợ học bổng của tổ chức bạn.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Wallet} label="Tổng ngân sách giải ngân" value={stats.totalDisbursed} color="text-[hsl(var(--admin-success))]" />
            <StatCard icon={Users} label="Học viên được tài trợ" value={stats.totalRecipients} color="text-[hsl(var(--admin-accent))]" />
            <StatCard icon={CheckCircle2} label="Hoàn thành khóa học" value={stats.completedLearners} color="text-[hsl(var(--admin-success))]" />
            <StatCard icon={TrendingUp} label="Tỷ lệ hoàn thành" value={`${stats.completionRate || 0}%`} color="text-[hsl(var(--admin-warning))]" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ImpactChart
              data={stats.monthlyTrend || []}
              title="Xu hướng giải ngân theo tháng"
              description="Số tiền đã giải ngân qua các tháng"
            />
          </div>
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] text-sm">Sponsorships đang hoạt động</h3>
            {(stats.activeSponsorships || []).map(sp => (
              <div key={sp._id} className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--admin-text-secondary))]">{sp.title}</span>
                <span className="text-[hsl(var(--admin-success))] font-medium">{sp.remaining} slot</span>
              </div>
            ))}
            {!(stats.activeSponsorships || []).length && (
              <p className="text-[hsl(var(--admin-text-muted))] text-xs">Chưa có sponsorship nào đang hoạt động.</p>
            )}
          </div>
        </div>

        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
          <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-4 text-sm">Chi tiết sponsorship</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Tổng sponsorships', value: stats.totalSponsorships },
              { label: 'Ngân sách còn lại', value: stats.totalRemaining },
              { label: 'Clawback', value: stats.totalClawback }
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-[hsl(var(--admin-border))] p-4 text-center">
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-2">{item.label}</p>
                <p className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{item.value ?? 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Khóa học cần tài trợ Section */}
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Khóa học cần tài trợ</h2>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Các khóa học đang cần sự hỗ trợ tài chính từ tổ chức của bạn để giúp học viên tham gia.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/community')} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
              Xem tất cả
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.length > 0 ? courses.map((course) => (
              <div key={course._id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] hover:shadow-xl transition-all duration-300">
                <div className="aspect-[16/9] w-full overflow-hidden bg-[hsl(var(--admin-surface-hover))]">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[hsl(var(--admin-text-muted))]">No image</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))] line-clamp-2 min-h-[3rem] mb-2">{course.title}</h3>
                  <div className="mb-4 mt-auto">
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Học phí:</p>
                    <p className="text-lg font-bold text-[hsl(var(--admin-success))]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(course.fee || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCourse(course)}
                      className="flex-1 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] text-xs h-9 px-2"
                    >
                      Xem chi tiết
                    </Button>
                    <Button 
                      onClick={() => navigate(`/ngo/sponsorships/create?courseId=${course._id}`)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-2 shadow-sm shadow-emerald-600/20"
                    >
                      Tài trợ ngay
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-10 text-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-2xl">
                Không tìm thấy khóa học nào có học phí.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Chi tiết khóa học */}
      <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] gap-0">
          {selectedCourse && (
            <>
              <div className="relative h-48 w-full bg-[hsl(var(--admin-surface-hover))]">
                {selectedCourse.thumbnail ? (
                  <img src={selectedCourse.thumbnail} alt={selectedCourse.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[hsl(var(--admin-text-muted))]">Không có hình ảnh</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <Badge className="bg-[hsl(var(--admin-accent))] text-white mb-2 border-none">
                    {selectedCourse.category?.name || 'Chưa phân loại'}
                  </Badge>
                  <h2 className="text-2xl font-bold text-white line-clamp-2">{selectedCourse.title}</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[hsl(var(--admin-surface-elevated))] p-4 rounded-xl border border-[hsl(var(--admin-border))]">
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Mức học phí</p>
                    <p className="text-xl font-bold text-[hsl(var(--admin-success))]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedCourse.fee || 0)}
                    </p>
                  </div>
                  <div className="bg-[hsl(var(--admin-surface-elevated))] p-4 rounded-xl border border-[hsl(var(--admin-border))]">
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Thời lượng</p>
                    <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                      {selectedCourse.duration?.value} {selectedCourse.duration?.unit === 'hours' ? 'Giờ' : selectedCourse.duration?.unit === 'weeks' ? 'Tuần' : selectedCourse.duration?.unit === 'months' ? 'Tháng' : 'Ngày'}
                    </p>
                  </div>
                </div>

                {selectedCourse.skills && selectedCourse.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-2">Kỹ năng đạt được</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCourse.skills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--admin-surface-hover))] text-[hsl(var(--admin-text-secondary))] rounded-full border border-[hsl(var(--admin-border))]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-2">Mô tả ngắn</h3>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] leading-relaxed line-clamp-3">
                    {selectedCourse.shortDescription || 'Chưa có mô tả ngắn cho khóa học này.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--admin-border))]">
                  <Button variant="outline" onClick={() => setSelectedCourse(null)} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
                    Đóng
                  </Button>
                  <Button 
                    onClick={() => navigate(`/ngo/sponsorships/create?courseId=${selectedCourse._id}`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    Tài trợ khóa học này
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </NgoLayout>
  );
}
