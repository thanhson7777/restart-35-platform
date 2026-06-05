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
      iconColor: 'text-[#3B82F6]',
      bgGlow: 'from-[#3B82F6]/10 to-transparent',
    },
    {
      title: 'Doanh thu tháng này',
      value: `${(revenueThisMonth / 1000000).toFixed(1)}M VND`,
      change: '+8.2% so với tháng trước',
      trend: 'up',
      icon: DollarSign,
      iconColor: 'text-[#10B981]',
      bgGlow: 'from-[#10B981]/10 to-transparent',
    },
    {
      title: 'Tỷ lệ bỏ học (Dropout)',
      value: `${dropoutRate}%`,
      change: '-1.5% so với tháng trước',
      trend: 'down',
      icon: AlertTriangle,
      iconColor: 'text-[#EF4444]',
      bgGlow: 'from-[#EF4444]/10 to-transparent',
    },
    {
      title: 'Khóa học chờ duyệt',
      value: pendingCourses,
      change: 'Cần xử lý ngay',
      trend: 'warning',
      icon: BookOpen,
      iconColor: 'text-[#F59E0B]',
      bgGlow: 'from-[#F59E0B]/10 to-transparent',
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
            transition={{
              duration: 0.8,
              delay: index * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <BezelCard
              outerClassName="h-full hover:border-[#3B82F6]/30 hover:scale-[1.02] cursor-pointer"
              innerClassName="flex flex-col justify-between"
            >
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${item.bgGlow} rounded-bl-full pointer-events-none blur-xl opacity-70`} />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs uppercase tracking-[0.15em] font-medium text-slate-400 font-mono">
                  {item.title}
                </span>
                <div className="p-2 rounded-full bg-slate-900 border border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
              </div>

              <div className="relative z-10 mt-2">
                <h3 className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {item.value}
                </h3>
                <div className="flex items-center gap-1.5 mt-2">
                  {item.trend === 'up' && (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {item.trend === 'down' && (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className={`text-xs font-medium ${item.trend === 'warning' ? 'text-amber-400' : 'text-slate-400'}`}>
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
