import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, DollarSign, Handshake } from 'lucide-react';
import { BezelCard } from '@/components/ui';

export const TrainerStatsCards = ({ stats = {}, courses = [], courseStats = {}, schedules = [], dropoutRisk = {}, enterpriseStudents = {} }) => {
  // 1. Active students count
  const activeStudents = stats.byStatus?.active || 0;

  // 2. Active courses count
  const activeCourses = courseStats.approved || courses.filter(course => course.status === 'approved').length;

  // 3. Partnerships
  const partnershipsCount = enterpriseStudents?.total || 0;

  // 4. Revenue (if available in stats, otherwise default to 0)
  const totalRevenue = stats.totalRevenue || 0;

  const cardData = [
    {
      title: 'Học viên đang học',
      value: activeStudents,
      sub: 'Đang tham gia học tập',
      icon: Users,
      colorClass: 'text-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-subtle))] border-[hsl(var(--admin-accent))]/20',
      iconColor: '#60A5FA',
    },
    {
      title: 'Khóa học hoạt động',
      value: activeCourses,
      sub: 'Đã xuất bản trên hệ thống',
      icon: BookOpen,
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      iconColor: '#C084FC',
    },
    {
      title: 'Doanh thu (VNĐ)',
      value: new Intl.NumberFormat('vi-VN').format(totalRevenue),
      sub: 'Tổng doanh thu hệ thống',
      icon: DollarSign,
      colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      iconColor: '#10B981',
    },
    {
      title: 'Đối tác doanh nghiệp',
      value: partnershipsCount,
      sub: 'Doanh nghiệp liên kết',
      icon: Handshake,
      colorClass: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      iconColor: '#F97316',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardData.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <BezelCard className="h-full flex items-center justify-between" padding="default">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-[hsl(var(--admin-text-secondary))] font-medium uppercase tracking-wider">{card.title}</p>
                <h3 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))] tracking-tight font-mono my-1">
                  {card.value.toLocaleString()}
                </h3>
                <span className="text-xs text-[hsl(var(--admin-text-muted))]">{card.sub}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${card.colorClass} flex items-center justify-center shrink-0 shadow-lg`}>
                <IconComponent size={24} color={card.iconColor} />
              </div>
            </BezelCard>
          </motion.div>
        );
      })}
    </div>
  );
};
