import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { cn } from '@/utils/cn';
import { logoutUser } from '@/redux/user/userSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GridFour, Users, BookOpenText, GraduationCap,
  FileText, Medal, Gear, Question, SignOut,
  CaretLeft, CaretRight, CheckSquare, ChartBar,
  CreditCard, TrendUp, Wallet, Certificate,
  Briefcase, ChatCircle, Brain, ArrowsClockwise, Megaphone,
  FolderOpen
} from '@phosphor-icons/react';
import { Building2, Tags } from 'lucide-react';
import { Badge } from '@/components/ui';

const adminNavGroups = [
  {
    group: '',
    items: [
      { title: 'Tổng quan', href: '/admin', icon: GridFour },
    ]
  },
  {
    group: 'Người dùng & Đối tác',
    items: [
      { title: 'Quản lý người dùng', href: '/admin/users', icon: Users },
      { title: 'Đối tác', href: '/admin/organizations', icon: Building2 },
    ]
  },
  {
    group: 'Đào tạo',
    items: [
      { title: 'Quản lý khóa học', href: '/admin/courses', icon: BookOpenText },
      { title: 'Danh mục khóa học', href: '/admin/course-categories', icon: Tags },
      { title: 'Quản lý tuyển sinh', href: '/admin/enrollments', icon: GraduationCap },
      { title: 'Chứng chỉ', href: '/admin/certificates', icon: Certificate },
    ]
  },
  {
    group: 'Tuyển dụng',
    items: [
      { title: 'Đơn ứng tuyển', href: '/admin/applications', icon: FileText },
      { title: 'Duyệt tin tuyển dụng', href: '/admin/jobs/pending', icon: Megaphone },
      { title: 'Danh mục việc làm', href: '/admin/job-categories', icon: FolderOpen },
      { title: 'Placements', href: '/admin/placements', icon: Briefcase },
    ]
  },
  {
    group: 'Tài chính & Hệ thống',
    items: [
      { title: 'Gói dịch vụ', href: '/admin/service-packages', icon: CreditCard },
      { title: 'Thanh toán', href: '/admin/payments', icon: CreditCard },
      { title: 'Analytics', href: '/admin/analytics', icon: ChartBar },
      { title: 'Master Data', href: '/admin/master-data', icon: Gear },
    ]
  }
];

const bottomNavItems = [
  { title: 'Cài đặt', href: '/admin/settings', icon: Gear },
  { title: 'Trợ giúp', href: '/admin/help', icon: Question },
];

const AdminSidebar = ({ collapsed, onToggle }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
        <div className="space-y-4">
          {adminNavGroups.map((navGroup, groupIdx) => (
            <div key={groupIdx}>
              {navGroup.group && !collapsed && (
                <h3 className="px-5 mb-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">
                  {navGroup.group}
                </h3>
              )}
              {navGroup.group && collapsed && groupIdx > 0 && (
                <div className="mx-3 mb-2 mt-2 h-px bg-[hsl(var(--admin-border))]" />
              )}
              <ul className="space-y-0.5 px-3">
                {navGroup.items.map((item) => {
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
            </div>
          ))}
        </div>
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
              onClick={() => {
                dispatch(logoutUser());
                navigate('/auth');
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-danger-subtle))] hover:text-[hsl(var(--admin-danger))] transition-all duration-200',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              )}
            >
              <SignOut className="w-[18px] h-[18px] shrink-0" />
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
            {collapsed ? <CaretRight className="w-3.5 h-3.5" /> : <CaretLeft className="w-3.5 h-3.5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </aside>
  );
};

export default AdminSidebar;
