import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Bell, Search, Menu, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui';
import { logoutUser } from '@/redux/user/userSlice';

const AdminHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: 1, title: 'Đơn đăng ký mới', message: 'Nguyễn Văn A đã đăng ký khóa học mới', time: '5 phút trước', unread: true },
    { id: 2, title: 'Yêu cầu học bổng', message: 'Trần Thị B yêu cầu học bổng khẩn cấp', time: '15 phút trước', unread: true },
    { id: 3, title: 'Cập nhật hồ sơ', message: 'Lê Văn C đã cập nhật hồ sơ cá nhân', time: '1 giờ trước', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;
  const currentUser = { name: 'Admin User', email: 'admin@restart35.com', avatar: null, role: 'Quản trị viên' };

  return (
    <header
      className={`
        fixed top-0 right-0 z-30 h-[60px]
        bg-[hsl(var(--admin-sidebar))] border-b border-[hsl(var(--admin-border))]
        transition-all duration-300 flex items-center justify-between px-6
        ${sidebarCollapsed ? 'left-16' : 'left-64'}
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] transition-all duration-200"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))] pointer-events-none" />
          <input
            type="search"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 pr-4 py-2 rounded-xl text-[13px]
              text-[hsl(var(--admin-text-primary))]
              bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]
              placeholder:text-[hsl(var(--admin-text-muted))]
              focus:outline-none focus:border-[hsl(var(--admin-accent))] focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/20
              transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        <button className="md:hidden p-2 rounded-xl text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] transition-all duration-200">
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="relative p-2 rounded-xl text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] transition-all duration-200"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[hsl(var(--admin-accent))] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50
                    bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]
                    shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                >
                  <div className="px-4 py-3 border-b border-[hsl(var(--admin-border))] flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-[hsl(var(--admin-text-primary))]">Thông báo</h3>
                    <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 cursor-pointer border-b border-[hsl(var(--admin-border))]/60 last:border-0 transition-colors duration-150 hover:bg-[hsl(var(--admin-surface-hover))] ${
                          notification.unread ? 'bg-[hsl(var(--admin-accent-subtle))]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {notification.unread && (
                            <span className="w-2 h-2 bg-[hsl(var(--admin-accent))] rounded-full mt-[6px] shrink-0" />
                          )}
                          <div className={notification.unread ? '' : 'ml-5'}>
                            <p className="text-[13px] font-medium text-[hsl(var(--admin-text-primary))] leading-snug">{notification.title}</p>
                            <p className="text-[11px] text-[hsl(var(--admin-text-muted))] mt-0.5 leading-snug">{notification.message}</p>
                            <p className="text-[10px] text-[hsl(var(--admin-text-faint))] mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
                    <Link
                      to="/admin/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block text-center text-[12px] text-[hsl(var(--admin-accent))] hover:text-[hsl(var(--admin-accent-hover))] font-medium transition-colors"
                    >
                      Xem tất cả thông báo
                    </Link>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-[hsl(var(--admin-border))] mx-2 hidden sm:block" />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[hsl(var(--admin-surface-hover))] transition-all duration-200 group"
          >
            <Avatar
              src={currentUser.avatar}
              fallback={currentUser.name?.charAt(0) || 'A'}
              size="sm"
              className="hidden sm:flex border border-[hsl(var(--admin-border))]"
            />
            <div className="hidden sm:block text-left leading-none">
              <p className="text-[13px] font-medium text-[hsl(var(--admin-text-primary))] group-hover:text-[hsl(var(--admin-accent))] transition-colors leading-snug">{currentUser.name}</p>
              <p className="text-[11px] text-[hsl(var(--admin-text-muted))] mt-0.5">{currentUser.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--admin-text-muted))] group-hover:text-[hsl(var(--admin-text-secondary))] transition-colors hidden sm:block" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden z-50
                    bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]
                    shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                >
                  <div className="px-4 py-3.5 border-b border-[hsl(var(--admin-border))]">
                    <p className="text-[13px] font-semibold text-[hsl(var(--admin-text-primary))]">{currentUser.name}</p>
                    <p className="text-[11px] text-[hsl(var(--admin-text-muted))] mt-0.5">{currentUser.email}</p>
                  </div>
                  <div className="py-1.5">
                    <Link to="/admin/profile" onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-accent-subtle))] transition-all duration-150 rounded-xl mx-1.5">
                      Hồ sơ cá nhân
                    </Link>
                    <Link to="/admin/settings" onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-accent-subtle))] transition-all duration-150 rounded-xl mx-1.5">
                      Cài đặt
                    </Link>
                  </div>
                  <div className="py-1.5 border-t border-[hsl(var(--admin-border))]">
                    <button
                      onClick={() => {
                        dispatch(logoutUser());
                        navigate('/auth');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger-subtle))] transition-all duration-150 rounded-xl mx-1.5"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
