import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from '@/components/ui';
import { getEnrollmentById, getCourseSchedule, getCourseLessons, getMyIsaRepayments, submitIncome, createPayment, getScheduleById, cancelEnrollment } from '@/apis/courseApi';
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';
import { DropoutRiskBadge } from '@/components/enrollment/DropoutRiskBadge';
import { PaymentTracker } from '@/components/enrollment/PaymentTracker';
import { SyllabusAccordion } from '@/components/course/CourseDetail/SyllabusAccordion';
import { CourseInstructorInfo } from '@/components/course/CourseDetail/CourseInstructorInfo';
import { ArrowLeft, PlayCircle, Video, MapPin, Calendar, Clock, DollarSign, ExternalLink, Navigation, Award, FileText, QrCode, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatPrice } from '@/utils/formatter';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyEnrollmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [enrollment, setEnrollment] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // ISA States
  const [isaRecord, setIsaRecord] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportIncome, setReportIncome] = useState('');
  const [reportProof, setReportProof] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // Checkout modal states (shared for monthly record payment)
  const [checkoutRecord, setCheckoutRecord] = useState(null);
  const [checkoutPayment, setCheckoutPayment] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Cancel enrollment states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchEnrollmentDetail = useCallback(async () => {
    setLoading(true);
    try {
      const enrollRes = await getEnrollmentById(id);
      const enrollData = enrollRes.data || enrollRes;
      setEnrollment(enrollData);

      const courseId = enrollData.courseId || enrollData.course?._id;
      const fundingModel = enrollData.course?.funding_model || 'free';

      if (courseId) {
        const fetchDetails = [];
        if (['live', 'offline', 'blended'].includes(enrollData.course?.delivery_type)) {
          const targetScheduleId = enrollData.scheduleId || enrollData.schedule?._id;
          if (targetScheduleId) {
            fetchDetails.push(
              getScheduleById(targetScheduleId)
                .then((res) => {
                  const scheduleObj = res.data?.data || res.data || res;
                  const list = Array.isArray(scheduleObj?.sessions)
                    ? scheduleObj.sessions
                    : [];
                  setSchedule(list);
                  // Store schedule ID in localStorage for CheckinPage fallback
                  localStorage.setItem(`restart35_schedule_${id}`, targetScheduleId);
                })
                .catch((err) => {
                  console.warn('Schedule by ID fetch error, falling back to public:', err);
                  return getCourseSchedule(courseId)
                    .then((res) => {
                      const list = Array.isArray(res.data) 
                        ? res.data 
                        : Array.isArray(res?.data?.data)
                        ? res.data.data
                        : [];
                      setSchedule(list);
                    });
                })
            );
          } else {
            fetchDetails.push(
              getCourseSchedule(courseId)
                .then((res) => {
                  const list = Array.isArray(res.data) 
                    ? res.data 
                    : Array.isArray(res?.data?.data)
                    ? res.data.data
                    : [];
                  setSchedule(list);
                })
                .catch((err) => console.warn('Schedule fetch error:', err))
            );
          }
        }

        fetchDetails.push(
          getCourseLessons(courseId)
            .then((res) => {
              const list = Array.isArray(res.data) 
                ? res.data 
                : Array.isArray(res?.data?.data)
                ? res.data.data
                : [];
              setLessons(list);
            })
            .catch((err) => console.warn('Lessons fetch error:', err))
        );

        // Fetch ISA Repayment Agreement if funding_model = 'isa'
        if (fundingModel === 'isa') {
          fetchDetails.push(
            getMyIsaRepayments()
              .then((res) => {
                const list = res.data || res || [];
                const record = list.find(r => r.enrollmentId === id);
                setIsaRecord(record || null);
              })
              .catch((err) => console.warn('ISA Agreement fetch error:', err))
          );
        }

        await Promise.all(fetchDetails);
      }
    } catch (err) {
      console.error('Error fetching enrollment details:', err);
      toast.error('Không thể tải chi tiết lớp học này.');
      navigate('/my-enrollments');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchEnrollmentDetail();
  }, [fetchEnrollmentDetail]);

  const calculateRepaymentPreview = () => {
    if (!isaRecord) return 0;
    const incomeVal = parseInt(reportIncome, 10) || 0;
    if (incomeVal <= isaRecord.incomeThreshold) return 0;

    const excess = incomeVal - isaRecord.incomeThreshold;
    const calculated = Math.round((excess * isaRecord.percentage) / 100);
    const remaining = isaRecord.maxCap - isaRecord.totalPaidAmount;

    return Math.min(calculated, Math.max(0, remaining));
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportIncome || isNaN(reportIncome) || reportIncome < 0) {
      toast.error('Vui lòng nhập thu nhập hợp lệ.');
      return;
    }

    setSubmittingReport(true);
    try {
      const incomeVal = parseInt(reportIncome, 10);
      const res = await submitIncome(isaRecord._id, {
        month: parseInt(reportMonth, 10),
        year: parseInt(reportYear, 10),
        income: incomeVal,
        incomeProof: reportProof.trim() || ''
      });

      const paymentAmt = calculateRepaymentPreview();
      toast.success('Gửi báo cáo thu nhập thành công!');
      
      // Reset form
      setReportIncome('');
      setReportProof('');
      setIsReportModalOpen(false);

      // Nếu có nghĩa vụ đóng phí (> 0 VND), tự động kích hoạt Modal thanh toán VietQR
      if (paymentAmt > 0) {
        handlePayMonthlyRecord({
          month: parseInt(reportMonth, 10),
          year: parseInt(reportYear, 10),
          paymentAmount: paymentAmt
        });
      } else {
        fetchEnrollmentDetail();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.';
      toast.error(msg);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handlePayMonthlyRecord = async (record) => {
    setCheckoutRecord(record);
    setLoadingCheckout(true);
    setCheckoutPayment(null);
    try {
      // Gọi API backend tạo giao dịch thanh toán pending
      const res = await createPayment({
        enrollmentId: id,
        courseId: enrollment.courseId || enrollment.course?._id,
        method: 'bank_transfer',
        amount: record.paymentAmount
      });
      const paymentData = res.data || res;
      setCheckoutPayment(paymentData);
    } catch (err) {
      console.error(err);
      toast.error('Không thể khởi tạo mã giao dịch thanh toán.');
      setCheckoutRecord(null);
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleCancelEnrollment = async () => {
    setCancelling(true);
    try {
      await cancelEnrollment(id, { reason: cancelReason || 'Hủy từ trang chi tiết' });
      toast.success('Đã hủy ghi danh thành công');
      setShowCancelModal(false);
      navigate('/my-enrollments');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Hủy ghi danh thất bại');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!enrollment) return null;

  const { course, status, progress, installments = [], dropoutRisk = 'low', enrolledAt } = enrollment;
  const courseId = course?._id || enrollment.courseId;
  const deliveryType = course?.delivery_type || 'video';
  const fundingModel = course?.funding_model || 'free';

  const upcomingSessions = schedule.filter(s => s.status !== 'completed');
  const nextSession = upcomingSessions[0];

  const repaymentAmtPreview = calculateRepaymentPreview();

  const renderAttendanceStatus = (session) => {
    // 1. Find if user has an attendance record for this session
    const userIdStr = enrollment.userId?._id || enrollment.userId;
    const attRecord = session.attendance?.find(
      (a) => (a.userId?._id || a.userId)?.toString() === userIdStr?.toString()
    );

    // 2. Determine if session date is today
    const sessionDate = new Date(session.date);
    const today = new Date();
    const isToday =
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear();

    // 3. Render status badge if record exists
    if (attRecord) {
      const statusMap = {
        present: { label: 'Có mặt', class: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
        late: { label: 'Đi muộn', class: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' },
        excused: { label: 'Nghỉ phép', class: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' },
        absent: { label: 'Vắng mặt', class: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' },
      };
      const info = statusMap[attRecord.status] || { label: 'Đã điểm danh', class: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 border border-zinc-200' };
      return (
        <Badge className={`${info.class} px-2 py-0.5 rounded-full text-[10.5px] font-bold`}>
          {info.label}
        </Badge>
      );
    }

    // 4. If session status is completed and no record exists, they were absent
    if (session.status === 'completed') {
      return (
        <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
          Vắng mặt
        </Badge>
      );
    }

    // 5. If it's today and not completed, render glowing "Tự điểm danh" button
    if (isToday) {
      return (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-550 border-blue-500 text-white rounded-full px-3 py-1 text-[11px] font-bold shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all flex items-center gap-1 cursor-pointer h-7"
          onClick={() => {
            const targetScheduleId = enrollment.scheduleId || enrollment.schedule?._id || localStorage.getItem(`restart35_schedule_${id}`);
            if (targetScheduleId) {
              localStorage.setItem(`restart35_schedule_${id}`, targetScheduleId);
            }
            localStorage.setItem(`restart35_sess_${id}`, session.sessionNumber);
            navigate(`/my-enrollments/${id}/checkin`);
          }}
        >
          <QrCode className="w-3 h-3" />
          Tự điểm danh
        </Button>
      );
    }

    return (
      <Badge className="bg-zinc-150/40 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800 px-2 py-0.5 rounded-full text-[10.5px] font-medium">
        Chưa diễn ra
      </Badge>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Light Gradient Header */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] shadow-sm py-6">
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <button
              onClick={() => navigate('/my-enrollments')}
              className="flex items-center gap-1.5 text-xs text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] transition-colors mb-4 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Khóa của tôi
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <DeliveryTypeBadge deliveryType={deliveryType} size="sm" />
                  <FundingModelChip fundingModel={fundingModel} size="sm" />
                  {status === 'in_progress' && <DropoutRiskBadge risk={dropoutRisk} />}
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] mb-2 leading-tight">
                  {course?.title || 'Chi tiết khóa học'}
                </h1>
                
                <p className="text-xs text-[hsl(var(--admin-text-muted))] font-medium">
                  Ghi danh ngày: {enrolledAt ? formatDate(enrolledAt) : 'Chưa rõ'}
                </p>
              </div>

              {/* Launch Learning Workspace Button (only for video classes) */}
              {deliveryType === 'video' && status === 'in_progress' && (
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-xl text-xs font-bold px-6 py-4 shadow-lg shrink-0 flex items-center gap-2"
                  onClick={() => navigate(`/my-enrollments/${id}/learn`)}
                >
                  <PlayCircle className="w-5 h-5 fill-current" />
                  Vào không gian học tập
                </Button>
              )}

              {/* View Certificate Button (for completed course) */}
              {status === 'completed' && (
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-xl text-xs font-bold px-6 py-4 shadow-lg shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/10 text-white border-none"
                  onClick={() => navigate(`/my-enrollments/${id}/certificate`)}
                >
                  <Award className="w-5 h-5 fill-current" />
                  Xem chứng nhận của tôi
                </Button>
              )}

              {/* Cancel Enrollment Button (only for active enrollments) */}
              {status === 'in_progress' && (
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl text-xs font-bold px-6 py-4 shrink-0 flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => setShowCancelModal(true)}
                >
                  Hủy ghi danh
                </Button>
              )}
            </div>
          </div>
        </div>

      {/* Main Grid */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Tabs curriculum & schedules */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="curriculum">
              <TabsList className="mb-6 flex flex-wrap gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                <TabsTrigger value="curriculum" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Giáo trình lộ trình
                </TabsTrigger>
                {['live', 'offline', 'blended'].includes(deliveryType) && (
                  <TabsTrigger value="schedules" className="rounded-lg text-xs font-semibold px-4 py-2">
                    Lịch học trực tiếp ({schedule.length} buổi)
                  </TabsTrigger>
                )}
                <TabsTrigger value="instructor" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Đơn vị giảng dạy
                </TabsTrigger>
              </TabsList>

              {/* Tab: Curriculum Accordion */}
              <TabsContent value="curriculum" className="focus:outline-none">
                {course?.syllabus?.length > 0 ? (
                  <SyllabusAccordion
                    syllabus={course.syllabus}
                    delivery_type={deliveryType}
                    courseId={courseId}
                    isEnrolled={true}
                    lessons={lessons}
                  />
                ) : (
                  <div className="text-center py-12 text-zinc-500 text-sm">
                    Khóa học hiện tại chưa cập nhật giáo trình cụ thể.
                  </div>
                )}
              </TabsContent>

              {/* Tab: Schedules List */}
              {['live', 'offline', 'blended'].includes(deliveryType) && (
                <TabsContent value="schedules" className="focus:outline-none space-y-4">
                  <div className="space-y-3">
                    {schedule.map((session, idx) => {
                      const isCompleted = session.status === 'completed';
                      return (
                        <div 
                          key={session._id || idx}
                          className="flex items-center justify-between p-4 rounded-xl border border-zinc-250/60 dark:border-zinc-850 bg-white dark:bg-zinc-950/20 shadow-sm gap-4"
                        >
                          <div className="flex gap-3">
                            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                              isCompleted 
                                ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900' 
                                : 'bg-primary/5 text-primary border border-primary/10'
                            }`}>
                              <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                                {new Date(session.date).toLocaleDateString('vi-VN', { month: 'short' })}
                              </span>
                              <span className="text-lg font-extrabold font-mono mt-0.5 leading-none">
                                {new Date(session.date).getDate()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                                <span>Buổi {session.sessionNumber}</span>
                                <span>•</span>
                                <span className="font-mono">{session.startTime} - {session.endTime || '21:00'}</span>
                              </div>
                              <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                                {session.title}
                              </h5>
                              {session.instructorName && (
                                <p className="text-xs text-zinc-450 mt-1">Giảng viên: {session.instructorName}</p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {renderAttendanceStatus(session)}
                            {!isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-3 py-1.5 h-8 gap-1.5 rounded-xl border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950"
                                onClick={() => window.open(session.location || 'https://meet.google.com', '_blank')}
                              >
                                {deliveryType === 'offline' ? <MapPin className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                                <span>{deliveryType === 'offline' ? 'Xem vị trí' : 'Vào lớp Live'}</span>
                                <ExternalLink className="w-3 h-3 text-zinc-400" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              )}

              {/* Tab: Instructor Info */}
              <TabsContent value="instructor" className="focus:outline-none">
                <CourseInstructorInfo provider={course?.provider} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Invoices & schedules */}
          <div className="lg:col-span-1 space-y-6">
            {/* Payment Timelines Card */}
            {fundingModel === 'learner_paid' && installments?.length > 0 && (
              <div className="p-1 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/85">
                <Card className="p-5 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150/60 dark:border-zinc-900 shadow-sm">
                  <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-4.5 h-4.5 text-zinc-500" />
                    Lịch sử đóng học phí
                  </h4>
                  <PaymentTracker
                    installments={installments}
                    enrollmentId={id}
                    courseId={courseId}
                    onPaymentSuccess={fetchEnrollmentDetail}
                  />
                </Card>
              </div>
            )}

            {/* ISA Repayment Tracker Card */}
            {fundingModel === 'isa' && isaRecord && (
              <div className="p-1 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/85">
                <Card className="p-5 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150/60 dark:border-zinc-900 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
                      <DollarSign className="w-4.5 h-4.5 text-zinc-500" />
                      Hợp đồng hoàn trả ISA
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      isaRecord.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' :
                      isaRecord.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                    }`}>
                      {isaRecord.status === 'active' ? 'Đang hoạt động' :
                       isaRecord.status === 'pending' ? 'Chờ kích hoạt' :
                       isaRecord.status === 'capped' ? 'Đã đạt trần' :
                       isaRecord.status === 'completed' ? 'Hoàn thành' :
                       isaRecord.status === 'waived' ? 'Miễn đóng' : isaRecord.status}
                    </span>
                  </div>

                  {/* Contract Specs Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-150 dark:border-zinc-900">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Tỷ lệ trích nộp</p>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{isaRecord.percentage}% thu nhập</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Ngưỡng tối thiểu</p>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{formatPrice(isaRecord.incomeThreshold)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Trần tối đa (Cap)</p>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{formatPrice(isaRecord.maxCap)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Đã đóng góp</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-450 mt-0.5">{formatPrice(isaRecord.totalPaidAmount)}</p>
                    </div>
                  </div>

                  {/* Monthly Records Timeline */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">Lịch sử báo cáo thu nhập</p>
                    {isaRecord.monthlyRecords?.length === 0 ? (
                      <p className="text-xs text-zinc-400 text-center py-4 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/10">
                        Chưa có bản ghi thu nhập nào.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {isaRecord.monthlyRecords.map((record, index) => {
                          const isRepayable = record.status === 'pending' && record.paymentAmount > 0;
                          return (
                            <div key={index} className="p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/20 dark:bg-zinc-950/10 text-xs flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-zinc-750 dark:text-zinc-300">Tháng {record.month}/{record.year}</span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-bold border ${
                                    record.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500' :
                                    record.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' :
                                    record.status === 'skipped' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' :
                                    'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                  }`}>
                                    {record.status === 'paid' ? 'Đã đóng' :
                                     record.status === 'pending' ? 'Chờ duyệt' :
                                     record.status === 'skipped' ? 'Dưới ngưỡng' :
                                     record.status === 'waived' ? 'Miễn đóng' : record.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-450 dark:text-zinc-500">
                                  Thu nhập: {formatPrice(record.income)} • Cần nộp: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatPrice(record.paymentAmount)}</span>
                                </p>
                              </div>
                              {isRepayable && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[9px] h-6 px-2 rounded-lg border-zinc-200 hover:bg-zinc-105 dark:border-zinc-850 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950 shrink-0 gap-0.5"
                                  onClick={() => handlePayMonthlyRecord(record)}
                                >
                                  <QrCode className="w-2.5 h-2.5" /> Thanh toán
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Report Button */}
                  {isaRecord.status === 'active' && (
                    <Button
                      variant="default"
                      className="w-full py-3.5 text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                      onClick={() => setIsReportModalOpen(true)}
                    >
                      <FileText className="w-4 h-4" /> Báo cáo thu nhập tháng mới
                    </Button>
                  )}
                </Card>
              </div>
            )}

            {/* Offline Venue Map Card */}
            {deliveryType === 'offline' && course?.location && (
              <div className="p-1 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/85">
                <Card className="p-5 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150/60 dark:border-zinc-900 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
                    <MapPin className="w-4.5 h-4.5 text-zinc-500" />
                    Địa điểm cơ sở lớp học
                  </h4>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl space-y-2.5">
                    <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                      {course.location.address || 'Tòa nhà A, 123 Nguyễn Huệ, Quận 1, TP.HCM'}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full text-xs gap-1.5 py-3 rounded-xl border-zinc-250 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900 font-bold"
                      onClick={() => window.open('https://maps.google.com', '_blank')}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Xem chỉ đường bản đồ
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Next session widget */}
            {nextSession && (
              <div className="p-1 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/85">
                <Card className="p-5 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150/60 dark:border-zinc-900 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
                    <Calendar className="w-4.5 h-4.5 text-zinc-500" />
                    Sự kiện học tập sắp tới
                  </h4>
                  <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-2">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-rose-500 block">
                      Buổi {nextSession.sessionNumber}: {deliveryType === 'offline' ? 'Lớp thực hành' : 'Lớp học trực tuyến'}
                    </span>
                    <p className="text-xs font-bold text-zinc-850 dark:text-zinc-250 leading-snug line-clamp-2">
                      {nextSession.title}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500 font-semibold pt-1 border-t border-rose-500/5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(nextSession.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {nextSession.startTime} - {nextSession.endTime || '21:00'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Income Report Modal ─── */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setIsReportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-md rounded-[24px] bg-zinc-900 border border-zinc-800 p-1 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Khai báo thu nhập tháng mới
                  </h4>
                  <button 
                    onClick={() => setIsReportModalOpen(false)}
                    className="p-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleReportSubmit} className="space-y-4">
                  {/* Select month/year */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500 mb-1">Tháng</label>
                      <select 
                        value={reportMonth} 
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="w-full text-xs p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i} value={i + 1}>Tháng {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500 mb-1">Năm</label>
                      <select 
                        value={reportYear} 
                        onChange={(e) => setReportYear(e.target.value)}
                        className="w-full text-xs p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      >
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                        <option value={2028}>2028</option>
                      </select>
                    </div>
                  </div>

                  {/* Income Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500 mb-1">Tổng thu nhập hàng tháng (VND)</label>
                    <input 
                      type="number"
                      placeholder="Ví dụ: 12000000"
                      value={reportIncome}
                      onChange={(e) => setReportIncome(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-bold"
                      required
                    />
                  </div>

                  {/* Proof URL Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500 mb-1">URL file minh chứng thu nhập</label>
                    <input 
                      type="text"
                      placeholder="Link sao kê lương / tài liệu chứng minh"
                      value={reportProof}
                      onChange={(e) => setReportProof(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                  </div>

                  {/* Calculation Preview */}
                  {reportIncome !== '' && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-xs space-y-1 border border-zinc-150 dark:border-zinc-800">
                      <p className="text-zinc-500">Mức vượt ngưỡng miễn đóng: <span className="font-semibold text-zinc-800 dark:text-zinc-250 font-mono">{formatPrice(Math.max(0, parseInt(reportIncome, 10) - isaRecord.incomeThreshold))}</span></p>
                      <p className="text-zinc-500">Tỷ lệ đóng góp: <span className="font-semibold text-zinc-800 dark:text-zinc-250">{isaRecord.percentage}%</span></p>
                      <p className="font-bold text-zinc-800 dark:text-white flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-800 mt-1">
                        <span>Số tiền cần hoàn trả:</span>
                        <span className="text-primary font-mono">{formatPrice(repaymentAmtPreview)}</span>
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsReportModalOpen(false)}
                      className="flex-1 rounded-xl py-3 border-zinc-250 dark:border-zinc-800"
                    >
                      Hủy bỏ
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submittingReport}
                      className="flex-1 rounded-xl py-3 font-bold"
                    >
                      {submittingReport ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Gửi báo cáo'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ISA Repayment Checkout Modal ─── */}
      <AnimatePresence>
        {checkoutRecord && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => {
              setCheckoutRecord(null);
              fetchEnrollmentDetail();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-sm rounded-[24px] bg-zinc-900 border border-zinc-800 p-1 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 rounded-[18px] bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-primary" />
                    Thanh toán hoàn trả ISA
                  </h4>
                  <button 
                    onClick={() => {
                      setCheckoutRecord(null);
                      fetchEnrollmentDetail();
                    }}
                    className="p-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingCheckout ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-xs text-zinc-500">Đang khởi tạo mã giao dịch...</p>
                  </div>
                ) : (
                  checkoutPayment && (
                    <div className="space-y-4">
                      {/* VietQR visual image */}
                      <div className="p-1 rounded-[16px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
                        <div className="bg-white p-4 rounded-[12px] text-center space-y-3">
                          <div className="w-40 h-40 mx-auto p-1.5 border border-zinc-200 rounded-xl bg-white flex items-center justify-center">
                            <img
                              src={checkoutPayment.qrUrl || `https://img.vietqr.io/image/VCB-1234567890-compact.png?amount=${checkoutPayment.amount}&addInfo=RESTART35-${id.toUpperCase()}&accountName=RESTART35%20PROJECT`}
                              alt="VietQR code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          <div className="space-y-1 text-xs text-zinc-650 font-medium">
                            <p>Ngân hàng: <span className="font-bold text-zinc-900 font-mono">Vietcombank</span></p>
                            <p>Số tài khoản: <span className="font-bold text-zinc-900 font-mono">1234 5678 90</span></p>
                            <p>Số tiền: <span className="font-bold text-primary font-mono">{formatPrice(checkoutPayment.amount)}</span></p>
                            <div className="text-[10px] text-zinc-550 mt-2 bg-zinc-100 p-2 rounded-lg leading-relaxed">
                              <p className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider mb-0.5 font-sans">Nội dung chuyển khoản chính xác:</p>
                              <span className="font-mono bg-zinc-200/60 text-zinc-800 px-2 py-0.5 rounded font-bold text-xs select-all">
                                RESTART35-{id.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 leading-normal">
                        Chuyển đúng số tiền và nội dung chuyển khoản ở trên để hệ thống tự động duyệt trả ISA cho tháng {checkoutRecord.month}/{checkoutRecord.year}.
                      </p>

                      <Button
                        className="w-full py-4 text-xs font-bold rounded-full shadow-sm"
                        onClick={() => {
                          setCheckoutRecord(null);
                          fetchEnrollmentDetail();
                        }}
                      >
                        Tôi đã chuyển khoản xong
                      </Button>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Enrollment Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2">Xác nhận hủy ghi danh</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bạn có chắc muốn hủy đăng ký khóa học này? Hành động này không thể hoàn tác.
            </p>
            <textarea
              className="w-full p-3 rounded-lg border border-border text-sm mb-4 dark:bg-zinc-800 dark:border-zinc-700 resize-none"
              placeholder="Lý do hủy (tùy chọn)"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                disabled={cancelling}
              >
                Đóng
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelEnrollment}
                disabled={cancelling}
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </Button>
            </div>
          </div>
        </div>
      )}

      </div>
      <Footer />
    </>
  );
}
