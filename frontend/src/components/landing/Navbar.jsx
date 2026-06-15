import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { selectCurrentUser, logoutUser } from '@/redux/user/userSlice';
import { UserCircle, User, BookOpen, ClipboardText, SignOut, Briefcase } from '@phosphor-icons/react';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    setDropdownOpen(false);
    navigate('/');
  };

  const isLoggedIn = !!currentUser;

  return (
    <nav className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md transition-all duration-200 ${scrolled ? 'border-b border-zinc-200/80' : ''}`}>
      <div className="max-w-[1280px] mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-[hsl(var(--primary))]">Restart 35+</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Trang chủ', to: '/' },
              { label: 'Giới thiệu', to: '/about' },
              { label: 'Việc làm trên thị trường', to: '/jobs' },
              { label: 'Bản đồ cơ hội', to: '/opportunity-map' },
              // { label: 'Khóa học', to: '/courses' },
              { label: 'Diễn đàn & Cộng đồng', to: '/community' },
              { label: 'Liên hệ', to: '/contact' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors duration-200 relative group"
              >
                {item.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[hsl(var(--primary))] transition-all duration-200 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center overflow-hidden">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {currentUser?.displayName?.[0] || currentUser?.username?.[0] || 'U'}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-zinc-100 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-zinc-100">
                      <p className="font-medium text-[hsl(var(--foreground))] truncate text-sm">
                        {currentUser?.displayName || currentUser?.username}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{currentUser?.email}</p>
                    </div>
                    <div className="py-1.5">
                      <Link to="/worker/analytics" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors text-sm font-medium">
                        <Briefcase size={17} className="shrink-0" />Đến trang người lao động
                      </Link>

                    </div>
                    <div className="border-t border-zinc-100 py-1">
                      <button onClick={handleLogout} className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl w-full text-red-500 hover:bg-red-50 transition-colors text-sm">
                        <SignOut size={17} className="shrink-0" />Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/auth" className="px-5 py-2 text-sm font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] rounded-full transition-colors duration-200">
                Đăng nhập
              </Link>
              <Link to="/auth" className="px-5 py-2 text-sm bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white font-medium rounded-full transition-colors duration-200">
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
