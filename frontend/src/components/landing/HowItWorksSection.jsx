import React from 'react';
import { motion } from 'framer-motion';

const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      title: "Đăng ký & Đánh giá năng lực",
      description: "Tạo hồ sơ chuyên nghiệp chỉ trong vài phút. Hệ thống sẽ giúp bạn đánh giá các kỹ năng hiện có và định hướng con đường phù hợp nhất."
    },
    {
      number: "02",
      title: "Nâng cao kỹ năng",
      description: "Tham gia các khóa học đào tạo nghề và kỹ năng mềm do các chuyên gia hàng đầu giảng dạy. Nhận chứng chỉ ngay sau khi hoàn thành."
    },
    {
      number: "03",
      title: "Kết nối Việc làm",
      description: "Hệ thống AI sẽ tự động đề xuất những công việc phù hợp với kỹ năng và định hướng của bạn tại các doanh nghiệp đối tác uy tín."
    },
    {
      number: "04",
      title: "Làm việc & Thăng tiến",
      description: "Bắt đầu công việc mới. Tham gia cộng đồng Restart 35+ để học hỏi, chia sẻ và tiếp tục phát triển sự nghiệp bền vững."
    }
  ];

  return (
    <section className="bg-white py-32 border-b border-black/5 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-20">
          
          {/* Left: Sticky Header */}
          <div className="lg:w-1/3">
            <div className="sticky top-32">
              <h2 
                className="text-4xl md:text-5xl lg:text-6xl text-black leading-tight mb-6"
                style={{ fontFamily: '"Instrument Serif", serif' }}
              >
                Hành trình <br/>
                <span className="italic text-[#6F6F6F]">bắt đầu lại.</span>
              </h2>
              <p className="text-[#6F6F6F] text-lg leading-relaxed" style={{ fontFamily: '"Inter", sans-serif' }}>
                4 bước đơn giản để tìm lại vị thế của bạn trên thị trường lao động. Chúng tôi sẽ đồng hành cùng bạn trên mỗi chặng đường.
              </p>
            </div>
          </div>

          {/* Right: Scrolling Steps */}
          <div className="lg:w-2/3">
            <div className="space-y-12 md:space-y-24">
              {steps.map((step, index) => (
                <motion.div 
                  key={index}
                  className="flex gap-8 md:gap-12 group"
                  initial={{ opacity: 0.3, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ margin: "-200px" }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Number */}
                  <div 
                    className="text-5xl md:text-7xl font-light text-zinc-200 group-hover:text-[hsl(var(--primary))] transition-colors duration-500"
                    style={{ fontFamily: '"Instrument Serif", serif' }}
                  >
                    {step.number}
                  </div>
                  
                  {/* Content */}
                  <div className="pt-2 md:pt-4 border-t border-black/10 flex-1">
                    <h3 className="text-2xl md:text-3xl font-medium text-black mb-4" style={{ fontFamily: '"Inter", sans-serif' }}>
                      {step.title}
                    </h3>
                    <p className="text-lg text-[#6F6F6F] leading-relaxed max-w-lg">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
