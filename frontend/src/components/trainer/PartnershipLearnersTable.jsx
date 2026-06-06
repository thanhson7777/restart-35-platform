import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

const PartnershipLearnersTable = ({ learners = [], emptyText = 'Chưa có dữ liệu.' }) => {
  if (!learners.length) {
    return <p className="text-slate-500 text-sm py-8 text-center">{emptyText}</p>;
  }

  return (
    <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/30">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500">Học viên</TableHead>
            <TableHead className="text-slate-500">Email</TableHead>
            <TableHead className="text-slate-500">Khóa học</TableHead>
            <TableHead className="text-slate-500">Trạng thái</TableHead>
            <TableHead className="text-slate-500 text-right">Tiến độ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {learners.map((item) => (
            <TableRow key={item._id} className="border-slate-800 hover:bg-slate-800/30">
              <TableCell className="text-white font-medium">{item.user?.displayName || 'Học viên'}</TableCell>
              <TableCell className="text-slate-400">{item.user?.email || '—'}</TableCell>
              <TableCell className="text-slate-300">{item.course?.title || '—'}</TableCell>
              <TableCell className="text-slate-300 capitalize">{item.status || '—'}</TableCell>
              <TableCell className="text-right text-blue-400 font-semibold">{item.progress?.percentage || 0}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PartnershipLearnersTable;
