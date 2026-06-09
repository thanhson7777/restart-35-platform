import { useState } from 'react';
import { X, User, BookOpen, DollarSign, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Badge, Progress, SafeImage } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { activateIsaRepayment } from '@/apis';

const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const statusConfig = {
  pending: { label: 'Chờ kích hoạt', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: ClockIcon },
  active: { label: 'Đang hoạt động', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  completed: { label: 'Đã hoàn thành', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: CheckCircle },
  default: { label: 'Vi phạm', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: AlertTriangle },
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

const AdminIsaDetailModal = ({ isa, open, onClose, onActivated }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activating, setActivating] = useState(false);

  if (!open || !isa) return null;

  const statusInfo = statusConfig[isa.status] || { label: isa.status, className: '', icon: ClockIcon };
  const StatusIcon = statusInfo.icon;
  const paidPercent = isa.totalAmount > 0 ? Math.round((isa.totalPaid / isa.totalAmount) * 100) : 0;
  const monthlyRecords = isa.monthlyRecords || [];
  const paidRecords = monthlyRecords.filter((r) => r.status === 'paid');

  const tabs = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'payments', label: 'Lịch sử thanh toán' },
    { key: 'course', label: 'Khóa học' },
  ];

  const handleActivate = async () => {
    try {
      setActivating(true);
      const response = await activateIsaRepayment(isa._id || isa.id);
      if (response.success) {
        toast.success('ISA đã được kích hoạt thành công');
        onActivated?.();
        onClose();
      } else {
        toast.error(response.message || 'Kích hoạt ISA thất bại');
      }
    } catch (error) {
      toast.error('Kích hoạt ISA thất bại');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <SafeImage
              src={isa.worker?.avatar || 'https://picsum.photos/seed/worker/80/80'}
              alt={isa.worker?.fullName || 'Worker'}
              className="w-12 h-12 rounded-full object-cover bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]"
            />
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">
                ISA - {isa.worker?.fullName || 'Worker'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </span>
                {isa.worker?.email && (
                  <span className="text-xs text-[hsl(var(--admin-text-muted))]">{isa.worker.email}</span>
                )}
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
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Financial summary */}
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-[hsl(var(--admin-text-muted))]">Tổng số tiền</span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
                    {formatCurrency(isa.totalAmount)}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-[hsl(var(--admin-text-muted))] mb-1.5">
                      <span>Đã thanh toán</span>
                      <span className="text-emerald-500 font-semibold">{formatCurrency(isa.totalPaid)}</span>
                    </div>
                    <Progress value={paidPercent} className="h-2" />
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1.5">
                      Còn lại: <span className="text-rose-500 font-semibold">{formatCurrency(isa.totalAmount - isa.totalPaid)}</span>
                    </p>
                  </div>
                </div>

                {/* ISA terms */}
                <div className="p-5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-[hsl(var(--admin-text-muted))]">Điều khoản ISA</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[hsl(var(--admin-text-muted))]">Tỷ lệ trả</span>
                      <span className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">{isa.percentage}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[hsl(var(--admin-text-muted))]">Ngưỡng thu nhập</span>
                      <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formatCurrency(isa.incomeThreshold)}/tháng</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[hsl(var(--admin-text-muted))]">Tháng đã trả</span>
                      <span className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{paidRecords.length} / {monthlyRecords.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Thời gian</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                    {formatDate(isa.startDate)} - {formatDate(isa.endDate)}
                  </p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <User className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-medium">Worker</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                    {isa.worker?.fullName || '-'}
                  </p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                    {isa.worker?.email || isa.worker?.phone || '-'}
                  </p>
                </div>
              </div>

              {/* Activate button */}
              {isa.status === 'pending' && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">ISA đang chờ kích hoạt</p>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Bạn có thể kích hoạt ISA này để bắt đầu theo dõi</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleActivate}
                    disabled={activating}
                    className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {activating ? 'Đang kích hoạt...' : 'Kích hoạt ISA'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              {monthlyRecords.length === 0 ? (
                <div className="text-center py-12 text-[hsl(var(--admin-text-muted))]">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Chưa có bản ghi thanh toán nào</p>
                </div>
              ) : (
                monthlyRecords.map((record, idx) => {
                  const paymentStatus = {
                    paid: { label: 'Đã trả', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
                    pending: { label: 'Chờ', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                    skipped: { label: 'Bỏ qua', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
                  }[record.status] || { label: record.status, className: '' };

                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          record.status === 'paid' ? 'bg-emerald-500/10' : 'bg-[hsl(var(--admin-surface))]'
                        }`}>
                          {record.status === 'paid' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <span className="text-sm font-bold text-[hsl(var(--admin-text-muted))]">{idx + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))]">{record.month}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                            Thu nhập: {formatCurrency(record.income)} · Thanh toán: {formatCurrency(record.payment)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${paymentStatus.className}`}>
                          {paymentStatus.label}
                        </span>
                        {record.paidAt && (
                          <span className="text-xs text-[hsl(var(--admin-text-muted))]">
                            {formatDate(record.paidAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'course' && (
            <div>
              {isa.courseId ? (
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl flex items-center gap-4">
                  <BookOpen className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Khóa học: {isa.courseId}</p>
                    {isa.enrollmentId && (
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">Enrollment: {isa.enrollmentId}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-[hsl(var(--admin-text-muted))]">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Chưa có thông tin khóa học</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminIsaDetailModal;
