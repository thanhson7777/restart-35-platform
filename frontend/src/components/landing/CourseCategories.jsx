import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Code, ChartLine, Megaphone, Calculator, ChatCircle, ArrowsClockwise } from '@phosphor-icons/react';

const categories = [
  {
    icon: Code,
    title: 'CNTT & Tech',
    subtitle: 'Backend, Frontend, DevOps, AI',
    image: 'https://picsum.photos/seed/tech-programming/400/250',
  },
  {
    icon: ChartLine,
    title: 'Quản trị & Kinh doanh',
    subtitle: 'Project Management, Business Analysis, HR',
    image: 'https://picsum.photos/seed/business-meeting/400/250',
  },
  {
    icon: Megaphone,
    title: 'Marketing & Sales',
    subtitle: 'Digital Marketing, CRM, B2B Sales',
    image: 'https://picsum.photos/seed/marketing-team/400/250',
  },
  {
    icon: Calculator,
    title: 'Tài chính & Kế toán',
    subtitle: 'Finance, Accounting, Tax, Audit',
    image: 'https://picsum.photos/seed/finance-accounting/400/250',
  },
  {
    icon: ChatCircle,
    title: 'Kỹ năng mềm',
    subtitle: 'Leadership, Giao tiếp, Public Speaking',
    image: 'https://picsum.photos/seed/soft-skills/400/250',
  },
  {
    icon: ArrowsClockwise,
    title: 'Chuyển đổi nghề nghiệp',
    subtitle: 'Career Transition Programs',
    image: 'https://picsum.photos/seed/career-growth/400/250',
  },
];

const CategoryCard = ({ category, index }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.5,
        delay: (index % 3) * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        to="/courses"
        className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        {/* Image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={category.image}
            alt={category.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Icon badge overlay */}
          <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
            <category.icon size={22} weight="duotone" className="text-[hsl(var(--primary))]" />
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-1 group-hover:text-[hsl(var(--primary))] transition-colors">
            {category.title}
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
            {category.subtitle}
          </p>
          <span className="text-sm font-medium text-[hsl(var(--primary))] group-hover:underline">
            Khám phá
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

const CourseCategories = () => {
  const reduce = useReducedMotion();

  return (
    <section className="py-24 px-8 bg-zinc-50">
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
            Danh mục khóa học
          </h2>
          <p className="text-base text-[hsl(var(--muted-foreground))] max-w-[55ch] mx-auto">
            Chọn lĩnh vực phù hợp với mục tiêu và đam mê của bạn.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <CategoryCard key={category.title} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseCategories;
