import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COURSE_DELIVERY_TYPES } from '@/utils/constants';

const DELIVERY_LABELS = {
  [COURSE_DELIVERY_TYPES.VIDEO]: 'Video quay sẵn',
  [COURSE_DELIVERY_TYPES.LIVE]: 'Trực tuyến (Live)',
  [COURSE_DELIVERY_TYPES.OFFLINE]: 'Trực tiếp (Offline)',
  [COURSE_DELIVERY_TYPES.HYBRID]: 'Kết hợp (Hybrid)'
};

const BAR_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6']; // Amber, Blue, Emerald, Violet

export const TrainerCourseDeliveryChart = ({ courses = [] }) => {
  const deliveryCounts = courses.reduce((acc, c) => {
    const type = c.delivery_type || COURSE_DELIVERY_TYPES.VIDEO;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const data = Object.keys(DELIVERY_LABELS).map(key => ({
    name: DELIVERY_LABELS[key],
    value: deliveryCounts[key] || 0
  })).filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))]/95 border border-[hsl(var(--admin-border))] p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))] mb-1">
            {payload[0].payload.name}
          </p>
          <p className="text-sm font-medium flex items-center gap-1" style={{ color: payload[0].payload.fill || payload[0].color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
            {payload[0].value} khóa học
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Hình thức giảng dạy</h3>
          <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Phân bổ theo hình thức</p>
        </div>

        <div className="h-72 w-full mt-4">
          {data.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
              Chưa có dữ liệu.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--admin-text-secondary))', fontSize: 11 }}
                />
                <YAxis 
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--admin-text-secondary))', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--admin-surface-hover))' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
