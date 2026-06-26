import { LayoutDashboard, Handshake, Briefcase, Users, Calendar, Wallet, Building2, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';

const navItems = [
  // Nhóm 1: Quản lý chung
  { href: '/enterprise/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/enterprise/profile', label: 'Hồ sơ doanh nghiệp', icon: Building2 },
  { divider: true },
  // Nhóm 2: Tuyển dụng & Đào tạo
  { href: '/enterprise/recruitment', label: 'Tin tuyển dụng', icon: Briefcase },
  { href: '/enterprise/applications', label: 'Ứng viên', icon: Users },
  { href: '/enterprise/interviews', label: 'Phỏng vấn', icon: Calendar },
  { href: '/enterprise/partnerships', label: 'Đối tác', icon: Handshake },
  { divider: true },
  // Nhóm 3: Tài chính & Dịch vụ
  { href: '/enterprise/packages', label: 'Gói dịch vụ', icon: Package },
  { href: '/enterprise/wallet', label: 'Ví & Giao dịch', icon: Wallet }
];

const EnterpriseSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { socket } = useSocket();
  const [unreadJobs, setUnreadJobs] = useState(false);
  const [unreadApplications, setUnreadApplications] = useState(false);
  const [unreadPartnerships, setUnreadPartnerships] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      if (notification.type === 'NEW_APPLICATION') {
        setUnreadApplications(true);
      }
      if (notification.type === 'JOB_APPROVED' || notification.type === 'JOB_REJECTED') {
        setUnreadJobs(true);
      }
      if (notification.type === 'PARTNERSHIP_RESPONDED' || notification.type === 'PARTNERSHIP_CONFIRMED') {
        setUnreadPartnerships(true);
      }
    };
    socket.on('NEW_NOTIFICATION', handleNewNotification);
    return () => socket.off('NEW_NOTIFICATION', handleNewNotification);
  }, [socket]);

  useEffect(() => {
    if (location.pathname.startsWith('/enterprise/applications')) {
      setUnreadApplications(false);
    }
    if (location.pathname.startsWith('/enterprise/recruitment') || location.pathname === '/enterprise/jobs') {
      setUnreadJobs(false);
    }
    if (location.pathname.startsWith('/enterprise/partnerships')) {
      setUnreadPartnerships(false);
    }
  }, [location.pathname]);

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-sidebar))] transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--admin-border))]">
        <Link to="/enterprise/dashboard" className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 opacity-90" />
            <div className="absolute inset-[2px] rounded-[7px] bg-[hsl(var(--admin-sidebar))] flex items-center justify-center">
              <span className="text-[14px] font-bold bg-gradient-to-br from-[hsl(var(--admin-accent))] to-blue-400 bg-clip-text text-transparent leading-none">E</span>
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))] truncate">Enterprise Hub</p>
              <p className="text-[11px] text-[hsl(var(--admin-text-muted))] truncate">Quản lý hợp tác & tài trợ</p>
            </div>
          )}
        </Link>
        <Button variant="ghost" size="icon" onClick={onToggle} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-surface-hover))] shrink-0">
          <span className="text-xs">{collapsed ? '»' : '«'}</span>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, idx) => {
          if (item.divider) {
            return <div key={`divider-${idx}`} className="h-px bg-[hsl(var(--admin-border))] my-2" />;
          }
          const { href, label, icon: Icon } = item;
          const active = location.pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))]'
                  : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
              )}
            >
              <Icon size={18} className={cn(
                'shrink-0',
                active ? 'text-[hsl(var(--admin-accent))]' : 'text-[hsl(var(--admin-text-muted))]'
              )} />
              {!collapsed && <span className="flex-1">{label}</span>}
              
              {/* Notification Badges */}
              {active && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[hsl(var(--admin-accent))] rounded-l-full" />
              )}
              {href === '/enterprise/recruitment' && unreadJobs && (
                <span className={cn(
                  "rounded-full bg-red-500 shadow-sm shadow-red-500/50",
                  collapsed ? "absolute top-2 right-2 w-2 h-2" : "w-2 h-2 shrink-0"
                )} />
              )}
              {href === '/enterprise/applications' && unreadApplications && (
                <span className={cn(
                  "rounded-full bg-red-500 shadow-sm shadow-red-500/50",
                  collapsed ? "absolute top-2 right-2 w-2 h-2" : "w-2 h-2 shrink-0"
                )} />
              )}
              {href === '/enterprise/partnerships' && unreadPartnerships && (
                <span className={cn(
                  "rounded-full bg-red-500 shadow-sm shadow-red-500/50",
                  collapsed ? "absolute top-2 right-2 w-2 h-2" : "w-2 h-2 shrink-0"
                )} />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default EnterpriseSidebar;
