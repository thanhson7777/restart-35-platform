import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { selectCurrentUser, logoutUser } from '@/redux/user/userSlice';
import { Briefcase, SignOut, CaretDown } from '@phosphor-icons/react';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [careerMenuOpen, setCareerMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const careerMenuRef = useRef(null);

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
      if (careerMenuRef.current && !careerMenuRef.current.contains(e.target)) {
        setCareerMenuOpen(false);
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
    <nav className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-6">
        {/* Logo */}
        <Link
          to="/"
          className="text-3xl tracking-tight text-[hsl(var(--primary))] hover:opacity-80 transition-opacity"
          style={{ fontFamily: '"Instrument Serif", serif' }}
        >
          Restart 35+
        </Link>

        {/* Menu Items */}
        <div className="hidden md:flex items-center gap-8 relative" style={{ fontFamily: '"Inter", sans-serif' }}>
          <Link
            to="/"
            className={`text-sm font-medium transition-colors duration-200 ${location.pathname === '/' ? 'text-[hsl(var(--primary))]' : 'text-[#6F6F6F] hover:text-[hsl(var(--primary))]'}`}
          >
            Trang chủ
          </Link>
          
          <Link
            to="/about"
            className={`text-sm font-medium transition-colors duration-200 ${location.pathname.startsWith('/about') ? 'text-[hsl(var(--primary))]' : 'text-[#6F6F6F] hover:text-[hsl(var(--primary))]'}`}
          >
            Giới thiệu
          </Link>

          {/* Dropdown: Cơ hội & Học tập */}
          <div className="relative" ref={careerMenuRef}>
            <button
              onClick={() => setCareerMenuOpen(!careerMenuOpen)}
              className={`flex items-center gap-1 text-sm font-medium transition-colors duration-200 ${(location.pathname.startsWith('/jobs') || location.pathname.startsWith('/partner-jobs') || location.pathname.startsWith('/courses')) ? 'text-[hsl(var(--primary))]' : 'text-[#6F6F6F] hover:text-[hsl(var(--primary))]'}`}
            >
              Cơ hội & Học tập
              <CaretDown size={14} className={`transition-transform duration-200 ${careerMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {careerMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-3 w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 overflow-hidden z-50 py-2"
                >
                  <Link
                    to="/jobs"
                    onClick={() => setCareerMenuOpen(false)}
                    className="flex flex-col gap-0.5 mx-2 px-3 py-2 rounded-xl hover:bg-[hsl(var(--primary))]/10 transition-colors"
                  >
                    <span className="text-sm font-semibold text-[hsl(var(--primary))]">Cơ hội việc làm</span>
                    <span className="text-xs text-[#6F6F6F]">Tìm kiếm công việc phù hợp với bạn</span>
                  </Link>
                  <Link
                    to="/partner-jobs"
                    onClick={() => setCareerMenuOpen(false)}
                    className="flex flex-col gap-0.5 mx-2 px-3 py-2 rounded-xl hover:bg-[hsl(var(--primary))]/10 transition-colors"
                  >
                    <span className="text-sm font-semibold text-[hsl(var(--primary))]">Doanh nghiệp tuyển dụng</span>
                    <span className="text-xs text-[#6F6F6F]">Kết nối với nhà tuyển dụng uy tín</span>
                  </Link>
                  <Link
                    to="/courses"
                    onClick={() => setCareerMenuOpen(false)}
                    className="flex flex-col gap-0.5 mx-2 px-3 py-2 rounded-xl hover:bg-[hsl(var(--primary))]/10 transition-colors"
                  >
                    <span className="text-sm font-semibold text-[hsl(var(--primary))]">Khóa học kỹ năng</span>
                    <span className="text-xs text-[#6F6F6F]">Nâng cao tay nghề và kiến thức</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to="/opportunity-map"
            className={`text-sm font-medium transition-colors duration-200 ${location.pathname.startsWith('/opportunity-map') ? 'text-[hsl(var(--primary))]' : 'text-[#6F6F6F] hover:text-[hsl(var(--primary))]'}`}
          >
            Bản đồ cơ hội
          </Link>

          <Link
            to="/community"
            className={`text-sm font-medium transition-colors duration-200 ${(location.pathname.startsWith('/community') && !location.search.includes('tab=jobs') && !location.search.includes('tab=courses')) ? 'text-[hsl(var(--primary))]' : 'text-[#6F6F6F] hover:text-[hsl(var(--primary))]'}`}
          >
            Cộng đồng
          </Link>

          <Link
            to="/contact"
            className={`text-sm font-medium transition-colors duration-200 ${location.pathname.startsWith('/contact') ? 'text-[hsl(var(--primary))]' : 'text-[#6F6F6F] hover:text-[hsl(var(--primary))]'}`}
          >
            Liên hệ
          </Link>
        </div>

        {/* Auth / Profile */}
        <div className="flex items-center gap-4" style={{ fontFamily: '"Inter", sans-serif' }}>
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {currentUser?.displayName?.[0] || currentUser?.username?.[0] || 'U'}
                    </span>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 overflow-hidden z-50"
                  >
                    <div className="px-5 py-4 border-b border-black/5">
                      <p className="font-medium text-[hsl(var(--primary))] truncate text-sm">
                        {currentUser?.displayName || currentUser?.username}
                      </p>
                      <p className="text-xs text-[#6F6F6F] truncate mt-0.5">{currentUser?.email}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        to={currentUser?.role === 'enterprise' ? '/enterprise/dashboard' : '/worker/analytics'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl hover:bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] transition-colors text-sm font-medium"
                      >
                        <Briefcase size={18} className="shrink-0" />
                        Bảng điều khiển
                      </Link>
                    </div>
                    <div className="border-t border-black/5 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl w-[calc(100%-16px)] hover:bg-red-50 text-red-600 transition-colors text-sm font-medium"
                      >
                        <SignOut size={18} className="shrink-0" />
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-6 py-2.5 text-sm font-medium bg-[hsl(var(--primary))] text-white rounded-full transition-transform hover:scale-[1.03] active:scale-[0.98] shadow-md shadow-blue-500/20"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
