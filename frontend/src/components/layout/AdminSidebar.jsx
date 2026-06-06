import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  FileText, Award, Settings, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, CheckSquare, BarChart2,
} from 'lucide-react';
import { Badge } from '@/components/ui';

const adminNavItems = [
  { title: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { title: 'Quản lý người dùng', href: '/admin/users', icon: Users, badge: '2.4k' },
  { title: 'Quản lý khóa học', href: '/admin/courses', icon: BookOpen },
  { title: 'Duyệt khóa học', href: '/admin/courses/approval', icon: CheckSquare },
  { title: 'Quản lý tuyển sinh', href: '/admin/enrollments', icon: GraduationCap, badge: '12' },
  { title: 'Đơn ứng tuyển', href: '/admin/applications', icon: FileText, badge: '5' },
  { title: 'Học bổng', href: '/admin/scholarships', icon: Award },
  { title: 'Analytics Khóa học', href: '/admin/recommendation-analytics', icon: BarChart2 },
];

const bottomNavItems = [
  { title: 'Cài đặt', href: '/admin/settings', icon: Settings },
  { title: 'Trợ giúp', href: '/admin/help', icon: HelpCircle },
];

const AdminSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const isActive = (href) =>
    href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col admin-sidebar-gradient transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-[68px] flex items-center border-b border-[hsl(var(--admin-border))] relative',
        collapsed ? 'justify-center px-0' : 'px-5'
      )}>
        <Link to="/admin" className={cn('flex items-center gap-3 group', collapsed ? 'justify-center' : '')}>
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 opacity-90" />
            <div className="absolute inset-[3px] rounded-[9px] bg-[hsl(var(--admin-sidebar))] flex items-center justify-center">
              <span className="text-[14px] font-bold bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 bg-clip-text text-transparent leading-none">R</span>
            </div>
          </div>
          {!collapsed && (
            <div className="leading-none">
              <span className="block text-[13px] font-semibold text-[hsl(var(--admin-text-primary))] tracking-tight">Restart 35+</span>
              <span className="block text-[10px] text-[hsl(var(--admin-text-muted))] mt-0.5">Admin Panel</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-0.5 px-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <motion.div
                  initial={false} animate={{ x: 0 }}
                  whileHover={!active ? { x: 2 } : {}}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                >
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-all duration-200 relative group',
                      active
                        ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))]'
                        : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[hsl(var(--admin-accent))] rounded-r-full" />
                    )}
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0',
                        active ? 'text-[hsl(var(--admin-accent))]' : 'text-[hsl(var(--admin-text-muted))] group-hover:text-[hsl(var(--admin-text-secondary))]'
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className={cn('font-medium text-[13px] flex-1 leading-none', active ? 'font-semibold' : '')}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge
                            className={cn(
                              'text-[10px] px-2 py-0.5 font-semibold leading-none',
                              active
                                ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/20'
                                : 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]'
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[hsl(var(--admin-accent))] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className={cn('py-4 border-t border-[hsl(var(--admin-border))]', collapsed ? 'px-2' : 'px-3')}>
        <ul className="space-y-0.5">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl transition-all duration-200 group',
                    active
                      ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))]'
                      : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]',
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                  )}
                >
                  <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-[hsl(var(--admin-accent))]' : 'text-[hsl(var(--admin-text-muted))] group-hover:text-[hsl(var(--admin-text-secondary))]')} />
                  {!collapsed && (
                    <span className={cn('font-medium text-[13px]', active ? 'font-semibold' : '')}>{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => { localStorage.removeItem('accessToken'); window.location.href = '/auth'; }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-danger-subtle))] hover:text-[hsl(var(--admin-danger))] transition-all duration-200',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              )}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="font-medium text-[13px]">Đăng xuất</span>}
            </button>
          </li>
        </ul>
      </div>

      {/* Collapse Toggle */}
      <motion.button
        onClick={onToggle}
        className={cn(
          'absolute flex items-center justify-center w-6 h-6 rounded-full',
          'bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]',
          'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))] hover:border-[hsl(var(--admin-accent))]/30',
          'transition-all duration-200 shadow-sm',
          '-right-3 top-[88px]'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={collapsed ? 'collapsed' : 'expanded'}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </aside>
  );
};

export default AdminSidebar;
