import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Award,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';

const adminNavItems = [
  {
    title: 'Tổng quan',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Quản lý người dùng',
    href: '/admin/users',
    icon: Users,
    badge: '2.4k',
  },
  {
    title: 'Quản lý khóa học',
    href: '/admin/courses',
    icon: BookOpen,
  },
  {
    title: 'Duyệt khóa học',
    href: '/admin/courses/approval',
    icon: CheckSquare,
  },
  {
    title: 'Quản lý tuyển sinh',
    href: '/admin/enrollments',
    icon: GraduationCap,
    badge: '12',
  },
  {
    title: 'Đơn ứng tuyển',
    href: '/admin/applications',
    icon: FileText,
    badge: '5',
  },
  {
    title: 'Học bổng',
    href: '/admin/scholarships',
    icon: Award,
  },
];

const bottomNavItems = [
  {
    title: 'Cài đặt',
    href: '/admin/settings',
    icon: Settings,
  },
  {
    title: 'Trợ giúp',
    href: '/admin/help',
    icon: HelpCircle,
  },
];

const AdminSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
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
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#001D4A] font-bold text-lg">R</span>
            </div>
            <div>
              <span className="font-bold text-lg">Restart 35+</span>
              <span className="block text-xs text-white/60">Admin Panel</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/admin" className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto">
            <span className="text-[#001D4A] font-bold text-lg">R</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1 px-3">
          {adminNavItems.map((item) => {
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
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant={active ? 'default' : 'secondary'}
                          className={cn(
                            'ml-auto text-xs',
                            active ? 'bg-[#001D4A]/20 text-[#001D4A]' : 'bg-white/20'
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 border-t border-white/10 px-3">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    active
                      ? 'bg-white text-[#001D4A]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', active && 'text-[#001D4A]')} />
                  {!collapsed && <span className="font-medium">{item.title}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
              onClick={() => {
                localStorage.removeItem('accessToken');
                window.location.href = '/auth';
              }}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">Đăng xuất</span>}
            </button>
          </li>
        </ul>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-border rounded-full shadow-md flex items-center justify-center hover:bg-muted transition-colors"
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

export default AdminSidebar;
