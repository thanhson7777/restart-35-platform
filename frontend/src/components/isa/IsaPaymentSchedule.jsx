import { CheckCircle, Clock, XCircle } from 'lucide-react';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const statusConfig = {
  paid: {
    label: 'Đã trả',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: CheckCircle,
    dotClass: 'bg-emerald-500',
  },
  pending: {
    label: 'Chờ thanh toán',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Clock,
    dotClass: 'bg-amber-500',
  },
  skipped: {
    label: 'Bỏ qua',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: Clock,
    dotClass: 'bg-gray-400',
  },
  missed: {
    label: 'Bỏ lỡ',
    className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    icon: XCircle,
    dotClass: 'bg-rose-500',
  },
};

const IsaPaymentSchedule = ({ monthlyRecords }) => {
  if (!monthlyRecords || monthlyRecords.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Chưa có lịch thanh toán</p>
        <p className="text-xs text-gray-400 mt-1">Lịch sẽ xuất hiện khi ISA được kích hoạt</p>
      </div>
    );
  }

  const paidCount = monthlyRecords.filter((r) => r.status === 'paid').length;
  const totalAmount = monthlyRecords.reduce((sum, r) => sum + (r.payment || 0), 0);
  const paidAmount = monthlyRecords.filter((r) => r.status === 'paid').reduce((sum, r) => sum + (r.payment || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch trình thanh toán</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{monthlyRecords.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tổng tháng</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{paidCount}</p>
            <p className="text-xs text-gray-500 mt-1">Đã thanh toán</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(paidAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">Đã trả</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {monthlyRecords.map((record, idx) => {
          const info = statusConfig[record.status] || statusConfig.pending;
          const StatusIcon = info.icon;
          const isPast = record.paidAt || record.status === 'paid';

          return (
            <div key={idx} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${record.status === 'paid' ? 'bg-emerald-500' : record.status === 'pending' ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <StatusIcon className={`w-5 h-5 ${record.status === 'paid' ? 'text-white' : record.status === 'pending' ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{record.month}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">Thu nhập: <strong>{formatCurrency(record.income)}</strong></span>
                  {record.payment > 0 && (
                    <span className="text-xs text-gray-500">Trả: <strong className="text-emerald-600">{formatCurrency(record.payment)}</strong></span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {record.paidAt && (
                  <span className="text-xs text-gray-400">{new Date(record.paidAt).toLocaleDateString('vi-VN')}</span>
                )}
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${info.className}`}>
                  {info.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IsaPaymentSchedule;
