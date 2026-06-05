import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui';

export const TrainerRiskAlert = ({ level = 'low', score }) => {
  const getRiskDetails = (lvl) => {
    switch (lvl) {
      case 'critical':
        return {
          label: 'Cực kỳ nguy cấp',
          className: 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse',
          icon: <ShieldX size={14} className="mr-1 text-red-400" />
        };
      case 'high':
        return {
          label: 'Nguy cơ cao',
          className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          icon: <ShieldAlert size={14} className="mr-1 text-orange-400" />
        };
      case 'medium':
        return {
          label: 'Nguy cơ trung bình',
          className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
          icon: <AlertTriangle size={14} className="mr-1 text-yellow-400" />
        };
      case 'low':
      default:
        return {
          label: 'Nguy cơ thấp',
          className: 'bg-slate-800 text-slate-400 border-slate-700',
          icon: <CheckCircle2 size={14} className="mr-1 text-slate-400" />
        };
    }
  };

  const details = getRiskDetails(level);

  return (
    <div className="flex items-center gap-2">
      <Badge className={`px-2 py-0.5 border text-xs font-semibold flex items-center rounded-md ${details.className}`}>
        {details.icon}
        {details.label}
      </Badge>
      {score !== undefined && score !== null && (
        <span className="text-xs font-mono text-slate-500">({score}%)</span>
      )}
    </div>
  );
};
