import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const BackIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

const TOC = [
  { id: 'intro', title: '1. Giới thiệu & Chấp nhận điều khoản' },
  { id: 'account', title: '2. Quy định về Tài khoản' },
  { id: 'roles', title: '3. Quyền & Trách nhiệm theo vai trò' },
  { id: 'payment', title: '4. Thanh toán & Hoàn tiền' },
  { id: 'ip', title: '5. Sở hữu trí tuệ' },
  { id: 'prohibited', title: '6. Hành vi bị cấm' },
  { id: 'liability', title: '7. Giới hạn trách nhiệm pháp lý' },
];

function TermsPage() {
  const [activeSection, setActiveSection] = useState('intro');
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      let current = '';
      for (const section of TOC) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          current = section.id;
        }
      }
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: 'smooth',
      });
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      window.close();
      setTimeout(() => navigate('/'), 200);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        {/* Header */}
        <div className="bg-primary/5 py-12 border-b border-border">
          <div className="container-page">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <BackIcon className="w-4 h-4" />
              Quay lại
            </button>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Điều khoản Dịch vụ</h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Cập nhật lần cuối: Tháng 6, 2026.
              <br />
              Vui lòng đọc kỹ các điều khoản này trước khi sử dụng nền tảng RESTART-35.
            </p>
          </div>
        </div>

        <div className="container-page py-12 flex flex-col lg:flex-row gap-12">
          {/* Sidebar TOC */}
          <aside className="w-full lg:w-1/4 flex-shrink-0">
            <div className="sticky top-[120px]">
              <h3 className="font-semibold mb-4 text-foreground">Mục lục</h3>
              <nav className="space-y-2 border-l border-border pl-4">
                {TOC.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left text-sm py-1.5 transition-colors ${
                      activeSection === item.id
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="w-full lg:w-3/4 max-w-3xl prose prose-sm md:prose-base dark:prose-invert">
            <section id="intro" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Giới thiệu & Chấp nhận điều khoản</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Chào mừng bạn đến với RESTART-35, nền tảng kết nối học tập và việc làm dành riêng cho người lao động từ 35 tuổi trở lên.
                Bằng việc đăng ký tài khoản và sử dụng các dịch vụ trên nền tảng, bạn đồng ý tuân thủ các Điều khoản Dịch vụ này.
                Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng nền tảng.
              </p>
            </section>

            <section id="account" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Quy định về Tài khoản</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li><strong>Độ tuổi:</strong> Nền tảng dành riêng cho Người lao động từ 35 tuổi đến 65 tuổi. Bạn cần cam kết thông tin về độ tuổi cung cấp là chính xác.</li>
                <li><strong>Xác thực thông tin:</strong> Người dùng cần cung cấp chính xác Số CCCD/CMND (đối với cá nhân) hoặc Mã số thuế (đối với doanh nghiệp/tổ chức) để xác minh danh tính. Nền tảng chỉ lưu trữ mã số, không lưu trữ hình ảnh giấy tờ tùy thân của bạn.</li>
                <li><strong>Bảo mật:</strong> Bạn chịu trách nhiệm hoàn toàn về việc bảo mật mật khẩu và tất cả hoạt động diễn ra dưới tài khoản của mình.</li>
              </ul>
            </section>

            <section id="roles" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Quyền & Trách nhiệm theo vai trò</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">3.1 Người lao động (Worker)</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Bạn có quyền truy cập các khóa học, tìm kiếm việc làm và nhận tài trợ. Bạn cam kết các thông tin trong Hồ sơ năng lực (CV), kinh nghiệm, trình độ học vấn là sự thật.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">3.2 Trung tâm / Chuyên gia Đào tạo (Trainer)</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Bạn cam kết về chất lượng giảng dạy và sở hữu bản quyền hợp pháp đối với các nội dung khóa học đăng tải. Bất kỳ nội dung sao chép trái phép nào sẽ bị gỡ bỏ mà không cần báo trước.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">3.3 Doanh nghiệp (Enterprise)</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Doanh nghiệp chịu trách nhiệm cho tính trung thực của các thông tin tuyển dụng. Bạn có trách nhiệm bảo mật thông tin hồ sơ của Người lao động và chỉ được phép liên hệ cho mục đích tuyển dụng.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">3.4 Tổ chức Phi chính phủ (NGO)</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Tổ chức NGO cam kết tính minh bạch đối với các quỹ tài trợ học bổng và đồng hành cùng sự phát triển của người lao động trên nền tảng.
                  </p>
                </div>
              </div>
            </section>

            <section id="payment" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Thanh toán & Hoàn tiền</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li><strong>Cổng thanh toán:</strong> Các giao dịch mua khóa học hoặc tài trợ được thực hiện thông qua cổng thanh toán VNPay. Nền tảng không lưu trữ thông tin thẻ ngân hàng của bạn.</li>
                <li><strong>Phí dịch vụ:</strong> Đối với các khóa học có phí, nền tảng áp dụng chính sách chia sẻ doanh thu với tỷ lệ <strong>80% cho Chuyên gia/Trung tâm đào tạo (Trainer)</strong> và <strong>20% phí duy trì nền tảng (Admin)</strong>.</li>
                <li><strong>Chính sách hoàn tiền:</strong> RESTART-35 <strong>không áp dụng chính sách hoàn học phí</strong> cho bất kỳ khóa học nào sau khi thanh toán thành công. Vui lòng xem kỹ nội dung khóa học trước khi đăng ký.</li>
              </ul>
            </section>

            <section id="ip" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Sở hữu trí tuệ</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Toàn bộ nội dung, mã nguồn, thiết kế đồ họa của nền tảng RESTART-35 thuộc sở hữu của chúng tôi. 
                Nội dung các khóa học do Trainer đăng tải vẫn thuộc sở hữu của Trainer, tuy nhiên Trainer cấp cho RESTART-35 giấy phép hiển thị và phân phối nội dung đó trên nền tảng.
              </p>
            </section>

            <section id="prohibited" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Hành vi bị cấm</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li>Sử dụng nền tảng cho bất kỳ mục đích bất hợp pháp nào.</li>
                <li>Đăng tải nội dung độc hại, lừa đảo, phân biệt đối xử hoặc vi phạm thuần phong mỹ tục.</li>
                <li>Gian lận trong thanh toán, trục lợi từ quỹ tài trợ hoặc khai man thông tin hồ sơ.</li>
                <li>Cố ý phá hoại, tấn công hệ thống (hacking) hoặc can thiệp trái phép vào dữ liệu của nền tảng.</li>
              </ul>
            </section>

            <section id="liability" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Giới hạn trách nhiệm pháp lý</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                RESTART-35 là nền tảng kết nối. Chúng tôi không chịu trách nhiệm đối với các tranh chấp trực tiếp xảy ra giữa các bên (ví dụ: Trainer và Học viên).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Xử lý tranh chấp tuyển dụng:</strong> Trong trường hợp người lao động hoàn thành "Khóa học cam kết việc làm" nhưng không được Doanh nghiệp tuyển dụng như đã cam kết, RESTART-35 sẽ đóng vai trò trung gian xác minh quá trình học tập và hỗ trợ các bên giải quyết khiếu nại theo quy định của nền tảng.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TermsPage;
