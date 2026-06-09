import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-4 rounded-xl shadow-[var(--admin-shadow-lg)]">
        <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--admin-text-muted))] mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}{entry.name === 'Success Rate' ? '%' : ''}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminPlacementAnalyticsChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <BezelCard>
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Placement Analytics</h3>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1 mb-4">Tỷ lệ thành công theo tháng</p>
          <div className="h-72 flex items-center justify-center text-[hsl(var(--admin-text-muted))]">
            <p className="text-sm">Chưa có dữ liệu placement analytics</p>
          </div>
        </BezelCard>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <BezelCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Placement Analytics</h3>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tỷ lệ thành công và số placement theo tháng</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="colorResigned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="month"
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--admin-accent))', fillOpacity: 0.05 }} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                iconType="circle"
              />
              <Bar dataKey="active" name="Đang làm" fill="url(#colorActive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resigned" name="Đã nghỉ" fill="url(#colorResigned)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BezelCard>
    </motion.div>
  );
};

export default AdminPlacementAnalyticsChart;
