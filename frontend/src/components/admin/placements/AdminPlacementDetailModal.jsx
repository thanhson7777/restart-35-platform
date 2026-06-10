import { X, User, Briefcase, DollarSign, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { updatePlacementStatus, resignPlacement } from '@/apis/trainerApi';

const statusConfig = {
  active: { label: 'Đang làm', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  resigned: { label: 'Đã nghỉ', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  promoted: { label: 'Được thăng', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const AdminPlacementDetailModal = ({ placement, open, onClose, onUpdated }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showResignForm, setShowResignForm] = useState(false);
  const [resignReason, setResignReason] = useState('');
  const [updating, setUpdating] = useState(false);

  if (!open || !placement) return null;

  const statusInfo = statusConfig[placement.status] || { label: placement.status, className: '' };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const response = await updatePlacementStatus(placement._id || placement.id, { status: newStatus });
      if (response.success) {
        toast.success('Cập nhật trạng thái thành công');
        onUpdated?.();
        onClose();
      } else {
        toast.error(response.message || 'Cập nhật thất bại');
      }
    } catch {
      toast.error('Cập nhật thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const handleResign = async () => {
    if (!resignReason.trim()) {
      toast.error('Vui lòng nhập lý do nghỉ');
      return;
    }
    try {
      setUpdating(true);
      const response = await resignPlacement(placement._id || placement.id, { reason: resignReason });
      if (response.success) {
        toast.success('Đã ghi nhận nghỉ việc');
        setShowResignForm(false);
        onUpdated?.();
        onClose();
      } else {
        toast.error(response.message || 'Thao tác thất bại');
      }
    } catch {
      toast.error('Thao tác thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">
                {placement.companyName || 'Placement'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-[hsl(var(--admin-text-muted))]">{placement.jobTitle}</span>
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
                    <User className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-medium">Worker</span>
                  </div>
                  <p className="text-base font-semibold text-[hsl(var(--admin-text-primary))]">
                    {placement.worker?.fullName || '-'}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                    {placement.worker?.email || '-'}
                  </p>
                </div>
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Lương</span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
                    {formatCurrency(placement.salary)}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">/tháng</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Địa điểm</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">{placement.location || '-'}</p>
                  {placement.industry && <p className="text-xs text-[hsl(var(--admin-text-muted))]">Ngành: {placement.industry}</p>}
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Thời gian</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                    {formatDate(placement.startDate)}
                  </p>
                  {placement.endDate && (
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                      Đến: {formatDate(placement.endDate)}
                    </p>
                  )}
                </div>
              </div>

              {placement.resignationReason && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Lý do nghỉ</p>
                  <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-1">{placement.resignationReason}</p>
                </div>
              )}

              {/* Status actions */}
              {placement.status === 'active' && !showResignForm && (
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl flex items-center justify-between">
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Cập nhật trạng thái placement</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('promoted')} disabled={updating}
                      className="border-blue-200 text-blue-500 hover:bg-blue-50">
                      Đánh dấu thăng
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowResignForm(true)} disabled={updating}
                      className="border-rose-200 text-rose-500 hover:bg-rose-50">
                      Ghi nhận nghỉ
                    </Button>
                  </div>
                </div>
              )}

              {showResignForm && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Ghi nhận nghỉ việc</p>
                  <textarea
                    value={resignReason}
                    onChange={(e) => setResignReason(e.target.value)}
                    placeholder="Lý do nghỉ việc..."
                    rows={3}
                    className="w-full px-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl
                      bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-primary))]
                      focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleResign} disabled={updating} className="bg-rose-500 hover:bg-rose-600 text-white">
                      {updating ? 'Đang xử lý...' : 'Xác nhận nghỉ'}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowResignForm(false); setResignReason(''); }}>
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Bắt đầu làm việc</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formatDate(placement.startDate)}</p>
                </div>
              </div>
              {placement.resignationReason && (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Nghỉ việc</p>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))]">{placement.resignationReason}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPlacementDetailModal;
