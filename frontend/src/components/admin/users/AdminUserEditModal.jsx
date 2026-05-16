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
  const [formData, setFormData] = useState({
    role: '',
    isActive: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        role: user.role || '',
        isActive: user.isActive ?? true
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user._id, formData);
  };

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Chỉnh sửa người dùng</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* User Info */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Avatar
                src={user.avatar}
                fallback={user.displayName?.charAt(0) || 'U'}
                className="w-12 h-12"
              />
              <div>
                <p className="font-medium text-slate-900">{user.displayName}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="px-6 py-4 space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vai trò
              </label>
              <div className="space-y-2">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      formData.role === option.value
                        ? 'border-slate-400 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      className="w-4 h-4 text-slate-600 focus:ring-slate-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trạng thái tài khoản
              </label>
              <div
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                  formData.isActive
                    ? 'border-green-200 bg-green-50'
                    : 'border-slate-200 bg-slate-50'
                )}
                onClick={() =>
                  setFormData({ ...formData, isActive: !formData.isActive })
                }
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formData.isActive ? 'Hoạt động' : 'Không hoạt động'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formData.isActive
                      ? 'Người dùng có thể đăng nhập'
                      : 'Người dùng không thể đăng nhập'}
                  </p>
                </div>
                <div
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    formData.isActive ? 'bg-green-500' : 'bg-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      formData.isActive ? 'left-7' : 'left-1'
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              className="gap-2"
            >
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
