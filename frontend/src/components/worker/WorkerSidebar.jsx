import {
  LayoutDashboard,
  UserCircle,
  BookOpen,
  ClipboardList,
  Calendar,
  FileText,
  Briefcase,
  FileCheck,
  Target,
  Gift,
  DollarSign,
  BadgeDollarSign,
  MessageSquare,
  Users,
  CalendarCheck,
  TrendingUp,
  Award,
  BookMarked,
  GraduationCap,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';

const navGroups = [
  {
    section: 'NAVIGATE',
    items: [
      { href: '/worker', label: 'Tổng quan', icon: LayoutDashboard, end: true },
      { href: '/worker/profile', label: 'Hồ sơ của tôi', icon: UserCircle },
    ],
  },
  {
    section: 'HỌC TẬP',
    items: [
      { href: '/courses', label: 'Khóa học', icon: BookOpen },
      { href: '/my-enrollments', label: 'Ghi danh của tôi', icon: ClipboardList },
      { href: '/my-schedules', label: 'Lịch học', icon: Calendar },
      { href: '/my-learning-records', label: 'Bản ghi học tập', icon: FileText },
    ],
  },
  {
    section: 'VIỆC LÀM',
    items: [
      { href: '/jobs', label: 'Việc làm', icon: Briefcase },
      { href: '/my-applications', label: 'Đơn ứng tuyển', icon: FileCheck },
      { href: '/my-placements', label: 'Vị trí việc làm', icon: Target },
    ],
  },
  {
    section: 'TÀI CHÍNH',
    items: [
      { href: '/scholarships', label: 'Học bổng', icon: Gift },
      { href: '/my-isa', label: 'ISA của tôi', icon: DollarSign },
      { href: '/my-sponsorships', label: 'Tài trợ', icon: BadgeDollarSign },
    ],
  },
  {
    section: 'CỘNG ĐỒNG',
    items: [
      { href: '/community/forum', label: 'Diễn đàn', icon: MessageSquare },
      { href: '/mentor/booking', label: 'Đặt lịch Mentor', icon: Users },
      { href: '/my-mentor-sessions', label: 'Lịch sử Mentor', icon: CalendarCheck },
      { href: '/my-success-stats', label: 'Thống kê thành công', icon: TrendingUp },
    ],
  },
  {
    section: 'CÔNG CỤ',
    items: [
      { href: '/verify-certificate', label: 'Xác minh chứng chỉ', icon: Award },
      { href: '/my-outcomes', label: 'Kết quả tuyển dụng', icon: GraduationCap },
    ],
  },
];

const WorkerSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const isActive = (href, end) => {
    if (end) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col',
        'border-r border-[hsl(var(--admin-border))]',
        'bg-[hsl(var(--admin-sidebar))]',
        'transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--admin-border))]">
        <Link
          to="/worker"
          className="flex items-center gap-3 min-w-0 overflow-hidden"
        >
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 opacity-90" />
            <div className="absolute inset-[2px] rounded-[7px] bg-[hsl(var(--admin-sidebar))] flex items-center justify-center">
              <span className="text-[14px] font-bold bg-gradient-to-br from-emerald-500 to-teal-400 bg-clip-text text-transparent leading-none">
                W
              </span>
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))] truncate">
                Worker Hub
              </p>
              <p className="text-[11px] text-[hsl(var(--admin-text-muted))] truncate">
                Quản lý học tập &amp; việc làm
              </p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-[hsl(var(--admin-text-muted))] hover:text-emerald-500 hover:bg-[hsl(var(--admin-surface-hover))] shrink-0"
        >
          <span className="text-xs">{collapsed ? '»' : '«'}</span>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-text-muted))]">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, end }) => {
                const active = isActive(href, end);
                return (
                  <Link
                    key={href}
                    to={href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
                    )}
                    title={collapsed ? label : undefined}
                  >
                    <Icon
                      size={18}
                      className={cn('shrink-0', active ? 'text-emerald-500' : 'text-[hsl(var(--admin-text-muted))]')}
                    />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default WorkerSidebar;
