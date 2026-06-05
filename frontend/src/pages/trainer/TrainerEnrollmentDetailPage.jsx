import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  getEnrollmentById,
  getEnrollmentRiskDetail,
  triggerManualIntervention,
  suspendEnrollment,
  completeEnrollmentTrainer,
  failEnrollment
} from '@/apis/courseApi';
import { Button, Skeleton } from '@/components/ui';
import { TrainerEnrollmentDetail } from '@/components/trainer/TrainerEnrollmentDetail';

const TrainerEnrollmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data States
  const [enrollment, setEnrollment] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInterventionLoading, setIsInterventionLoading] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState(null); // 'suspend' | 'complete' | 'fail' | null
  const [modalReason, setModalReason] = useState('');
  const [modalScore, setModalScore] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch Enrollment Details & Risk Profile
  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [enrollmentRes, riskRes] = await Promise.all([
        getEnrollmentById(id),
        getEnrollmentRiskDetail(id).catch(err => {
          console.warn('Risk details not calculated yet or unavailable:', err);
          return { data: { data: null } };
        })
      ]);

      if (enrollmentRes.data?.success) {
        setEnrollment(enrollmentRes.data?.data || null);
      }
      setRisk(riskRes.data?.data || null);
    } catch (err) {
      console.error('Failed to load enrollment details:', err);
      toast.error('Không thể tải thông tin chi tiết học viên');
      navigate('/trainer/enrollments');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Trigger Manual Interventions
  const handleTriggerIntervention = async (type) => {
    setIsInterventionLoading(true);
    try {
      const res = await triggerManualIntervention(id, { type });
      if (res.data?.success) {
        toast.success('Kích hoạt biện pháp can thiệp thành công!');
        fetchDetails(); // Reload to get updated intervention logs
      } else {
        toast.error('Gửi can thiệp thất bại.');
      }
    } catch (err) {
      console.error('Failed to trigger intervention:', err);
      toast.error(err.response?.data?.message || 'Không thể thực hiện biện pháp can thiệp');
    } finally {
      setIsInterventionLoading(false);
    }
  };

  // Open Actions Confirmation Modals
  const openActionModal = (type) => {
    setModalType(type);
    setModalReason('');
    setModalScore('');
    setModalNotes('');
  };

  const closeActionModal = () => {
    setModalType(null);
  };

  // Submit Suspended, Completed, or Failed actions
  const handleActionConfirm = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      if (modalType === 'suspend') {
        if (!modalReason.trim()) {
          toast.error('Vui lòng nhập lý do tạm ngưng.');
          setSubmittingAction(false);
          return;
        }
        const res = await suspendEnrollment(id, { reason: modalReason.trim() });
        if (res.data?.success) {
          toast.success('Đã tạm ngưng đăng ký học viên thành công.');
          closeActionModal();
          fetchDetails();
        }
      } else if (modalType === 'complete') {
        const scoreVal = parseFloat(modalScore);
        if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
          toast.error('Vui lòng nhập điểm số hợp lệ (0 - 100).');
          setSubmittingAction(false);
          return;
        }
        const res = await completeEnrollmentTrainer(id, {
          score: scoreVal,
          notes: modalNotes.trim()
        });
        if (res.data?.success) {
          toast.success('Đánh giá hoàn thành khóa học thành công.');
          closeActionModal();
          fetchDetails();
        }
      } else if (modalType === 'fail') {
        if (!modalReason.trim()) {
          toast.error('Vui lòng nhập lý do đánh trượt.');
          setSubmittingAction(false);
          return;
        }
        const res = await failEnrollment(id, { reason: modalReason.trim() });
        if (res.data?.success) {
          toast.success('Đã đánh trượt học viên thành công.');
          closeActionModal();
          fetchDetails();
        }
      }
    } catch (err) {
      console.error('Action failed:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện hành động');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-1">
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[120px] w-full rounded-2xl" />
            <Skeleton className="h-[250px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const studentName = enrollment?.user?.displayName || 'Học viên';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/trainer/enrollments')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách học viên
        </button>
      </div>

      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Hồ sơ học viên: {studentName}
        </h1>
        <p className="text-gray-400 text-sm">
          Xem thông tin liên hệ, tiến trình, lịch sử can thiệp và đánh giá kết quả học tập.
        </p>
      </div>

      {/* Main Detail Component */}
      <TrainerEnrollmentDetail
        enrollment={enrollment}
        risk={risk}
        onTriggerIntervention={handleTriggerIntervention}
        onSuspend={() => openActionModal('suspend')}
        onComplete={() => openActionModal('complete')}
        onFail={() => openActionModal('fail')}
        isInterventionLoading={isInterventionLoading}
      />

      {/* Action Modals */}
      <AnimatePresence>
        {modalType && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={closeActionModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-1 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 rounded-[14px] bg-[#0c101d] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    {modalType === 'suspend' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {modalType === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {modalType === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                    {modalType === 'suspend' && 'Tạm ngưng học viên'}
                    {modalType === 'complete' && 'Đánh giá hoàn thành khóa học'}
                    {modalType === 'fail' && 'Đánh trượt học viên'}
                  </h4>
                  <button
                    onClick={closeActionModal}
                    className="p-1 rounded-full bg-slate-850 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleActionConfirm} className="space-y-4 text-sm">
                  {modalType === 'suspend' && (
                    <div className="space-y-3">
                      <p className="text-slate-300 leading-normal">
                        Bạn có chắc chắn muốn tạm ngưng việc học của học viên <span className="font-semibold text-white">{studentName}</span>?
                        Học viên sẽ không thể tiếp tục truy cập không gian học tập cho tới khi được kích hoạt lại.
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Lý do tạm ngưng <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          placeholder="Ví dụ: Nghỉ học dài ngày không phép, chưa hoàn thành thủ tục học phí..."
                          value={modalReason}
                          onChange={(e) => setModalReason(e.target.value)}
                          className="w-full text-xs p-3 border rounded-xl bg-slate-950 border-slate-850 text-slate-200 focus:outline-none focus:border-yellow-500 h-24 resize-none"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {modalType === 'complete' && (
                    <div className="space-y-4">
                      <p className="text-slate-300 leading-normal">
                        Nhập điểm số và nhận xét cuối khóa để đánh giá hoàn thành cho học viên <span className="font-semibold text-white">{studentName}</span>.
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Điểm số cuối khóa (0 - 100) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="Ví dụ: 85"
                            value={modalScore}
                            onChange={(e) => setModalScore(e.target.value)}
                            className="w-full text-xs p-3 border rounded-xl bg-slate-950 border-slate-850 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                            min="0"
                            max="100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Ghi chú / Nhận xét thêm
                          </label>
                          <textarea
                            placeholder="Nhập nhận xét về kết quả, thái độ học tập..."
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                            className="w-full text-xs p-3 border rounded-xl bg-slate-950 border-slate-850 text-slate-200 focus:outline-none focus:border-emerald-500 h-20 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {modalType === 'fail' && (
                    <div className="space-y-3">
                      <p className="text-slate-300 leading-normal">
                        Bạn có chắc chắn muốn đánh trượt học viên <span className="font-semibold text-white">{studentName}</span>? Thao tác này sẽ kết thúc đăng ký học với trạng thái Không đạt.
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Lý do đánh trượt <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          placeholder="Ví dụ: Điểm tổng kết không đạt yêu cầu tối thiểu..."
                          value={modalReason}
                          onChange={(e) => setModalReason(e.target.value)}
                          className="w-full text-xs p-3 border rounded-xl bg-slate-950 border-slate-850 text-slate-200 focus:outline-none focus:border-red-500 h-24 resize-none"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeActionModal}
                      className="flex-1 rounded-xl py-3 border-slate-800 text-slate-400 hover:text-white"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      type="submit"
                      disabled={submittingAction}
                      className={`flex-1 rounded-xl py-3 font-bold text-white flex items-center justify-center gap-1.5 ${
                        modalType === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700' :
                        modalType === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        'bg-red-650 hover:bg-red-700'
                      }`}
                    >
                      {submittingAction ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        modalType === 'suspend' ? 'Xác nhận ngưng' :
                        modalType === 'complete' ? 'Xác nhận hoàn thành' :
                        'Xác nhận trượt'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainerEnrollmentDetailPage;
