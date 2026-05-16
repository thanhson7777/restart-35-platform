import { X, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const roleLabels = {
  worker: 'Người lao động',
  enterprise: 'Doanh nghiệp',
  trainer: 'Giảng viên',
  ngo: 'Tổ chức',
  admin: 'Quản trị'
};

const roleColors = {
  worker: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-green-100 text-green-700',
  trainer: 'bg-purple-100 text-purple-700',
  ngo: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700'
};

const AdminUserModal = ({ user, open, onClose }) => {
  if (!open || !user) return null;

  const infoItems = [
    {
      icon: Mail,
      label: 'Email',
      value: user.email,
      show: !!user.email
    },
    {
      icon: Phone,
      label: 'Số điện thoại',
      value: user.phone,
      show: !!user.phone
    },
    {
      icon: MapPin,
      label: 'Địa chỉ',
      value: user.address || 'Chưa cập nhật',
      show: true
    },
    {
      icon: Calendar,
      label: 'Ngày tham gia',
      value: user.createdAt
        ? format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: vi })
        : '-',
      show: true
    },
    {
      icon: Shield,
      label: 'Vai trò',
      value: roleLabels[user.role] || user.role,
      show: true,
      isBadge: true
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Chi tiết người dùng</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* User Info */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar
              src={user.avatar}
              fallback={user.displayName?.charAt(0) || 'U'}
              className="w-16 h-16 text-xl"
            />
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{user.displayName}</h3>
              <p className="text-sm text-slate-500">@{user.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    roleColors[user.role] || 'bg-slate-100 text-slate-700'
                  )}
                >
                  {roleLabels[user.role] || user.role}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    user.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      user.isActive ? 'bg-green-500' : 'bg-slate-400'
                    )}
                  />
                  {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </span>
              </div>
            </div>
          </div>

          {/* Info List */}
          <div className="space-y-4">
            {infoItems.map((item, index) => {
              if (!item.show) return null;
              const Icon = item.icon;

              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 mb-0.5">{item.label}</p>
                    {item.isBadge ? (
                      <Badge variant="secondary" className="mt-1">
                        {item.value}
                      </Badge>
                    ) : (
                      <p className="text-sm text-slate-900">{item.value}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;
