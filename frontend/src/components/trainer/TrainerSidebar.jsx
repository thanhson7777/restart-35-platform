import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Briefcase,
  Star,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui';

const trainerNavItems = [
  {
    title: 'Tổng quan',
    href: '/trainer',
    icon: LayoutDashboard,
  },
  {
    title: 'Học viên',
    href: '/trainer/enrollments',
    icon: Users,
  },
  {
    title: 'Khóa học',
    href: '/trainer/courses',
    icon: BookOpen,
  },
  {
    title: 'Lịch dạy',
    href: '/trainer/schedule',
    icon: Calendar,
  },
  {
    title: 'Việc làm',
    href: '/trainer/placements',
    icon: Briefcase,
  },
  {
    title: 'Đánh giá',
    href: '/trainer/reviews',
    icon: Star,
  },
];

const TrainerSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/trainer') {
      return location.pathname === '/trainer';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#001D4A] text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <Link to="/trainer" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="text-[#001D4A] font-bold text-lg">T</span>
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-lg block truncate">Restart 35+</span>
              <span className="block text-xs text-white/60">Trainer Panel</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/trainer" className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto shrink-0">
            <span className="text-[#001D4A] font-bold text-lg">T</span>
          </Link>
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    active
                      ? 'bg-white text-[#001D4A]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', active && 'text-[#001D4A]')} />
                  {!collapsed && (
                    <>
                      <span className="font-medium text-sm">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant={active ? 'default' : 'secondary'}
                          className={cn(
                            'ml-auto text-xs font-mono',
                            active ? 'bg-[#001D4A]/20 text-[#001D4A]' : 'bg-white/20'
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold font-mono rounded-full flex items-center justify-center">
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
      <div className="py-4 border-t border-white/10 px-3">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 text-left"
          onClick={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/auth';
          }}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-border rounded-full shadow-md flex items-center justify-center hover:bg-muted transition-colors z-50"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
};

export default TrainerSidebar;
