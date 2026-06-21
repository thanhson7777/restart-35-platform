import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TrainerPartnershipTrendChart = ({ data = [] }) => {
  const [range, setRange] = useState('6');

  // Slice data based on selected range
  const filteredData = range === '6' ? data.slice(-6) : data;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))]/95 border border-[hsl(var(--admin-border))] p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-xs uppercase tracking-wider font-mono text-[hsl(var(--admin-text-muted))] mb-1">{label}</p>
          <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))] font-mono">
            Học viên B2B: <span className="text-orange-500">{payload[0].value} học viên</span>
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
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tăng trưởng Học viên Doanh nghiệp</h3>
            <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Biểu đồ số lượng học viên B2B mới qua từng tháng</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-xs border border-[hsl(var(--admin-border))] rounded-full px-3 py-1.5 bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-secondary))] focus:outline-none focus:border-[hsl(var(--admin-accent))] cursor-pointer font-mono"
          >
            <option value="6">6 tháng gần đây</option>
            <option value="12">12 tháng gần đây</option>
          </select>
        </div>

        <div className="h-72 w-full mt-4">
          {filteredData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
              Chưa có dữ liệu học viên doanh nghiệp.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPartnership" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono, monospace"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  fontFamily="JetBrains Mono, monospace"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#F97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPartnership)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
