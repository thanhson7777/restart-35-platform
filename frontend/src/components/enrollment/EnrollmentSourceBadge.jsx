import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { GraduationCap, Handshake, Building2, HeartHandshake, Layers3 } from 'lucide-react';
import { ENROLLMENT_SOURCE } from '@/utils/constants';

const sourceMeta = {
  [ENROLLMENT_SOURCE.DIRECT]: {
    label: 'Tự đăng ký',
    icon: GraduationCap,
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
  },
  [ENROLLMENT_SOURCE.SCHOLARSHIP]: {
    label: 'Học bổng',
    icon: GraduationCap,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
  },
  [ENROLLMENT_SOURCE.RECOMMENDATION]: {
    label: 'Đề xuất hệ thống',
    icon: GraduationCap,
    className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
  },
  [ENROLLMENT_SOURCE.ENTERPRISE_LINKED]: {
    label: 'Enterprise linked',
    icon: Building2,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
  },
  [ENROLLMENT_SOURCE.ENTERPRISE_SPONSORED]: {
    label: 'Enterprise tài trợ',
    icon: Handshake,
    className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40'
  },
  [ENROLLMENT_SOURCE.NGO_SPONSORED]: {
    label: 'NGO tài trợ',
    icon: HeartHandshake,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
  },
  [ENROLLMENT_SOURCE.CO_FUNDED]: {
    label: 'Đồng tài trợ',
    icon: Layers3,
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
  }
};

export const EnrollmentSourceBadge = ({ source, compact = false }) => {
  const meta = sourceMeta[source] || sourceMeta[ENROLLMENT_SOURCE.DIRECT];
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={1.8} />
      {meta.label}
    </span>
  );
};

export const EnrollmentFundingSummary = ({ enrollment }) => {
  const sponsorships = enrollment?.sponsorships || [];
  const partnership = enrollment?.partnershipId || enrollment?.partnership;

  if (!sponsorships.length && !partnership && !enrollment?.source) {
    return null;
  }

  return (
    <Card className="border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold">Nguồn hỗ trợ ghi danh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <EnrollmentSourceBadge source={enrollment?.source} />
          {sponsorships.map((item) => (
            <EnrollmentSourceBadge key={item.sponsorshipId || item._id} source={item.source || enrollment?.source} compact />
          ))}
        </div>

        {partnership && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1">Partnership liên kết</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {typeof partnership === 'string' ? partnership : partnership?.title || partnership?._id || 'Partnership đã liên kết'}
            </p>
          </div>
        )}

        {sponsorships.length > 0 && (
          <div className="space-y-2">
            {sponsorships.map((item, idx) => (
              <div key={item.sponsorshipId || idx} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{item.title || item.sponsorshipTitle || `Sponsorship #${idx + 1}`}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Trạng thái: {item.status || 'matched'}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                    {item.coverageType || 'Tài trợ'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnrollmentSourceBadge;
