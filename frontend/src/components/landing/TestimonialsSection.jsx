import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from '@phosphor-icons/react';

const testimonials = [
  {
    name: 'Nguyễn Thu Hương',
    age: 42,
    from: 'Trưởng phòng Tài chính',
    to: 'Data Analyst',
    quote:
      'Sau 18 năm trong ngành tài chính, tôi tìm được công việc mới với mức lương cao hơn 40%. Khóa học Data Analysis giúp tôi tự tin bước sang lĩnh vực mới.',
    avatar: 'https://picsum.photos/seed/woman-finance/80/80',
  },
  {
    name: 'Trần Văn Phong',
    age: 47,
    from: 'Giám đốc Kinh doanh',
    to: 'Cloud Engineer',
    quote:
      'AI của nền tảng gợi ý đúng lộ trình cho tôi. Chỉ 3 tháng sau khi hoàn thành khóa Cloud Computing, tôi đã nhận được offer từ một công ty fintech.',
    avatar: 'https://picsum.photos/seed/man-executive/80/80',
  },
  {
    name: 'Phạm Thị Mai Anh',
    age: 39,
    from: 'Marketing Manager',
    to: 'Marketing Director',
    quote:
      'Lần đầu tiên có nền tảng thực sự hiểu những lo lắng của chúng tôi khi muốn chuyển nghề. Cộng đồng ở đây rất đồng cảm và hỗ trợ.',
    avatar: 'https://picsum.photos/seed/woman-manager/80/80',
  },
];

const StarRating = () => (
  <div className="flex gap-0.5">
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} size={14} weight="fill" className="text-amber-400" />
    ))}
  </div>
);

const TestimonialCard = ({ testimonial, index }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <StarRating />

      <p className="mt-4 text-sm text-[hsl(var(--foreground))] leading-relaxed line-clamp-3">
        "{testimonial.quote}"
      </p>

      <div className="mt-6 flex items-center gap-3">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="w-11 h-11 rounded-full object-cover bg-zinc-100"
        />
        <div>
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {testimonial.name}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {testimonial.age} tuổi · {testimonial.from} → {testimonial.to}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const TestimonialsSection = () => {
  const reduce = useReducedMotion();

  return (
    <section className="py-24 px-8 bg-[hsl(var(--muted))]">
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
            Câu chuyện thành công
          </h2>
          <p className="text-base text-[hsl(var(--muted-foreground))] max-w-[55ch] mx-auto">
            Những chuyên gia đã tái khởi động sự nghiệp thành công cùng Restart 35+.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <TestimonialCard key={t.name} testimonial={t} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
