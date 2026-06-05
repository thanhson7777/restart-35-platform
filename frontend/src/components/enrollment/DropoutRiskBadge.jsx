import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

const RISK_CONFIG = {
  low: {
    label: 'Tiến độ tốt',
    className: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  medium: {
    label: 'Rủi ro trung bình',
    className: 'bg-amber-500/10 border-amber-500/25 text-amber-650 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400',
    icon: AlertTriangle,
  },
  high: {
    label: 'Nguy cơ tụt lại',
    className: 'bg-rose-500/10 border-rose-500/25 text-rose-650 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-450',
    icon: AlertOctagon,
  },
};

export const DropoutRiskBadge = ({ risk = 'low' }) => {
  const normalizedRisk = risk?.toLowerCase();
  const config = RISK_CONFIG[normalizedRisk] || RISK_CONFIG.low;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.className}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.0} />
      <span>{config.label}</span>
    </span>
  );
};
