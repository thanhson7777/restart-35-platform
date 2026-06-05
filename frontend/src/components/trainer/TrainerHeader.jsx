import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bell, Search, Menu, ChevronDown } from 'lucide-react';
import { Avatar, Badge, Input } from '@/components/ui';
import { selectCurrentUser } from '@/redux/user/userSlice';

const TrainerHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = useSelector(selectCurrentUser) || {
    displayName: 'Trainer User',
    email: 'trainer@restart35.com',
    avatar: null,
    role: 'trainer',
  };

  const notifications = [
    {
      id: 1,
      title: 'Học viên mới đăng ký',
      message: 'Nguyễn Văn Hải đã đăng ký khóa học "May công nghiệp"',
      time: '10 phút trước',
      unread: true,
    },
    {
      id: 2,
      title: 'Đánh giá mới',
      message: 'Lê Hoàng Minh đã gửi đánh giá 5 sao cho khóa học của bạn',
      time: '30 phút trước',
      unread: true,
    },
    {
      id: 3,
      title: 'Nhắc nhở lịch dạy',
      message: 'Bạn có buổi dạy lúc 14:00 hôm nay',
      time: '2 giờ trước',
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header
      className={`
        fixed top-0 right-0 z-30 h-16 bg-[#0b0f19] border-b border-[#1f2937] text-white
        transition-all duration-300 flex items-center justify-between px-6
        ${sidebarCollapsed ? 'left-20' : 'left-64'}
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-[#1f2937] rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Tìm kiếm học viên, khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 bg-[#111827] border-[#1f2937] text-white placeholder-gray-500 focus:bg-[#111827] focus:border-gray-600 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search Toggle (Mobile) */}
        <button className="md:hidden p-2 hover:bg-[#1f2937] rounded-lg transition-colors">
          <Search className="w-5 h-5 text-gray-400" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-[#1f2937] rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
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
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg z-50 overflow-hidden text-white">
                <div className="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Thông báo</h3>
                  <button className="text-xs text-blue-400 hover:underline">
                    Đánh dấu đã đọc
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-[#1f2937]/50 cursor-pointer border-b border-[#1f2937] last:border-0 ${
                        notification.unread ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {notification.unread && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                        )}
                        <div className={notification.unread ? '' : 'ml-5'}>
                          <p className="font-medium text-xs">{notification.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-[#1f2937] bg-[#111827] text-center">
                  <Link
                    to="/trainer/notifications"
                    className="text-xs text-blue-400 hover:underline inline-block"
                    onClick={() => setShowNotifications(false)}
                  >
                    Xem tất cả thông báo
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-[#1f2937] mx-2 hidden sm:block" />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1.5 hover:bg-[#1f2937] rounded-lg transition-colors text-left"
          >
            <Avatar
              src={currentUser.avatar}
              fallback={currentUser.displayName?.charAt(0) || 'T'}
              size="sm"
              className="hidden sm:flex"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">{currentUser.displayName || 'Trainer'}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{currentUser.role || 'trainer'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfile(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg z-50 overflow-hidden text-white">
                <div className="px-4 py-3 border-b border-[#1f2937]">
                  <p className="font-medium text-sm">{currentUser.displayName || 'Trainer'}</p>
                  <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/trainer/profile"
                    className="block px-4 py-2 text-xs hover:bg-[#1f2937] transition-colors"
                    onClick={() => setShowProfile(false)}
                  >
                    Hồ sơ cá nhân
                  </Link>
                  <Link
                    to="/trainer/settings"
                    className="block px-4 py-2 text-xs hover:bg-[#1f2937] transition-colors"
                    onClick={() => setShowProfile(false)}
                  >
                    Cài đặt
                  </Link>
                </div>
                <div className="py-1 border-t border-[#1f2937]">
                  <button
                    onClick={() => {
                      localStorage.removeItem('accessToken');
                      localStorage.removeItem('refreshToken');
                      window.location.href = '/auth';
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
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

export default TrainerHeader;
