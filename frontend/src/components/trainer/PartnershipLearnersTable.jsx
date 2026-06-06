import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

const PartnershipLearnersTable = ({ learners = [], emptyText = 'Chưa có dữ liệu.' }) => {
  if (!learners.length) {
    return <p className="text-[hsl(var(--admin-text-muted))] text-sm py-8 text-center">{emptyText}</p>;
  }

  return (
    <div className="rounded-2xl border border-[hsl(var(--admin-border))] overflow-hidden bg-[hsl(var(--admin-surface-elevated))]/30">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="border-[hsl(var(--admin-border))] hover:bg-transparent">
            <TableHead className="text-[hsl(var(--admin-text-muted))]">Học viên</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-muted))]">Email</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-muted))]">Khóa học</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-muted))]">Trạng thái</TableHead>
            <TableHead className="text-[hsl(var(--admin-text-muted))] text-right">Tiến độ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {learners.map((item) => (
            <TableRow key={item._id} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]/30">
              <TableCell className="text-[hsl(var(--admin-text-primary))] font-medium">{item.user?.displayName || 'Học viên'}</TableCell>
              <TableCell className="text-[hsl(var(--admin-text-muted))]">{item.user?.email || '—'}</TableCell>
              <TableCell className="text-[hsl(var(--admin-text-secondary))]">{item.course?.title || '—'}</TableCell>
              <TableCell className="text-[hsl(var(--admin-text-secondary))] capitalize">{item.status || '—'}</TableCell>
              <TableCell className="text-right text-[hsl(var(--admin-accent))] font-semibold">{item.progress?.percentage || 0}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PartnershipLearnersTable;
