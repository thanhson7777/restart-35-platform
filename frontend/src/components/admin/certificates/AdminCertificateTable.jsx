import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui';

const formatDate = (date) => {
  if (!date) return '-';
  try { return new Date(date).toLocaleDateString('vi-VN'); }
  catch { return '-'; }
};

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  revoked: { label: 'Revoked', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const AdminCertificateRow = ({ certificate, onView }) => {
  const statusInfo = statusConfig[certificate.status] || { label: certificate.status, className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' };

  return (
    <tr className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[200px]">
            {certificate.worker?.fullName || '-'}
          </p>
          <span className="text-xs text-[hsl(var(--admin-text-muted))]">
            {certificate.worker?.email || '-'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[200px]">
            {certificate.courseName || certificate.courseId || '-'}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-[hsl(var(--admin-text-muted))]">
          {certificate.certificateId || (certificate._id || '').slice(-8) || '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[hsl(var(--admin-text-secondary))]">
        {formatDate(certificate.issuedAt || certificate.createdAt)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onView?.(certificate)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors" title="Xem chi tiết">
          <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        </button>
      </td>
    </tr>
  );
};

const AdminCertificateTable = ({ certificates, loading, onView }) => {
  if (!loading && certificates.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-[hsl(var(--admin-text-muted))] opacity-30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
          </svg>
          <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có chứng chỉ nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
              {['Worker', 'Khóa học', 'Certificate ID', 'Ngày cấp', 'Trạng thái', 'Hành động'].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  {[1, 2, 3, 4, 5, 6].map((j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))
            ) : (
              certificates.map((cert) => (
                <AdminCertificateRow key={cert._id || cert.id} certificate={cert} onView={onView} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCertificateTable;
