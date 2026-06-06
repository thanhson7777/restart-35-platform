import React from 'react';
import { Briefcase, GraduationCap, TrendingUp, Users } from 'lucide-react';

const TrainerPartnershipStats = ({ summary = {} }) => {
  const stats = [
    { label: 'Tổng học viên', value: summary.totalLearners ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Đang học', value: summary.pendingLearners ?? 0, icon: Briefcase, color: 'text-amber-400' },
    { label: 'Đã tốt nghiệp', value: summary.totalGraduates ?? 0, icon: GraduationCap, color: 'text-green-400' },
    { label: 'Đã hoàn thành', value: summary.completedLearners ?? 0, icon: TrendingUp, color: 'text-purple-400' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-slate-800">
              <Icon size={16} className={color} />
            </div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
};

export default TrainerPartnershipStats;
