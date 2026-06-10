import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { sendContact } from '@/apis/contactApi';
import {
  Headset,
  Handshake,
  Gear,
  MapPin,
  Phone,
  Envelope,
  CaretDown,
  ArrowRight,
  CheckCircle,
} from '@phosphor-icons/react';

const SUBJECTS = [
  { value: 'Tư vấn tuyển sinh', label: 'Tư vấn tuyển sinh' },
  { value: 'Hợp tác doanh nghiệp', label: 'Hợp tác doanh nghiệp' },
  { value: 'Hỗ trợ kỹ thuật', label: 'Hỗ trợ kỹ thuật' },
  { value: 'Góp ý', label: 'Góp ý' },
];

const contactCards = [
  {
    icon: Headset,
    title: 'Tư vấn tuyển sinh',
    email: 'hotro@restart35plus.vn',
    hours: 'Thứ 2 – Thứ 6, 8:00 – 18:00',
    color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300',
  },
  {
    icon: Handshake,
    title: 'Hợp tác doanh nghiệp',
    email: 'partner@restart35plus.vn',
    hours: 'Thứ 2 – Thứ 6, 9:00 – 17:00',
    color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300',
  },
  {
    icon: Gear,
    title: 'Hỗ trợ kỹ thuật',
    email: 'tech@restart35plus.vn',
    hours: 'Hỗ trợ 24/7',
    color: 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300',
  },
];

const faqs = [
  {
    q: 'Thời gian phản hồi liên hệ là bao lâu?',
    a: 'Chúng tôi phản hồi trong vòng 24 giờ làm việc (Thứ 2 – Thứ 6).',
  },
  {
    q: 'Tôi có thể gặp trực tiếp tại văn phòng không?',
    a: 'Có, bạn có thể đặt lịch hẹn trực tiếp qua form liên hệ hoặc gọi hotline 1900 1234.',
  },
  {
    q: 'Restart 35+ có miễn phí sử dụng không?',
    a: 'Đăng ký và tạo hồ sơ hoàn toàn miễn phí. Một số khóa học và học bổng có thể có phí.',
  },
  {
    q: 'Làm sao để trở thành mentor trên nền tảng?',
    a: 'Gửi email kèm CV và lĩnh vực chuyên môn của bạn tới partner@restart35plus.vn.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-200"
      >
        <span className="font-medium text-[hsl(var(--foreground))]">{q}</span>
        <CaretDown
          size={18}
          className={`shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40' : 'max-h-0'}`}
      >
        <p className="px-6 pb-4 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
          {a}
        </p>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const reduce = useReducedMotion();
  const [openFaq, setOpenFaq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ tên';
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email không hợp lệ';
    if (!form.subject) errs.subject = 'Vui lòng chọn chủ đề';
    if (!form.message.trim()) errs.message = 'Vui lòng nhập tin nhắn';
    else if (form.message.trim().length < 10)
      errs.message = 'Tin nhắn phải có ít nhất 10 ký tự';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((errs) => ({ ...errs, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await sendContact(form);
      toast.success('Gửi liên hệ thành công! Chúng tôi sẽ phản hồi trong 24 giờ.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    } catch (err) {
      const msg = err?.response?.data?.message || 'Gửi liên hệ thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[hsl(var(--background))]">
      <Navbar />

      {/* Hero */}
      <section className="relative py-28 px-8 bg-gradient-to-b from-[hsl(var(--muted))] to-white dark:from-zinc-900 dark:to-zinc-950 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] rounded-full bg-[hsl(var(--primary))]/5" />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full bg-[hsl(var(--primary))]/5" />
        </div>
        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="inline-block mb-4 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 rounded-full"
          >
            Liên hệ
          </motion.span>
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="text-4xl md:text-5xl font-bold text-[hsl(var(--foreground))] mb-5"
          >
            Kết nối với{' '}
            <span className="text-[hsl(var(--primary))]">Restart 35+</span>
          </motion.h1>
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={reduce ? {} : fadeUp}
            className="text-lg text-[hsl(var(--muted-foreground))] max-w-[55ch] mx-auto"
          >
            Có câu hỏi, góp ý hoặc muốn hợp tác? Đội ngũ của chúng tôi luôn sẵn sàng lắng nghe
            và phản hồi trong 24 giờ.
          </motion.p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16 px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid sm:grid-cols-3 gap-6">
            {contactCards.map((card, i) => (
              <motion.div
                key={i}
                custom={i * 0.12}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reduce ? {} : fadeUp}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-7 border border-zinc-100 dark:border-zinc-800 hover:shadow-md hover:border-[hsl(var(--primary))]/20 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${card.color}`}
                >
                  <card.icon size={24} weight="duotone" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{card.title}</h3>
                <a
                  href={`mailto:${card.email}`}
                  className="text-sm text-[hsl(var(--primary))] hover:underline block mb-1"
                >
                  {card.email}
                </a>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{card.hours}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-16 px-8 bg-[hsl(var(--muted))] dark:bg-zinc-900">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="md:col-span-3 bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-700"
            >
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-6">
                Gửi tin nhắn cho chúng tôi
              </h2>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Họ tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-900 text-[hsl(var(--foreground))] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 transition-colors ${
                        errors.name
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-900 text-[hsl(var(--foreground))] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 transition-colors ${
                        errors.email
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    Chủ đề <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-900 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 transition-colors ${
                      errors.subject
                        ? 'border-red-400 dark:border-red-500'
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <option value="">-- Chọn chủ đề --</option>
                    {SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="mt-1 text-xs text-red-500">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    Tin nhắn <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Mô tả chi tiết câu hỏi hoặc yêu cầu của bạn..."
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-900 text-[hsl(var(--foreground))] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 transition-colors resize-none ${
                      errors.message
                        ? 'border-red-400 dark:border-red-500'
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  />
                  {errors.message && (
                    <p className="mt-1 text-xs text-red-500">{errors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Gửi liên hệ
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Info sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-2 space-y-6"
            >
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-7 border border-zinc-100 dark:border-zinc-700">
                <h3 className="font-semibold text-[hsl(var(--foreground))] mb-5">
                  Thông tin văn phòng
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-[hsl(var(--primary))]" weight="bold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Địa chỉ</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Tầng 12, Bitexco Financial Tower,<br />
                        2 Hải Triều, Quận 1, TP.HCM
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
                      <Phone size={16} className="text-[hsl(var(--primary))]" weight="bold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Hotline</p>
                      <a href="tel:19001234" className="text-sm text-[hsl(var(--primary))] hover:underline">
                        1900 1234
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
                      <Envelope size={16} className="text-[hsl(var(--primary))]" weight="bold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Email</p>
                      <a href="mailto:contact@restart35plus.vn" className="text-sm text-[hsl(var(--primary))] hover:underline">
                        contact@restart35plus.vn
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-48">
                <iframe
                  title="Restart 35+ Office"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.4462!2d106.7047!3d10.7722!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4670702e91%3A0x1e3ee0ee10!2sBitexco%20Financial%20Tower!5e0!3m2!1sen!2s!4v1234567890"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-8">
        <div className="max-w-[700px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-3">
              Câu hỏi thường gặp
            </h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              Giải đáp nhanh những thắc mắc phổ biến
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                q={faq.q}
                a={faq.a}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
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
            Bạn đã sẵn sàng?
          </h2>
          <p className="text-base text-white/80 mb-10 max-w-[50ch] mx-auto">
            Tạo hồ sơ miễn phí trong 2 phút và bắt đầu hành trình tái khởi động sự nghiệp ngay hôm nay.
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
