import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { RefreshCw, Calculator, HelpCircle, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/utils/formatter';

export const FundingSidebarISACard = ({ course, eligibility, onSubmit, isSubmitting }) => {
  const [income, setIncome] = useState(12000000); // Default: 12M VND

  // Repayment calculations (10% of income only if income >= 5,000,000)
  const isEligibleForRepayment = income >= 5000000;
  const monthlyRepayment = isEligibleForRepayment ? income * 0.1 : 0;

  // Check eligibility status
  const isEligible = eligibility?.eligible !== false;

  return (
    <div className="space-y-4">
      {/* Price section */}
      <div className="text-center pb-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 block mb-1">
          Hợp đồng chia sẻ thu nhập (ISA)
        </span>
        <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5">
          <RefreshCw className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
          Học trước - Trả sau
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
        Bạn không phải đóng bất kỳ khoản học phí nào trong suốt quá trình học. Chỉ hoàn trả <span className="font-bold text-zinc-700 dark:text-zinc-300">10% thu nhập mỗi tháng</span> sau khi có việc làm và thu nhập đạt từ 5.000.000 đ trở lên.
      </p>

      {/* Interactive Slider Calculator */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5" />
            Mô phỏng hoàn trả
          </span>
          <span className="font-mono font-bold text-zinc-750 dark:text-zinc-200">
            {formatPrice(income)}/tháng
          </span>
        </div>

        {/* Custom Styled Slider */}
        <input
          type="range"
          min="4000000"
          max="30000000"
          step="1000000"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
        />

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-850 text-xs">
          <span className="text-zinc-500">Khoản cần trả:</span>
          {isEligibleForRepayment ? (
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
              {formatPrice(monthlyRepayment)}/tháng
            </span>
          ) : (
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              0 đ (Dưới ngưỡng)
            </span>
          )}
        </div>
      </div>

      {/* Eligibility Warning Alert */}
      {!isEligible && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] leading-snug">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Bạn có thể không đủ điều kiện tham gia ISA (yêu cầu tốt nghiệp THPT, tuổi dưới 60). Hãy kiểm tra lại hồ sơ của mình.
          </span>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={() => onSubmit({ fundingModel: 'isa' })}
        disabled={isSubmitting || !isEligible}
        className="w-full py-5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-sm"
      >
        {isSubmitting ? 'Đang gửi hồ sơ...' : 'Đăng ký chương trình ISA'}
      </Button>

      {/* Conditions summary */}
      <div className="text-[10px] text-zinc-400 space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl">
        <p className="font-semibold text-zinc-500 dark:text-zinc-400">Điều kiện & Cam kết:</p>
        <p>• Ngưỡng thu nhập tối thiểu hoàn trả: 5.000.000 đ/tháng</p>
        <p>• Thời gian hoàn trả tối đa: 12 tháng</p>
        <p>• Miễn hoàn trả nếu thu nhập dưới ngưỡng tối thiểu</p>
      </div>
    </div>
  );
};
