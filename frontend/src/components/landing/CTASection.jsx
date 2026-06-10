import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Users } from '@phosphor-icons/react';

const CTASection = () => {
  const reduce = useReducedMotion();

  return (
    <section className="py-24 px-8 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(221_83%_40%)] relative overflow-hidden">
      {/* Geometric decorative shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-[400px] h-[400px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-80px] left-[-40px] w-[300px] h-[300px] rounded-full bg-white/5" />
        <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full bg-white/5" />
      </div>

      <div className="max-w-[800px] mx-auto text-center relative z-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Sẵn sàng bắt đầu hành trình mới?
          </h2>
          <p className="text-base md:text-lg text-white/80 mb-10 max-w-[50ch] mx-auto">
            Đăng ký miễn phí trong 2 phút. Không cần thẻ tín dụng.
          </p>

          <Link
            to="/auth"
            className="inline-flex items-center justify-center px-10 py-4 bg-white text-[hsl(var(--primary))] font-semibold rounded-full hover:bg-zinc-100 active:scale-[0.98] transition-all duration-200 shadow-xl"
          >
            Tạo hồ sơ miễn phí
          </Link>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/70">
            <div className="flex items-center gap-2 text-sm">
              <Lock size={16} weight="bold" />
              <span>Dữ liệu được bảo mật tuyệt đối</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} weight="bold" />
              <span>5,000+ chuyên gia đã tham gia</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
