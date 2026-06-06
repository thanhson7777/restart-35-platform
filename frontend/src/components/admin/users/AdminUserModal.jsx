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
  worker: 'bg-[hsl(var(--admin-accent))]/10 text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/20',
  enterprise: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  trainer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  ngo: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
};

const AdminUserModal = ({ user, open, onClose }) => {
  if (!open || !user) return null;

  const infoItems = [
    { icon: Mail, label: 'Email', value: user.email, show: !!user.email },
    { icon: Phone, label: 'Số điện thoại', value: user.phone, show: !!user.phone },
    { icon: MapPin, label: 'Địa chỉ', value: user.address || 'Chưa cập nhật', show: true },
    { icon: Calendar, label: 'Ngày tham gia', value: user.createdAt ? format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: vi }) : '-', show: true },
    { icon: Shield, label: 'Vai trò', value: roleLabels[user.role] || user.role, show: true, isBadge: true }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--admin-border))]">
          <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Chi tiết người dùng</h2>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar
              src={user.avatar}
              fallback={user.displayName?.charAt(0) || 'U'}
              className="w-16 h-16 text-xl border border-[hsl(var(--admin-border))]"
            />
            <div>
              <h3 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">{user.displayName}</h3>
              <p className="text-sm text-[hsl(var(--admin-text-muted))]">@{user.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', roleColors[user.role] || 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]')}>
                  {roleLabels[user.role] || user.role}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', user.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', user.isActive ? 'bg-emerald-500' : 'bg-[hsl(var(--admin-text-muted))]')} />
                  {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {infoItems.map((item, index) => {
              if (!item.show) return null;
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg shrink-0">
                    <Icon className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[hsl(var(--admin-text-muted))] mb-0.5">{item.label}</p>
                    {item.isBadge ? (
                      <Badge className="mt-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">{item.value}</Badge>
                    ) : (
                      <p className="text-sm text-[hsl(var(--admin-text-primary))]">{item.value}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;
