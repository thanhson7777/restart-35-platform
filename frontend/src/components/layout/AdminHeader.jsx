import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Bell, Search, Menu, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui';
import { logoutUser } from '@/redux/user/userSlice';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';

const AdminHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = { name: 'Admin User', email: 'admin@restart35.com', avatar: null, role: 'Quản trị viên' };

  return (
    <header
      className={`
        fixed top-0 right-0 z-[999] h-[60px]
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
        <NotificationDropdown />

        {/* Divider */}
        <div className="h-6 w-px bg-[hsl(var(--admin-border))] mx-2 hidden sm:block" />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); }}
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
