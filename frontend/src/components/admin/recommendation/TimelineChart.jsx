/**
 * Timeline Chart — Recommendation Analytics
 * Light admin theme
 */
import React from 'react'
import { BezelCard } from '@/components/ui'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl px-3 py-2.5 text-xs shadow-[var(--admin-shadow-lg)]">
      <p className="font-semibold text-[hsl(var(--admin-text-primary))] mb-2 pb-1.5 border-b border-[hsl(var(--admin-border))]">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2 text-[hsl(var(--admin-text-secondary))]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[11px]">{p.name}:</span>
          <span className="font-semibold tabular-nums ml-auto pl-4 text-[hsl(var(--admin-text-primary))]">{p.value?.toLocaleString('vi-VN')}</span>
        </p>
      ))}
    </div>
  )
}

export const TimelineChart = ({ data = [], loading, period }) => {
  return (
    <BezelCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[hsl(var(--admin-text-primary))] tracking-tight">Xu hướng gợi ý</h3>
        <span className="text-[11px] text-[hsl(var(--admin-text-muted))]">{period} ngày gần nhất</span>
      </div>

      {loading ? (
        <div className="h-48 bg-[hsl(var(--admin-surface-elevated))] rounded-xl animate-pulse border border-[hsl(var(--admin-border))]" />
      ) : data.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <p className="text-[13px] text-[hsl(var(--admin-text-muted))] font-medium">Chưa có dữ liệu</p>
          <p className="text-[11px] text-[hsl(var(--admin-text-faint))] mt-1">Dữ liệu sẽ hiển thị khi có tương tác</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEnrolls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="_id"
              tick={{ fontSize: 10, fill: 'hsl(var(--admin-text-muted))' }}
              stroke="hsl(var(--admin-border))"
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 7) - 1)}
            />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--admin-text-muted))' }} stroke="hsl(var(--admin-border))" tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--admin-text-muted))', paddingTop: '12px' }} iconType="circle" iconSize={6} />
            <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#gradViews)" dot={false} name="Xem" activeDot={{ r: 4, fill: '#3b82f6' }} />
            <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fill="url(#gradClicks)" dot={false} name="Click" activeDot={{ r: 4, fill: '#10b981' }} />
            <Area type="monotone" dataKey="enrolls" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradEnrolls)" dot={false} name="Đăng ký" activeDot={{ r: 4, fill: '#8b5cf6' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </BezelCard>
  )
}
