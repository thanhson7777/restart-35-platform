import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Avatar, Button } from '@/components/ui';
import { cn } from '@/utils/cn';

const roleOptions = [
  { value: 'worker', label: 'Người lao động', description: 'Người dùng thông thường' },
  { value: 'enterprise', label: 'Doanh nghiệp', description: 'Tài khoản doanh nghiệp' },
  { value: 'trainer', label: 'Giảng viên', description: 'Người tạo và quản lý khóa học' },
  { value: 'ngo', label: 'Tổ chức', description: 'Tổ chức phi lợi nhuận' },
  { value: 'admin', label: 'Quản trị', description: 'Quản trị viên hệ thống' }
];

const AdminUserEditModal = ({ user, open, onClose, onSave, loading }) => {
  const [formData, setFormData] = useState({ role: '', isActive: true });

  useEffect(() => {
    if (user) {
      setFormData({ role: user.role || '', isActive: user.isActive ?? true });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user._id, formData);
  };

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--admin-border))]">
          <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Chỉnh sửa người dùng</h2>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-[hsl(var(--admin-border))]">
            <div className="flex items-center gap-3">
              <Avatar src={user.avatar} fallback={user.displayName?.charAt(0) || 'U'} className="w-12 h-12 border border-[hsl(var(--admin-border))]" />
              <div>
                <p className="font-medium text-[hsl(var(--admin-text-primary))]">{user.displayName}</p>
                <p className="text-sm text-[hsl(var(--admin-text-muted))]">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-5">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Vai trò</label>
              <div className="space-y-2">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      formData.role === option.value
                        ? 'border-[hsl(var(--admin-accent))]/40 bg-[hsl(var(--admin-accent))]/5'
                        : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-4 h-4 text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{option.label}</p>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))]">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Trạng thái tài khoản</label>
              <div
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer',
                  formData.isActive
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]'
                )}
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              >
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{formData.isActive ? 'Hoạt động' : 'Không hoạt động'}</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))]">{formData.isActive ? 'Người dùng có thể đăng nhập' : 'Người dùng không thể đăng nhập'}</p>
                </div>
                <div className={cn('w-12 h-6 rounded-full transition-colors relative', formData.isActive ? 'bg-[hsl(var(--admin-accent))]' : 'bg-[hsl(var(--admin-surface-elevated))]')}>
                  <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', formData.isActive ? 'left-7' : 'left-1')} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
              Hủy
            </Button>
            <Button type="submit" disabled={loading} isLoading={loading} className="gap-2 rounded-xl">
              <Save className="w-4 h-4" />
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUserEditModal;
