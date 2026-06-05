import React from 'react';
import { Button } from '@/components/ui';
import { CheckCircle2, Clock, PlayCircle } from 'lucide-react';

export const FundingSidebarFreeCard = ({ course, onSubmit, isSubmitting }) => {
  const { delivery_type } = course || {};

  return (
    <div className="space-y-4">
      {/* Price section */}
      <div className="text-center pb-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 block mb-1">
          Ưu đãi đặc biệt
        </span>
        <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
          Miễn phí 100%
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
        Khóa học này được hỗ trợ kinh phí toàn phần dành riêng cho người lao động trên 35 tuổi nhằm hỗ trợ chuyển đổi kỹ năng nghề nghiệp.
      </p>

      {/* Benefits checklist */}
      <div className="space-y-2 py-2 border-y border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Học toàn bộ giáo trình gốc</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Cấp chứng nhận hoàn thành miễn phí</span>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => onSubmit({ fundingModel: 'free' })}
        disabled={isSubmitting}
        className="w-full py-5 rounded-full text-xs font-bold shadow-sm"
      >
        {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký học miễn phí ngay'}
      </Button>

      {/* Footer Info */}
      <div className="space-y-1.5 text-[10.5px] text-zinc-400 pt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Thời hạn: Không giới hạn thời gian học</span>
        </div>
        <div className="flex items-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Hình thức học: {delivery_type === 'video' ? 'Học qua Video bài giảng' : 'Lớp học trực tuyến/trực tiếp'}</span>
        </div>
      </div>
    </div>
  );
};
