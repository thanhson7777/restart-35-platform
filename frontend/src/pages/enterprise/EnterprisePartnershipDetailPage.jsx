import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Briefcase, Users, Banknote, CalendarRange, 
  MessageSquare, BookOpen, CheckCircle, Clock, MonitorPlay, ListChecks, Gift
} from 'lucide-react';

import PartnershipPlacementList from '@/components/enterprise/PartnershipPlacementList';
import { Button, Badge, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { getPartnershipDetail, confirmPartnership, cancelPartnership, getPartnershipLearners } from '@/apis/partnershipApi';
import { decideSponsorshipLearner } from '@/apis/courseSponsorshipApi';
import toast from 'react-hot-toast';
import { getCourseById } from '@/apis/courseApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';

const statusConfig = {
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  negotiating: { label: 'Đang đàm phán', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  active: { label: 'Đang hợp tác', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-500 border-slate-300' },
  expired: { label: 'Hết hạn', className: 'bg-red-100 text-red-700 border-red-200' }
};

const courseStatusMap = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  archived: 'Lưu trữ'
};

const dayMap = {
  Monday: 'Thứ hai',
  Tuesday: 'Thứ ba',
  Wednesday: 'Thứ tư',
  Thursday: 'Thứ năm',
  Friday: 'Thứ sáu',
  Saturday: 'Thứ bảy',
  Sunday: 'Chủ nhật'
};

const timeMap = {
  Morning: 'Sáng',
  Afternoon: 'Chiều',
  Evening: 'Tối'
};

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—';

export default function EnterprisePartnershipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partnership, setPartnership] = useState(null);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    enrollmentId: null,
    sponsorshipId: null,
    status: null
  });

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [pRes, lRes] = await Promise.all([
          getPartnershipDetail(id).catch(() => ({ data: { data: {} } })),
          getPartnershipLearners(id, { limit: 50 }).catch(() => ({ data: { data: [] } }))
        ]);
        setPartnership(pRes.data?.data || {});
        setLearners(lRes.data?.data || []);
      } catch {
        toast.error('Không thể tải chi tiết partnership.');
        navigate('/enterprise/partnerships');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  const handleConfirm = async () => {
    try {
      const payload = {
        agreedTerms: {
          linkedCourseIds: partnership.linkedCourses?.map(c => c._id) || []
        }
      };
      await confirmPartnership(id, payload);
      toast.success('Đã duyệt khóa học và bắt đầu hợp tác!');
      navigate(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi duyệt khóa học.');
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Nhập lý do hủy hợp tác (không bắt buộc):');
    if (reason === null) return; // User cancelled prompt

    try {
      await cancelPartnership(id, { reason });
      toast.success('Đã hủy hợp tác thành công!');
      navigate(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi hủy hợp tác.');
    }
  };

  const handleDecideLearner = async (enrollmentId, sponsorshipId, status) => {
    try {
      await decideSponsorshipLearner(sponsorshipId, enrollmentId, status);
      toast.success(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} tài trợ học viên thành công!`);
      // Refresh learners
      const lRes = await getPartnershipLearners(id, { limit: 50 });
      setLearners(lRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý.');
    }
  };

  const handleViewCourse = async (courseId) => {
    try {
      const res = await getCourseById(courseId);
      setSelectedCourse(res.data?.data || res.data || {});
      setIsCourseModalOpen(true);
    } catch {
      toast.error('Không thể tải thông tin khóa học.');
    }
  };

  if (loading) {
    return <><Skeleton className="h-96 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" /></>;
  }

  if (!partnership) return null;

  const statusLower = (partnership.status || '').toLowerCase();
  const config = statusConfig[statusLower] || statusConfig.pending;
  const stats = partnership.summary || partnership.stats || {};
  const recruitment = partnership.recruitmentNeeds || {};
  
  const isActiveOrCompleted = ['active', 'completed'].includes(statusLower);
  const isNegotiating = statusLower === 'negotiating';
  
  // Filter out any duplicate courses from backend based on course ID
  const uniqueLinkedCourses = partnership.linkedCourses ? partnership.linkedCourses.reduce((acc, current) => {
    if (!acc.find(item => item._id === current._id)) {
      return acc.concat([current]);
    }
    return acc;
  }, []) : [];

  // Tính toán số lượng chờ duyệt và từ chối từ danh sách learners (dự phòng nếu backend không trả về)
  const pendingCount = stats.pendingSponsorships ?? learners.filter(l => {
    const s = l.sponsorships?.find(s => s.sponsorType === 'enterprise') || l.sponsorships?.[0];
    return s?.status === 'matched';
  }).length;

  const rejectedCount = stats.rejectedSponsorships ?? learners.filter(l => {
    const s = l.sponsorships?.find(s => s.sponsorType === 'enterprise') || l.sponsorships?.[0];
    return s?.status === 'rejected';
  }).length;

  return (
    <>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enterprise/partnerships')} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
          <ArrowLeft size={16} /> Quay lại
        </Button>

        {/* Hero / Header Section */}
        <div className="flex flex-col gap-4 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">{partnership.trainer?.displayName || 'Partnership'}</h1>
                <Badge className={config.className}>{config.label}</Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                  <Briefcase className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
                  <span className="font-medium text-[hsl(var(--admin-text-primary))]">{recruitment.jobTitle || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                  <Users className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
                  <span>Cần tuyển: <span className="font-medium text-[hsl(var(--admin-text-primary))]">{recruitment.jobQuantity || 0}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(recruitment.salaryRange?.min)} — {formatCurrency(recruitment.salaryRange?.max)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                  <CalendarRange className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                  <span>Ký ngày: {partnership.signedAt ? new Date(partnership.signedAt).toLocaleDateString('vi-VN') : 'Chưa xác định'}</span>
                </div>
              </div>
            </div>
            {['pending', 'negotiating'].includes(statusLower) && (
              <Button onClick={handleCancel} variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                Hủy hợp tác
              </Button>
            )}
          </div>

          {partnership.message && (
            <div className="mt-2 bg-[hsl(var(--admin-surface-elevated))] p-4 rounded-xl flex gap-3 border border-[hsl(var(--admin-border))]">
              <MessageSquare className="w-5 h-5 text-[hsl(var(--admin-text-muted))] shrink-0 mt-0.5" />
              <div>
                <p className="text-[hsl(var(--admin-text-muted))] text-xs mb-1 font-semibold uppercase tracking-wider">Lời nhắn đã gửi</p>
                <p className="text-[hsl(var(--admin-text-secondary))] text-sm italic">"{partnership.message}"</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Section (Conditional) */}
        {isActiveOrCompleted && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Tổng', value: stats.totalLearners ?? stats.enrolledLearners ?? learners.length },
              { label: 'Chờ duyệt', value: pendingCount },
              { label: 'Đang học', value: stats.activeLearners ?? stats.pendingLearners ?? 0 },
              { label: 'Đã hoàn thành', value: stats.completedLearners ?? stats.totalGraduates ?? 0 },
              { label: 'Từ chối', value: rejectedCount }
            ].map(item => (
              <div key={item.label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider mb-2">{item.label}</p>
                <p className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="mb-6 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] p-1">
            <TabsTrigger value="courses" className="rounded-md">Khóa học liên kết</TabsTrigger>
            <TabsTrigger value="learners" className="rounded-md">Xét duyệt tài trợ</TabsTrigger>
            <TabsTrigger value="graduates" className="rounded-md">Tiếp nhận ứng viên</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {isNegotiating ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                  <BookOpen size={20} />
                  Bản thảo khóa học chờ xét duyệt
                </h3>
                <div className="space-y-4">
                  {uniqueLinkedCourses.map(course => (
                    <div key={course._id} className="bg-white border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-base">{course.title}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Trạng thái: <Badge variant="secondary" className="ml-1 font-normal text-xs">{courseStatusMap[course.status] || course.status}</Badge>
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewCourse(course._id)} className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                        Xem chi tiết
                      </Button>
                    </div>
                  ))}
                  <div className="pt-4 mt-4 border-t border-blue-200 flex justify-end">
                    <Button onClick={handleConfirm} className="bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-2 shadow-sm px-6">
                      <CheckCircle size={18} /> Duyệt khóa học & Bắt đầu hợp tác
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
                 <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-6 flex items-center gap-2">
                  <BookOpen size={18} className="text-[hsl(var(--admin-text-muted))]" />
                  Khóa học đang liên kết
                </h3>
                {uniqueLinkedCourses.length > 0 ? (
                  <div className={`grid grid-cols-1 ${uniqueLinkedCourses.length > 1 ? 'lg:grid-cols-2' : ''} gap-4`}>
                    {uniqueLinkedCourses.map(course => (
                      <div key={course._id} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-[hsl(var(--admin-border-strong))] transition-colors">
                        <div>
                          <p className="font-bold text-[hsl(var(--admin-text-primary))]">{course.title}</p>
                          <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-2">Trạng thái: <span className="font-medium">{courseStatusMap[course.status] || course.status}</span></p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewCourse(course._id)} className="mt-5 w-fit">
                          Xem chi tiết
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--admin-border))] rounded-xl">
                    <BookOpen className="w-10 h-10 text-[hsl(var(--admin-text-faint))] mb-3" />
                    <p className="text-[hsl(var(--admin-text-muted))] text-sm font-medium">Không có khóa học nào được liên kết.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="learners">
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-6 flex items-center gap-2">
                <Users size={18} className="text-[hsl(var(--admin-text-muted))]" />
                Danh sách học viên chờ cấp vốn
              </h3>
              
              {learners.length > 0 ? (
                <div className="space-y-4">
                  {learners.map(learner => {
                    const sponsorship = learner.sponsorships?.find(s => s.sponsorType === 'enterprise') || learner.sponsorships?.[0];
                    const sponsorshipStatus = sponsorship?.status || 'unknown';
                    
                    const statusUI = {
                      matched: { label: 'Chờ duyệt', color: 'text-amber-700 bg-amber-100 border-amber-200' },
                      approved: { label: 'Đã duyệt', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
                      rejected: { label: 'Đã từ chối', color: 'text-rose-700 bg-rose-100 border-rose-200' },
                      disbursed: { label: 'Đã giải ngân', color: 'text-blue-700 bg-blue-100 border-blue-200' },
                      clawback: { label: 'Thu hồi', color: 'text-red-700 bg-red-100 border-red-200' },
                      unknown: { label: 'Không xác định', color: 'text-slate-700 bg-slate-100 border-slate-200' },
                    }[sponsorshipStatus] || { label: sponsorshipStatus, color: 'text-slate-700 bg-slate-100 border-slate-200' };

                    return (
                      <div key={learner._id} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[hsl(var(--admin-accent-subtle))] flex items-center justify-center text-[hsl(var(--admin-accent))] font-bold text-lg shrink-0">
                            {learner.user?.displayName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-[hsl(var(--admin-text-primary))] text-base">
                              {learner.user?.displayName || 'Học viên'}
                            </p>
                            <p className="text-sm text-[hsl(var(--admin-text-muted))]">{learner.user?.email}</p>
                            <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">
                              Ngày nộp: {new Date(learner.enrolledAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge className={statusUI.color}>{statusUI.label}</Badge>
                          
                          {sponsorshipStatus === 'matched' && sponsorship?.sponsorshipId && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setConfirmDialog({ isOpen: true, enrollmentId: learner._id, sponsorshipId: sponsorship.sponsorshipId, status: 'approved' })}
                              >
                                Duyệt
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => setConfirmDialog({ isOpen: true, enrollmentId: learner._id, sponsorshipId: sponsorship.sponsorshipId, status: 'rejected' })}
                              >
                                Từ chối
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--admin-border))] rounded-xl">
                  <Users className="w-10 h-10 text-[hsl(var(--admin-text-faint))] mb-3" />
                  <p className="text-[hsl(var(--admin-text-muted))] text-sm font-medium">Chưa có học viên nào đăng ký tài trợ.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="graduates">
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-6 flex items-center gap-2">
                <Users size={18} className="text-[hsl(var(--admin-text-muted))]" />
                Quản lý tuyển dụng (Placement)
              </h3>
              <PartnershipPlacementList partnershipId={id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Course Detail Modal (2-Column Layout) */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent className="w-[95vw] max-w-5xl md:min-w-[800px] lg:min-w-[900px] max-h-[90vh] overflow-y-auto p-0 gap-0 block">
          <div className="sticky top-0 z-20 px-6 py-5 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]">
            <DialogHeader>
              <DialogTitle className="text-xl text-[hsl(var(--admin-text-primary))]">{selectedCourse?.title || 'Chi tiết khóa học'}</DialogTitle>
              <DialogDescription className="text-[hsl(var(--admin-text-secondary))] mt-1 break-words whitespace-pre-wrap">
                {selectedCourse?.shortDescription || 'Thông tin khóa học do Trainer đề xuất cho chương trình hợp tác.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-6 bg-[hsl(var(--admin-surface-elevated))]">
            {selectedCourse ? (
              <div className="flex flex-col gap-6">
                {/* Basic Info */}
                  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 space-y-5 shadow-sm">
                    <h4 className="font-semibold text-[hsl(var(--admin-text-primary))] border-b border-[hsl(var(--admin-border))] pb-3">Thông tin cơ bản</h4>
                    
                    <div className="flex gap-3 items-start">
                      <MonitorPlay className="w-5 h-5 text-[hsl(var(--admin-accent))] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium tracking-wide uppercase">Hình thức giảng dạy</p>
                        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
                          {selectedCourse.delivery_type === 'live' ? 'Học Online (Live)' : selectedCourse.delivery_type === 'offline' ? 'Học trực tiếp (Offline)' : 'Học qua Video'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium tracking-wide uppercase">Thời lượng</p>
                        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
                          {selectedCourse.duration ? `${selectedCourse.duration.value} ${selectedCourse.duration.unit === 'hours' ? 'giờ' : selectedCourse.duration.unit === 'weeks' ? 'tuần' : selectedCourse.duration.unit === 'months' ? 'tháng' : 'ngày'}` : 'Chưa cập nhật'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <Users className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium tracking-wide uppercase">Số lượng tối đa</p>
                        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{selectedCourse.maxStudents || 30} học viên</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Job Card */}
                  <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 space-y-5 shadow-sm">
                    <h4 className="font-semibold text-[hsl(var(--admin-text-primary))] border-b border-[hsl(var(--admin-border))] pb-3">Tài chính & Việc làm</h4>
                    
                    <div className="flex gap-3 items-start">
                      <Banknote className="w-5 h-5 text-[hsl(var(--admin-text-secondary))] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium tracking-wide uppercase">Học phí gốc</p>
                        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
                          {selectedCourse?.fundingConfig?.price > 0 ? formatCurrency(selectedCourse.fundingConfig.price) : 'Miễn phí'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <Gift className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium tracking-wide uppercase">DN Tài trợ</p>
                        <p className="text-sm font-semibold text-rose-600">
                          {partnership.proposedSponsorship?.coverageType === 'FULL' 
                            ? 'Toàn phần (100%)' 
                            : partnership.proposedSponsorship?.coverageType === 'FIXED_AMOUNT'
                              ? formatCurrency(partnership.proposedSponsorship?.fixedAmountPerLearner)
                              : 'Không tài trợ'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <Briefcase className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 font-medium tracking-wide uppercase">Cam kết việc làm</p>
                        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
                          {selectedCourse?.fundingConfig?.hasJobGuarantee || partnership.recruitmentNeeds ? 'Có cam kết tuyển dụng' : 'Không cam kết'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedCourse.scheduleConfig && (
                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 shadow-sm">
                      <h4 className="font-semibold text-[hsl(var(--admin-text-primary))] border-b border-[hsl(var(--admin-border))] pb-3 mb-4">Lịch học dự kiến</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-muted))]">Tổng số buổi:</span> <span className="font-medium text-[hsl(var(--admin-text-secondary))]">{selectedCourse.scheduleConfig.totalSessions} buổi</span></div>
                        <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-muted))]">Thời lượng/buổi:</span> <span className="font-medium text-[hsl(var(--admin-text-secondary))]">{selectedCourse.scheduleConfig.sessionDurationMinutes} phút</span></div>
                        <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-muted))]">Tần suất:</span> <span className="font-medium text-[hsl(var(--admin-text-secondary))]">{selectedCourse.scheduleConfig.sessionsPerWeek} buổi/tuần</span></div>
                        {selectedCourse.scheduleConfig.preferredDays?.length > 0 && (
                          <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-muted))]">Ngày học:</span> <span className="font-medium text-[hsl(var(--admin-text-secondary))]">{selectedCourse.scheduleConfig.preferredDays.map(d => dayMap[d] || d).join(', ')}</span></div>
                        )}
                        {selectedCourse.scheduleConfig.preferredTime && (
                          <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-muted))]">Khung giờ:</span> <span className="font-medium text-[hsl(var(--admin-text-secondary))]">{timeMap[selectedCourse.scheduleConfig.preferredTime] || selectedCourse.scheduleConfig.preferredTime}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                {/* Syllabus & Skills */}
                  {selectedCourse.skills && selectedCourse.skills.length > 0 && (
                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 shadow-sm">
                      <h4 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-4 flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-[hsl(var(--admin-accent))]" />
                        Kỹ năng đạt được
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCourse.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] px-3 py-1 font-medium">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCourse.syllabus && selectedCourse.syllabus.length > 0 && (
                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-5 shadow-sm">
                      <h4 className="font-semibold text-[hsl(var(--admin-text-primary))] mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[hsl(var(--admin-accent))]" />
                        Lộ trình học (Syllabus)
                      </h4>
                      <div className="space-y-3">
                        {selectedCourse.syllabus.map((s, i) => (
                          <div key={i} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg p-4 transition-colors hover:border-[hsl(var(--admin-border-strong))]">
                            <p className="font-semibold text-[hsl(var(--admin-text-primary))] text-sm">Buổi {i + 1}: {s.title}</p>
                            {s.content && <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-2 leading-relaxed">{s.content}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!selectedCourse.skills || selectedCourse.skills.length === 0) && (!selectedCourse.syllabus || selectedCourse.syllabus.length === 0) && (
                    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-10 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                      <BookOpen className="w-12 h-12 text-[hsl(var(--admin-text-faint))] mb-3 opacity-50" />
                      <p className="font-medium text-[hsl(var(--admin-text-primary))] text-lg">Chưa có thông tin</p>
                      <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-2 max-w-sm">Trainer chưa cập nhật lộ trình học và kỹ năng chi tiết cho khóa học này.</p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <Skeleton className="h-6 w-1/3 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Sponsorship Decision */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[hsl(var(--admin-text-primary))]">Xác nhận quyết định tài trợ</DialogTitle>
            <DialogDescription className="text-[hsl(var(--admin-text-secondary))] mt-2">
              Bạn có chắc chắn muốn {confirmDialog.status === 'approved' ? <span className="font-semibold text-emerald-600">DUYỆT</span> : <span className="font-semibold text-rose-600">TỪ CHỐI</span>} tài trợ cho học viên này không? 
              {confirmDialog.status === 'approved' 
                ? ' Số tiền tài trợ sẽ được trừ vào quỹ của bạn.' 
                : ' Học viên sẽ không nhận được khoản tài trợ này.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
              Hủy bỏ
            </Button>
            <Button 
              className={confirmDialog.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              onClick={() => {
                handleDecideLearner(confirmDialog.enrollmentId, confirmDialog.sponsorshipId, confirmDialog.status);
                setConfirmDialog({ isOpen: false, enrollmentId: null, sponsorshipId: null, status: null });
              }}
            >
              {confirmDialog.status === 'approved' ? 'Xác nhận Duyệt' : 'Xác nhận Từ chối'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

