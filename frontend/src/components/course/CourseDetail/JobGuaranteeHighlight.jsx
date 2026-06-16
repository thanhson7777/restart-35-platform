import React from 'react';
import { Badge, Card } from '@/components/ui';
import { Briefcase, Building, CheckCircle2, ShieldCheck, Heart, Users } from 'lucide-react';

export const JobGuaranteeHighlight = ({ sponsorships }) => {
  if (!sponsorships || sponsorships.length === 0) return null;

  const sponsor = sponsorships[0]; // Chỉ hiển thị sponsor đầu tiên cho gọn

  const isNgo = sponsor.sponsorType === 'ngo';
  const targetLearners = sponsor.targetLearners || 0;
  const approvedLearners = sponsor.stats?.approvedLearners || 0;
  const remainingSlots = Math.max(0, targetLearners - approvedLearners);

  if (isNgo) {
    return (
      <Card className="mt-6 border border-emerald-200 dark:border-emerald-800/30 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-zinc-950 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-emerald-100/50 to-transparent dark:from-emerald-900/10 pointer-events-none" />
        
        <div className="p-4 sm:p-5 flex flex-col gap-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 flex items-center gap-1.5 px-3 py-1 font-bold shadow-sm">
              <Heart className="w-4 h-4 fill-white" />
              <span>Được tài trợ 100%</span>
            </Badge>
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Building className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              Bởi {sponsor.title || 'Quỹ từ thiện'}
            </span>
          </div>
          
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium mt-1">
            Chương trình tài trợ học phí toàn phần dành cho học viên khó khăn hoặc mong muốn chuyển nghề. 
            Bạn không cần đóng học phí nếu được quỹ xét duyệt.
          </p>

          <div className="mt-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Số suất tài trợ:</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Còn lại {remainingSlots}/{targetLearners} suất</span>
             </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, (approvedLearners / targetLearners) * 100)}%` }}
            ></div>
          </div>
        </div>
      </Card>
    );
  }

  // Enterprise logic
  const isJobGuaranteed = sponsor.guaranteedPlacements > 0 || sponsor.linkedJobId || sponsor.sponsorType === 'enterprise';
  if (!isJobGuaranteed) return null;

  return (
    <Card className="mt-6 border border-blue-200 dark:border-blue-800/30 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-950/20 dark:to-zinc-950 shadow-md rounded-xl overflow-hidden relative">
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
                Chỉ tiêu tuyển: {sponsor.guaranteedPlacements} suất
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
