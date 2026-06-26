import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, Search, Menu, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { selectCurrentUser, logoutUser } from '@/redux/user/userSlice';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';

const TrainerHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = useSelector(selectCurrentUser) || {
    displayName: 'Trainer User',
    email: 'trainer@restart35.com',
    avatar: null,
    role: 'trainer',
  };


  return (
    <header
      className={`
        fixed top-0 right-0 z-30 h-16
        bg-[hsl(var(--admin-sidebar))] border-b border-[hsl(var(--admin-border))]
        text-[hsl(var(--admin-text-primary))]
        transition-all duration-300 flex items-center justify-between px-6
        ${sidebarCollapsed ? 'left-20' : 'left-64'}
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-[hsl(var(--admin-surface-hover))] rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))] pointer-events-none" />
          <input
            type="search"
            placeholder="Tìm kiếm học viên, khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 pr-4 py-2 rounded-xl text-[13px]
              bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]
              text-[hsl(var(--admin-text-primary))]
              placeholder:text-[hsl(var(--admin-text-muted))]
              focus:outline-none focus:border-[hsl(var(--admin-accent))]/40
              transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search Toggle (Mobile) */}
        <button className="md:hidden p-2 hover:bg-[hsl(var(--admin-surface-hover))] rounded-lg transition-colors">
          <Search className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Divider */}
        <div className="h-8 w-px bg-[hsl(var(--admin-border))] mx-2 hidden sm:block" />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1.5 hover:bg-[hsl(var(--admin-surface-hover))] rounded-lg transition-colors text-left"
          >
            <Avatar
              src={currentUser.avatar}
              fallback={currentUser.displayName?.charAt(0) || 'T'}
              size="sm"
              className="hidden sm:flex border border-[hsl(var(--admin-border))]"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none text-[hsl(var(--admin-text-primary))]">{currentUser.displayName || 'Trainer'}</p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1 capitalize">{currentUser.role || 'trainer'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[hsl(var(--admin-text-muted))] hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-2 w-56
                bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]
                rounded-xl shadow-[var(--admin-shadow-lg)] z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--admin-border))]">
                  <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))]">{currentUser.displayName || 'Trainer'}</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate mt-0.5">{currentUser.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/"
                    className="block px-4 py-2 text-xs text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] transition-colors"
                    onClick={() => setShowProfile(false)}
                  >
                    Về Trang chủ
                  </Link>
                </div>
                <div className="py-1 border-t border-[hsl(var(--admin-border))]">
                  <button
                    onClick={() => {
                      dispatch(logoutUser());
                      navigate('/auth');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger-subtle))] transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TrainerHeader;
