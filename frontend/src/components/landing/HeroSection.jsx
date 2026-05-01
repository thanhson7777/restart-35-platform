import React from 'react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95, x: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.4,
      },
    },
  };

  const badgeVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: 1,
      },
    },
  };

  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  return (
    <section className="relative min-h-[921px] overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FAF8FD] via-[#F5F0FF] to-[#E8F4FD]">
        {/* Animated blobs */}
        <motion.div
          className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#001D4A]/10 to-transparent blur-[100px]"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#352116]/5 to-transparent blur-[80px]"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Decorative Elements */}
      <motion.div
        className="absolute top-20 left-10 w-20 h-20 border border-[#001D4A]/10 rounded-full"
        animate={floatAnimation}
      />
      <motion.div
        className="absolute top-40 right-20 w-3 h-3 bg-[#352116]/20 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 left-1/4 w-2 h-2 bg-[#001D4A]/30 rounded-full"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      <div className="relative max-w-[1280px] mx-auto px-8">
        <div className="flex items-center justify-between pt-[80px] min-h-[921px]">
          {/* Left Content */}
          <motion.div
            className="max-w-[584px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-[#001D4A] shadow-sm border border-[#001D4A]/10">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Đã có hơn 5,000+ chuyên gia tham gia
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              className="text-[72px] leading-[72px] tracking-[-1.8px] font-black text-[#000113] mt-6 mb-8"
              variants={itemVariants}
            >
              Tái khởi động sự{' '}
              <span className="relative inline-block">
                <span className="text-[#352116]">nghiệp sau 35</span>
                {/* Underline animation */}
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-3 bg-[#352116]/10 -z-10"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 1.5, ease: 'easeOut' }}
                  style={{ originX: 0 }}
                />
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              className="text-[20px] leading-[32.5px] text-[#43494D] max-w-[512px] mb-10"
              variants={itemVariants}
            >
              Nền tảng kết nối bạn với việc làm phù hợp, khóa học
              kỹ năng và cơ hội tài trợ độc quyền dành riêng cho
              chuyên gia dạn dày kinh nghiệm.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div className="flex gap-4" variants={itemVariants}>
              <motion.button
                className="px-8 py-4 bg-[#001D4A] text-white rounded-full font-semibold shadow-lg shadow-[#001D4A]/20"
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 20px 40px rgba(0, 29, 74, 0.3)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Bắt đầu ngay
              </motion.button>
              <motion.button
                className="px-8 py-4 bg-white/80 backdrop-blur-sm text-[#001D4A] border border-[#C4C4CF] rounded-full font-semibold shadow-sm"
                whileHover={{
                  scale: 1.05,
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Tìm hiểu thêm
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            className="relative"
            variants={imageVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Image Container with Shadow */}
            <motion.div
              className="relative rounded-[24px] overflow-hidden shadow-2xl"
              style={{
                width: '606px',
                height: '670px',
              }}
              whileHover={{
                boxShadow: '0 40px 80px rgba(0, 29, 74, 0.2)',
              }}
            >
              {/* Hero Image */}
              <img
                src="/images/hero-image.jpg"
                alt="Chuyên gia tái khởi động sự nghiệp"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.querySelector('.placeholder').style.display = 'flex';
                }}
              />
              {/* Placeholder fallback */}
              <div className="placeholder absolute inset-0 bg-gradient-to-br from-[#e8e6ee] via-[#d4d2dd] to-[#c8c6d4] items-center justify-center hidden">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white/50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-[#001D4A]/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-[#001D4A]/40 text-sm font-medium">
                    Không tìm thấy hình ảnh
                  </p>
                </div>
              </div>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </motion.div>

            {/* Floating Badge - TOP MENTOR */}
            <motion.div
              className="absolute bottom-[113px] left-[-24px] bg-white/90 backdrop-blur-md rounded-[16px] p-6 shadow-xl border border-white/50"
              variants={badgeVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                animate={floatAnimation}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB785] to-[#FF9F5A] flex items-center justify-center shadow-lg shadow-[#FFB785]/30">
                    <span className="text-white text-sm">★</span>
                  </div>
                  <span className="text-[14px] font-bold tracking-[0.7px] text-[#43494D] uppercase">
                    TOP MENTOR
                  </span>
                </div>
                <p className="text-[14px] leading-[19px] font-medium text-[#1A1C1E]">
                  Hơn 500+ cố vấn cấp cao
                  <br />
                  đang sẵn sàng đồng hành
                  <br />
                  cùng bạn.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-[#001D4A]/30 flex justify-center pt-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-1.5 h-3 bg-[#001D4A]/40 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
