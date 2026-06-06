import { Menu, Bell, Search } from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';

const RoleHeader = ({ title, subtitle, onMenuClick }) => {
  const currentUser = useSelector(selectCurrentUser);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-auto z-20 h-16 border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-xl">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Menu size={18} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
            <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-400 min-w-[220px]">
            <Search size={14} />
            <span className="text-xs">Tìm nhanh trong dashboard</span>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
            <Bell size={17} />
          </Button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-1.5">
            <Avatar
              src={currentUser?.avatar}
              fallback={currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              className="h-8 w-8"
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-semibold text-white">{currentUser?.displayName || 'Người dùng'}</p>
              <p className="text-[11px] text-slate-400">{currentUser?.role || 'member'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RoleHeader;
