import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import {
  Brain, Target, Student, Handshake, Buildings,
  GraduationCap, ChartLineUp, HandHeart, ArrowRight,
  Sparkle, Briefcase, MapTrifold, Globe, ShieldCheck, BookOpenText
} from '@phosphor-icons/react';

const ROLES = [
  {
    id: 'worker',
    name: 'Người Lao Động',
    icon: Student,
    color: 'blue',
    description: 'Bệ phóng tái khởi động sự nghiệp và nâng cao năng lực chuyên môn.',
    features: [
      {
        title: 'Phân tích & Gợi ý (AI)',
        desc: 'AI tự động phân tích hồ sơ, đối chiếu yêu cầu thị trường để tìm ra "khoảng trống kỹ năng" (Skill Gaps).',
        icon: Brain,
      },
      {
        title: 'Tìm việc đa kênh',
        desc: 'Khám phá cơ hội việc làm từ thị trường mở và hệ sinh thái các doanh nghiệp đối tác độc quyền.',
        icon: Briefcase,
      },
      {
        title: 'Học tập & Bổ sung',
        desc: 'Tham gia các khóa đào tạo (Reskilling/Upskilling) qua hình thức trực tuyến hoặc trực tiếp.',
        icon: GraduationCap,
      },
      {
        title: 'Cơ hội Tài trợ',
        desc: 'Nhận học bổng hoặc tài trợ học phí toàn phần/bán phần từ Doanh nghiệp và Tổ chức phi chính phủ.',
        icon: HandHeart,
      },
      {
        title: 'Bản đồ cơ hội',
        desc: 'Kết nối cộng đồng 35+, tham khảo bản đồ xu hướng và lộ trình nghề nghiệp chuẩn xác.',
        icon: MapTrifold,
      },
    ]
  },
  {
    id: 'enterprise',
    name: 'Doanh Nghiệp',
    icon: Buildings,
    color: 'emerald',
    description: 'Nguồn nhân lực bền vững, gắn kết và mang lại trách nhiệm xã hội sâu sắc.',
    features: [
      {
        title: 'Tuyển dụng trúng đích',
        desc: 'Tiếp cận tệp ứng viên 35+ giàu kinh nghiệm thực chiến, có độ gắn bó và tính ổn định cực cao.',
        icon: Target,
      },
      {
        title: 'Lọc theo Kỹ năng',
        desc: 'Hệ thống Skill-based matching giúp lọc và tìm kiếm ứng viên dựa trên bộ kỹ năng thực tế.',
        icon: Sparkle,
      },
      {
        title: 'Tài trợ (CSR)',
        desc: 'Tài trợ học phí để "đặt hàng" nhân sự đầu ra, đồng thời thực hiện trách nhiệm xã hội doanh nghiệp.',
        icon: Handshake,
      },
      {
        title: 'Thương hiệu Tuyển dụng',
        desc: 'Khẳng định vị thế, giá trị nhân văn và hình ảnh doanh nghiệp mạnh mẽ trên nền tảng.',
        icon: ShieldCheck,
      },
    ]
  },
  {
    id: 'trainer',
    name: 'Cơ Sở Đào Tạo',
    icon: BookOpenText,
    color: 'violet',
    description: 'Cầu nối giáo dục thực tiễn mang lại những khóa học bám sát nhu cầu thị trường.',
    features: [
      {
        title: 'Phân phối đa nền tảng',
        desc: 'Đăng tải và quản lý linh hoạt các khóa học Lớp học trực tuyến (Live) hoặc ngoại tuyến (Offline).',
        icon: Globe,
      },
      {
        title: 'Tiếp cận đúng mục tiêu',
        desc: 'AI tự động giới thiệu khóa học của bạn tới đúng những người lao động đang bị "thiếu" kỹ năng đó.',
        icon: Target,
      },
      {
        title: 'Lộ trình thực chiến',
        desc: 'Thiết kế giáo án nhắm trực tiếp vào việc lấp đầy các "Skill Gaps" đang tồn tại trên thị trường.',
        icon: ChartLineUp,
      },
      {
        title: 'Nhận nguồn vốn hợp tác',
        desc: 'Hợp tác chặt chẽ với Doanh nghiệp và NGO để có ngân sách tài trợ cho học viên lớp mình.',
        icon: Handshake,
      },
    ]
  },
  {
    id: 'ngo',
    name: 'Tổ Chức NGO',
    icon: HandHeart,
    color: 'rose',
    description: 'Kiến tạo tác động xã hội và giải quyết bài toán an sinh bền vững.',
    features: [
      {
        title: 'Cấp vốn hiệu quả',
        desc: 'Cung cấp các gói tài trợ (Funding) nhắm đúng vào nhóm lao động 35+ yếu thế hoặc thất nghiệp.',
        icon: HandHeart,
      },
      {
        title: 'Đo lường tác động',
        desc: 'Quản lý minh bạch dòng tiền, đo lường tỷ lệ học viên hoàn thành khóa học và có việc làm.',
        icon: ChartLineUp,
      },
      {
        title: 'Hợp tác chiến lược',
        desc: 'Bắt tay cùng nền tảng và các cơ sở đào tạo để giải quyết bài toán an sinh xã hội vĩ mô.',
        icon: Handshake,
      },
    ]
  }
];

