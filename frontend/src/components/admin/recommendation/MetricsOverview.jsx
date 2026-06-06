/**
 * Metrics Overview — Recommendation Analytics
 * Light admin theme
 */
import React from 'react'
import { BezelCard } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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

export const MetricsOverview = ({ data = [] }) => {
  if (!data.length) {
    return (
      <BezelCard className="p-5">
        <h3 className="text-[13px] font-semibold text-[hsl(var(--admin-text-primary))] tracking-tight mb-4">Tổng quan metrics</h3>
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-[13px] text-[hsl(var(--admin-text-muted))] font-medium">Chưa có dữ liệu</p>
          <p className="text-[11px] text-[hsl(var(--admin-text-faint))] mt-1">Dữ liệu sẽ hiển thị khi có tương tác</p>
        </div>
      </BezelCard>
    )
  }

  return (
    <BezelCard className="p-5">
      <h3 className="text-[13px] font-semibold text-[hsl(var(--admin-text-primary))] tracking-tight mb-4">Tổng quan metrics</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="barGradClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="barGradEnrolls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--admin-border))" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="_id"
            tick={{ fontSize: 10, fill: 'hsl(var(--admin-text-muted))' }}
            stroke="hsl(var(--admin-border))"
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--admin-text-muted))' }} stroke="hsl(var(--admin-border))" tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--admin-accent))', fillOpacity: 0.05 }} />
          <Legend wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--admin-text-muted))', paddingTop: '8px' }} iconType="circle" iconSize={6} />
          <Bar dataKey="views" fill="url(#barGradViews)" name="Xem" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="clicks" fill="url(#barGradClicks)" name="Click" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="enrolls" fill="url(#barGradEnrolls)" name="Đăng ký" radius={[4, 4, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </BezelCard>
  )
}
