import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkle, ChartBar, Path, GraduationCap, UsersThree, Heart } from '@phosphor-icons/react';

const features = [
  {
    icon: Sparkle,
    title: 'AI Career Matching',
    description: 'Thuật toán ghép việc làm dựa trên 10+ năm kinh nghiệm của bạn.',
  },
  {
    icon: ChartBar,
    title: 'Skill Gap Analysis',
    description: 'Phân tích khoảng trống kỹ năng với ESCO framework chuẩn quốc tế.',
  },
  {
    icon: Path,
    title: 'Personalized Learning Paths',
    description: 'Lộ trình học được thiết kế riêng cho mục tiêu và tốc độ của bạn.',
  },
  {
    icon: GraduationCap,
    title: 'Scholarship Access',
    description: 'Tiếp cận học bổng và chương trình tài trợ độc quyền.',
  },
  {
    icon: UsersThree,
    title: 'Expert Mentors',
    description: '500+ mentor cấp cao đồng hành và chia sẻ kinh nghiệm thực tế.',
  },
  {
    icon: Heart,
    title: 'Community Support',
    description: 'Cộng đồng chuyên gia 35+ hỗ trợ lẫn nhau trên hành trình mới.',
  },
];

const FeatureCard = ({ feature, index }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      className={`rounded-2xl p-6 transition-all duration-300 hover:shadow-lg ${
        isEven ? 'bg-white' : 'bg-zinc-50'
      }`}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.5,
        delay: (index % 3) * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -4 }}
    >
      <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
        <feature.icon size={28} weight="duotone" className="text-[hsl(var(--primary))]" />
      </div>

      <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-2">
        {feature.title}
      </h3>

      <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
};

const FeaturesSection = () => {
  const reduce = useReducedMotion();

  return (
    <section className="py-24 px-8 bg-white">
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
            Tại sao chọn Restart 35+
          </h2>
          <p className="text-base text-[hsl(var(--muted-foreground))] max-w-[55ch] mx-auto">
            Nền tảng được xây dựng riêng cho hành trình tái khởi động sự nghiệp của bạn.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
