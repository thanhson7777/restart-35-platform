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
      color: 'text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/20 bg-[hsl(var(--admin-accent))]/5',
      href: '/admin/courses/approval',
    },
    {
      title: 'Quản lý tuyển sinh',
      desc: 'Xem danh sách nhập học và phân tích rủi ro',
      icon: GraduationCap,
      color: 'text-purple-500 border-purple-500/20 bg-purple-500/5',
      href: '/admin/enrollments',
    },
    {
      title: 'Điểm danh thực tế',
      desc: 'Quét mã QR điểm danh học viên offline',
      icon: QrCode,
      color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
      href: '/admin/enrollments',
    },
    {
      title: 'Xuất dữ liệu học viên',
      desc: 'Tải file CSV/XLSX báo cáo tổng thể',
      icon: FileSpreadsheet,
      color: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
      href: '/admin/enrollments',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard className="flex flex-col h-full">
        <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight mb-4">Thao tác nhanh</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {actions.map((act, index) => {
            const Icon = act.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(act.href)}
                className="group flex flex-col justify-between text-left p-4 rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]
                  hover:border-[hsl(var(--admin-accent))]/30
                  transition-all duration-300 active:scale-[0.98] relative overflow-hidden"
              >
                <div className="flex items-start justify-between w-full">
                  <div className={`p-2.5 rounded-lg border ${act.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="w-6 h-6 rounded-full
                    bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]
                    flex items-center justify-center
                    group-hover:bg-[hsl(var(--admin-accent))] group-hover:border-[hsl(var(--admin-accent))]
                    transition-colors duration-300">
                    <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--admin-text-muted))] group-hover:text-white transition-all duration-300" />
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-bold text-[hsl(var(--admin-text-secondary))] group-hover:text-[hsl(var(--admin-accent))] transition-colors duration-300">
                    {act.title}
                  </h4>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1 leading-normal">
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
