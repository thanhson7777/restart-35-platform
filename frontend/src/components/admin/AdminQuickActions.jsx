import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { BookOpen, Briefcase, Users, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminQuickActions = ({ pendingActions = {} }) => {
  const navigate = useNavigate();
  const { pendingCourses = 0, pendingJobs = 0, pendingOrganizations = 0 } = pendingActions;

  const actions = [
    {
      title: 'Duyệt khóa học mới',
      desc: `${pendingCourses} khóa học đang chờ`,
      icon: BookOpen,
      href: '/admin/courses?status=pending',
      urgent: pendingCourses > 0,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Duyệt việc làm',
      desc: `${pendingJobs} tin tuyển dụng`,
      icon: Briefcase,
      href: '/admin/jobs/pending',
      urgent: pendingJobs > 0,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
    {
      title: 'Xác thực đối tác',
      desc: `${pendingOrganizations} tài khoản chờ`,
      icon: Users,
      href: '/admin/organizations?status=pending',
      urgent: pendingOrganizations > 0,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Cài đặt hệ thống',
      desc: 'Quản lý tham số',
      icon: Settings,
      href: '/admin/settings',
      urgent: false,
      color: 'text-[hsl(var(--admin-text-muted))]',
      bg: 'bg-[hsl(var(--admin-surface-elevated))]'
    }
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
                  <div className={`p-2.5 rounded-lg border border-transparent ${act.bg} ${act.color}`}>
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
