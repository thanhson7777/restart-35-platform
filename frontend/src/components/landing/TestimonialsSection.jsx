import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const testimonials = [
    {
      quote: "Sau 5 năm chấp hành án, tôi tưởng chừng không thể nào xin được việc. Nhờ nền tảng này, tôi không chỉ học được nghề thợ mộc mà còn có một công việc ổn định tại xưởng với mức thu nhập tốt.",
      author: "Anh Nguyễn Văn Hùng",
      role: "Thợ mộc tại Xưởng Gỗ Phương Nam",
      age: 42
    },
    {
      quote: "Ở tuổi 45, bị sa thải do cắt giảm nhân sự khiến tôi rất sốc. Restart 35+ đã giúp tôi tham gia khóa học bán hàng trực tuyến và giờ đây tôi đã tự mở được một cửa hàng nhỏ cho riêng mình.",
      author: "Chị Trần Thị Mai",
      role: "Chủ cửa hàng tạp hóa số",
      age: 45
    },
    {
      quote: "Doanh nghiệp chúng tôi luôn gặp khó khăn trong việc tìm kiếm những người thợ gắn bó lâu dài. Từ khi hợp tác với nền tảng, chúng tôi đã tuyển được những người lao động trung niên cực kỳ trách nhiệm và cẩn thận.",
      author: "Anh Lê Quốc Bảo",
      role: "Giám đốc nhân sự, Công ty Cơ khí Tiến Đạt",
      age: null
    }
  ];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  return (
    <section className="bg-[#FAFAFA] py-32 border-b border-black/5 relative overflow-hidden">
      {/* Background Giant Quote Mark */}
      <div 
        className="absolute top-10 left-10 md:top-20 md:left-20 text-[20rem] md:text-[30rem] leading-none text-[hsl(var(--primary))]/[0.04] select-none pointer-events-none"
        style={{ fontFamily: '"Instrument Serif", serif' }}
      >
        "
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p 
              className="text-2xl md:text-4xl lg:text-5xl leading-relaxed text-black mb-12"
              style={{ fontFamily: '"Instrument Serif", serif' }}
            >
              "{testimonials[currentIndex].quote}"
            </p>
            
            <div className="flex flex-col items-center justify-center">
              <h4 className="text-lg font-medium text-black" style={{ fontFamily: '"Inter", sans-serif' }}>
                {testimonials[currentIndex].author}
              </h4>
              <p className="text-[#6F6F6F] mt-1">
                {testimonials[currentIndex].role} {testimonials[currentIndex].age && `(${testimonials[currentIndex].age} tuổi)`}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-center items-center gap-6 mt-16">
          <button 
            onClick={handlePrev}
            className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-[hsl(var(--primary))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors duration-300"
          >
            ←
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${idx === currentIndex ? 'bg-[hsl(var(--primary))]' : 'bg-black/10'}`}
              />
            ))}
          </div>
          <button 
            onClick={handleNext}
            className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-[hsl(var(--primary))] hover:border-[hsl(var(--primary))] hover:text-white transition-colors duration-300"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
