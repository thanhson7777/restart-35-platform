import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Skeleton } from '@/components/ui';
import { getCertificateByEnrollment, verifyCertificate } from '@/apis/courseApi';
import {
  ArrowLeft,
  Award,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Globe,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/formatter';

export default function CertificatePage() {
  const { id, code } = useParams();
  const navigate = useNavigate();
  
  const isPublic = !!code;
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCertificate = async () => {
      setLoading(true);
      try {
        if (isPublic) {
          // Fetch public verification status
          const res = await verifyCertificate(code);
          const responseData = res.data?.data || res.data || res;
          
          if (responseData.valid) {
            setCertData(responseData.certificate);
          } else {
            setCertData({
              status: 'revoked',
              isExpired: responseData.certificate?.isExpired || false,
              ...responseData.certificate
            });
            toast.error(res.data?.message || 'Chứng chỉ này không hợp lệ hoặc đã bị thu hồi.');
          }
        } else {
          // Fetch by enrollment ID (requires authentication)
          const res = await getCertificateByEnrollment(id);
          const responseData = res.data?.data || res.data || res;
          
          // API returns an array
          if (Array.isArray(responseData) && responseData.length > 0) {
            setCertData(responseData[0]);
          } else if (responseData && !Array.isArray(responseData)) {
            setCertData(responseData);
          } else {
            toast.error('Không tìm thấy thông tin chứng chỉ cho đăng ký này.');
            navigate(`/my-enrollments/${id}`);
          }
        }
      } catch (err) {
        console.error('Error fetching certificate:', err);
        const msg = err?.response?.data?.message || 'Không thể tải thông tin chứng chỉ.';
        toast.error(msg);
        if (!isPublic) {
          navigate(`/my-enrollments/${id}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [id, code, isPublic, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const verificationCode = certData?.verificationCode || code;
    if (!verificationCode) return;

    const verifyUrl = `${window.location.origin}/verify/${verificationCode}`;
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast.success('Đã sao chép liên kết xác thực vào bộ nhớ tạm.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const verificationCode = certData?.verificationCode || code;
    const courseTitle = certData?.courseTitle || 'Khóa học tại Restart-35';
    const verifyUrl = `${window.location.origin}/verify/${verificationCode}`;
    const text = encodeURIComponent(
      `Tôi rất vui mừng được chia sẻ rằng tôi đã hoàn thành xuất sắc khóa học "${courseTitle}" trên nền tảng Restart-35! Bạn có thể xác thực chứng chỉ của tôi tại đây: ${verifyUrl}`
    );
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}&summary=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=600');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="space-y-6 w-full max-w-4xl text-center">
          <Skeleton className="h-8 w-48 mx-auto rounded-full bg-zinc-800" />
          <Skeleton className="h-[480px] w-full rounded-2xl bg-zinc-900 border border-zinc-800" />
          <div className="flex gap-4 justify-center">
            <Skeleton className="h-10 w-32 rounded-full bg-zinc-850" />
            <Skeleton className="h-10 w-32 rounded-full bg-zinc-850" />
          </div>
        </div>
      </div>
    );
  }

  if (!certData) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-zinc-155 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md mx-auto space-y-4">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-bold">Không tìm thấy chứng chỉ</h1>
          <p className="text-zinc-400 text-sm">
            Thông tin chứng chỉ bạn yêu cầu không tồn tại hoặc đường dẫn truy cập đã bị lỗi. Vui lòng kiểm tra lại mã số xác thực.
          </p>
          <Button 
            variant="default" 
            onClick={() => navigate(isPublic ? '/' : '/my-enrollments')}
            className="rounded-full bg-primary hover:bg-primary/95 text-white"
          >
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    );
  }

  const isValid = certData.status === 'active' && !certData.isExpired;
  const verificationCode = certData.verificationCode || code;
  const verifyUrl = `${window.location.origin}/verify/${verificationCode}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}&color=0f172a&bgcolor=faf9f6`;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-zinc-150 relative overflow-hidden flex flex-col justify-between print:bg-white print:text-black print:min-h-0 print:p-0">
      
      {/* ─── Web Gradients Background (Hidden on Print) ─── */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_50%)] pointer-events-none print:hidden" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.04),transparent_50%)] pointer-events-none print:hidden" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none print:hidden" />

      {/* ─── Navigation Header (Hidden on Print) ─── */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 print:hidden">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          {isPublic ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center font-extrabold text-white shadow-lg shadow-primary/20">
                R
              </div>
              <div>
                <span className="font-extrabold text-white text-sm tracking-wide">RESTART-35</span>
                <span className="text-[10px] text-zinc-400 font-semibold block uppercase tracking-wider">Cổng Xác Thực Chứng Chỉ</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate(`/my-enrollments/${id}`)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Tiến trình học tập
            </button>
          )}

          <div className="flex items-center gap-2">
            {isPublic ? (
              <Badge className="bg-zinc-850 text-zinc-350 border-zinc-700 px-3 py-1 text-xs">
                Chế độ khách
              </Badge>
            ) : (
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs">
                Chứng chỉ của tôi
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content Area ─── */}
      <main className="container mx-auto px-4 py-8 max-w-6xl flex-grow flex flex-col items-center justify-center gap-8 print:p-0 print:m-0 print:max-w-none">
        
        {/* Verification Alert Banner (Hidden on Print) */}
        <AnimatePresence mode="wait">
          {isValid ? (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[842px] p-1 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 px-4 py-3 print:hidden shadow-[0_0_15px_rgba(16,185,129,0.05)]"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Chứng chỉ này là <strong>Hợp lệ</strong> và đã được xác thực bởi Hệ thống học tập &amp; tái hòa nhập Restart-35.</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[842px] p-1 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2 px-4 py-3 print:hidden shadow-[0_0_15px_rgba(244,63,94,0.05)]"
            >
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              <span>Cảnh báo: Chứng chỉ này không còn hiệu lực hoặc đã bị thu hồi bởi quản trị viên.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── The Certificate Container (The printable frame) ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="w-full max-w-[842px] p-1.5 rounded-[24px] bg-zinc-900/30 border border-zinc-800/80 shadow-2xl shadow-blue-950/20 print:p-0 print:border-none print:shadow-none print:bg-white"
        >
          {/* Outer Border (Dark Charcoal on Web, Slate on Print) */}
          <div className="relative aspect-[1.414/1] w-full bg-[#FAF9F6] border-[12px] border-slate-900 p-8 flex flex-col justify-between text-slate-900 rounded-[18px] overflow-hidden shadow-inner print:rounded-none print:border-[10px] print:border-black print:p-6">
            
            {/* Watermark Logo (Center Background) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
              <Award className="w-[300px] h-[300px] text-slate-900" />
            </div>

            {/* Elegant Golden Thin Inner Border */}
            <div className="absolute inset-2 border border-[#D4AF37] pointer-events-none print:inset-1.5" />
            
            {/* Corner Decorative Ornaments */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#D4AF37]" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[#D4AF37]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#D4AF37]" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#D4AF37]" />

            {/* ─── Top Brand Info ─── */}
            <div className="text-center relative z-10 space-y-1">
              <h4 className="font-sans font-extrabold text-[12px] tracking-[0.25em] text-[#2563EB] uppercase leading-none">
                RESTART 35+
              </h4>
              <p className="font-sans text-[8.5px] uppercase tracking-widest text-slate-500 font-semibold leading-none">
                Nền tảng hỗ trợ đào tạo &amp; tái lập nghiệp
              </p>
            </div>

            {/* ─── Title Headers ─── */}
            <div className="text-center relative z-10 space-y-1.5 my-auto">
              <h2 className="font-sans font-extrabold text-[24px] sm:text-[28px] tracking-[0.06em] text-slate-900 uppercase leading-none">
                CHỨNG NHẬN HOÀN THÀNH
              </h2>
              <p className="font-serif italic text-[11px] sm:text-[12px] text-slate-500 tracking-wider leading-none">
                CERTIFICATE OF COMPLETION
              </p>
            </div>

            {/* ─── Certify Body Text ─── */}
            <div className="text-center relative z-10 space-y-3.5 my-auto">
              <p className="font-sans text-[11.5px] text-slate-600 font-medium">
                Xác nhận học viên / <span className="italic font-serif text-[10px] text-slate-400">This is to certify that</span>
              </p>
              
              {/* Learner Name (Display Serif font lock for formal authenticity) */}
              <div className="space-y-1">
                <h1 className="font-serif font-bold text-[28px] sm:text-[34px] tracking-wide text-[#1E3A8A] leading-none capitalize">
                  {certData.userName || 'HỌC VIÊN'}
                </h1>
                {/* Custom Double Border Line below name */}
                <div className="w-56 mx-auto h-[1.5px] bg-[#1E3A8A] relative">
                  <div className="absolute top-[2.5px] inset-x-4 h-[0.5px] bg-[#D4AF37]" />
                </div>
              </div>

              <p className="font-sans text-[11px] text-slate-600 font-medium">
                Đã hoàn thành chương trình đào tạo / <span className="italic font-serif text-[9.5px] text-slate-400">has successfully completed the training program</span>
              </p>

              {/* Course Title */}
              <h3 className="font-sans font-extrabold text-[16px] sm:text-[18px] text-slate-800 leading-snug tracking-wide">
                &ldquo;{certData.courseTitle || 'Tên khóa học'}&rdquo;
              </h3>
            </div>

            {/* ─── Bottom Meta & Verification Row ─── */}
            <div className="flex justify-between items-end relative z-10 pt-4 border-t border-slate-200/50 mt-auto">
              
              {/* Left Column: ID & Verification Links */}
              <div className="w-[35%] text-[8px] text-slate-500 font-medium space-y-1 leading-relaxed">
                <p className="font-mono text-slate-800 font-bold">
                  Mã chứng chỉ: {certData.certificateNumber}
                </p>
                <p>
                  Mã xác thực: <span className="font-mono text-slate-700 font-semibold">{verificationCode}</span>
                </p>
                <p>
                  Ngày cấp: {certData.issuedDate ? formatDate(certData.issuedDate) : 'Chưa rõ'}
                </p>
                {certData.skills?.length > 0 && (
                  <p className="line-clamp-2 mt-1 pr-2">
                    Kỹ năng: {certData.skills.join(', ')}
                  </p>
                )}
                <p className="text-[#2563EB] hover:underline font-semibold flex items-center gap-0.5 mt-0.5 print:hidden">
                  <Globe className="w-2.5 h-2.5" />
                  Tra cứu tại: {window.location.origin}/verify/{verificationCode}
                </p>
              </div>

              {/* Center Column: Red Stamp Graphic */}
              <div className="w-[30%] flex flex-col items-center justify-center select-none">
                <motion.div 
                  whileHover={{ rotate: 10 }}
                  className="relative w-16 h-16 rounded-full border-[3px] border-double border-red-600/80 flex items-center justify-center p-[2px]"
                >
                  {/* Inner red disk/ring */}
                  <div className="w-full h-full rounded-full border border-red-600/60 flex flex-col items-center justify-center text-center leading-none">
                    <span className="font-sans font-extrabold text-[5px] text-red-600 tracking-wider uppercase opacity-90">CHỨNG NHẬN</span>
                    <span className="font-sans font-extrabold text-[7px] text-red-700 tracking-widest mt-0.5">RESTART</span>
                    <span className="font-sans font-bold text-[5px] text-red-600/80 mt-0.5 font-mono">35+</span>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Signatures & QR Verification */}
              <div className="w-[35%] flex items-end justify-between gap-3">
                {/* QR Code Validation */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 p-1 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center">
                    <img 
                      src={qrCodeApiUrl} 
                      alt="Verification QR" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[6.5px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-0.5">
                    <QrCode className="w-2 h-2 text-slate-400" />
                    Quét xác thực
                  </span>
                </div>

                {/* Signature Block */}
                <div className="text-center font-sans pr-2">
                  {/* Mock Script Signature Representation */}
                  <div className="h-7 flex items-center justify-center">
                    <span className="font-serif italic text-sm text-slate-700 tracking-wide select-none opacity-85">
                      {certData.trainerName || 'Giảng viên'}
                    </span>
                  </div>
                  <div className="w-20 mx-auto h-[0.75px] bg-slate-300" />
                  <p className="font-sans font-extrabold text-[7.5px] text-slate-900 mt-1 uppercase leading-none">
                    {certData.trainerName || 'GIẢNG VIÊN'}
                  </p>
                  <p className="text-[6.5px] text-slate-400 mt-0.5 leading-none">
                    Giảng viên Chương trình
                  </p>
                </div>
              </div>

            </div>

          </div>
        </motion.div>

        {/* ─── Actions Control Panel (Hidden on Print) ─── */}
        <div className="w-full max-w-[842px] flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden border-t border-zinc-900/60 pt-6">
          <div className="flex gap-2.5">
            {certData.credentialUrl ? (
              <Button
                variant="default"
                size="md"
                onClick={() => window.open(certData.credentialUrl, '_blank')}
                className="rounded-xl text-xs font-bold px-4 py-2.5 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/10 gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Tải File PDF chính thức</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="md"
                onClick={handlePrint}
                className="rounded-xl text-xs font-bold px-4 py-2.5 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/10 gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Tải về (In ra File)</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="md"
              onClick={handlePrint}
              className="rounded-xl text-xs font-bold px-4 py-2.5 border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-900 hover:text-white gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>In chứng chỉ</span>
            </Button>
          </div>

          <div className="flex gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={handleShareLinkedIn}
              className="rounded-xl text-xs font-bold px-4 py-2.5 border-zinc-800 bg-zinc-900/40 text-[#0077B5] hover:bg-zinc-900/80 hover:text-[#0077B5] gap-1.5"
            >
              <Share2 className="w-4 h-4 text-zinc-400 group-hover:text-current" />
              <span>Chia sẻ LinkedIn</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleCopyLink}
              className="rounded-xl text-xs font-bold px-4 py-2.5 border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-900 hover:text-white gap-1.5 min-w-[150px] justify-center"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy link xác thực</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </main>

      {/* ─── Footer (Hidden on Print) ─── */}
      <footer className="py-6 border-t border-zinc-900 bg-zinc-950/20 text-center text-xs text-zinc-500 print:hidden mt-auto">
        <p className="container mx-auto px-4">
          Hệ thống cấp và xác thực chứng nhận điện tử an toàn dựa trên mật mã số định danh. Bản quyền thuộc về Restart-35 © {new Date().getFullYear()}.
        </p>
      </footer>

      {/* Injecting CSS print override dynamically */}
      <style>{`
        @media print {
          body, html, #root {
            background-color: white !important;
            color: black !important;
            height: auto !important;
            min-height: 0 !important;
          }
          /* Hide web UI containers */
          header, footer, .print\\:hidden, button, [role="banner"], [role="contentinfo"] {
            display: none !important;
          }
          /* Reset print padding */
          main, .container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            display: block !important;
          }
          /* Hide screen glows */
          .absolute {
            display: none !important;
          }
          /* Enforce display ornament bounds */
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          /* Print Landscape orientation */
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          /* Center the card on printable page */
          .w-full.max-w-\\[842px\\] {
            max-width: 100% !important;
            width: 100% !important;
            transform: none !important;
            animation: none !important;
          }
        }
      `}</style>
      
    </div>
  );
}
