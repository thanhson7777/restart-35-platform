import { LayoutDashboard, Handshake, BadgeDollarSign, Briefcase, Users, Calendar, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';

const navItems = [
  { href: '/enterprise/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/enterprise/partnerships', label: 'Partnerships', icon: Handshake },
  { href: '/enterprise/sponsorships', label: 'Tài trợ', icon: BadgeDollarSign },
  { divider: true },
  { href: '/enterprise/recruitment', label: 'Tin tuyển dụng', icon: Briefcase },
  { href: '/enterprise/applications', label: 'Ứng viên', icon: Users },
  { href: '/enterprise/interviews', label: 'Phỏng vấn', icon: Calendar },
  { href: '/enterprise/offers', label: 'Offers', icon: FileText }
];

const EnterpriseSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

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
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))]'
                  : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))]'
              )}
            >
              <Icon size={18} className={cn(
                'shrink-0',
                active ? 'text-[hsl(var(--admin-accent))]' : 'text-[hsl(var(--admin-text-muted))]'
              )} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default EnterpriseSidebar;
