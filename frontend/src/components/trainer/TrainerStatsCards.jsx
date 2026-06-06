import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Calendar, AlertTriangle } from 'lucide-react';
import { BezelCard } from '@/components/ui';

export const TrainerStatsCards = ({ stats = {}, courses = [], schedules = [], dropoutRisk = {} }) => {
  // 1. Active students count
  const activeStudents = stats.byStatus?.active || 0;

  // 2. Active courses count
  const activeCourses = courses.filter(course => course.status === 'published').length;

  // 3. Upcoming sessions in next 7 days
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  let upcomingSessions = 0;
  schedules.forEach(schedule => {
    if (schedule.status === 'published' && schedule.sessions) {
      schedule.sessions.forEach(session => {
        const sessionDate = new Date(session.date);
        if (sessionDate >= now && sessionDate <= nextWeek && session.status === 'scheduled') {
          upcomingSessions++;
        }
      });
    }
  });

  // 4. High dropout risk students count
  const highRiskStudents = dropoutRisk.highRisk || 0;

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
      title: 'Buổi học sắp tới',
      value: upcomingSessions,
      sub: 'Diễn ra trong 7 ngày tới',
      icon: Calendar,
      colorClass: 'text-[hsl(var(--admin-warning))] bg-[hsl(var(--admin-warning))]/10 border-[hsl(var(--admin-warning))]/20',
      iconColor: '#FBBF24',
    },
    {
      title: 'Nguy cơ bỏ học cao',
      value: highRiskStudents,
      sub: 'Cần can thiệp khẩn cấp',
      icon: AlertTriangle,
      colorClass: 'text-[hsl(var(--admin-danger))] bg-[hsl(var(--admin-danger))]/10 border-[hsl(var(--admin-danger))]/20',
      iconColor: '#F87171',
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
