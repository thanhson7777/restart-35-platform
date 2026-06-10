import { CheckCircle, Clock, XCircle, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatMonth = (monthStr) => {
  if (!monthStr) return ''
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
}

const statusConfig = {
  paid: {
    label: 'Da tra',
    labelVn: 'Da tra',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: CheckCircle,
    dotClass: 'bg-emerald-500',
  },
  pending: {
    label: 'Cho thanh toan',
    labelVn: 'Cho thanh toan',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Clock,
    dotClass: 'bg-amber-500',
  },
  skipped: {
    label: 'Bo qua',
    labelVn: 'Bo qua',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: Clock,
    dotClass: 'bg-gray-400',
  },
  missed: {
    label: 'Bo lo',
    labelVn: 'Bo lo',
    className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    icon: XCircle,
    dotClass: 'bg-rose-500',
  },
};

const IsaPaymentSchedule = ({ monthlyRecords, isa }) => {
  if (!monthlyRecords || monthlyRecords.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Chua co lich thanh toan</p>
        <p className="text-xs text-gray-400 mt-1">Lich se xuat hien khi ISA duoc kich hoat</p>
      </div>
    );
  }

  const paidCount = monthlyRecords.filter((r) => r.status === 'paid').length;
  const totalAmount = monthlyRecords.reduce((sum, r) => sum + (r.payment || 0), 0);
  const paidAmount = monthlyRecords.filter((r) => r.status === 'paid').reduce((sum, r) => sum + (r.payment || 0), 0);
  const remainingAmount = totalAmount - paidAmount;
  const progressPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // Find next pending payment
  const nextPayment = monthlyRecords.find(r => r.status === 'pending')
  const missedPayments = monthlyRecords.filter(r => r.status === 'missed')

  // Chart data
  const chartData = monthlyRecords.map(r => ({
    month: formatMonth(r.month),
    paid: r.status === 'paid' ? (r.payment || 0) : 0,
    income: r.income || 0
  }))

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tien do tra no</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">{progressPercent}%</span>
              <span className="font-medium text-gray-900">{formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{monthlyRecords.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tong thang</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{paidCount}</p>
            <p className="text-xs text-gray-500 mt-1">Da thanh toan</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(remainingAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">Con phai tra</p>
          </div>
        </div>
      </div>

      {/* Due Date Reminder */}
      {nextPayment && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Thanh toan ky tiep</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ky {nextPayment.month} - So tien: {formatCurrency(nextPayment.payment || 0)}
              {nextPayment.dueDate && ` - Han: ${new Date(nextPayment.dueDate).toLocaleDateString('vi-VN')}`}
            </p>
          </div>
        </div>
      )}

      {/* Missed Payments Warning */}
      {missedPayments.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-800">Canh bao: {missedPayments.length} ky chua tra</p>
            <p className="text-xs text-rose-600 mt-0.5">
              {missedPayments.map(p => p.month).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Payment Chart */}
      {chartData.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Bieu do thu nhap & thanh toan</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis dataKey="month" fontSize={11} tickLine={false} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="income" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Thu nhap" />
              <Area type="monotone" dataKey="paid" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Da tra" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-0.5 bg-indigo-500" />
              <span>Thu nhap</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-0.5 bg-green-500" />
              <span>Da tra</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Timeline */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Lich su thanh toan</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {monthlyRecords.map((record, idx) => {
            const info = statusConfig[record.status] || statusConfig.pending;
            const StatusIcon = info.icon;

            return (
              <div key={idx} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${record.status === 'paid' ? 'bg-emerald-500' : record.status === 'pending' ? 'bg-amber-500' : record.status === 'missed' ? 'bg-rose-500' : 'bg-gray-200'}`}>
                  <StatusIcon className={`w-5 h-5 ${record.status === 'paid' ? 'text-white' : record.status === 'pending' ? 'text-white' : record.status === 'missed' ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{record.month}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">Thu nhap: <strong>{formatCurrency(record.income)}</strong></span>
                    {record.payment > 0 && (
                      <span className="text-xs text-gray-500">Tra: <strong className="text-emerald-600">{formatCurrency(record.payment)}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.paidAt && (
                    <span className="text-xs text-gray-400">{new Date(record.paidAt).toLocaleDateString('vi-VN')}</span>
                  )}
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${info.className}`}>
                    {info.labelVn}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IsaPaymentSchedule;
