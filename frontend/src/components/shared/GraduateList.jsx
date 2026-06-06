import { Avatar, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import SponsorshipBadge from './SponsorshipBadge';

const GraduateList = ({ graduates = [], emptyText = 'Chưa có học viên tốt nghiệp.' }) => {
  if (!graduates.length) {
    return <div className="rounded-2xl border border-dashed border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-6 text-sm text-[hsl(var(--admin-text-secondary))]">{emptyText}</div>;
  }

  return (
    <div className="rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[hsl(var(--admin-border))] hover:bg-transparent">
            <TableHead className="text-[hsl(var(--admin-text-secondary))]">Học viên</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-secondary))]">Khóa học</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-secondary))]">Nguồn</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-secondary))] text-right">Hoàn thành</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {graduates.map((graduate) => (
            <TableRow key={graduate._id || graduate.enrollmentId} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar src={graduate.user?.avatar} fallback={graduate.user?.displayName?.charAt(0)?.toUpperCase() || 'H'} className="h-9 w-9" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{graduate.user?.displayName || 'Học viên'}</p>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">{graduate.user?.email || '—'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-[hsl(var(--admin-text-primary))]">{graduate.course?.title || graduate.courseTitle || '—'}</TableCell>
              <TableCell>
                <SponsorshipBadge type={graduate.sourceType || (graduate.source === 'ngo_sponsored' ? 'ngo' : graduate.source === 'co_funded' ? 'mixed' : 'enterprise')}>
                  {graduate.sourceLabel || graduate.source || 'direct'}
                </SponsorshipBadge>
              </TableCell>
              <TableCell className="text-right text-[hsl(var(--admin-text-primary))]">
                {graduate.completedAt ? new Date(graduate.completedAt).toLocaleDateString('vi-VN') : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default GraduateList;
