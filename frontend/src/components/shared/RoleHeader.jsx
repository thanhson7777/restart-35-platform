import { Menu, Bell, Search } from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';

const RoleHeader = ({ title, subtitle, onMenuClick }) => {
  const currentUser = useSelector(selectCurrentUser);

  return (
    <header className={`
      fixed top-0 right-0 left-0 lg:left-auto z-20 h-16
      border-b border-[hsl(var(--admin-border))]
      bg-[hsl(var(--admin-sidebar))]/95 backdrop-blur-xl
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
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] px-3 py-2 text-[hsl(var(--admin-text-muted))] min-w-[220px]">
            <Search size={14} />
            <span className="text-xs">Tìm nhanh trong dashboard</span>
          </div>
          <Button variant="ghost" size="icon" className="text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]">
            <Bell size={17} />
          </Button>
          <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] px-2.5 py-1.5">
            <Avatar
              src={currentUser?.avatar}
              fallback={currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              className="h-8 w-8"
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-semibold text-[hsl(var(--admin-text-primary))]">{currentUser?.displayName || 'Người dùng'}</p>
              <p className="text-[11px] text-[hsl(var(--admin-text-muted))]">{currentUser?.role || 'member'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RoleHeader;
