import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminRevenueChart = ({ data = [] }) => {
  const [range, setRange] = useState('12');
  const filteredData = range === '6' ? data.slice(-6) : data;

  const formatCurrency = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B VND`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M VND`;
    return `${value.toLocaleString()} VND`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-4 rounded-xl shadow-[var(--admin-shadow-lg)]">
          <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--admin-text-muted))] mb-1">{label}</p>
          <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))]">
            Doanh thu: <span className="text-[hsl(var(--admin-accent))]">{payload[0].value.toLocaleString()} VND</span>
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
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Doanh thu thanh toán</h3>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Xu hướng thu nhập thực tế từ học viên và quỹ tài trợ</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-xs border border-[hsl(var(--admin-border))] rounded-xl px-3 py-1.5
              bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-secondary))]
              focus:outline-none focus:border-[hsl(var(--admin-accent))]/40 cursor-pointer"
          >
            <option value="6">6 tháng gần đây</option>
            <option value="12">12 tháng gần đây</option>
          </select>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--admin-border))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                fontFamily="JetBrains Mono, monospace"
              />
              <YAxis
                stroke="hsl(var(--admin-border))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
                fontFamily="JetBrains Mono, monospace"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'hsl(var(--admin-accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--admin-accent))"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--admin-surface))" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </BezelCard>
    </motion.div>
  );
};
