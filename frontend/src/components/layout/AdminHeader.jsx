import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search, Menu, X, ChevronDown } from 'lucide-react';
import { Avatar, Badge, Button, Input } from '@/components/ui';

const AdminHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    {
      id: 1,
      title: 'Đơn đăng ký mới',
      message: 'Nguyễn Văn A đã đăng ký khóa học mới',
      time: '5 phút trước',
      unread: true,
    },
    {
      id: 2,
      title: 'Yêu cầu học bổng',
      message: 'Trần Thị B yêu cầu học bổng khẩn cấp',
      time: '15 phút trước',
      unread: true,
    },
    {
      id: 3,
      title: 'Cập nhật hồ sơ',
      message: 'Lê Văn C đã cập nhật hồ sơ cá nhân',
      time: '1 giờ trước',
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const currentUser = {
    name: 'Admin User',
    email: 'admin@restart35.com',
    avatar: null,
    role: 'Quản trị viên',
  };

  return (
    <header
      className={`
        fixed top-0 right-0 z-30 h-16 bg-white border-b border-border
        transition-all duration-300 flex items-center justify-between px-6
        ${sidebarCollapsed ? 'left-16' : 'left-64'}
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 bg-muted/50 border-transparent focus:bg-background focus:border-input"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search Toggle (Mobile) */}
        <button className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
          <Search className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Thông báo</h3>
                    <button className="text-xs text-primary hover:underline">
                      Đánh dấu đã đọc
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0 ${
                        notification.unread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {notification.unread && (
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                        )}
                        <div className={notification.unread ? '' : 'ml-5'}>
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border bg-muted/30">
                  <Link
                    to="/admin/notifications"
                    className="block text-center text-sm text-primary hover:underline"
                  >
                    Xem tất cả thông báo
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <Avatar
              src={currentUser.avatar}
              fallback={currentUser.name?.charAt(0) || 'A'}
              size="sm"
              className="hidden sm:flex"
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-none">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{currentUser.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfile(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium">{currentUser.name}</p>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
                <div className="py-2">
                  <Link
                    to="/admin/profile"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Hồ sơ cá nhân
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Cài đặt
                  </Link>
                </div>
                <div className="py-2 border-t border-border">
                  <button
                    onClick={() => {
                      localStorage.removeItem('accessToken');
                      window.location.href = '/auth';
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
