import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Briefcase, BookOpen, MapPinLine, Users } from '@phosphor-icons/react';

const FeaturesSection = () => {
  return (
    <section className="bg-[#FAFAFA] py-32 border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <motion.div 
          className="mb-16 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 
            className="text-4xl md:text-5xl lg:text-6xl text-black mb-6"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            Mọi thứ bạn cần <br/>để <span className="italic text-[#6F6F6F]">bắt đầu lại.</span>
          </h2>
          <p className="text-[#6F6F6F] text-lg" style={{ fontFamily: '"Inter", sans-serif' }}>
            Hệ sinh thái toàn diện từ kết nối việc làm, đào tạo kỹ năng cho đến hỗ trợ cộng đồng.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 h-auto md:h-[600px]">
          
          {/* Card 1: Việc làm (Large) */}
          <motion.div 
            className="md:col-span-2 md:row-span-1 rounded-[2rem] bg-white border border-black/5 p-8 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100/50 to-transparent z-0" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Briefcase size={24} weight="fill" className="text-[hsl(var(--primary))]" />
                </div>
                <h3 className="text-2xl font-semibold text-black mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Kết nối Việc làm</h3>
                <p className="text-[#6F6F6F] max-w-sm">Hàng ngàn cơ hội việc làm từ các doanh nghiệp uy tín, không phân biệt tuổi tác hay rào cản quá khứ.</p>
              </div>
              <Link to="/jobs" className="mt-8 inline-flex items-center text-black font-medium group-hover:underline">
                Tìm việc ngay <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
            {/* Decorative background image could go here */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-zinc-100 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
          </motion.div>

          {/* Card 2: Khóa học (Tall) */}
          <motion.div 
            className="md:col-span-1 md:row-span-2 rounded-[2rem] bg-blue-950 border border-black/5 p-8 relative overflow-hidden group shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                <BookOpen size={24} weight="fill" className="text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Đào tạo Kỹ năng</h3>
              <p className="text-zinc-400">Trang bị các kỹ năng nghề nghiệp và kỹ năng mềm cần thiết để tự tin làm việc trong môi trường hiện đại.</p>
              
              <div className="mt-auto pt-12">
                <Link to="/courses" className="w-full py-4 bg-white text-black rounded-full font-medium flex items-center justify-center hover:bg-zinc-200 transition-colors">
                  Khám phá khóa học
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Bản đồ cơ hội (Medium) */}
          <motion.div 
            className="md:col-span-1 md:row-span-1 rounded-[2rem] bg-white border border-black/5 p-8 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <MapPinLine size={24} weight="fill" className="text-[hsl(var(--primary))]" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Bản đồ Cơ hội</h3>
                <p className="text-[#6F6F6F] text-sm">Tìm kiếm việc làm và các tổ chức hỗ trợ gần khu vực sinh sống của bạn.</p>
              </div>
              <Link to="/opportunity-map" className="mt-6 inline-flex items-center text-black text-sm font-medium hover:underline">
                Xem bản đồ →
              </Link>
            </div>
          </motion.div>

          {/* Card 4: Cộng đồng (Medium) */}
          <motion.div 
            className="md:col-span-1 md:row-span-1 rounded-[2rem] bg-white border border-black/5 p-8 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Users size={24} weight="fill" className="text-[hsl(var(--primary))]" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Cộng đồng & Diễn đàn</h3>
                <p className="text-[#6F6F6F] text-sm">Nơi chia sẻ câu chuyện, tìm kiếm người hướng dẫn (Mentor) và đồng hành.</p>
              </div>
              <Link to="/community" className="mt-6 inline-flex items-center text-black text-sm font-medium hover:underline">
                Tham gia ngay →
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
