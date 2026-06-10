import React from 'react';
import { Link } from 'react-router-dom';
import { FacebookLogo, LinkedinLogo, YoutubeLogo, Envelope, Phone, MapPin, Clock } from '@phosphor-icons/react';

const Footer = () => {
  return (
    <footer className="bg-zinc-900 text-zinc-400 dark:bg-zinc-950">
      <div className="max-w-[1280px] mx-auto px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1: Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-bold text-white">Restart 35+</span>
            </Link>
            <p className="text-sm leading-relaxed mb-6">
              Nền tảng tái khởi động sự nghiệp cho chuyên gia trên 35. Kết nối việc làm phù hợp, khóa học kỹ năng và cơ hội tài trợ.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-[hsl(var(--primary))] flex items-center justify-center transition-colors duration-200"
                aria-label="Facebook"
              >
                <FacebookLogo size={18} className="text-zinc-400 hover:text-white" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-[hsl(var(--primary))] flex items-center justify-center transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <LinkedinLogo size={18} className="text-zinc-400 hover:text-white" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-[hsl(var(--primary))] flex items-center justify-center transition-colors duration-200"
                aria-label="YouTube"
              >
                <YoutubeLogo size={18} className="text-zinc-400 hover:text-white" />
              </a>
            </div>
          </div>

          {/* Column 2: Nền tảng */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Nền tảng
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Trang chủ', to: '/' },
                { label: 'Việc làm', to: '/jobs' },
                { label: 'Khóa học', to: '/courses' },
                { label: 'Học bổng', to: '/scholarships' },
                { label: 'Giới thiệu', to: '/about' },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Hỗ trợ */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Hỗ trợ
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Trung tâm trợ giúp', href: '#' },
                { label: 'Liên hệ', href: '#' },
                { label: 'FAQ', href: '#' },
                { label: 'Chính sách bảo mật', href: '#' },
                { label: 'Điều khoản sử dụng', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Liên hệ */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Liên hệ
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Tòa nhà ABC, 123 Nguyễn Huệ, Quận 1, TP.HCM
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Envelope size={18} className="flex-shrink-0" />
                <a
                  href="mailto:contact@restart35.vn"
                  className="text-sm hover:text-white transition-colors duration-200"
                >
                  contact@restart35.vn
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="flex-shrink-0" />
                <a
                  href="tel:02812345678"
                  className="text-sm hover:text-white transition-colors duration-200"
                >
                  028 1234 5678
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock size={18} className="flex-shrink-0" />
                <span className="text-sm">Thứ 2 - Thứ 6, 8:00 - 18:00</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 text-center">
            © 2024 Restart 35+. Made with care in Vietnam.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
