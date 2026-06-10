import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { cn } from '@/utils/cn';
import { logoutUser } from '@/redux/user/userSlice';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Briefcase,
  Star,
  Handshake,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui';

const trainerNavItems = [
  { title: 'Tổng quan', href: '/trainer', icon: LayoutDashboard },
  { title: 'Học viên', href: '/trainer/enrollments', icon: Users },
  { title: 'Khóa học', href: '/trainer/courses', icon: BookOpen },
  { title: 'Lịch dạy', href: '/trainer/schedule', icon: Calendar },
  { title: 'Partnership', href: '/trainer/partnerships', icon: Handshake },
  { title: 'Việc làm', href: '/trainer/placements', icon: Briefcase },
  { title: 'Đánh giá', href: '/trainer/reviews', icon: Star },
];

const TrainerSidebar = ({ collapsed, onToggle }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (href) =>
    href === '/trainer'
      ? location.pathname === '/trainer'
      : location.pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col admin-sidebar-gradient transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--admin-border))]">
        {!collapsed && (
          <Link to="/trainer" className="flex items-center gap-2">
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 opacity-90" />
              <div className="absolute inset-[2px] rounded-[7px] bg-[hsl(var(--admin-sidebar))] flex items-center justify-center">
                <span className="text-[14px] font-bold bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 bg-clip-text text-transparent leading-none">T</span>
              </div>
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-[15px] block truncate text-[hsl(var(--admin-text-primary))]">Restart 35+</span>
              <span className="block text-[11px] text-[hsl(var(--admin-text-muted))]">Trainer Panel</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="relative w-8 h-8 mx-auto shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 opacity-90" />
            <div className="absolute inset-[2px] rounded-[7px] bg-[hsl(var(--admin-sidebar))] flex items-center justify-center">
              <span className="text-[14px] font-bold bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 bg-clip-text text-transparent leading-none">T</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1 px-3">
          {trainerNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                    active
                      ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))]'
                      : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[hsl(var(--admin-accent))] rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0',
                      active ? 'text-[hsl(var(--admin-accent))]' : 'text-[hsl(var(--admin-text-muted))] group-hover:text-[hsl(var(--admin-text-secondary))]'
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className={cn('font-medium text-sm', active ? 'font-semibold' : '')}>
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge
                          className={cn(
                            'ml-auto text-xs font-mono',
                            active
                              ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border border-[hsl(var(--admin-accent))]/20'
                              : 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border border-[hsl(var(--admin-border))]'
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[hsl(var(--admin-accent))] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white/20">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout section */}
      <div className="py-4 border-t border-[hsl(var(--admin-border))] px-3">
        <button
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
            'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-danger))]',
            'hover:bg-[hsl(var(--admin-danger-subtle))]',
            'transition-all duration-200 text-left'
          )}
          onClick={() => {
            dispatch(logoutUser());
            navigate('/auth');
          }}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full',
          'bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]',
          'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))] hover:border-[hsl(var(--admin-accent))]/30',
          'shadow-sm flex items-center justify-center transition-colors z-50'
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
};

export default TrainerSidebar;
