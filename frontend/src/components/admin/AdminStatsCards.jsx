import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { GraduationCap, DollarSign, AlertTriangle, BookOpen, TrendingUp, TrendingDown } from 'lucide-react';

export const AdminStatsCards = ({ stats = {} }) => {
  const {
    totalEnrollments = 0,
    revenueThisMonth = 0,
    dropoutRate = 0,
    pendingCourses = 0,
  } = stats;

  const cardItems = [
    {
      title: 'Tổng đăng ký học',
      value: totalEnrollments.toLocaleString(),
      change: '+14% so với tháng trước',
      trend: 'up',
      icon: GraduationCap,
      iconColor: 'text-[hsl(var(--admin-accent))]',
      bgGlow: 'from-[hsl(var(--admin-accent))] to-transparent',
    },
    {
      title: 'Doanh thu tháng này',
      value: `${(revenueThisMonth / 1000000).toFixed(1)}M VND`,
      change: '+8.2% so với tháng trước',
      trend: 'up',
      icon: DollarSign,
      iconColor: 'text-[hsl(var(--admin-success))]',
      bgGlow: 'from-[hsl(var(--admin-success))] to-transparent',
    },
    {
      title: 'Tỷ lệ bỏ học',
      value: `${dropoutRate}%`,
      change: '-1.5% so với tháng trước',
      trend: 'down',
      icon: AlertTriangle,
      iconColor: 'text-[hsl(var(--admin-danger))]',
      bgGlow: 'from-[hsl(var(--admin-danger))] to-transparent',
    },
    {
      title: 'Khóa học chờ duyệt',
      value: pendingCourses,
      change: 'Cần xử lý ngay',
      trend: 'warning',
      icon: BookOpen,
      iconColor: 'text-[hsl(var(--admin-warning))]',
      bgGlow: 'from-[hsl(var(--admin-warning))] to-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <BezelCard
              outerClassName="h-full cursor-pointer"
              innerClassName="flex flex-col justify-between"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${item.bgGlow} rounded-bl-full pointer-events-none opacity-40`} />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[hsl(var(--admin-text-muted))]">
                  {item.title}
                </span>
                <div className="p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
              </div>

              <div className="relative z-10 mt-2">
                <h3 className="text-[22px] font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] tabular-nums">
                  {item.value}
                </h3>
                <div className="flex items-center gap-1.5 mt-2">
                  {item.trend === 'up' && (
                    <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--admin-success))]" />
                  )}
                  {item.trend === 'down' && (
                    <TrendingDown className="w-3.5 h-3.5 text-[hsl(var(--admin-success))]" />
                  )}
                  <span className={`text-xs font-medium ${item.trend === 'warning' ? 'text-[hsl(var(--admin-warning))]' : 'text-[hsl(var(--admin-text-muted))]'}`}>
                    {item.change}
                  </span>
                </div>
              </div>
            </BezelCard>
          </motion.div>
        );
      })}
    </div>
  );
};
