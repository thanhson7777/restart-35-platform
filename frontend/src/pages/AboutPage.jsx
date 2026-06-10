import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import {
  Heart,
  Lightbulb,
  Shield,
  Handshake,
  GraduationCap,
  TrendUp,
  LinkedinLogo,
  ArrowRight,
  Target,
  Binoculars,
} from '@phosphor-icons/react';

const stats = [
  { value: '5,000+', label: 'Chuyên gia', sub: 'đã tham gia' },
  { value: '500+', label: 'Việc làm', sub: 'đang tuyển dụng' },
  { value: '40+', label: 'Khóa học', sub: 'chất lượng cao' },
  { value: '85%', label: 'Tỷ lệ', sub: 'hài lòng' },
];

const team = [
  {
    name: 'Nguyễn Minh Tuấn',
    role: 'CEO & Founder',
    bio: '15 năm kinh nghiệm trong edtech và HR tech. Từng làm tại TopCV và Vietnamwork.',
    avatar: 'https://picsum.photos/seed/founder1/160/160',
  },
  {
    name: 'Trần Thị Lan Anh',
    role: 'CTO & Co-Founder',
    bio: 'Chuyên gia AI/ML từ FPT Software. Thạc sĩ Khoa học Máy tính, ĐH RMIT.',
    avatar: 'https://picsum.photos/seed/founder2/160/160',
  },
  {
    name: 'Lê Hoàng Nam',
    role: 'CPO & Co-Founder',
    bio: '10 năm thiết kế sản phẩm. Từng dẫn dắt design team tại VNG và ZaloPay.',
    avatar: 'https://picsum.photos/seed/founder3/160/160',
  },
];

