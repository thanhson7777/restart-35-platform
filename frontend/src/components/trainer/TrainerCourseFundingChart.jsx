import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const TrainerCourseFundingChart = ({ courses = [] }) => {
  const freeCount = courses.filter(c => c.isFree || c.fundingConfig?.type === 'FREE').length;
  const paidCount = courses.filter(c => !c.isFree && c.fundingConfig?.type !== 'FREE').length;

  const data = [
    { name: 'Miễn phí', value: freeCount, color: '#10B981' }, // Emerald 500
    { name: 'Có phí', value: paidCount, color: '#8B5CF6' } // Violet 500
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))]/95 border border-[hsl(var(--admin-border))] p-3 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
          <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
            {payload[0].name}: <span className="font-bold font-mono">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegendText = (value) => {
    return <span className="text-xs text-[hsl(var(--admin-text-secondary))] font-medium ml-1">{value}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Cơ cấu thu phí</h3>
          <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Tỷ lệ khóa học miễn phí và có phí</p>
        </div>

        <div className="h-72 w-full mt-4">
          {data.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
              Chưa có khóa học nào.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={renderLegendText}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
