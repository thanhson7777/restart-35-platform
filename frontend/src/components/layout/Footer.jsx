import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#001D4A] text-white py-12 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-2xl font-bold mb-4">Restart 35+</h3>
            <p className="text-gray-300 text-sm">
              Nền tảng kết nối chuyên gia trên 35 tuổi với cơ hội việc làm và học tập.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Về chúng tôi</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/about" className="hover:text-white">Giới thiệu</Link></li>
              <li><Link to="/contact" className="hover:text-white">Liên hệ</Link></li>
              <li><Link to="/careers" className="hover:text-white">Tuyển dụng</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Tài nguyên</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/courses" className="hover:text-white">Khóa học</Link></li>
              <li><Link to="/jobs" className="hover:text-white">Việc làm</Link></li>
              <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/help" className="hover:text-white">Trung tâm trợ giúp</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Chính sách bảo mật</Link></li>
              <li><Link to="/terms" className="hover:text-white">Điều khoản sử dụng</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
          © 2026 Restart 35+. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
