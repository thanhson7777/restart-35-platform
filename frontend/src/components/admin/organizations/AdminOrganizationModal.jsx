import { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';

const TYPE_OPTIONS = [
  { value: 'enterprise', label: 'Doanh nghiệp' },
  { value: 'ngo', label: 'Tổ chức NGO' },
  { value: 'training_center', label: 'Trung tâm đào tạo' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Không hoạt động' },
  { value: 'suspended', label: 'Tạm ngưng' },
];

const AdminOrganizationModal = ({ open, onClose, onSubmit, organization, loading }) => {
  const isEdit = !!organization?._id;
  const [form, setForm] = useState({
    name: '',
    type: 'enterprise',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    quota: { total: 100, used: 0 },
  });

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || '',
        type: organization.type || 'enterprise',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        status: organization.status || 'active',
        quota: organization.quota || { total: 100, used: 0 },
      });
    } else {
      setForm({ name: '', type: 'enterprise', email: '', phone: '', address: '', status: 'active', quota: { total: 100, used: 0 } });
    }
  }, [organization, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">
                {isEdit ? 'Chỉnh sửa đối tác' : 'Thêm đối tác mới'}
              </h2>
              <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                {isEdit ? `ID: ${organization._id}` : 'Tạo đối tác mới trong hệ thống'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Tên đối tác <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Công ty TNHH ABC"
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                placeholder:text-[hsl(var(--admin-text-muted))]
                focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
                focus:border-[hsl(var(--admin-accent))]/50 text-sm"
            />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
                Loại hình <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contact@company.com"
                className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  placeholder:text-[hsl(var(--admin-text-muted))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
                  focus:border-[hsl(var(--admin-accent))]/50 text-sm"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Số điện thoại
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0912 345 678"
                className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  placeholder:text-[hsl(var(--admin-text-muted))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
                  focus:border-[hsl(var(--admin-accent))]/50 text-sm"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Địa chỉ
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
                className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                  bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                  placeholder:text-[hsl(var(--admin-text-muted))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
                  focus:border-[hsl(var(--admin-accent))]/50 text-sm"
              />
            </div>
          </div>

          {/* Quota */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-1.5">
              Tổng quota học viên
            </label>
            <input
              type="number"
              min="0"
              value={form.quota.total}
              onChange={(e) => setForm((f) => ({ ...f, quota: { ...f.quota, total: Number(e.target.value) } }))}
              className="w-full px-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
                bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
                focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
                focus:border-[hsl(var(--admin-accent))]/50 text-sm"
            />
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">
              Số lượng học viên tối đa đối tác có thể đăng ký
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            className="rounded-xl"
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo đối tác'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrganizationModal;
