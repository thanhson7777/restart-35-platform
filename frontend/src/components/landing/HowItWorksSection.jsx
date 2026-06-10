import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserCircle, Brain, PaperPlaneTilt, Briefcase } from '@phosphor-icons/react';

const steps = [
  {
    icon: UserCircle,
    title: 'Tạo hồ sơ',
    description: 'Nhập kinh nghiệm, kỹ năng và mục tiêu trong 3 phút.',
  },
  {
    icon: Brain,
    title: 'AI phân tích',
    description: 'Thuật toán gợi ý việc làm và lộ trình học phù hợp.',
  },
  {
    icon: PaperPlaneTilt,
    title: 'Ứng tuyển thông minh',
    description: 'Nộp đơn được cá nhân hóa cho từng vị trí.',
  },
  {
    icon: Briefcase,
    title: 'Nhận việc mới',
    description: 'Tăng thu nhập và thăng tiến bền vững.',
  },
];

const StepCard = ({ step, index }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="relative flex flex-col items-center text-center px-4"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white text-sm font-bold flex items-center justify-center mb-4">
        {index + 1}
      </div>

      <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-5">
        <step.icon size={40} weight="duotone" className="text-[hsl(var(--primary))]" />
      </div>

      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-[104px] left-[60%] w-[80%] border-t-2 border-dashed border-[hsl(var(--primary))]/20 z-0" />
      )}

      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
        {step.title}
      </h3>

      <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-[200px] leading-relaxed">
        {step.description}
      </p>
    </motion.div>
  );
};

const HowItWorksSection = () => {
  const reduce = useReducedMotion();
  const headerRef = useRef(null);

  return (
    <section className="py-24 px-8 bg-gradient-to-b from-white to-[hsl(var(--muted))]">
      <div className="max-w-[1280px] mx-auto" ref={headerRef}>
        <motion.div
          className="text-center mb-16"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
            Quy trình 4 bước đơn giản
          </h2>
          <p className="text-base text-[hsl(var(--muted-foreground))] max-w-[55ch] mx-auto">
            Từ hồ sơ đến việc làm mới, chúng tôi đồng hành cùng bạn trong suốt hành trình.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
