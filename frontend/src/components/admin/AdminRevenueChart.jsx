import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-1">{label}</p>
          <p className="text-sm font-bold text-white font-mono">
            Doanh thu: <span className="text-[#3B82F6]">{payload[0].value.toLocaleString()} VND</span>
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
            <h3 className="text-lg font-bold text-white tracking-tight">Doanh thu thanh toán</h3>
            <p className="text-xs text-slate-400 mt-1">Xu hướng thu nhập thực tế từ học viên và quỹ tài trợ</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-xs border border-slate-800 rounded-full px-3 py-1.5 bg-slate-900 text-slate-300 focus:outline-none focus:border-[#3B82F6] cursor-pointer font-mono"
          >
            <option value="6">6 tháng gần đây</option>
            <option value="12">12 tháng gần đây</option>
          </select>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
                tickFormatter={formatCurrency}
                fontFamily="JetBrains Mono, monospace"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BezelCard>
    </motion.div>
  );
};
