import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, CheckCircle2, BadgeDollarSign, CalendarDays } from 'lucide-react';
import { Skeleton, Button, Dialog, DialogContent, Badge } from '@/components/ui';
import { getNgoImpactDashboard } from '@/apis/ngoDashboardApi';
import { fetchEventsAPI } from '@/apis/eventApi';
import { getCourses } from '@/apis/courseApi';
import { selectCurrentUser } from '~/redux/user/userSlice';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['hsl(var(--admin-success))', 'hsl(var(--admin-warning))', 'hsl(var(--admin-accent))', 'hsl(var(--admin-destructive))'];

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
  const currentUser = useSelector(selectCurrentUser);
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalGraduates: 0,
    scholarshipStats: {},
    totalEvents: 0,
    totalParticipants: 0,
    activeSponsorships: []
  });
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNgoImpactDashboard().catch(() => ({ data: { data: {} } }));
      const dashboardData = res.data?.data || {};

      let totalEvents = 0;
      let totalParticipants = 0;
      if (currentUser?._id) {
        const eventsRes = await fetchEventsAPI({ organizerId: currentUser._id, limit: 100 }).catch(() => ({ data: [] }));
        const eventsData = eventsRes.data || [];
        totalEvents = eventsData.length;
        totalParticipants = eventsData.reduce((acc, ev) => acc + (ev.participantCount || 0), 0);
      }

      setStats({
        totalLearners: dashboardData.totalLearners || 0,
        totalGraduates: dashboardData.totalGraduates || 0,
        scholarshipStats: dashboardData.scholarshipStats || {},
        activeSponsorships: dashboardData.activeSponsorships || [],
        totalEvents,
        totalParticipants
      });

      const coursesRes = await getCourses({ limit: 50, isFree: false }).catch(() => ({ data: { data: [] } }));
      const paidCourses = (coursesRes.data?.data || []).filter(c => c.fee > 0).slice(0, 4);
      setCourses(paidCourses);
    } catch (err) {
      console.error('NGO impact dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const learnerData = [
    { name: 'Đang học', value: Math.max(0, stats.totalLearners - stats.totalGraduates) },
    { name: 'Tốt nghiệp', value: stats.totalGraduates }
  ].filter(item => item.value > 0);

  const scholarshipStatusData = [
    { name: 'Đang mở (Active)', count: stats.scholarshipStats.active || 0 },
    { name: 'Tạm dừng (Paused)', count: stats.scholarshipStats.paused || 0 },
    { name: 'Hết suất (Exhausted)', count: stats.scholarshipStats.exhausted || 0 }
  ];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Impact Dashboard</h1>
          <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
            Tổng quan các chương trình tài trợ và sự kiện cộng đồng do tổ chức của bạn thực hiện.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Tổng số Học viên" value={stats.totalLearners} color="text-[hsl(var(--admin-accent))]" />
            <StatCard icon={CheckCircle2} label="Học viên Tốt nghiệp" value={stats.totalGraduates} color="text-[hsl(var(--admin-success))]" />
            <StatCard icon={BadgeDollarSign} label="Tổng số Quỹ tài trợ" value={stats.scholarshipStats?.total || 0} color="text-[hsl(var(--admin-warning))]" />
            <StatCard icon={CalendarDays} label="Lượt tham gia Sự kiện" value={stats.totalParticipants} color="text-[hsl(var(--admin-destructive))]" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
            <h3 className="font-bold text-[hsl(var(--admin-text-primary))] mb-6">Trạng thái Học viên</h3>
            <div className="h-64">
              {stats.totalLearners > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={learnerData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {learnerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--admin-text-primary))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-xl text-sm">
                  Chưa có dữ liệu học viên
                </div>
              )}
            </div>
            {stats.totalLearners > 0 && (
              <div className="flex justify-center gap-6 mt-4">
                {learnerData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-sm font-medium text-[hsl(var(--admin-text-secondary))]">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
            <h3 className="font-bold text-[hsl(var(--admin-text-primary))] mb-6">Trạng thái Quỹ tài trợ</h3>
            <div className="h-64">
              {stats.scholarshipStats?.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scholarshipStatusData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--admin-text-muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--admin-text-muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--admin-surface-hover))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--admin-surface))', borderColor: 'hsl(var(--admin-border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--admin-accent))" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] border border-dashed border-[hsl(var(--admin-border))] rounded-xl text-sm">
                  Chưa có quỹ tài trợ nào
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Quản lý Quỹ đang mở</h2>
            <Button variant="outline" onClick={() => navigate('/ngo/sponsorships')} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
              Tất cả quỹ
            </Button>
          </div>
          
          <div className="space-y-4">
            {stats.activeSponsorships && stats.activeSponsorships.length > 0 ? (
              stats.activeSponsorships.map(sp => {
                const total = sp.maxRecipients || 1;
                const used = sp.currentRecipients || 0;
                const percent = Math.min(100, Math.round((used / total) * 100));
                
                return (
                  <div key={sp._id} className="p-4 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[hsl(var(--admin-text-primary))]">{sp.title}</h4>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Đã cấp {used} / {total} suất</p>
                    </div>
                    <div className="flex-1 w-full md:max-w-xs">
                      <div className="h-2 w-full bg-[hsl(var(--admin-surface-hover))] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${percent >= 90 ? 'bg-red-500' : 'bg-[hsl(var(--admin-success))]'}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-[hsl(var(--admin-text-muted))] text-sm py-8 text-center border border-dashed border-[hsl(var(--admin-border))] rounded-xl">Chưa có quỹ tài trợ nào đang mở.</p>
            )}
          </div>
        </div>

        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">Khóa học cần tài trợ</h2>
              <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">Các khóa học đang cần sự hỗ trợ tài chính để giúp học viên tham gia.</p>
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
    </>
  );
}