const values = [
  {
    icon: Heart,
    title: 'Đồng cảm',
    desc: 'Hiểu nỗi lo và khát vọng của chuyên gia 35+',
    color: 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300',
  },
  {
    icon: Lightbulb,
    title: 'Đổi mới',
    desc: 'AI và công nghệ phục vụ con người, không thay thế',
    color: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300',
  },
  {
    icon: Shield,
    title: 'Tin cậy',
    desc: 'Dữ liệu bảo mật, nền tảng minh bạch',
    color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300',
  },
  {
    icon: Handshake,
    title: 'Hợp tác',
    desc: 'Kết nối doanh nghiệp và chuyên gia cùng có lợi',
    color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300',
  },
  {
    icon: GraduationCap,
    title: 'Chất lượng',
    desc: 'Khóa học chuẩn quốc tế, mentor thực chiến',
    color: 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300',
  },
  {
    icon: TrendUp,
    title: 'Cam kết',
    desc: 'Lộ trình rõ ràng, kết quả đo lường được',
    color: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-300',
  },
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
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-white dark:bg-[hsl(var(--background))]">
      <Navbar />

      {/* Hero About */}
      <section className="relative py-28 px-8 bg-gradient-to-b from-[hsl(var(--muted))] to-white dark:from-zinc-900 dark:to-zinc-950 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] rounded-full bg-[hsl(var(--primary))]/5" />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full bg-[hsl(var(--primary))]/5" />
        </div>
        <div className="max-w-[900px] mx-auto text-center relative z-10">
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="inline-block mb-4 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 rounded-full"
          >
            Về chúng tôi
          </motion.span>
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-[hsl(var(--foreground))] mb-6 leading-tight"
          >
            Restart 35+ —{' '}
            <span className="text-[hsl(var(--primary))]">
              Nền tảng tái khởi động sự nghiệp
            </span>
          </motion.h1>
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] max-w-[60ch] mx-auto mb-8"
          >
            Chúng tôi tin rằng tuổi tác không phải là rào cản. Restart 35+ được xây dựng để giúp
            500,000+ chuyên gia trên 35 chuyển đổi nghề nghiệp thành công.
          </motion.p>
          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="flex flex-wrap justify-center gap-6 text-sm text-[hsl(var(--muted-foreground))]"
          >
            {[
              '3 năm hoạt động',
              '5,000+ học viên',
              '500+ mentor',
              '50+ doanh nghiệp đối tác',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-8 border-y border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                custom={i * 0.1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reduce ? {} : fadeUp}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] mb-1">
                  {s.value}
                </div>
                <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{s.label}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="bg-gradient-to-br from-[hsl(var(--primary))]/5 to-[hsl(var(--primary))]/10 rounded-2xl p-8 md:p-10"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/10 mb-6">
                <Target weight="bold" size={24} className="text-[hsl(var(--primary))]" />
              </div>
              <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Sứ mệnh</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Kết nối chuyên gia với cơ hội việc làm phù hợp, khóa học kỹ năng thực chiến và
                học bổng độc quyền. Chúng tôi đồng hành từng bước trên hành trình tái khởi động
                sự nghiệp.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-yellow-900/30 rounded-2xl p-8 md:p-10"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 mb-6">
                <Binoculars weight="bold" size={24} className="text-amber-600 dark:text-amber-300" />
              </div>
              <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Tầm nhìn</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Trở thành nền tảng số 1 tại Việt Nam về tái khởi động sự nghiệp cho người
                trưởng thành. Mỗi chuyên gia đều xứng đáng được tái khởi động với sự tự tin
                và năng lực được phát huy tối đa.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-8 bg-[hsl(var(--muted))] dark:bg-zinc-900">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
              Đội ngũ sáng lập
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-[50ch] mx-auto">
              Đội ngũ với hơn 30 năm kinh nghiệm kết hợp edtech, HR tech và AI.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <motion.div
                key={i}
                custom={i * 0.15}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reduce ? {} : fadeUp}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-8 text-center shadow-sm border border-zinc-100 dark:border-zinc-700 hover:shadow-md transition-shadow duration-300"
              >
                <div className="relative inline-block mb-6">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-[hsl(var(--primary))]/10 mx-auto"
                  />
                  <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center cursor-pointer hover:bg-[hsl(var(--primary-hover))] transition-colors">
                    <LinkedinLogo size={14} weight="fill" className="text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">{member.name}</h3>
                <p className="text-sm font-medium text-[hsl(var(--primary))] mb-3">{member.role}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {member.bio}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-8">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
              Giá trị cốt lõi
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-[50ch] mx-auto">
              6 giá trị định hướng mọi quyết định của Restart 35+
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={i}
                custom={i * 0.1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reduce ? {} : fadeUp}
                className="group flex gap-5 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-[hsl(var(--primary))]/20 hover:shadow-sm transition-all duration-300 bg-white dark:bg-zinc-900"
              >
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${v.color}`}
                >
                  <v.icon size={24} weight="duotone" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">{v.title}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-20 px-8 bg-[hsl(var(--muted))] dark:bg-zinc-900">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mb-3">
              Đối tác chiến lược
            </h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              Hơn 50 doanh nghiệp đang tin tưởng và hợp tác cùng Restart 35+
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {partners.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
              >
                <img
                  src={`https://picsum.photos/seed/${p.seed}/120/48`}
                  alt={p.name}
                  className="h-10 w-auto object-contain grayscale"
                />
                <span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                  {p.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(221_83%_40%)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-60px] right-[-60px] w-[400px] h-[400px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-80px] left-[-40px] w-[300px] h-[300px] rounded-full bg-white/5" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[700px] mx-auto text-center relative z-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Sẵn sàng bắt đầu hành trình mới?
          </h2>
          <p className="text-base text-white/80 mb-10 max-w-[50ch] mx-auto">
            Đăng ký miễn phí trong 2 phút. Không cần thẻ tín dụng. Không phí ẩn.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-[hsl(var(--primary))] font-semibold rounded-full hover:bg-zinc-100 active:scale-[0.98] transition-all duration-200 shadow-xl"
          >
            Tạo hồ sơ miễn phí
            <ArrowRight size={18} weight="bold" />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
