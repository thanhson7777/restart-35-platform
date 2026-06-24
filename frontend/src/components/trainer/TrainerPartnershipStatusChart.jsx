import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BezelCard } from '@/components/ui';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_MAP = {
  pending: { label: 'Chờ duyệt', color: '#F59E0B' }, // Amber
  negotiating: { label: 'Đang thương lượng', color: '#3B82F6' }, // Blue
  active: { label: 'Đang hợp tác', color: '#10B981' }, // Emerald
  rejected: { label: 'Bị từ chối', color: '#EF4444' }, // Red
  expired: { label: 'Đã hết hạn', color: '#64748B' }, // Slate
  cancelled: { label: 'Đã hủy', color: '#94A3B8' } // Light Slate
};

export const TrainerPartnershipStatusChart = ({ partnerships = [] }) => {
  const chartData = useMemo(() => {
    if (!partnerships || partnerships.length === 0) return [];

    const counts = {};
    partnerships.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });

    return Object.keys(counts).map(status => ({
      name: STATUS_MAP[status]?.label || status,
      value: counts[status],
      color: STATUS_MAP[status]?.color || '#CBD5E1'
    })).sort((a, b) => b.value - a.value); // Sort by count descending
  }, [partnerships]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[hsl(var(--admin-surface))]/90 border border-[hsl(var(--admin-border))] p-3 rounded-xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></div>
            <p className="text-xs font-bold text-[hsl(var(--admin-text-primary))] font-mono uppercase tracking-wide">
              {payload[0].name}
            </p>
          </div>
          <p className="text-sm font-bold text-[hsl(var(--admin-text-secondary))] font-mono ml-5">
            {payload[0].value} <span className="text-xs font-normal">đối tác</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLegend = (props) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--admin-text-secondary))] font-mono uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.value}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Tỷ lệ Trạng thái Đối tác</h3>
          <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Phân bổ đối tác theo trạng thái hiện tại</p>
        </div>

        <div className="h-72 w-full mt-2">
          {chartData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[hsl(var(--admin-text-muted))] text-sm border border-dashed border-[hsl(var(--admin-border))] rounded-xl">
              Chưa có dữ liệu đối tác.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderCustomLegend} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
