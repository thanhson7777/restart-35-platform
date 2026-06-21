import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, UserCircle as LucideUserCircle, Settings, Briefcase, BookOpen, FileCheck, CalendarCheck, LogOut, Home } from 'lucide-react';
import { ChatCircle } from '@phosphor-icons/react';
import { Button, Avatar } from '@/components/ui';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, logoutUser } from '@/redux/user/userSlice';

const RoleHeader = ({ title, subtitle, onMenuClick, sidebarCollapsed }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className={`
      fixed top-0 right-0 z-20 h-[64px]
      border-b border-[hsl(var(--admin-border))]
      bg-[hsl(var(--admin-sidebar))]/95 backdrop-blur-xl
      transition-all duration-300
      ${sidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'}
    `}>
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]"
          >
            <Menu size={18} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] truncate">{title}</h1>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">

          <Button variant="ghost" size="icon" className="text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]">
            <Bell size={17} />
          </Button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] px-2.5 py-1.5 hover:bg-[hsl(var(--admin-surface-hover))] transition-colors duration-200"
            >
              <Avatar
                src={currentUser?.avatar}
                fallback={currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                className="h-8 w-8"
              />
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-semibold text-[hsl(var(--admin-text-primary))]">
                  {['enterprise', 'ngo', 'trainer'].includes(currentUser?.role) ? (currentUser?.organization?.name || currentUser?.companyName || currentUser?.displayName) : (currentUser?.displayName || 'Người dùng')}
                </p>
                <p className="text-[11px] text-[hsl(var(--admin-text-muted))] capitalize">{currentUser?.role || 'member'}</p>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-[hsl(var(--admin-text-muted))] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50"
                >
                  <div className="px-4 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={currentUser?.avatar}
                        fallback={currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        className="h-10 w-10 ring-2 ring-white shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[hsl(var(--foreground))] text-sm truncate">
                          {['enterprise', 'ngo', 'trainer'].includes(currentUser?.role) ? (currentUser?.organization?.name || currentUser?.companyName || currentUser?.displayName) : (currentUser?.displayName || currentUser?.username || 'Người dùng')}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{currentUser?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <Link
                      to="/"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-[hsl(var(--foreground))] hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-sm"
                    >
                      <Home size={17} className="text-emerald-500 shrink-0" />
                      Quay lại trang chủ
                    </Link>
                  </div>

                  <div className="border-t border-zinc-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl w-full text-red-500 hover:bg-red-50 transition-colors text-sm"
                    >
                      <LogOut size={17} className="shrink-0" />
                      Đăng xuất
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RoleHeader;
