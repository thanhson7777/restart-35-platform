import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HeroSection = () => {
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
    y: [0, -8, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  return (
    <section className="relative min-h-[100dvh] overflow-hidden flex items-center">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--muted))] via-white to-[hsl(var(--accent-light))]">
        <motion.div
          className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[hsl(var(--primary))]/10 to-transparent blur-[100px]"
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
          className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[hsl(var(--primary))]/5 to-transparent blur-[80px]"
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

      {/* Decorative dots */}
      <motion.div
        className="absolute top-20 left-10 w-20 h-20 border border-[hsl(var(--primary))]/10 rounded-full"
        animate={floatAnimation}
      />
      <motion.div
        className="absolute top-40 right-20 w-3 h-3 bg-[hsl(var(--primary))]/20 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 left-1/4 w-2 h-2 bg-[hsl(var(--primary))]/30 rounded-full"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      <div className="relative max-w-[1280px] mx-auto px-8 py-16 md:py-20 w-full">
        <div className="flex items-center justify-between gap-12">
          {/* Left content */}
          <motion.div
            className="max-w-[560px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-[hsl(var(--primary))] shadow-sm border border-[hsl(var(--primary))]/10">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Đã có hơn 5,000+ chuyên gia tham gia
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-black text-[hsl(var(--foreground))] mt-6 mb-6 leading-[1.1] tracking-tight"
              variants={itemVariants}
            >
              Tái khởi động sự{' '}
              <span className="relative inline-block">
                <span className="text-[hsl(var(--primary))]">nghiệp sau 35</span>
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-2.5 bg-[hsl(var(--primary))]/10 -z-10"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 1.5, ease: 'easeOut' }}
                  style={{ originX: 0 }}
                />
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              className="text-base md:text-lg text-[hsl(var(--muted-foreground))] mb-8 max-w-[52ch]"
              variants={itemVariants}
            >
              Kết nối việc làm phù hợp, khóa học kỹ năng và cơ hội tài trợ dành riêng cho chuyên gia trên 35.
            </motion.p>

            {/* CTA buttons */}
            <motion.div className="flex flex-wrap gap-3" variants={itemVariants}>
              <Link
                to="/auth"
                className="px-8 py-3.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white font-semibold rounded-full shadow-lg shadow-[hsl(var(--primary))]/20 transition-all duration-200 active:scale-[0.98]"
              >
                Bắt đầu miễn phí
              </Link>
              <Link
                to="/courses"
                className="px-8 py-3.5 bg-white/80 backdrop-blur-sm text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20 rounded-full font-semibold shadow-sm hover:bg-white transition-all duration-200 active:scale-[0.98]"
              >
                Xem khóa học
              </Link>
            </motion.div>
          </motion.div>

          {/* Right image */}
          <motion.div
            className="relative flex-shrink-0 hidden lg:block"
            variants={imageVariants}
            initial="hidden"
            animate="visible"
          >
            <div
              className="relative rounded-3xl overflow-hidden shadow-2xl"
              style={{
                width: '560px',
                height: '620px',
              }}
            >
              <img
                src="https://picsum.photos/seed/professional-career/560/620"
                alt="Chuyên gia tái khởi động sự nghiệp"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Floating card */}
            <motion.div
              className="absolute bottom-6 left-[-24px] bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-white/50"
              variants={badgeVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div animate={floatAnimation} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <p className="text-2xl font-black text-[hsl(var(--primary))] mb-0.5">
                  500+
                </p>
                <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                  việc làm đang tuyển
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Cập nhật hàng ngày
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
