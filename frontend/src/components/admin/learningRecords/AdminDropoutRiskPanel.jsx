import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui';

const riskBadge = (level) => {
  const map = {
    low:      { label: 'Thấp',     cls: 'bg-emerald-500/10 text-emerald-500' },
    medium:   { label: 'TB',       cls: 'bg-amber-500/10 text-amber-500' },
    high:     { label: 'Cao',      cls: 'bg-orange-500/10 text-orange-500' },
    critical: { label: 'Nguy cấp', cls: 'bg-rose-500/10 text-rose-500' },
  };
  const cfg = map[level] || { label: level, cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const RiskFactorBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--admin-text-muted))]">{label}</span>
        <span className="font-medium text-[hsl(var(--admin-text-primary))]">{value}</span>
      </div>
      <div className="w-full bg-[hsl(var(--admin-border))] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const AdminDropoutRiskPanel = ({ riskData, loading }) => {
  const atRisk = riskData?.atRiskLearners || [];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const distribution = riskData?.riskDistribution || {};

  return (
    <div className="space-y-6">
      {/* Risk distribution summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { level: 'critical', label: 'Nguy cấp', count: distribution.critical || 0, color: 'bg-rose-500' },
          { level: 'high',     label: 'Cao',       count: distribution.high || 0,     color: 'bg-orange-500' },
          { level: 'medium',   label: 'TB',         count: distribution.medium || 0,   color: 'bg-amber-500' },
          { level: 'low',      label: 'Thấp',       count: distribution.low || 0,    color: 'bg-emerald-500' },
        ].map(({ level, label, count, color }) => (
          <div key={level} className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
            <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{count}</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))]">{label}</p>
          </div>
        ))}
      </div>

      {/* Risk factors breakdown */}
      {riskData?.riskFactors && (
        <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
          <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Yếu tố rủi ro trung bình</h4>
          <div className="space-y-3">
            <RiskFactorBar label="Ngày không hoạt động" value={riskData.riskFactors.avgInactiveDays || 0} max={30} color="bg-rose-500" />
            <RiskFactorBar label="Tỷ lệ hoàn thành bài" value={riskData.riskFactors.avgLessonCompletion || 0} max={100} color="bg-amber-500" />
            <RiskFactorBar label="Điểm engagement" value={riskData.riskFactors.avgEngagementScore || 0} max={10} color="bg-blue-500" />
          </div>
        </div>
      )}

      {/* At-risk learners list */}
      <div>
        <h4 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Học viên cần can thiệp ({atRisk.length})
        </h4>
        {atRisk.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <svg className="w-10 h-10 text-emerald-500 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">Không có học viên nào cần can thiệp.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {atRisk.map((learner) => (
              <div key={learner._id} className="flex items-center gap-3 p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))] truncate">{learner.workerName || '—'}</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate">{learner.courseName || '—'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {learner.riskFactors && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{learner.riskFactors.inactiveDays || 0}d inactive</p>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{learner.riskFactors.engagementScore || 0}/10</p>
                    </div>
                  )}
                  {riskBadge(learner.riskLevel)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDropoutRiskPanel;
