import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export const AdminUserGrowthChart = ({ data = [] }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-3 rounded-xl shadow-[var(--admin-shadow-lg)]">
          <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--admin-text-muted))] mb-1">{payload[0].payload.name}</p>
          <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))]">
            Người dùng mới: <span className="text-[hsl(var(--admin-accent))]">{payload[0].value.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col justify-end mt-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--admin-accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--admin-accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              fontFamily="JetBrains Mono, monospace"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'hsl(var(--admin-accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="hsl(var(--admin-accent))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUsers)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
