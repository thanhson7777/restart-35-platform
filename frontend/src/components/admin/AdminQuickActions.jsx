import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { CheckSquare, GraduationCap, QrCode, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminQuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Phê duyệt khóa học',
      desc: 'Xét duyệt các khóa học đang chờ đăng tải',
      icon: CheckSquare,
      color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      href: '/admin/courses/approval',
    },
    {
      title: 'Quản lý tuyển sinh',
      desc: 'Xem danh sách nhập học và phân tích rủi ro',
      icon: GraduationCap,
      color: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
      href: '/admin/enrollments',
    },
    {
      title: 'Điểm danh thực tế',
      desc: 'Quét mã QR điểm danh học viên offline',
      icon: QrCode,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      href: '/admin/enrollments', // Will select tab or open modal there
    },
    {
      title: 'Xuất dữ liệu học viên',
      desc: 'Tải file CSV/XLSX báo cáo tổng thể',
      icon: FileSpreadsheet,
      color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
      href: '/admin/enrollments', // Will invoke export action there
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard className="flex flex-col h-full">
        <h3 className="text-lg font-bold text-white tracking-tight mb-4">Thao tác nhanh</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {actions.map((act, index) => {
            const Icon = act.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(act.href)}
                className="group flex flex-col justify-between text-left p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 active:scale-[0.98] relative overflow-hidden"
              >
                <div className="flex items-start justify-between w-full">
                  <div className={`p-2.5 rounded-lg border ${act.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:bg-[#3B82F6] group-hover:border-[#3B82F6] transition-colors duration-300">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-[#3B82F6] transition-colors duration-300">
                    {act.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </BezelCard>
    </motion.div>
  );
};
