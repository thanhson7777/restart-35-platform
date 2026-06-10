import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CaretLeft, CaretRight, Star } from '@phosphor-icons/react';

const courses = [
  {
    title: 'Backend Development Masterclass',
    instructor: 'Nguyễn Văn Minh',
    instructorAvatar: 'https://picsum.photos/seed/instructor-minh/48/48',
    rating: 4.9,
    reviews: '1.2k',
    price: '2.400.000đ',
    thumbnail: 'https://picsum.photos/seed/backend-dev/320/200',
  },
  {
    title: 'Digital Marketing Strategy',
    instructor: 'Trần Thị Lan',
    instructorAvatar: 'https://picsum.photos/seed/instructor-lan/48/48',
    rating: 4.8,
    reviews: '890',
    price: '1.800.000đ',
    thumbnail: 'https://picsum.photos/seed/digital-marketing/320/200',
  },
  {
    title: 'Project Management Professional',
    instructor: 'Lê Hoàng Nam',
    instructorAvatar: 'https://picsum.photos/seed/instructor-nam/48/48',
    rating: 4.9,
    reviews: '2.1k',
    price: '3.200.000đ',
    thumbnail: 'https://picsum.photos/seed/project-management/320/200',
  },
  {
    title: 'Data Analysis with Python',
    instructor: 'Phạm Đức Anh',
    instructorAvatar: 'https://picsum.photos/seed/instructor-anh/48/48',
    rating: 4.7,
    reviews: '654',
    price: '1.600.000đ',
    thumbnail: 'https://picsum.photos/seed/data-analysis/320/200',
  },
  {
    title: 'Leadership & Communication',
    instructor: 'Đặng Thu Hà',
    instructorAvatar: 'https://picsum.photos/seed/instructor-ha/48/48',
    rating: 4.9,
    reviews: '1.5k',
    price: '2.000.000đ',
    thumbnail: 'https://picsum.photos/seed/leadership/320/200',
  },
  {
    title: 'Cloud Computing Fundamentals',
    instructor: 'Hoàng Minh Tuấn',
    instructorAvatar: 'https://picsum.photos/seed/instructor-tuan/48/48',
    rating: 4.8,
    reviews: '420',
    price: '2.800.000đ',
    thumbnail: 'https://picsum.photos/seed/cloud-computing/320/200',
  },
];

const CourseCard = ({ course, index }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
        {/* Thumbnail */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2 line-clamp-2">
            {course.title}
          </h3>

          {/* Instructor */}
          <div className="flex items-center gap-2 mb-3">
            <img
              src={course.instructorAvatar}
              alt={course.instructor}
              className="w-6 h-6 rounded-full object-cover bg-zinc-100"
            />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {course.instructor}
            </span>
          </div>

          {/* Rating + Price */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1">
              <Star size={13} weight="fill" className="text-amber-400" />
              <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                {course.rating}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                ({course.reviews})
              </span>
            </div>
            <span className="text-sm font-semibold text-[hsl(var(--primary))]">
              {course.price}
            </span>
          </div>

          {/* Register button */}
          <Link
            to="/courses"
            className="mt-3 w-full py-2 px-4 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white text-sm font-medium rounded-xl text-center transition-colors duration-200 active:scale-[0.98]"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const PopularCourses = () => {
  const reduce = useReducedMotion();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  return (
    <section className="py-24 px-8 bg-white">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-end justify-between mb-10"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-2">
              Khóa học nổi bật
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Những khóa học được đánh giá cao nhất bởi cộng đồng.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all"
              aria-label="Cuộn trái"
            >
              <CaretLeft size={18} className="text-zinc-600" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all"
              aria-label="Cuộn phải"
            >
              <CaretRight size={18} className="text-zinc-600" />
            </button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto scroll-smooth scroll-snap-x-mandatory pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {courses.map((course, index) => (
            <div key={course.title} className="flex-shrink-0 w-[280px] scroll-snap-start">
              <CourseCard course={course} index={index} />
            </div>
          ))}
        </div>

        {/* View all link */}
        <div className="mt-8 text-center">
          <Link
            to="/courses"
            className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
          >
            Xem tất cả khóa học
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularCourses;
