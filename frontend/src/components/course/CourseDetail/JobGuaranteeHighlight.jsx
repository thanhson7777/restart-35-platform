import React from 'react';
import { Badge, Card } from '@/components/ui';
import { Briefcase, Building, CheckCircle2, ShieldCheck } from 'lucide-react';

export const JobGuaranteeHighlight = ({ sponsorships }) => {
  if (!sponsorships || sponsorships.length === 0) return null;

  const sponsor = sponsorships[0];

  // We focus on Enterprise sponsorships that have guaranteed placements or are linked to a job
  const isJobGuaranteed = sponsor.guaranteedPlacements > 0 || sponsor.linkedJobId || sponsor.sponsorType === 'enterprise';

  if (!isJobGuaranteed) return null;

  return (
    <Card className="mt-6 border border-blue-200 dark:border-blue-800/30 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-950/20 dark:to-zinc-950 shadow-md rounded-xl overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-blue-100/50 to-transparent dark:from-blue-900/10 pointer-events-none" />
      
      <div className="p-4 sm:p-5 flex flex-col gap-3 relative z-10">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 flex items-center gap-1.5 px-3 py-1 font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Cam kết Đầu ra</span>
          </Badge>
          <span className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <Building className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            Tài trợ bởi {sponsor.title || 'Doanh nghiệp đối tác'}
          </span>
        </div>
        
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium mt-1">
          Được thiết kế đặc biệt cho tệp ứng viên chuyển nghề. Hoàn thành 100% khóa học để nhận chứng chỉ và tự động ghi danh ứng tuyển vào vị trí chính thức.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-2 pt-3 border-t border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Tài trợ 100% học phí</span>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Đảm bảo phỏng vấn</span>
          </div>

          {sponsor.guaranteedPlacements && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800/30">
              <Briefcase className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs text-blue-900 dark:text-blue-300 font-bold">
                Chỉ tiêu: {sponsor.guaranteedPlacements} suất
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
