import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, AlertCircle, QrCode, Loader2, X, RefreshCw } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { BezelCard } from '@/components/ui';
import { studentCheckin } from '@/apis/courseApi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CheckinPage = () => {
  const { id: enrollmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL Params
  const paramPin = searchParams.get('pin') || '';
  const paramScheduleId = searchParams.get('scheduleId') || '';
  const paramSessionNum = searchParams.get('session') || '';

  // Local states
  const [pin, setPin] = useState(paramPin);
  const [scheduleId, setScheduleId] = useState(paramScheduleId);
  const [sessionNumber, setSessionNumber] = useState(paramSessionNum);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Video Ref for Camera stream
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start Camera preview
  const startCamera = async () => {
    setCameraError(false);
    setCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(true);
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // Automatically start camera on mount if not prefilled with QR parameters
    if (!paramPin) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [paramPin]);

  // Handle manual submit / confirm
  const handleCheckinSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!pin || pin.trim().length !== 6) {
      toast.error('Vui lòng nhập mã PIN gồm 6 ký tự');
      return;
    }

    // If query params are missing, we prompt or fall back to sensible defaults.
    // However, in production, they must navigate from MyEnrollmentDetailPage which has scheduleId,
    // or scan a QR code which has all query parameters.
    const finalScheduleId = scheduleId || searchParams.get('scheduleId') || localStorage.getItem(`restart35_schedule_${enrollmentId}`);
    const finalSessionNum = parseInt(sessionNumber || searchParams.get('session') || localStorage.getItem(`restart35_sess_${enrollmentId}`), 10);

    if (!finalScheduleId || isNaN(finalSessionNum)) {
      toast.error('Thiếu thông tin Buổi học / Lịch học. Vui lòng quay lại chi tiết lớp học và thử lại.');
      return;
    }

    setLoading(true);
    try {
      await studentCheckin(finalScheduleId, finalSessionNum, { pin: pin.trim().toUpperCase() });
      setSuccess(true);
      stopCamera();
      toast.success('Điểm danh thành công!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Mã PIN điểm danh không hợp lệ hoặc buổi học không mở.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 py-10 px-4 relative flex flex-col justify-between">
      {/* Background glow lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent_40%)] pointer-events-none" />
      
      <div className="container mx-auto max-w-md w-full relative z-10 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/my-enrollments/${enrollmentId}`)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Về chi tiết lớp học
          </button>
          
          <Badge className="bg-blue-600/10 border border-blue-500/20 text-[#3B82F6] font-mono text-[9px] font-bold uppercase tracking-wider">
            QR Check-In
          </Badge>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight text-white">Điểm danh Lớp học</h2>
          <p className="text-xs text-slate-450 font-medium">Sử dụng camera quét mã QR hoặc nhập mã PIN hiển thị trên bảng.</p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            /* SUCCESS STATE SCREEN */
            <motion.div
              key="success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-1 rounded-[24px] bg-emerald-500/5 border border-emerald-500/15"
            >
              <BezelCard className="p-8 text-center bg-slate-950/40 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center text-emerald-450 mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">Điểm danh thành công!</h3>
                  <p className="text-xs text-slate-400">Trạng thái của bạn đã được cập nhật thành **Có mặt**.</p>
                </div>

                <div className="p-4 bg-emerald-950/10 border border-emerald-500/10 rounded-2xl text-[10.5px] text-emerald-400 leading-normal">
                  Dữ liệu chuyên cần trong hồ sơ học tập của bạn đã được ghi nhận tự động. Bạn có thể quay lại lớp học để tiếp tục.
                </div>

                <Button
                  onClick={() => navigate(`/my-enrollments/${enrollmentId}`)}
                  className="w-full bg-emerald-600 hover:bg-emerald-550 border-emerald-500 text-white rounded-full py-3 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2"
                >
                  Trở lại lớp của tôi
                </Button>
              </BezelCard>
            </motion.div>
          ) : (
            /* SCANNER & INPUT STATE SCREEN */
            <motion.div key="form" className="space-y-6">
              {/* 1. Camera QR Scanner Simulator */}
              {cameraActive && (
                <div className="relative aspect-square w-full rounded-[24px] overflow-hidden border border-slate-800 bg-black">
                  {/* Glowing Laser Scan Bar */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[scan_2.5s_ease-in-out_infinite] z-20" />
                  
                  {/* Scanner Crop Frame corners */}
                  <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br-lg" />
                    <QrCode className="w-10 h-10 text-white/10" />
                  </div>

                  {/* Video Stream Preview */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover grayscale brightness-90"
                  />

                  {/* Close camera button */}
                  <button
                    onClick={stopCamera}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 border border-white/10 text-slate-400 hover:text-white z-30 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Camera Activation / Re-trigger Button */}
              {!cameraActive && !paramPin && (
                <div
                  onClick={startCamera}
                  className="aspect-video w-full rounded-[24px] border border-dashed border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-slate-450 font-bold">Kích hoạt Camera để quét QR</span>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center gap-2.5 text-xs text-rose-450">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Không thể truy cập camera. Vui lòng nhập mã PIN thủ công bên dưới.</span>
                </div>
              )}

              {/* 2. PIN Input Panel */}
              <div className="p-1 rounded-[24px] bg-slate-950/30 border border-slate-850">
                <BezelCard className="p-6 bg-slate-950/10 space-y-4">
                  <form onSubmit={handleCheckinSubmit} className="space-y-4">
                    {paramPin ? (
                      /* Scanned QR Pre-filled state display */
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-center space-y-1">
                          <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">MÃ PIN ĐÃ NHẬN DIỆN</p>
                          <span className="text-3xl font-mono font-extrabold text-[#3B82F6] tracking-widest">{paramPin}</span>
                        </div>
                        <p className="text-[10px] text-slate-450 text-center leading-normal">
                          Mã PIN và thông tin lớp học đã được tải từ QR Code thành công. Nhấn nút bên dưới để xác thực.
                        </p>
                      </div>
                    ) : (
                      /* Manual PIN Entry input field */
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          Mã PIN điểm danh (6 ký tự)
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: A3FE89"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          className="w-full text-center tracking-widest font-mono text-2xl font-extrabold uppercase px-4 py-3 bg-slate-950 border border-slate-850 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50"
                          required
                        />
                      </div>
                    )}

                    {/* Inputs for Schedule and Session if not present in URL */}
                    {!paramScheduleId && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-500 font-mono uppercase">Lịch học ID</label>
                          <input
                            type="text"
                            placeholder="Nhập ID lịch học"
                            value={scheduleId}
                            onChange={(e) => setScheduleId(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-850 text-slate-300 rounded-lg focus:outline-none focus:border-blue-500/40 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-500 font-mono uppercase">Buổi học số</label>
                          <input
                            type="number"
                            placeholder="Số"
                            value={sessionNumber}
                            onChange={(e) => setSessionNumber(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-850 text-slate-300 rounded-lg focus:outline-none focus:border-blue-500/40"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-550 border-blue-500 text-white rounded-full py-3.5 text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] mt-2 flex items-center justify-center gap-1.5"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      Xác nhận Điểm danh
                    </Button>
                  </form>
                </BezelCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer warning info */}
      <div className="text-[10px] text-center text-slate-600 max-w-xs mx-auto leading-normal mt-6">
        Mỗi mã QR/PIN điểm danh có thời hạn sử dụng giới hạn theo ngày diễn ra buổi học và được hệ thống bảo mật đối soát IP / phiên đăng nhập tự động.
      </div>

      {/* Laser Scanning custom style */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 32px; }
          50% { top: calc(100% - 34px); }
        }
      `}</style>
    </div>
  );
};

export default CheckinPage;
