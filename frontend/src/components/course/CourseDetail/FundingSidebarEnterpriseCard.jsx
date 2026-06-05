import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';

export const FundingSidebarEnterpriseCard = ({ course, onSubmit, isSubmitting }) => {
  const [voucher, setVoucher] = useState('');
  const [error, setError] = useState(null);
  const [verifiedCompany, setVerifiedCompany] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = () => {
    if (!voucher.trim()) {
      setError('Vui lòng nhập mã Voucher tài trợ.');
      return;
    }

    setVerifying(true);
    setError(null);

    // Mock validation logic
    setTimeout(() => {
      if (voucher.toUpperCase() === 'VOUCHER35' || voucher.toUpperCase() === 'CORPORATE') {
        setVerifiedCompany('Công ty Cổ phần Công nghệ & Giáo dục ABC');
        setError(null);
      } else {
        setError('Mã Voucher không chính xác hoặc đã hết hạn.');
        setVerifiedCompany(null);
      }
      setVerifying(false);
    }, 800);
  };

  const handleEnroll = () => {
    onSubmit({
      fundingModel: 'enterprise_funded',
      voucherCode: voucher,
      companyName: verifiedCompany,
    });
  };

  return (
    <div className="space-y-4">
      {/* Price section */}
      <div className="text-center pb-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">
          Doanh nghiệp liên kết tài trợ
        </span>
        <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
          <Briefcase className="w-5 h-5" />
          Tài trợ 100%
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
        Khóa học được chi trả toàn bộ học phí từ quỹ đào tạo liên kết nội bộ hoặc chương trình phát triển cộng đồng của doanh nghiệp tài trợ.
      </p>

      {/* Input Voucher Field */}
      {!verifiedCompany ? (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
              Nhập mã Voucher tài trợ
            </label>
            <Input
              type="text"
              placeholder="VD: VOUCHER35"
              value={voucher}
              onChange={(e) => {
                setVoucher(e.target.value);
                setError(null);
              }}
              className="rounded-xl border border-zinc-250 dark:border-zinc-800 text-xs px-3 py-4 focus:ring-amber-500/20 bg-white dark:bg-zinc-950 uppercase font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-500 text-[11px] font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={verifying}
            variant="outline"
            className="w-full py-4 text-xs font-bold rounded-full border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950"
          >
            {verifying ? 'Đang xác thực mã...' : 'Xác thực mã Voucher'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Verified Sponsorship Panel */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Voucher hợp lệ!</span>
            </div>
            <div className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
              <p>Doanh nghiệp chi trả:</p>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">{verifiedCompany}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setVerifiedCompany(null);
                setVoucher('');
              }}
              variant="outline"
              className="flex-1 py-4 text-xs font-semibold rounded-full border-zinc-200 dark:border-zinc-800"
            >
              Hủy
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={isSubmitting}
              className="flex-[2] py-4 text-xs font-bold rounded-full shadow-sm bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-0"
            >
              {isSubmitting ? 'Đang đăng ký...' : 'Ghi danh khóa học'}
            </Button>
          </div>
        </div>
      )}

      {/* Corporate disclaimer */}
      <div className="text-[10px] text-zinc-400 space-y-0.5 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl">
        <p className="font-semibold text-zinc-500 dark:text-zinc-400">Lưu ý nhập mã:</p>
        <p>• Nhập mã do phòng Hành chính Nhân sự doanh nghiệp của bạn cấp.</p>
        <p>• Mỗi mã chỉ kích hoạt ghi danh được cho một tài khoản duy nhất.</p>
      </div>
    </div>
  );
};
