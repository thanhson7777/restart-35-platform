import { Eye, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { BookOpen } from 'lucide-react';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const typeConfig = {
  isa: { label: 'ISA', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  income_based: { label: 'Income Based', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  full_isa: { label: 'Full ISA', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const AdminFundingRow = ({ config, onView, onEdit }) => {
  const typeInfo = typeConfig[config.type] || { label: config.type, className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' };

  return (
    <tr className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))] truncate max-w-[200px]">
              {config.courseName || config.courseId || 'Khóa học'}
            </p>
            <span className="text-xs text-[hsl(var(--admin-text-muted))] font-mono">
              {typeof config.courseId === 'string' ? config.courseId.slice(-8) : config.courseId}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${typeInfo.className}`}>
          {typeInfo.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="font-semibold text-[hsl(var(--admin-text-primary))]">{config.percentage}%</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
            ngưỡng: {formatCurrency(config.incomeThreshold)}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm space-y-0.5">
          <p className="text-[hsl(var(--admin-text-primary))]">
            {config.maxAmount ? `max ${formatCurrency(config.maxAmount)}` : '-'}
          </p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
            {config.minAmount ? `min ${formatCurrency(config.minAmount)}` : 'no min'}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-[hsl(var(--admin-text-secondary))]">
            {config.gracePeriod ? `${config.gracePeriod} tháng` : '-'}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${
          config.isActive
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            : 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]'
        }`}>
          {config.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onView?.(config)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors" title="Xem chi tiết">
            <Eye className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          </button>
          <button onClick={() => onEdit?.(config)} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors" title="Chỉnh sửa">
            <Pencil className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const AdminFundingList = ({ configs, loading, onView, onEdit }) => {
  if (!loading && configs.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-12 h-12 text-[hsl(var(--admin-text-muted))] opacity-30 mb-3" />
          <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có funding config nào</p>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Tạo config mới để bắt đầu</p>
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
              {['Khóa học', 'Loại', 'Tỷ lệ', 'Số tiền', 'Grace Period', 'Trạng thái', 'Hành động'].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--admin-border))]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[hsl(var(--admin-border))]">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : (
              configs.map((config) => (
                <AdminFundingRow key={config._id || config.id} config={config} onView={onView} onEdit={onEdit} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFundingList;
