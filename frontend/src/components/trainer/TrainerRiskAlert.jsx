import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui';

export const TrainerRiskAlert = ({ level = 'low', score }) => {
  const getRiskDetails = (lvl) => {
    switch (lvl) {
      case 'critical':
        return {
          label: 'Cực kỳ nguy cấp',
          className: 'bg-[hsl(var(--admin-danger-subtle))] text-[hsl(var(--admin-danger))] border-[hsl(var(--admin-danger))]/30 animate-pulse',
          icon: <ShieldX size={14} className="mr-1 text-[hsl(var(--admin-danger))]" />
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
          className: 'bg-yellow-500/15 text-[hsl(var(--admin-warning))] border-yellow-500/30',
          icon: <AlertTriangle size={14} className="mr-1 text-[hsl(var(--admin-warning))]" />
        };
      case 'low':
      default:
        return {
          label: 'Nguy cơ thấp',
          className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]',
          icon: <CheckCircle2 size={14} className="mr-1 text-[hsl(var(--admin-text-muted))]" />
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
        <span className="text-xs font-mono text-[hsl(var(--admin-text-muted))]">({score}%)</span>
      )}
    </div>
  );
};
