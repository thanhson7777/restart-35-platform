import { Avatar, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import SponsorshipBadge from './SponsorshipBadge';

const GraduateList = ({ graduates = [], emptyText = 'Chưa có học viên tốt nghiệp.' }) => {
  if (!graduates.length) {
    return <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">{emptyText}</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Học viên</TableHead>
            <TableHead className="text-slate-400">Khóa học</TableHead>
            <TableHead className="text-slate-400">Nguồn</TableHead>
            <TableHead className="text-slate-400 text-right">Hoàn thành</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {graduates.map((graduate) => (
            <TableRow key={graduate._id || graduate.enrollmentId} className="border-slate-800 hover:bg-slate-900/40">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar src={graduate.user?.avatar} fallback={graduate.user?.displayName?.charAt(0)?.toUpperCase() || 'H'} className="h-9 w-9" />
                  <div>
                    <p className="text-sm font-medium text-white">{graduate.user?.displayName || 'Học viên'}</p>
                    <p className="text-xs text-slate-500">{graduate.user?.email || '—'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-slate-300">{graduate.course?.title || graduate.courseTitle || '—'}</TableCell>
              <TableCell>
                <SponsorshipBadge type={graduate.sourceType || (graduate.source === 'ngo_sponsored' ? 'ngo' : graduate.source === 'co_funded' ? 'mixed' : 'enterprise')}>
                  {graduate.sourceLabel || graduate.source || 'direct'}
                </SponsorshipBadge>
              </TableCell>
              <TableCell className="text-right text-slate-300">
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