const stats = [
  { value: '5,000+', label: 'Học viên 35+', sub: 'đã tái hòa nhập' },
  { value: '500+', label: 'Doanh nghiệp', sub: 'tuyển dụng & tài trợ' },
  { value: '40+', label: 'Trung tâm', sub: 'cung cấp đào tạo' },
  { value: '15+', label: 'Tổ chức NGO', sub: 'tham gia đồng hành' },
];

const partners = [
  { name: 'FPT Software', seed: 'partner1' },
  { name: 'TopCV', seed: 'partner2' },
  { name: 'VNG', seed: 'partner3' },
  { name: 'Viettel', seed: 'partner4' },
  { name: 'FIS', seed: 'partner5' },
  { name: 'CMC Corp', seed: 'partner6' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function AboutPage() {
  const [activeRole, setActiveRole] = useState(ROLES[0].id);

  return (
    <div className="min-h-screen bg-white dark:bg-[hsl(var(--background))]">
      <Navbar />

      {/* 1. Hero Ecosystem */}
      <section className="relative pt-32 pb-20 px-8 bg-white dark:bg-zinc-950 overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[hsl(var(--primary))]/5 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>
        
        <div className="max-w-[1000px] mx-auto text-center relative z-10">
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 rounded-full"
          >
            <Sparkle size={14} weight="fill" />
            Hệ Sinh Thái Restart 35+
          </motion.span>
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-4xl md:text-5xl lg:text-7xl font-bold text-[hsl(var(--foreground))] mb-6 leading-[1.1] tracking-tight"
          >
            Kết nối trọn vẹn Học tập, <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] to-blue-600">
              Việc làm và Tài trợ
            </span>
          </motion.h1>
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] max-w-[70ch] mx-auto mb-10 leading-relaxed"
          >
            Chúng tôi không chỉ là một cổng thông tin việc làm. Restart 35+ là một <strong>bệ phóng toàn diện</strong> nơi Người lao động, Doanh nghiệp, Cơ sở đào tạo và Quỹ hỗ trợ cộng hưởng để giải quyết bài toán nhân sự lớn tuổi.
          </motion.p>
        </div>
      </section>

      {/* 2. AI Core Feature Showcase */}
      <section className="py-24 px-8 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Trí tuệ nhân tạo soi sáng <span className="text-blue-400">Khoảng trống Kỹ năng</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                Trái tim của hệ sinh thái là hệ thống AI Skill Gap Analysis. Không cần phải hoang mang tìm định hướng mới, AI sẽ phân tách hồ sơ của bạn với hơn 10,000 kỹ năng chuẩn ESCO để:
              </p>
              <ul className="space-y-5">
                {[
                  'Chỉ ra chính xác kỹ năng bạn đang thiếu cho công việc mơ ước.',
                  'Tự động match với các khóa học bù đắp kỹ năng hoàn hảo nhất.',
                  'Gợi ý doanh nghiệp đang khát khao bộ kỹ năng tương lai của bạn.'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4 text-zinc-300">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkle size={12} className="text-blue-400" weight="fill" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square md:aspect-[4/3] rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-8 shadow-2xl overflow-hidden relative">
                 {/* Decorative AI UI elements */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-zinc-800 rounded-full animate-[spin_20s_linear_infinite]" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-dashed border-zinc-700/50 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600/20 w-32 h-32 rounded-full blur-2xl" />
                 
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.5)] z-20">
                    <Brain size={32} weight="duotone" className="text-white" />
                 </div>

                 {/* Nodes */}
                 <div className="absolute top-[20%] left-[20%] bg-zinc-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300">Python Data</div>
                 <div className="absolute bottom-[20%] right-[15%] bg-zinc-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300">Digital Marketing</div>
                 <div className="absolute top-[30%] right-[20%] bg-blue-900/50 backdrop-blur px-3 py-1.5 rounded-lg border border-blue-700/50 text-xs text-blue-300">Thiếu: SQL Basic</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Role Tabs (Ecosystem Map) */}
      <section className="py-24 px-8 bg-zinc-50 dark:bg-[hsl(var(--background))]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
              Vai trò của bạn trong Hệ sinh thái?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-[60ch] mx-auto">
              Nền tảng được thiết kế chuyên biệt để đem lại giá trị tối đa cho từng nhóm tham gia. Hãy chọn vai trò của bạn để khám phá.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeRole === role.id 
                    ? 'bg-[hsl(var(--primary))] text-white shadow-lg shadow-[hsl(var(--primary))]/20 scale-105' 
                    : 'bg-white dark:bg-zinc-900 text-[hsl(var(--muted-foreground))] hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <role.icon size={20} weight={activeRole === role.id ? "fill" : "regular"} />
                {role.name}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {ROLES.map((role) => activeRole === role.id && (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-sm border border-zinc-100 dark:border-zinc-800"
              >
                <div className="max-w-[800px] mb-12">
                  <h3 className="text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mb-3">
                    Dành cho {role.name}
                  </h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-lg">
                    {role.description}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {role.features.map((feature, idx) => (
                    <div 
                      key={idx} 
                      className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 hover:border-[hsl(var(--primary))]/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-800 mb-5">
                        <feature.icon size={24} className="text-[hsl(var(--primary))]" weight="duotone" />
                      </div>
                      <h4 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">{feature.title}</h4>
                      <p className="text-[hsl(var(--muted-foreground))] leading-relaxed text-sm">
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* 4. Stats & Partners */}
      <section className="py-24 px-8 border-y border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            
            {/* Stats */}
            <div className="lg:col-span-5">
              <h2 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-4">Sức mạnh của sự chung tay</h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-10">
                Chỉ sau một thời gian ngắn, nền tảng đã thu hút sự chú ý và tin tưởng của hàng ngàn chuyên gia cũng như các tập đoàn lớn.
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                {stats.map((s, i) => (
                  <div key={i}>
                    <div className="text-3xl font-bold text-[hsl(var(--primary))] mb-1">{s.value}</div>
                    <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{s.label}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partners */}
            <div className="lg:col-span-7 bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-10 border border-zinc-100 dark:border-zinc-800">
               <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-8 text-center">Các đối tác chiến lược đồng hành</h3>
               <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-10">
                  {partners.map((p, i) => (
                    <div key={i} className="opacity-50 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0">
                      <img
                        src={`https://picsum.photos/seed/${p.seed}/120/48`}
                        alt={p.name}
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Dual CTA */}
      <section className="py-24 px-8 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/2 w-[800px] h-[800px] rounded-full bg-[hsl(var(--primary))]/10 blur-[100px]" />
        </div>
        
        <div className="max-w-[1000px] mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Bắt đầu hành trình của bạn
          </h2>
          <p className="text-zinc-400 text-lg mb-12 max-w-[60ch] mx-auto">
            Dù bạn là một chuyên gia đang tìm hướng đi mới, hay một tổ chức muốn lan tỏa giá trị, Restart 35+ luôn có không gian dành cho bạn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-[hsl(var(--primary))] text-white font-semibold rounded-xl hover:bg-[hsl(var(--primary))]/90 active:scale-[0.98] transition-all duration-200"
            >
              <Student size={20} weight="bold" />
              Đăng ký Học viên
            </Link>
            
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all duration-200"
            >
              <Buildings size={20} weight="bold" />
              Dành cho Tổ chức / Doanh nghiệp
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
