import React from 'react';
import { motion } from 'framer-motion';

const CoreProblemsSection = () => {
  return (
    <section className="bg-white py-32 border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          {/* Left: Massive Editorial Heading */}
          <motion.div 
            className="flex-1"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 
              className="text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-[hsl(var(--primary))]"
              style={{ fontFamily: '"Instrument Serif", serif' }}
            >
              Khởi đầu mới <br/>
              <span className="text-[#6F6F6F] italic">không bao giờ</span><br/>
              là quá muộn.
            </h2>
          </motion.div>

          {/* Right: Detailed Description */}
          <motion.div 
            className="flex-1 lg:max-w-xl"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <p className="text-xl md:text-2xl text-[#6F6F6F] leading-relaxed font-light mb-8" style={{ fontFamily: '"Inter", sans-serif' }}>
              Thị trường lao động luôn ưu tiên giới trẻ, khiến những người trên 35 tuổi và đặc biệt là cựu phạm nhân gặp vô vàn rào cản khi muốn quay lại làm việc.
            </p>
            <div className="space-y-6">
              <div className="p-6 border border-black/5 rounded-2xl bg-zinc-50/50">
                <h4 className="text-lg font-medium text-black mb-2">Định kiến xã hội</h4>
                <p className="text-[#6F6F6F] leading-relaxed">Hồ sơ quá khứ hoặc tuổi tác thường là lý do để nhà tuyển dụng từ chối ngay từ vòng gửi CV.</p>
              </div>
              <div className="p-6 border border-black/5 rounded-2xl bg-zinc-50/50">
                <h4 className="text-lg font-medium text-black mb-2">Thiếu hụt kỹ năng mới</h4>
                <p className="text-[#6F6F6F] leading-relaxed">Sự thay đổi nhanh chóng của công nghệ khiến nhiều người cảm thấy chới với và tụt hậu.</p>
              </div>
            </div>
            
            <p className="text-lg text-black font-medium mt-10 leading-relaxed" style={{ fontFamily: '"Inter", sans-serif' }}>
              Restart 35+ ra đời không chỉ để kết nối việc làm, mà để phá vỡ sự im lặng đó. Chúng tôi tạo ra một "bến đỗ" kỹ thuật số — nơi những tâm hồn muốn làm lại cuộc đời tìm thấy cơ hội thực sự.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default CoreProblemsSection;
