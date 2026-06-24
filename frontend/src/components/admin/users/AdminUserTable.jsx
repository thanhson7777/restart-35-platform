import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Eye, Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Avatar, Skeleton } from '@/components/ui';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const roleLabels = {
  worker: 'Người lao động',
  enterprise: 'Doanh nghiệp',
  trainer: 'Trung tâm đào tạo',
  ngo: 'Tổ chức',
  admin: 'Quản trị'
};

const roleColors = {
  worker: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  trainer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  ngo: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
};

const MenuDropdown = ({ user, onView, onEdit, onToggleStatus, onDelete, onClose, position }) => {
  const menuRef = useRef(null);

  const handleActionClick = (action) => {
    action(user);
    onClose();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 w-48 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl shadow-2xl py-1"
        style={{ top: position.y, left: position.x }}
      >
        <button
          onClick={() => handleActionClick(onView)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))] transition-colors"
        >
          <Eye className="w-4 h-4" />
          Xem chi tiết
        </button>

        <button
          onClick={() => handleActionClick(onToggleStatus)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))] transition-colors"
        >
          {user.isActive ? (
            <>
              <ToggleRight className="w-4 h-4" />
              Vô hiệu hóa
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              Kích hoạt
            </>
          )}
        </button>

      </div>
    </>,
    document.body
  );
};

const AdminUserTable = ({
  users,
  loading,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  selectedUsers,
  onSelectUser,
  onSelectAll
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRefs = useRef({});

  const handleMenuToggle = useCallback((userId, e) => {
    e.stopPropagation();
    if (openMenuId === userId) {
      setOpenMenuId(null);
    } else {
      const button = menuButtonRefs.current[userId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuWidth = 192;
        const menuHeight = 220;
        let x = rect.right - menuWidth;
        let y = rect.bottom + 8;
        if (x < 8) x = 8;
        if (x + menuWidth > window.innerWidth - 8) x = window.innerWidth - menuWidth - 8;
        if (y + menuHeight > window.innerHeight - 8) y = rect.top - menuHeight - 8;
        if (y < 8) y = 8;
        setMenuPosition({ x, y });
      }
      setOpenMenuId(userId);
    }
  }, [openMenuId]);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  if (loading) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[hsl(var(--admin-border))]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 bg-[hsl(var(--admin-surface-elevated))]" />
                <Skeleton className="h-3 w-48 bg-[hsl(var(--admin-surface-elevated))]" />
              </div>
              <Skeleton className="h-6 w-20 bg-[hsl(var(--admin-surface-elevated))]" />
              <Skeleton className="h-4 w-24 bg-[hsl(var(--admin-surface-elevated))]" />
              <Skeleton className="w-8 h-8 bg-[hsl(var(--admin-surface-elevated))]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-[hsl(var(--admin-surface-elevated))] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[hsl(var(--admin-text-muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0M7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[hsl(var(--admin-text-primary))] mb-1">Không có người dùng nào</h3>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
      </div>
    );
  }

  const allSelected = users.length > 0 && users.every((u) => selectedUsers.includes(u._id));
  const openMenuUser = users.find((u) => u._id === openMenuId);

  return (
    <>
      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                <th className="w-12 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked, users)}
                    className="w-4 h-4 rounded border-[hsl(var(--admin-border))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-surface-elevated))]"
                  />
                </th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Người dùng</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Vai trò</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày tham gia</th>
                <th className="w-12 px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--admin-border))]">
              {users.map((user) => {
                const isSelected = selectedUsers.includes(user._id);
                return (
                  <tr
                    key={user._id}
                    className={cn(
                      'hover:bg-[hsl(var(--admin-accent))]/[0.03] transition-colors cursor-pointer border-l-[2px] border-l-transparent hover:border-l-[hsl(var(--admin-accent))]',
                      isSelected && 'bg-[hsl(var(--admin-accent))]/[0.03]'
                    )}
                    onClick={() => onView(user)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); onSelectUser(user._id); }}
                        className="w-4 h-4 rounded border-[hsl(var(--admin-border))] text-[hsl(var(--admin-accent))] focus:ring-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-surface-elevated))]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatar}
                          fallback={user.displayName?.charAt(0) || 'U'}
                          className="w-10 h-10 border border-[hsl(var(--admin-border))]"
                        />
                        <div>
                          <div className="font-medium text-[hsl(var(--admin-text-primary))]">{user.displayName}</div>
                          <div className="text-sm text-[hsl(var(--admin-text-muted))]">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', roleColors[user.role] || 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]')}>
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', user.isActive ? 'text-emerald-500' : 'text-[hsl(var(--admin-text-muted))]')}>
                        <span className={cn('w-2 h-2 rounded-full', user.isActive ? 'bg-emerald-500' : 'bg-[hsl(var(--admin-text-muted))]')} />
                        {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[hsl(var(--admin-text-secondary))]">
                      {user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: vi }) : '-'}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        ref={(el) => (menuButtonRefs.current[user._id] = el)}
                        onClick={(e) => handleMenuToggle(user._id, e)}
                        className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openMenuId && openMenuUser && (
        <MenuDropdown
          user={openMenuUser}
          onView={onView}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onClose={closeMenu}
          position={menuPosition}
        />
      )}
    </>
  );
};

export default AdminUserTable;
