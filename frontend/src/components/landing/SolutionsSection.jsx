import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const solutions = [
  {
    id: 1,
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Việc làm phù hợp',
    description: 'Kết nối với nhà tuyển dụng đang tìm kiếm kinh nghiệm và sự trưởng thành của bạn.',
    features: ['Lọc theo kỹ năng', 'Phù hợp với kinh nghiệm', 'Hỗ trợ phỏng vấn'],
    color: '#001D4A',
    bgColor: 'from-[#001D4A]/5 to-[#001D4A]/10',
  },
  {
    id: 2,
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: 'Khóa học kỹ năng',
    description: 'Cập nhật và nâng cấp kỹ năng với các khóa học được thiết kế riêng cho người trên 35.',
    features: ['Đào tạo ngắn hạn', 'Học online linh hoạt', 'Chứng chỉ có giá trị'],
    color: '#352116',
    bgColor: 'from-[#352116]/5 to-[#352116]/10',
  },
  {
    id: 3,
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Hỗ trợ tài chính',
    description: 'Tiếp cận các chương trình học bổng và tài trợ để đầu tư vào tương lai của bạn.',
    features: ['Học bổng hấp dẫn', 'Trả góp 0% lãi suất', 'Cam kết hoàn tiền'],
    color: '#059669',
    bgColor: 'from-green-500/5 to-green-500/10',
  },
];

const SolutionCard = ({ solution, index }) => {
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
      <div className="relative h-full bg-white rounded-3xl p-8 shadow-lg border border-gray-100 overflow-hidden">
        {/* Hover background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${solution.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
            style={{ backgroundColor: `${solution.color}10` }}
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <div style={{ color: solution.color }}>
              {solution.icon}
            </div>
          </motion.div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-[#000113] mb-4 group-hover:text-[#001D4A] transition-colors">
            {solution.title}
          </h3>

          {/* Description */}
          <p className="text-[#43494D] leading-relaxed mb-6">
            {solution.description}
          </p>

          {/* Features */}
          <ul className="space-y-3">
            {solution.features.map((feature, idx) => (
              <motion.li
                key={idx}
                className="flex items-center gap-3 text-sm text-[#1A1C1E]"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${solution.color}20`, color: solution.color }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {feature}
              </motion.li>
            ))}
          </ul>

          {/* Learn more link */}
          <motion.a
            href="#"
            className="inline-flex items-center gap-2 mt-6 text-sm font-semibold group/link"
            style={{ color: solution.color }}
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            Tìm hiểu thêm
            <svg className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </div>

        {/* Decorative element */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: solution.color }}
        />
      </div>
    </motion.div>
  );
};

const SolutionsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 px-8 bg-gradient-to-b from-[#FAF8FD] to-white">
      <div className="max-w-[1280px] mx-auto" ref={ref}>
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-2 bg-[#001D4A]/5 rounded-full text-sm font-semibold text-[#001D4A] mb-4">
            GIẢI PHÁP CỦA CHÚNG TÔI
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-[#000113] mb-6">
            Đồng hành cùng bạn
            <br />
            <span className="text-[#352116]">mọi bước đường</span>
          </h2>
          <p className="text-lg text-[#43494D]">
            Chúng tôi hiểu những thách thức của bạn và cung cấp giải pháp toàn diện
            để bạn tự tin tái khởi động sự nghiệp.
          </p>
        </motion.div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {solutions.map((solution, index) => (
            <SolutionCard key={solution.id} solution={solution} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
