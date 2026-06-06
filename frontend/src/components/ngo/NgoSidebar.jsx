import { LayoutDashboard, BadgeDollarSign, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';

const navItems = [
  { href: '/ngo/dashboard/impact', label: 'Impact', icon: LayoutDashboard },
  { href: '/ngo/sponsorships', label: 'Sponsorships', icon: BadgeDollarSign },
  { href: '/ngo/sponsorships/create', label: 'Tạo mới', icon: BarChart3 }
];

const NgoSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-slate-800 bg-[#112015] transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        <Link to="/ngo/dashboard/impact" className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white text-[#112015] flex items-center justify-center font-black">N</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">NGO Impact</p>
              <p className="text-[11px] text-emerald-200/70 truncate">Theo dõi tác động & học viên</p>
            </div>
          )}
        </Link>
        <Button variant="ghost" size="icon" onClick={onToggle} className="text-white hover:bg-white/10">
          <span className="text-xs">{collapsed ? '»' : '«'}</span>
        </Button>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location.pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                active ? 'bg-white text-[#112015]' : 'text-emerald-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default NgoSidebar;
