import { useState, useEffect } from 'react';
import { X, User, BookOpen, GraduationCap, FileText, Award, Star, DollarSign, Calendar, Clock, CheckCircle, CreditCard, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button, Badge, Avatar } from '@/components/ui';
import { Progress } from '@/components/ui/Progress';
import { formatPrice, formatDate } from '@/utils/formatter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getAllPayments, 
  updatePaymentStatus, 
  refundPayment, 
  getAllIsaRepayments, 
  activateIsaRepayment, 
  updateMonthlyRecord 
} from '@/apis/courseApi';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: User },
  { id: 'progress', label: 'Tiến độ', icon: BookOpen },
  { id: 'assessments', label: 'Điểm thi', icon: GraduationCap },
  { id: 'attendance', label: 'Điểm danh', icon: CheckCircle },
  { id: 'payments', label: 'Thanh toán & ISA', icon: CreditCard },
  { id: 'scholarship', label: 'Học bổng', icon: DollarSign },
  { id: 'reviews', label: 'Đánh giá', icon: Star }
];

const STATUS_CONFIG = {
  enrolled: { label: 'Đã đăng ký', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', borderColor: 'border-blue-500/20' },
  in_progress: { label: 'Đang tiến hành', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', borderColor: 'border-purple-500/20' },
  completed: { label: 'Hoàn thành', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  waitlist: { label: 'Chờ xếp lớp', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
  dropped: { label: 'Đã bỏ cuộc', bgColor: 'bg-rose-500/10', textColor: 'text-rose-400', borderColor: 'border-rose-500/20' },
  cancelled: { label: 'Đã hủy', bgColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20' }
};

const AdminEnrollmentDetailModal = ({ enrollment, open, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isaRecord, setIsaRecord] = useState(null);
  const [loadingIsa, setLoadingIsa] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fundingModel = enrollment?.course?.funding_model || enrollment?.course?.fundingModel || 'free';

  useEffect(() => {
    if (!open || !enrollment) return;

    if (activeTab === 'payments') {
      if (fundingModel === 'learner_paid') {
        fetchPayments();
      } else if (fundingModel === 'isa') {
        fetchIsaRecord();
      }
    }
  }, [open, enrollment, activeTab, fundingModel]);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await getAllPayments({ enrollmentId: enrollment._id });
      const data = res.data?.payments || res.data || res || [];
      setPayments(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải lịch sử thanh toán');
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchIsaRecord = async () => {
    setLoadingIsa(true);
    try {
      const res = await getAllIsaRepayments({ enrollmentId: enrollment._id });
      const records = res.data || res || [];
      const record = Array.isArray(records)
        ? records.find(r => r.enrollmentId === enrollment._id)
        : records;
      setIsaRecord(record || null);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thông tin hợp đồng ISA');
    } finally {
      setLoadingIsa(false);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    setSubmittingAction(true);
    try {
      await updatePaymentStatus(paymentId, { status: 'completed' });
      toast.success('Xác nhận thanh toán thành công!');
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi xác nhận thanh toán.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRefundPayment = async (paymentId) => {
    const reason = prompt('Nhập lý do hoàn tiền:');
    if (reason === null) return;
    setSubmittingAction(true);
    try {
      await refundPayment(paymentId, { reason: reason || 'Hoàn tiền bởi Admin' });
      toast.success('Hoàn tiền thành công!');
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi hoàn tiền.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleActivateIsa = async (isaId) => {
    setSubmittingAction(true);
    try {
      await activateIsaRepayment(isaId);
      toast.success('Kích hoạt hợp đồng ISA thành công!');
      fetchIsaRecord();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt ISA.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApproveMonthlyRecord = async (isaId, record) => {
    setSubmittingAction(true);
    try {
      await updateMonthlyRecord(isaId, record.month, {
        year: record.year,
        status: 'paid',
        paidDate: Date.now()
      });
      toast.success(`Duyệt & xác nhận thanh toán Tháng ${record.month}/${record.year} thành công!`);
      fetchIsaRecord();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleWaiveMonthlyRecord = async (isaId, record) => {
    const reason = prompt('Nhập lý do miễn đóng học phí tháng này:');
    if (reason === null) return;
    setSubmittingAction(true);
    try {
      await updateMonthlyRecord(isaId, record.month, {
        year: record.year,
        status: 'waived'
      });
      toast.success(`Miễn đóng Tháng ${record.month}/${record.year} thành công!`);
      fetchIsaRecord();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!open || !enrollment) return null;

  const status = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.enrolled;

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* User Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-slate-950/40 border border-slate-850 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none blur-lg" />
        <Avatar
          src={enrollment.user?.avatar}
          fallback={enrollment.user?.displayName?.charAt(0) || 'U'}
          className="w-14 h-14 border border-slate-800 shadow-md shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-white text-lg tracking-tight">{enrollment.user?.displayName || 'N/A'}</h3>
          <p className="text-sm text-slate-450 font-mono mt-0.5 truncate">{enrollment.user?.email || '-'}</p>
          <p className="text-xs text-slate-500 font-mono mt-1">{enrollment.user?.phone || 'Chưa cung cấp SĐT'}</p>
        </div>
        <Badge className={`${status.bgColor} ${status.textColor} ${status.borderColor} border font-semibold px-3 py-1 rounded-full text-xs shrink-0 self-start sm:self-center`}>
          {status.label}
        </Badge>
      </div>

      {/* Course Info */}
      <div>
        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-3 flex items-center gap-2 font-mono">
          <BookOpen className="w-4 h-4 text-blue-400" />
          Thông tin khóa học
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Khóa học</p>
            <p className="font-bold text-slate-200 text-sm">{enrollment.course?.title || enrollment.courseTitle || 'N/A'}</p>
          </div>
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Hình thức giảng dạy</p>
            <p className="font-bold text-slate-200 text-sm">{enrollment.course?.location?.type || 'Online / Blended'}</p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> Ngày đăng ký
          </p>
          <p className="font-bold text-white text-sm font-mono mt-1.5">{formatDate(enrollment.enrolledAt)}</p>
        </div>
        <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Ngày khai giảng
          </p>
          <p className="font-bold text-white text-sm font-mono mt-1.5">{formatDate(enrollment.startDate) || 'Chưa bắt đầu'}</p>
        </div>
        <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" /> Ngày hoàn thành
          </p>
          <p className="font-bold text-white text-sm font-mono mt-1.5">{formatDate(enrollment.completedAt) || '-'}</p>
        </div>
      </div>

      {/* Fee */}
      <div className="p-5 bg-emerald-950/15 border border-emerald-500/20 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none blur-lg" />
        <h4 className="font-bold text-emerald-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
          <DollarSign className="w-4 h-4" />
          Thông tin thanh toán học phí
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Tổng học phí</p>
            <p className="text-lg font-extrabold text-white font-mono">{formatPrice(enrollment.fee?.total || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Đã thanh toán</p>
            <p className="text-lg font-extrabold text-emerald-400 font-mono">{formatPrice(enrollment.fee?.paid || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Còn dư nợ</p>
            <p className="text-lg font-extrabold text-rose-450 font-mono">{formatPrice(enrollment.fee?.pending || 0)}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {enrollment.notes && (
        <div className="p-4 bg-amber-950/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-400 mb-1.5 font-bold uppercase tracking-wider font-mono">Ghi chú từ hệ thống/Trainer</p>
          <p className="text-sm text-slate-300 leading-relaxed">{enrollment.notes}</p>
        </div>
      )}
    </div>
  );

  const renderProgressTab = () => {
    const progress = enrollment.progress || {};
    const percentage = progress.percentage || 0;

    return (
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">Tiến độ bài học</span>
            <span className="text-2xl font-extrabold text-blue-400 font-mono">{percentage}%</span>
          </div>
          
          <div className="h-2.5 bg-slate-950 border border-slate-850 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-550"
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>Đang học buổi: {progress.currentLesson || 0}</span>
            <span>Tổng số buổi: {progress.totalLessons || 0}</span>
          </div>
        </div>

        {/* Completion Status */}
        {enrollment.status === 'completed' && (
          <div className="flex items-center gap-4 p-5 bg-emerald-950/15 border border-emerald-500/20 rounded-2xl">
            <Award className="w-10 h-10 text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-white text-base">Khóa học đã hoàn thành xuất sắc!</p>
              <p className="text-sm text-slate-400 font-mono mt-1">
                Thời gian ghi nhận: {formatDate(enrollment.completedAt)}
              </p>
            </div>
          </div>
        )}

        {/* Certificate */}
        {enrollment.status === 'completed' && (
          <div className="p-6 border border-dashed border-slate-800 bg-slate-950/20 rounded-2xl text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            <p className="font-bold text-white text-sm">Chứng nhận điện tử cấp cao</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Học viên đã hoàn thành tối thiểu 80% tiến trình học tập và vượt qua các bài thi kiểm tra.
            </p>
            <Button variant="outline" size="sm" className="mt-4 bg-slate-900 border-slate-800 text-slate-300 hover:text-white rounded-full">
              Tải xuống chứng chỉ PDF
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderAssessmentsTab = () => {
    const assessments = enrollment.assessments || [];

    if (assessments.length === 0) {
      return (
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-650 mb-3 opacity-60" />
          <p className="text-slate-400 text-sm font-semibold">Chưa có kết quả kiểm tra nào</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {assessments.map((assessment, index) => (
          <div key={index} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{assessment.name}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Ngày thi: {formatDate(assessment.date)}
              </p>
            </div>
            <div className="text-right shrink-0 flex items-center gap-4">
              <div className="text-right">
                <p className="text-xl font-extrabold text-white font-mono">{assessment.score ?? '-'}/100</p>
                {assessment.passed !== null && (
                  <Badge className={`mt-1 font-semibold text-[9px] px-2 py-0.5 rounded-full border ${
                    assessment.passed 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {assessment.passed ? 'Đạt yêu cầu' : 'Không đạt'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAttendanceTab = () => {
    const attendance = enrollment.attendance || {};
    const total = attendance.totalSessions || 0;
    const present = attendance.present || 0;
    const abs = attendance.absent || 0;
    const late = attendance.late || 0;
    
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-center">
            <p className="text-2xl font-extrabold text-emerald-400 font-mono">{present}</p>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1">Có mặt</p>
          </div>
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-center">
            <p className="text-2xl font-extrabold text-rose-400 font-mono">{abs}</p>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1">Vắng mặt</p>
          </div>
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-center">
            <p className="text-2xl font-extrabold text-amber-400 font-mono">{late}</p>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1">Trễ học</p>
          </div>
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-center">
            <p className="text-2xl font-extrabold text-slate-350 font-mono">{total}</p>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1">Tổng số buổi</p>
          </div>
        </div>

        {total > 0 && (
          <div className="p-5 bg-slate-950/20 border border-slate-850 rounded-xl">
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              <span>Tỉ lệ chuyên cần</span>
              <span className="text-emerald-450">{attendanceRate}%</span>
            </div>
            <div className="h-2 bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScholarshipTab = () => {
    const scholarship = enrollment.scholarship || {};

    if (!scholarship.scholarshipId) {
      return (
        <div className="text-center py-16">
          <DollarSign className="w-12 h-12 mx-auto text-slate-650 mb-3 opacity-60" />
          <p className="text-slate-400 text-sm font-semibold">Học viên này không đăng ký học bổng</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-5 bg-purple-950/15 border border-purple-500/20 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full pointer-events-none blur-lg" />
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-purple-300 text-sm uppercase tracking-wider font-mono">Chính sách học bổng</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Mức tài trợ</p>
              <p className="font-bold text-slate-200">
                {scholarship.coverage === 'full' ? 'Tài trợ 100%' :
                 scholarship.coverage === 'partial' ? 'Tài trợ 50%' : 'Chưa xếp hạng'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Tổng hạn mức</p>
              <p className="font-bold text-emerald-450 font-mono">{formatPrice(scholarship.fundedAmount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Học bổng đã giải ngân</p>
            <p className="text-lg font-extrabold text-emerald-450 font-mono">{formatPrice(scholarship.disbursedAmount || 0)}</p>
          </div>
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 font-bold text-rose-400">Thu hồi (Clawback)</p>
            <p className="text-lg font-extrabold text-rose-400 font-mono">{formatPrice(scholarship.clawbackAmount || 0)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewsTab = () => (
    <div className="text-center py-16">
      <Star className="w-12 h-12 mx-auto text-slate-650 mb-3 opacity-60" />
      <p className="text-slate-400 text-sm font-semibold">Học viên chưa gửi phản hồi đánh giá</p>
      <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">
        Khảo sát đánh giá khóa học sẽ tự động hiển thị sau khi học viên học xong 100% thời lượng.
      </p>
    </div>
  );

  const renderPaymentsTab = () => {
    if (fundingModel === 'free') {
      return (
        <div className="text-center py-16">
          <DollarSign className="w-12 h-12 mx-auto text-slate-650 mb-3 opacity-60" />
          <p className="text-slate-400 text-sm font-semibold">Khóa học miễn phí</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Học viên không cần thực hiện thanh toán cho khóa học này.
          </p>
        </div>
      );
    }

    if (fundingModel === 'learner_paid') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2 font-mono">
              <CreditCard className="w-4 h-4 text-blue-400" />
              Lịch sử giao dịch thanh toán
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPayments}
              disabled={loadingPayments}
              className="text-xs h-8 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-350"
            >
              Làm mới
            </Button>
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
              <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-60" />
              <p className="text-slate-400 text-sm font-semibold">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const isPending = payment.status === 'pending';
                const isCompleted = payment.status === 'completed';

                return (
                  <div
                    key={payment._id}
                    className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-white text-sm font-mono">
                          {formatPrice(payment.amount)}
                        </span>
                        <Badge
                          className={`font-semibold text-[10px] px-2 py-0.5 rounded-full border ${
                            payment.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : payment.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : payment.status === 'refunded'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                          }`}
                        >
                          {payment.status === 'completed' ? 'Thành công' :
                           payment.status === 'pending' ? 'Chờ xử lý' :
                           payment.status === 'refunded' ? 'Đã hoàn tiền' : payment.status}
                        </Badge>
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-medium">
                        Phương thức: <span className="font-semibold text-slate-300 uppercase">{payment.method}</span>
                        {payment.createdAt && ` • Ngày tạo: ${formatDate(payment.createdAt)}`}
                      </p>
                      {payment.transactionId && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Mã giao dịch: {payment.transactionId}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {isPending && (
                        <Button
                          size="sm"
                          disabled={submittingAction}
                          onClick={() => handleApprovePayment(payment._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] h-8 px-3 rounded-full font-bold shadow-sm"
                        >
                          Xác nhận thanh toán
                        </Button>
                      )}
                      {isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingAction}
                          onClick={() => handleRefundPayment(payment._id)}
                          className="border-slate-800 text-rose-450 hover:bg-rose-950/20 hover:text-rose-400 text-[10.5px] h-8 px-3 rounded-full font-bold"
                        >
                          Hoàn tiền
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (fundingModel === 'isa') {
      return (
        <div className="space-y-6">
          {/* Header & Refresh */}
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2 font-mono">
              <FileText className="w-4 h-4 text-purple-400" />
              Chi tiết Hợp đồng hoàn trả ISA
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchIsaRecord}
              disabled={loadingIsa}
              className="text-xs h-8 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-350"
            >
              Làm mới
            </Button>
          </div>

          {loadingIsa ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : !isaRecord ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-650 mb-3 opacity-60" />
              <p className="text-slate-400 text-sm font-semibold">Chưa thiết lập hợp đồng ISA cho học viên</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contract Specs Grid */}
              <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/5 to-transparent pointer-events-none blur-lg" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Trạng thái hợp đồng</span>
                  <div className="flex items-center gap-2.5">
                    <Badge
                      className={`font-semibold text-[10px] px-2.5 py-0.5 rounded-full border ${
                        isaRecord.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : isaRecord.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-500/10 text-slate-450 border-slate-500/20'
                      }`}
                    >
                      {isaRecord.status === 'active' ? 'Đang hoạt động' :
                       isaRecord.status === 'pending' ? 'Chờ kích hoạt' :
                       isaRecord.status === 'capped' ? 'Đã đạt trần' :
                       isaRecord.status === 'completed' ? 'Hoàn tất' :
                       isaRecord.status === 'waived' ? 'Miễn trừ' : isaRecord.status}
                    </Badge>
                    
                    {isaRecord.status === 'pending' && (
                      <Button
                        size="sm"
                        disabled={submittingAction}
                        onClick={() => handleActivateIsa(isaRecord._id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] h-7 px-3 rounded-full"
                      >
                        Kích hoạt ISA
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-455 uppercase tracking-wider font-mono">Tỷ lệ đóng góp</p>
                    <p className="font-extrabold text-white text-sm mt-0.5">{isaRecord.percentage}% thu nhập</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-455 uppercase tracking-wider font-mono">Ngưỡng tối thiểu</p>
                    <p className="font-extrabold text-white text-sm mt-0.5 font-mono">{formatPrice(isaRecord.incomeThreshold)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-455 uppercase tracking-wider font-mono">Trần tối đa (Cap)</p>
                    <p className="font-extrabold text-white text-sm mt-0.5 font-mono">{formatPrice(isaRecord.maxCap)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-455 uppercase tracking-wider font-mono">Đã hoàn trả</p>
                    <p className="font-extrabold text-emerald-400 text-sm mt-0.5 font-mono">{formatPrice(isaRecord.totalPaidAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Repayments History */}
              <div className="space-y-3">
                <p className="text-xs uppercase font-bold tracking-wider text-slate-400 font-mono">
                  Danh sách báo cáo thu nhập hàng tháng ({isaRecord.monthlyRecords?.length || 0})
                </p>

                {isaRecord.monthlyRecords?.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/5">
                    <p className="text-slate-500 text-xs font-medium">Chưa có kỳ báo cáo thu nhập nào được nộp</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {isaRecord.monthlyRecords.map((record, index) => {
                      const isPending = record.status === 'pending';
                      
                      return (
                        <div
                          key={index}
                          className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">Tháng {record.month}/{record.year}</span>
                              <Badge
                                className={`font-semibold text-[9px] px-2 py-0.2 rounded-full border ${
                                  record.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : record.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : record.status === 'waived'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-slate-500/10 text-slate-450 border-slate-500/20'
                                }`}
                              >
                                {record.status === 'paid' ? 'Đã đóng' :
                                 record.status === 'pending' ? 'Chờ duyệt' :
                                 record.status === 'waived' ? 'Miễn đóng' :
                                 record.status === 'skipped' ? 'Dưới ngưỡng' : record.status}
                              </Badge>
                            </div>
                            
                            <div className="text-[11px] text-slate-405 font-medium">
                              <span>Thu nhập khai báo: <strong className="text-slate-350 font-mono">{formatPrice(record.income)}</strong></span>
                              <span className="mx-2">•</span>
                              <span>Trích nộp dự kiến: <strong className="text-slate-200 font-mono">{formatPrice(record.paymentAmount)}</strong></span>
                            </div>

                            {record.incomeProof && (
                              <a
                                href={record.incomeProof}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline mt-1 font-semibold"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Xem minh chứng thu nhập
                              </a>
                            )}
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {isPending && record.paymentAmount > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={submittingAction}
                                  onClick={() => handleApproveMonthlyRecord(isaRecord._id, record)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 px-3 rounded-full font-bold"
                                >
                                  Duyệt & Xác nhận đóng
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={submittingAction}
                                  onClick={() => handleWaiveMonthlyRecord(isaRecord._id, record)}
                                  className="border-slate-800 text-slate-355 hover:bg-slate-850 hover:text-white text-[10px] h-7 px-3 rounded-full"
                                >
                                  Miễn trừ
                                </Button>
                              </>
                            )}

                            {isPending && record.paymentAmount === 0 && (
                              <Button
                                size="sm"
                                disabled={submittingAction}
                                onClick={() => handleApproveMonthlyRecord(isaRecord._id, record)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 px-3 rounded-full font-bold"
                              >
                                Duyệt báo cáo (Dưới ngưỡng)
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'progress': return renderProgressTab();
      case 'assessments': return renderAssessmentsTab();
      case 'attendance': return renderAttendanceTab();
      case 'scholarship': return renderScholarshipTab();
      case 'payments': return renderPaymentsTab();
      case 'reviews': return renderReviewsTab();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blurry glass */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-850">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Chi tiết hồ sơ học tập</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5 max-w-[500px] truncate">
              Khóa: {enrollment.course?.title || enrollment.courseTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-950 border border-slate-850 rounded-full text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-1.5 px-6 py-3 border-b border-slate-850 overflow-x-auto custom-scrollbar bg-slate-950/20">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    : 'bg-slate-900/60 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4.5 border-t border-slate-850 bg-slate-950/15">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-950 border-slate-850 text-slate-350 hover:text-white rounded-full px-5 py-2 hover:bg-slate-900"
          >
            Đóng cửa sổ
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminEnrollmentDetailModal;
