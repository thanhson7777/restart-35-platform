import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[hsl(var(--primary))] text-white pt-24 pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          
          <div className="lg:col-span-1">
            <h3 className="text-xl font-medium mb-6" style={{ fontFamily: '"Inter", sans-serif' }}>Về Restart 35+</h3>
            <p className="text-blue-100 leading-relaxed text-sm">
              Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+) thông qua kết nối việc làm, đào tạo và sinh kế bền vững.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-6 uppercase tracking-wider text-blue-200">Người lao động</h4>
            <ul className="space-y-4 text-sm text-blue-100">
              <li><Link to="/jobs" className="hover:text-white transition-colors">Tìm việc làm</Link></li>
              <li><Link to="/courses" className="hover:text-white transition-colors">Khóa học kỹ năng</Link></li>
              <li><Link to="/community" className="hover:text-white transition-colors">Cộng đồng</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-6 uppercase tracking-wider text-blue-200">Doanh nghiệp</h4>
            <ul className="space-y-4 text-sm text-blue-100">
              <li><Link to="/contact" className="hover:text-white transition-colors">Đăng tuyển dụng</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Tìm kiếm nhân tài</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Trở thành đối tác</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-6 uppercase tracking-wider text-blue-200">Liên hệ</h4>
            <ul className="space-y-4 text-sm text-blue-100">
              <li>Email: contact@restart35.vn</li>
              <li>Hotline: 1900 xxxx</li>
              <li>Địa chỉ: TP. Hồ Chí Minh, Việt Nam</li>
            </ul>
          </div>

        </div>

        {/* Copyright and Links */}
        <div className="border-t border-blue-400/30 pt-8 flex flex-col items-center justify-center text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full text-blue-200 text-sm">
            <p>© {new Date().getFullYear()} Restart 35+. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <Link to="/terms" className="hover:text-white">Điều khoản</Link>
              <Link to="/privacy" className="hover:text-white">Bảo mật</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
