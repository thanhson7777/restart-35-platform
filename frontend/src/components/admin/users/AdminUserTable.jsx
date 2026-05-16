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

const MenuDropdown = ({ user, onView, onEdit, onToggleStatus, onDelete, onClose, position }) => {
  const menuRef = useRef(null);

  const handleActionClick = (action) => {
    action(user);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150"
        style={{ top: position.y, left: position.x }}
      >
        <button
          onClick={() => handleActionClick(onView)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Xem chi tiết
        </button>
        <button
          onClick={() => handleActionClick(onEdit)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Chỉnh sửa
        </button>
        <button
          onClick={() => handleActionClick(onToggleStatus)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
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
        <div className="border-t border-slate-100 my-1" />
        <button
          onClick={() => handleActionClick(onDelete)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Xóa
        </button>
      </div>
    </>
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
        const menuWidth = 192; // w-48 = 192px
        const menuHeight = 220; // approximate menu height

        let x = rect.right - menuWidth;
        let y = rect.bottom + 8;

        // Ensure menu doesn't go off-screen horizontally
        if (x < 8) x = 8;
        if (x + menuWidth > window.innerWidth - 8) {
          x = window.innerWidth - menuWidth - 8;
        }

        // If not enough space below, show above
        if (y + menuHeight > window.innerHeight - 8) {
          y = rect.top - menuHeight - 8;
        }

        // Ensure menu doesn't go above viewport
        if (y < 8) y = 8;

        setMenuPosition({ x, y });
      }
      setOpenMenuId(userId);
    }
  }, [openMenuId]);

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="w-8 h-8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-1">Không có người dùng nào</h3>
        <p className="text-sm text-slate-500">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
      </div>
    );
  }

  const allSelected = users.length > 0 && users.every((u) => selectedUsers.includes(u._id));
  const openMenuUser = users.find((u) => u._id === openMenuId);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked, users)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Ngày tham gia
                </th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelected = selectedUsers.includes(user._id);

                return (
                  <tr
                    key={user._id}
                    className={cn(
                      'hover:bg-slate-50 transition-colors cursor-pointer',
                      isSelected && 'bg-slate-50'
                    )}
                    onClick={() => onView(user)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelectUser(user._id);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatar}
                          fallback={user.displayName?.charAt(0) || 'U'}
                          className="w-10 h-10"
                        />
                        <div>
                          <div className="font-medium text-slate-900">{user.displayName}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                          roleColors[user.role] || 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-sm font-medium',
                          user.isActive ? 'text-green-600' : 'text-slate-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            user.isActive ? 'bg-green-500' : 'bg-slate-300'
                          )}
                        />
                        {user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {user.createdAt
                        ? format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: vi })
                        : '-'}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        ref={(el) => (menuButtonRefs.current[user._id] = el)}
                        onClick={(e) => handleMenuToggle(user._id, e)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portal Dropdown Menu */}
      {openMenuId && openMenuUser && createPortal(
        <MenuDropdown
          user={openMenuUser}
          onView={onView}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onClose={closeMenu}
          position={menuPosition}
        />,
        document.body
      )}
    </>
  );
};

export default AdminUserTable;
