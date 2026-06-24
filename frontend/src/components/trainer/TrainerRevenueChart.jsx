import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TrainerRevenueChart = ({ rawData = [] }) => {
  const [range, setRange] = useState('last_30_days');

  const chartData = React.useMemo(() => {
    const result = [];
    const now = new Date();

    if (range === 'last_7_days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const displayDay = `${d.getDate()}/${d.getMonth() + 1}`;
        
        const dayTotal = rawData.filter(item => 
          item.year === d.getFullYear() && 
          item.month === d.getMonth() + 1 && 
          item.day === d.getDate()
        ).reduce((sum, item) => sum + item.revenue, 0);

        result.push({ period: displayDay, revenue: dayTotal });
      }
    } else if (range === 'last_30_days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const displayDay = `${d.getDate()}/${d.getMonth() + 1}`;
        
        const dayTotal = rawData.filter(item => 
          item.year === d.getFullYear() && 
          item.month === d.getMonth() + 1 && 
          item.day === d.getDate()
        ).reduce((sum, item) => sum + item.revenue, 0);

        result.push({ period: displayDay, revenue: dayTotal });
      }
    } else if (range === 'this_month') {
      const currentDay = now.getDate();
      for (let i = 1; i <= currentDay; i++) {
        const dayTotal = rawData.filter(item => 
          item.year === now.getFullYear() && 
          item.month === now.getMonth() + 1 && 
          item.day === i
        ).reduce((sum, item) => sum + item.revenue, 0);

        result.push({ period: `${i}/${now.getMonth() + 1}`, revenue: dayTotal });
      }
    } else if (range === 'this_year') {
      const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      const currentMonth = now.getMonth();
      for (let i = 0; i <= currentMonth; i++) {
        const monthTotal = rawData.filter(item => 
          item.year === now.getFullYear() && 
          item.month === i + 1
        ).reduce((sum, item) => sum + item.revenue, 0);

        result.push({ period: monthNames[i], revenue: monthTotal });
      }
    }

    return result;
  }, [rawData, range]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))]/60 border border-[hsl(var(--admin-border))]/50 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 z-0"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-[hsl(var(--admin-text-muted))] mb-1.5">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 font-mono tracking-tight">
                {new Intl.NumberFormat('vi-VN').format(payload[0].value)}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--admin-text-secondary))]">VNĐ</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Thống kê doanh thu</h3>
            <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Biểu đồ tổng doanh thu thực tế</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-xs border border-[hsl(var(--admin-border))] rounded-full px-3 py-1.5 bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-secondary))] focus:outline-none focus:border-[hsl(var(--admin-accent))] cursor-pointer font-mono"
          >
            <option value="last_7_days">7 ngày qua</option>
            <option value="last_30_days">30 ngày qua</option>
            <option value="this_month">Tháng này</option>
            <option value="this_year">Năm nay</option>
          </select>
        </div>

        <div className="h-72 w-full mt-4">
          {chartData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
              Chưa có dữ liệu doanh thu.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenueLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-[hsl(var(--admin-border))] opacity-30" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="currentColor"
                  className="text-[hsl(var(--admin-text-muted))]"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono, monospace"
                  dy={10}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-[hsl(var(--admin-text-muted))]"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val)}
                  fontFamily="JetBrains Mono, monospace"
                  dx={-10}
                  width={40}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: 'url(#colorRevenueLine)', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} 
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#colorRevenueLine)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenueArea)"
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2, style: { filter: 'url(#glow)' } }}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
