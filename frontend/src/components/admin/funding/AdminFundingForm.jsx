import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { createFundingConfig, updateFundingConfig } from '@/apis';

const TYPE_OPTIONS = [
  { value: 'isa', label: 'ISA - Income Share Agreement' },
  { value: 'income_based', label: 'Income Based - Thanh toán theo thu nhập' },
  { value: 'full_isa', label: 'Full ISA - 100% miễn phí trước' },
];

const AdminFundingForm = ({ config, open, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    courseId: config?.courseId || '',
    type: config?.type || 'isa',
    percentage: config?.percentage || 10,
    incomeThreshold: config?.incomeThreshold || 5000000,
    maxAmount: config?.maxAmount || '',
    minAmount: config?.minAmount || '',
    gracePeriod: config?.gracePeriod || 6,
    isActive: config?.isActive !== undefined ? config.isActive : true,
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseId) {
      toast.error('Vui lòng nhập Course ID');
      return;
    }
    try {
      setLoading(true);
      const payload = { ...form };
      if (!payload.maxAmount) payload.maxAmount = null;
      if (!payload.minAmount) payload.minAmount = null;

      let response;
      if (config?.courseId) {
        response = await updateFundingConfig(config.courseId, payload);
      } else {
        response = await createFundingConfig(payload);
      }
      if (response.success) {
        toast.success(config?.courseId ? 'Cập nhật thành công' : 'Tạo mới thành công');
        onSaved?.();
        onClose();
      } else {
        toast.error(response.message || 'Thao tác thất bại');
      }
    } catch (error) {
      toast.error('Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">
            {config?.courseId ? 'Chỉnh sửa Funding Config' : 'Tạo Funding Config mới'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Course ID</label>
            <input
              type="text"
              value={form.courseId}
              onChange={(e) => handleChange('courseId', e.target.value)}
              placeholder="65f..."
              disabled={!!config?.courseId}
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Loại Funding</label>
            <select
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Tỷ lệ trả (%)</label>
              <input
                type="number" min="0" max="100" step="0.5"
                value={form.percentage}
                onChange={(e) => handleChange('percentage', parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Grace Period (tháng)</label>
              <input
                type="number" min="0"
                value={form.gracePeriod}
                onChange={(e) => handleChange('gracePeriod', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Ngưỡng thu nhập tối thiểu (VND)</label>
            <input
              type="number" min="0"
              value={form.incomeThreshold}
              onChange={(e) => handleChange('incomeThreshold', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Số tiền tối thiểu (VND)</label>
              <input
                type="number" min="0"
                value={form.minAmount}
                onChange={(e) => handleChange('minAmount', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="0 (không giới hạn)"
                className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Số tiền tối đa (VND)</label>
              <input
                type="number" min="0"
                value={form.maxAmount}
                onChange={(e) => handleChange('maxAmount', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="0 (không giới hạn)"
                className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleChange('isActive', !form.isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-[hsl(var(--admin-text-secondary))]">
              {form.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
            </span>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2 rounded-xl">
            {loading ? 'Đang lưu...' : (config?.courseId ? 'Cập nhật' : 'Tạo mới')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminFundingForm;
