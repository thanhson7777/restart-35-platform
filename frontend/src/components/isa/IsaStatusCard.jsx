import { Progress } from '@/components/ui';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const statusConfig = {
  pending: {
    label: 'Chờ kích hoạt',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  active: {
    label: 'Đang hoạt động',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  completed: {
    label: 'Đã hoàn thành',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  default: {
    label: 'Vi phạm',
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

const IsaStatusCard = ({ isa }) => {
  if (!isa) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có ISA</h3>
        <p className="text-sm text-gray-500">Bạn chưa có ISA nào. ISA sẽ được tạo khi bạn đăng ký khóa học có hỗ trợ ISA.</p>
      </div>
    );
  }

  const statusInfo = statusConfig[isa.status] || statusConfig.pending;
  const paidPercent = isa.totalAmount > 0 ? Math.round((isa.totalPaid / isa.totalAmount) * 100) : 0;
  const remaining = (isa.totalAmount || 0) - (isa.totalPaid || 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">ISA của tôi</h3>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border ${statusInfo.className}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        <div className="mb-5">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Tổng số tiền phải trả</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(isa.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Đã trả</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(isa.totalPaid)}</p>
            </div>
          </div>
          <Progress value={paidPercent} className="h-2" />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-gray-500">{paidPercent}% đã thanh toán</span>
            <span className="text-xs text-rose-500 font-medium">Còn lại: {formatCurrency(remaining)}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Tỷ lệ trả</p>
          <p className="text-xl font-bold text-gray-900">{isa.percentage}%</p>
          <p className="text-xs text-gray-500 mt-1">thu nhập hàng tháng</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Ngưỡng thu nhập</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(isa.incomeThreshold)}</p>
          <p className="text-xs text-gray-500 mt-1">tối thiểu mỗi tháng</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Bắt đầu</p>
          <p className="text-base font-semibold text-gray-900">
            {isa.startDate ? new Date(isa.startDate).toLocaleDateString('vi-VN') : '-'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Kết thúc</p>
          <p className="text-base font-semibold text-gray-900">
            {isa.endDate ? new Date(isa.endDate).toLocaleDateString('vi-VN') : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IsaStatusCard;
