import { Skeleton } from '@/components/ui';
import { AlertTriangle, TrendingUp, Users, BookOpen } from 'lucide-react';

const formatDate = (date) => {
  if (!date) return '-';
  try { return new Date(date).toLocaleDateString('vi-VN'); }
  catch { return '-'; }
};

const riskConfig = {
  high: { label: 'Nguy cơ cao', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20', dot: 'bg-rose-500' },
  medium: { label: 'Nguy cơ trung bình', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dot: 'bg-amber-500' },
  low: { label: 'Nguy cơ thấp', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dot: 'bg-emerald-500' },
};

const RiskAnalysisPanel = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const atRisk = data?.atRisk || [];
  const riskFactors = data?.riskFactors || {};

  const stats = [
    {
      label: 'Tổng Learners',
      value: summary.totalLearners || 0,
      sub: 'đang theo học',
      colorClass: 'text-blue-500',
      icon: Users,
    },
    {
      label: 'At-Risk Count',
      value: summary.atRiskCount || 0,
      sub: `${summary.atRiskPercent || 0}% của tổng`,
      colorClass: summary.atRiskPercent > 20 ? 'text-rose-500' : 'text-amber-500',
      icon: AlertTriangle,
    },
    {
      label: 'Avg Completion',
      value: `${summary.avgCompletionRate || 0}%`,
      sub: 'tiến độ hoàn thành TB',
      colorClass: 'text-emerald-500',
      icon: TrendingUp,
    },
    {
      label: 'Avg Engagement',
      value: `${summary.avgEngagement || 0}`,
      sub: 'chỉ số tương tác TB',
      colorClass: 'text-purple-500',
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-5 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${stat.colorClass}`} />
                <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--admin-text-muted))]">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{stat.value}</p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Risk Breakdown */}
      {Object.keys(riskFactors).length > 0 && (
        <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-[hsl(var(--admin-text-primary))] mb-4">Phân tích yếu tố rủi ro</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(riskFactors).map(([factor, value]) => (
              <div key={factor} className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1 capitalize">{factor.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">
                  {typeof value === 'number' ? `${value}%` : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-Risk Learners Table */}
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[hsl(var(--admin-border))]">
          <h3 className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
            Learners có nguy cơ bỏ học
          </h3>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
            Những learners có dấu hiệu ngừng tiến độ học tập
          </p>
        </div>

        {atRisk.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Không có learner nào có nguy cơ</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tất cả learners đang tiến triển tốt</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
                  {['Learner', 'Khóa học', 'Mức rủi ro', 'Tiến độ', 'Tương tác', 'Ngày cập nhật cuối'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--admin-border))]">
                {atRisk.map((item, idx) => {
                  const riskInfo = riskConfig[item.riskLevel] || riskConfig.low;
                  return (
                    <tr key={idx} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[160px]">
                            {item.workerName || item.worker?.fullName || '-'}
                          </p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                            {item.workerEmail || item.worker?.email || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[hsl(var(--admin-text-secondary))] truncate max-w-[160px]">
                          {item.courseName || item.courseId || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${riskInfo.dot}`} />
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${riskInfo.className}`}>
                            {riskInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                          {item.completionRate !== undefined ? `${item.completionRate}%` : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                          {item.engagementScore !== undefined ? item.engagementScore : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--admin-text-muted))]">
                        {formatDate(item.lastActiveAt || item.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAnalysisPanel;
