import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { WarningIcon, CompetitionIcon, CompassIcon } from './Icons';

const problems = [
  {
    id: 1,
    icon: WarningIcon,
    title: 'Nguy cơ mất việc',
    description:
      'Biến động kinh tế và tái cấu trúc doanh nghiệp khiến vị trí của bạn trở nên mong manh hơn bao giờ hết.',
    gradient: 'from-red-50 to-orange-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    id: 2,
    icon: CompetitionIcon,
    title: 'Cạnh tranh khốc liệt',
    description:
      'Áp lực từ thế hệ nhân sự trẻ am hiểu công nghệ và mức lương linh hoạt tạo ra khoảng cách lớn.',
    gradient: 'from-yellow-50 to-amber-50',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-700',
  },
  {
    id: 3,
    icon: CompassIcon,
    title: 'Thiếu định hướng',
    description:
      'Hoang mang khi đứng trước ngã rẽ sự nghiệp và không biết bắt đầu từ đâu để cập nhật bản thân.',
    gradient: 'from-blue-50 to-indigo-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
];

const ProblemCard = ({ problem, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="group relative"
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div
        className={`relative h-full bg-gradient-to-br ${problem.gradient} rounded-3xl p-8 transition-all duration-500 group-hover:shadow-xl group-hover:scale-[1.02]`}
      >
        {/* Icon Container */}
        <motion.div
          className={`w-16 h-16 rounded-2xl ${problem.iconBg} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
          whileHover={{
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }}
        >
          <problem.icon className={`w-8 h-8 ${problem.iconColor}`} />
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-[#1A1C1E] mb-4 group-hover:text-[#001D4A] transition-colors">
          {problem.title}
        </h3>

        {/* Description */}
        <p className="text-[16px] leading-[26px] text-[#43494D]">
          {problem.description}
        </p>

        {/* Hover decoration */}
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-t from-white/50 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </motion.div>
  );
};

const CoreProblemsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 px-8 bg-gradient-to-b from-white to-[#F4F3F7]">
      <div className="max-w-[1280px] mx-auto" ref={ref}>
        {/* Header */}
        <motion.div
          className="flex flex-col gap-4 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-flex items-center gap-2 text-[14px] font-black tracking-[1.4px] text-[#352116] uppercase"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <span className="w-8 h-[2px] bg-[#352116]" />
            Thách thức
          </motion.span>
          <h2 className="text-[36px] leading-[40px] font-black text-[#000113] max-w-[672px]">
            Thấu hiểu những rào cản của bạn
            <br />
            <span className="text-[#43494D] font-normal text-xl">
              trên hành trình mới
            </span>
          </h2>

          {/* Decorative line */}
          <motion.div
            className="w-20 h-1 bg-gradient-to-r from-[#001D4A] to-[#352116] rounded-full mt-4"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
            style={{ originX: 0 }}
          />
        </motion.div>

        {/* Cards Grid */}
        <div className="flex gap-8 flex-wrap">
          {problems.map((problem, index) => (
            <div key={problem.id} className="flex-1 min-w-[300px]">
              <ProblemCard problem={problem} index={index} />
            </div>
          ))}
        </div>

        {/* Bottom decorative elements */}
        <motion.div
          className="flex justify-center gap-2 mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[#001D4A]/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CoreProblemsSection;
