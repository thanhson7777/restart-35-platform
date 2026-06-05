import React from 'react';
import { Badge } from '@/components/ui';
import { Check, DollarSign, RefreshCw, Briefcase, Calendar } from 'lucide-react';

const FUNDING_CONFIG = {
  free: {
    label: 'Miễn phí',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    icon: Check,
  },
  learner_paid: {
    label: 'Trả phí',
    className: 'bg-slate-50 text-slate-700 border border-slate-200/60 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/40',
    icon: DollarSign,
  },
  isa: {
    label: 'ISA - Học trước trả sau',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
    icon: RefreshCw,
  },
  enterprise_funded: {
    label: 'Doanh nghiệp chi trả',
    className: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    icon: Briefcase,
  },
  batch: {
    label: 'Đóng phí theo đợt',
    className: 'bg-zinc-50 text-zinc-700 border border-zinc-200/60 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800/40',
    icon: Calendar,
  },
};

export const FundingModelChip = ({ fundingModel, size = 'sm', showIcon = true, className = '' }) => {
  const config = FUNDING_CONFIG[fundingModel];
  if (!config) return null;

  const Icon = config.icon;
  const sizeClass = size === 'sm' 
    ? 'text-[11px] px-2 py-0.5 rounded-full' 
    : 'text-[13px] px-2.5 py-1 rounded-full';

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizeClass} gap-1 font-medium transition-all duration-300 ${className}`}
    >
      {showIcon && <Icon className="w-2.5 h-2.5" strokeWidth={2.0} />}
      <span>{config.label}</span>
    </Badge>
  );
};
