import React from 'react';
import { motion } from 'framer-motion';

const StatsBar = () => {
  const logos = [
    'Microsoft', 'Google', 'Amazon', 'Vingroup', 'FPT', 'Viettel', 'Shopee', 'Tiki'
  ];

  return (
    <section className="bg-white py-20 border-b border-black/5 overflow-hidden">
      {/* Marquee */}
      <div className="relative w-full flex overflow-x-hidden mb-24">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
        
        <motion.div
          className="flex whitespace-nowrap items-center"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20
          }}
        >
          {/* Double the array to create seamless loop */}
          {[...logos, ...logos].map((logo, index) => (
            <span 
              key={index} 
              className="mx-12 text-2xl font-semibold text-[#000000]/20 tracking-tighter"
              style={{ fontFamily: '"Inter", sans-serif' }}
            >
              {logo}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-6xl md:text-7xl font-normal text-[hsl(var(--primary))] mb-2" style={{ fontFamily: '"Instrument Serif", serif' }}>
              5,000+
            </h3>
            <p className="text-[#6F6F6F] font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>Việc làm đang tuyển</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-6xl md:text-7xl font-normal text-[hsl(var(--primary))] mb-2" style={{ fontFamily: '"Instrument Serif", serif' }}>
              200+
            </h3>
            <p className="text-[#6F6F6F] font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>Khóa học kỹ năng</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-6xl md:text-7xl font-normal text-[hsl(var(--primary))] mb-2" style={{ fontFamily: '"Instrument Serif", serif' }}>
              50+
            </h3>
            <p className="text-[#6F6F6F] font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>Doanh nghiệp & Tổ chức</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
