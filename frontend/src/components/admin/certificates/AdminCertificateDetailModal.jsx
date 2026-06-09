import { X, User, BookOpen, Calendar, AlertTriangle } from 'lucide-react';
import { Button, SafeImage } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useState } from 'react';
import { revokeCertificate } from '@/apis';
import toast from 'react-hot-toast';

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  revoked: { label: 'Revoked', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const AdminCertificateDetailModal = ({ certificate, open, onClose, onRevoked }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showRevoke, setShowRevoke] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  if (!open || !certificate) return null;

  const statusInfo = statusConfig[certificate.status] || { label: certificate.status, className: '' };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      toast.error('Vui lòng nhập lý do thu hồi');
      return;
    }
    try {
      setRevoking(true);
      const response = await revokeCertificate(certificate._id || certificate.id, revokeReason);
      if (response.success) {
        toast.success('Chứng chỉ đã được thu hồi');
        setShowRevoke(false);
        onRevoked?.();
        onClose();
      } else {
        toast.error(response.message || 'Thu hồi thất bại');
      }
    } catch {
      toast.error('Thu hồi thất bại');
    } finally {
      setRevoking(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'verification', label: 'Xác minh' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">Chứng chỉ</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                <span className="font-mono text-xs text-[hsl(var(--admin-text-muted))]">
                  {certificate.certificateId || (certificate._id || '').slice(-12) || '-'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-[hsl(var(--admin-border))] overflow-x-auto bg-[hsl(var(--admin-surface-elevated))]">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Worker</span>
                  </div>
                  <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                    {certificate.worker?.fullName || '-'}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                    {certificate.worker?.email || '-'}
                  </p>
                </div>
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Khóa học</span>
                  </div>
                  <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                    {certificate.courseName || certificate.courseId || '-'}
                  </p>
                  {certificate.enrollmentId && (
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">Enrollment: {certificate.enrollmentId}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Ngày cấp</span>
                  </div>
                  <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                    {formatDate(certificate.issuedAt || certificate.createdAt)}
                  </p>
                  {certificate.expiryDate && (
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                      Hết hạn: {formatDate(certificate.expiryDate)}
                    </p>
                  )}
                </div>
                {certificate.score !== undefined && (
                  <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                    <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                      <span className="text-sm font-medium">Điểm số</span>
                    </div>
                    <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
                      {certificate.score}
                    </p>
                  </div>
                )}
              </div>
              {certificate.revocationReason && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Đã bị thu hồi</p>
                    <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1">{certificate.revocationReason}</p>
                    {certificate.revokedAt && (
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Ngày thu hồi: {formatDate(certificate.revokedAt)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="p-6 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <h4 className="font-medium text-[hsl(var(--admin-text-primary))] mb-4">Thông tin xác minh</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Certificate ID', value: certificate.certificateId || certificate._id || '-' },
                    { label: 'Worker', value: certificate.worker?.fullName || '-' },
                    { label: 'Khóa học', value: certificate.courseName || certificate.courseId || '-' },
                    { label: 'Ngày cấp', value: formatDate(certificate.issuedAt || certificate.createdAt) },
                    { label: 'Trạng thái', value: statusInfo.label },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-[hsl(var(--admin-border))] last:border-0">
                      <span className="text-sm text-[hsl(var(--admin-text-muted))]">{label}</span>
                      <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          {certificate.status === 'active' && !showRevoke && (
            <Button
              variant="outline"
              onClick={() => setShowRevoke(true)}
              className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300"
            >
              Thu hồi chứng chỉ
            </Button>
          )}
          {showRevoke ? (
            <div className="flex items-center gap-3 flex-1 ml-4">
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Lý do thu hồi..."
                className="flex-1 px-4 py-2 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-sm"
              />
              <Button onClick={handleRevoke} disabled={revoking} className="bg-rose-500 hover:bg-rose-600 text-white">
                {revoking ? 'Đang thu hồi...' : 'Xác nhận'}
              </Button>
              <Button variant="outline" onClick={() => { setShowRevoke(false); setRevokeReason(''); }}>
                Hủy
              </Button>
            </div>
          ) : (
            <div />
          )}
          {!showRevoke && (
            <Button variant="outline" onClick={onClose} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
              Đóng
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCertificateDetailModal;
