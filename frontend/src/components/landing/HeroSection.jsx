import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HeroSection = () => {
  const videoRef = useRef(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  // Seamless video loop with fade in/out logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId;

    const handleTimeUpdate = () => {
      const { currentTime, duration } = video;

      if (duration && duration > 0) {
        const FADE_DURATION = 0.5;

        // Fade in
        if (currentTime < FADE_DURATION) {
          setVideoOpacity(currentTime / FADE_DURATION);
        }
        // Fade out
        else if (currentTime > duration - FADE_DURATION) {
          setVideoOpacity((duration - currentTime) / FADE_DURATION);
        }
        // Fully visible
        else {
          setVideoOpacity(1);
        }
      }

      animationFrameId = requestAnimationFrame(handleTimeUpdate);
    };

    const handleEnded = () => {
      setVideoOpacity(0);
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play().catch(console.error);
        }
      }, 100);
    };

    video.addEventListener('ended', handleEnded);
    video.play().catch(console.error);

    // Start loop
    animationFrameId = requestAnimationFrame(handleTimeUpdate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (video) {
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const fadeRiseVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-white text-black flex flex-col pt-[calc(8rem-75px)] pb-40">
      {/* Background video layer (z-0) */}
      <div className="absolute inset-0 z-0 overflow-hidden" style={{ top: '300px', inset: 'auto 0 0 0' }}>
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/dqu72sqq7/video/upload/v1781535219/6913858-uhd_3840_2160_25fps_ajln9a.mp4"
          className="w-full h-full object-cover transition-opacity duration-100"
          style={{ opacity: videoOpacity }}
          muted
          playsInline
          autoPlay
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      </div>

      {/* Hero content (z-10) */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Headline */}
        <motion.h1
          variants={fadeRiseVariants}
          className="max-w-7xl"
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            fontWeight: 400,
          }}
        >
          <span className="text-[hsl(var(--primary))]">Tái hòa nhập - </span>
          <span className="text-[hsl(var(--primary))]">Lập nghiệp vững chắc</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={fadeRiseVariants}
          className="mt-8 max-w-2xl text-[#fefae0] text-base sm:text-lg leading-relaxed"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+) thông qua kết nối việc làm, đào tạo và sinh kế bền vững.
        </motion.p>

        {/* Hero CTA Button */}
        <motion.div variants={fadeRiseVariants}>
          <Link
            to="/auth"
            className="inline-block mt-12 px-14 py-5 rounded-full bg-[hsl(var(--primary))] text-white text-base font-medium transition-transform hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-blue-500/30"
            style={{ fontFamily: '"Inter", sans-serif' }}
          >
            Bắt đầu hành trình
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
