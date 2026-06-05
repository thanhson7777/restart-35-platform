import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { cn } from '@/utils/cn';
import TrainerSidebar from './TrainerSidebar';
import TrainerHeader from './TrainerHeader';
import { selectCurrentUser, fetchCurrentUser } from '@/redux/user/userSlice';

const TrainerLayout = ({ children, className }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const userLoading = useSelector((state) => state.user.isLoading);
  const token = localStorage.getItem('accessToken');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync current user if token exists but user info isn't in Redux yet
  useEffect(() => {
    if (token && !currentUser && !userLoading) {
      dispatch(fetchCurrentUser());
    }
  }, [token, currentUser, userLoading, dispatch]);

  useEffect(() => {
    // Redirect if no token is found
    if (!token) {
      navigate('/auth');
      return;
    }

    // Redirect if user info is loaded but user is not a trainer
    if (currentUser && currentUser.role !== 'trainer') {
      navigate('/');
    }
  }, [currentUser, token, navigate]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Show a dark theme loading spinner while fetching user data
  if (token && !currentUser && userLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-400 font-mono">Đang tải thông tin giảng viên...</p>
        </div>
      </div>
    );
  }

  // Prevent rendering before verification finishes
  if (!token || (currentUser && currentUser.role !== 'trainer')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f9fafb] font-sans antialiased">
      {/* Sidebar */}
      <TrainerSidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300 flex flex-col',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        {/* Header */}
        <TrainerHeader
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Page Content */}
        <main className={cn('pt-16 flex-1 flex flex-col', className)}>
          <div className="p-6 flex-1 flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default TrainerLayout;
