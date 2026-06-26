import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, BellRing } from 'lucide-react';
import { Button } from '@/components/ui';
import { notificationApi } from '@/apis/notificationApi';
import toast from 'react-hot-toast';
import { useSocket } from '@/contexts/SocketContext';

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotification) => {
      console.log('[NotificationDropdown] Received NEW_NOTIFICATION:', newNotification);
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      toast(newNotification?.title || 'Bạn có thông báo mới', {
        icon: '🔔',
        duration: 5000,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          zIndex: 99999
        },
      });
    };

    socket.on('NEW_NOTIFICATION', handleNewNotification);

    return () => {
      socket.off('NEW_NOTIFICATION', handleNewNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ page: 1, limit: 20 });
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationApi.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setDropdownOpen(false);
      if (notification.link) {
        let finalLink = notification.link;
        // Fix legacy notification links
        if (finalLink.startsWith('/worker/interviews')) {
          finalLink = finalLink.replace('/worker/interviews', '/my/interviews');
        }
        if (finalLink === '/enterprise/jobs') {
          finalLink = '/enterprise/recruitment';
        }
        if (finalLink.startsWith('/admin/courses/pending')) {
          finalLink = '/admin/courses?status=pending';
        }
        navigate(finalLink);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xử lý thông báo');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      toast.error('Không thể đánh dấu tất cả');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))]"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[hsl(var(--admin-sidebar))] animate-pulse"></span>
        )}
      </Button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50 flex flex-col max-h-[85vh]"
          >
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <BellRing size={16} className="text-[hsl(var(--admin-text-primary))]" />
                <h3 className="font-semibold text-sm text-[hsl(var(--admin-text-primary))]">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                >
                  <Check size={14} />
                  Đánh dấu tất cả
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-[hsl(var(--admin-text-muted))]">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                    <Bell size={20} className="text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">Chưa có thông báo nào</p>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Khi có cập nhật mới, thông báo sẽ hiển thị ở đây.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <button
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`
                        w-full text-left px-4 py-3 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors
                        ${!notif.isRead ? 'bg-blue-50/30' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm truncate ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notif.title}
                          </p>
                          <p className={`text-xs mt-0.5 line-clamp-2 ${!notif.isRead ? 'text-gray-600' : 'text-gray-500'}`}>
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
