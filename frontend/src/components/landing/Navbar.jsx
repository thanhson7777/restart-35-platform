import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-[1280px] mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#001D4A] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-[#001D4A]">Restart 35+</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-[#43494D] hover:text-[#001D4A] font-medium">
              Trang chủ
            </Link>
            <Link to="/jobs" className="text-[#43494D] hover:text-[#001D4A] font-medium">
              Việc làm
            </Link>
            <Link to="/courses" className="text-[#43494D] hover:text-[#001D4A] font-medium">
              Khóa học
            </Link>
            <Link to="/about" className="text-[#43494D] hover:text-[#001D4A] font-medium">
              Giới thiệu
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="px-6 py-2 text-[#001D4A] font-medium hover:bg-gray-100 rounded-full transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/auth"
              className="px-6 py-2 bg-[#001D4A] text-white font-medium rounded-full hover:bg-[#002a5c] transition-colors"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
