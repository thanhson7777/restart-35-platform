import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section className="bg-blue-900 py-32 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.h2 
          className="text-5xl md:text-7xl lg:text-8xl text-white leading-[0.95] tracking-tight mb-8"
          style={{ fontFamily: '"Instrument Serif", serif' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Bạn đã sẵn sàng <br/>
          <span className="text-[#A1A1AA] italic">để bắt đầu lại?</span>
        </motion.h2>

        <motion.p 
          className="text-[#A1A1AA] text-lg md:text-xl max-w-2xl mx-auto mb-12"
          style={{ fontFamily: '"Inter", sans-serif' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Tham gia cùng hàng ngàn chuyên gia và người lao động khác để tìm kiếm cơ hội mới, hoặc trở thành đối tác doanh nghiệp để tuyển dụng những nhân sự chất lượng.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Link 
            to="/auth" 
            className="w-full sm:w-auto px-10 py-4 bg-[hsl(var(--primary))] text-white font-medium rounded-full hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/20"
          >
            Đăng ký Người lao động
          </Link>
          <Link 
            to="/contact" 
            className="w-full sm:w-auto px-10 py-4 bg-transparent border border-white/20 text-white font-medium rounded-full hover:bg-white/10 transition-colors duration-300"
          >
            Trở thành Đối tác
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
