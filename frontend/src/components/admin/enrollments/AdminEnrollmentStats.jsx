import React from 'react';
import { Users, BookOpen, CheckCircle, Clock, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { BezelCard } from '@/components/ui';

import { formatPrice } from '@/utils/formatter';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  total: {
    icon: Users,
    iconColor: 'text-[hsl(var(--admin-accent))]',
    bgGlow: 'from-[hsl(var(--admin-accent))]/10 to-transparent',
    label: 'Tổng đăng ký',
  },
  enrolled: {
    icon: BookOpen,
    iconColor: 'text-purple-500',
    bgGlow: 'from-purple-500/10 to-transparent',
    label: 'Đã đăng ký',
  },
  completed: {
    icon: CheckCircle,
    iconColor: 'text-[hsl(var(--admin-success))]',
    bgGlow: 'from-[hsl(var(--admin-success))]/10 to-transparent',
    label: 'Hoàn thành',
  },
  dropped: {
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    bgGlow: 'from-rose-500/10 to-transparent',
    label: 'Bỏ học',
  },
};

const AdminEnrollmentStats = ({ stats, loading }) => {
  const getStatItems = () => {
    if (!stats) return [];
    const { total = 0, byStatus = {}, revenue = {} } = stats;
    return [
      { key: 'total', value: total },
      { key: 'enrolled', value: byStatus.active || 0 },
      { key: 'completed', value: byStatus.completed || 0 },
      { key: 'dropped', value: byStatus.dropped || 0 },
    ];
  };



  if (loading) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] animate-pulse rounded-2xl" />
          ))}
        </div>
    );
  }

  const statItems = getStatItems();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, index) => {
          const config = STATUS_CONFIG[item.key];
          if (!config) return null;
          const Icon = config.icon;

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <BezelCard
                outerClassName="h-full hover:border-[hsl(var(--admin-accent))]/30 transition-all duration-300"
                innerClassName="flex flex-col justify-between p-4 h-full"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${config.bgGlow} rounded-bl-full pointer-events-none opacity-70`} />

                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-[hsl(var(--admin-text-muted))]">
                    {config.label}
                  </span>
                  <div className="p-1.5 rounded-full bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                </div>

                <div className="relative z-10 mt-1">
                  <h3 className="text-xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] tabular-nums truncate">
                    {item.isPrice
                      ? formatPrice(item.value)
                      : item.value.toLocaleString('vi-VN')}
                  </h3>
                  {item.key === 'completed' && item.value > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-[hsl(var(--admin-success))] font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      <span>Đầu ra tốt</span>
                    </div>
                  )}
                </div>
              </BezelCard>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};

export default AdminEnrollmentStats;
