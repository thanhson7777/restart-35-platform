import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { cn } from '@/utils/cn';
import { selectCurrentUser, fetchCurrentUser } from '@/redux/user/userSlice';

const RoleLayoutShell = ({
  children,
  className,
  allowedRole,
  loadingMessage,
  SidebarComponent,
  HeaderComponent
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const userLoading = useSelector((state) => state.user.isLoading);
  const token = localStorage.getItem('accessToken');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (token && !currentUser && !userLoading) {
      dispatch(fetchCurrentUser());
    }
  }, [token, currentUser, userLoading, dispatch]);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    if (currentUser && currentUser.role !== allowedRole) {
      navigate('/');
    }
  }, [currentUser, token, navigate, allowedRole]);

  if (token && !currentUser && userLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-400 font-mono">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (!token || (currentUser && currentUser.role !== allowedRole)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f9fafb] font-sans antialiased">
      <SidebarComponent
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          'min-h-screen transition-all duration-300 flex flex-col',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        <HeaderComponent
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className={cn('pt-16 flex-1 flex flex-col', className)}>
          <div className="p-6 flex-1 flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default RoleLayoutShell;
