import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BackIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

const TOC = [
  { id: 'collection', title: '1. Thu thập dữ liệu' },
  { id: 'purpose', title: '2. Mục đích sử dụng dữ liệu' },
  { id: 'sharing', title: '3. Chia sẻ dữ liệu' },
  { id: 'security', title: '4. Lưu trữ & Bảo mật' },
  { id: 'rights', title: '5. Quyền của người dùng' },
  { id: 'cookies', title: '6. Sử dụng Cookie' },
];

function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('collection');
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
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Chính sách Bảo mật</h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Cập nhật lần cuối: Tháng 6, 2026.
              <br />
              Bảo vệ sự riêng tư của bạn là ưu tiên hàng đầu tại RESTART-35.
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
            <section id="collection" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Thu thập dữ liệu</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Chúng tôi thu thập các loại dữ liệu sau khi bạn sử dụng RESTART-35:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li><strong>Dữ liệu định danh:</strong> Tên, độ tuổi, số điện thoại, địa chỉ email, và số CCCD/CMND (chỉ lưu trữ mã số, không lưu trữ ảnh chụp giấy tờ).</li>
                <li><strong>Dữ liệu chuyên môn:</strong> Hồ sơ xin việc (CV), trình độ học vấn, kinh nghiệm làm việc, kỹ năng, và tiến độ học tập trên nền tảng.</li>
                <li><strong>Dữ liệu tổ chức:</strong> Mã số thuế, giấy phép kinh doanh/hoạt động đối với Doanh nghiệp, Tổ chức Phi chính phủ, và Trung tâm đào tạo.</li>
              </ul>
            </section>

            <section id="purpose" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Mục đích sử dụng dữ liệu</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Các thông tin thu thập được sử dụng nhằm:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li>Cá nhân hóa trải nghiệm, gợi ý việc làm và khóa học phù hợp với độ tuổi và năng lực của bạn.</li>
                <li>Hỗ trợ xử lý thanh toán, phân chia doanh thu cho các Chuyên gia đào tạo.</li>
                <li>Kết nối người lao động với các cơ hội việc làm, học bổng từ Doanh nghiệp và Tổ chức Phi chính phủ.</li>
                <li>Đảm bảo tính minh bạch và an toàn của hệ sinh thái RESTART-35.</li>
              </ul>
            </section>

            <section id="sharing" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Chia sẻ dữ liệu</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                RESTART-35 cam kết tuyệt đối <strong>không bán dữ liệu cá nhân</strong> cho bên thứ ba vì mục đích quảng cáo thương mại.
                Dữ liệu chỉ được chia sẻ trong các trường hợp sau:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li><strong>Bảo vệ Hồ sơ cá nhân:</strong> Hồ sơ của Người lao động (Worker) được bảo mật. Chúng tôi <strong>chỉ chia sẻ hồ sơ của bạn cho Doanh nghiệp khi bạn trực tiếp nộp đơn ứng tuyển</strong> vào công việc của Doanh nghiệp đó. Các Doanh nghiệp khác không thể tự do tìm kiếm và xem hồ sơ công khai của bạn.</li>
                <li><strong>Theo dõi tài trợ:</strong> Cung cấp báo cáo ẩn danh hoặc thông tin tiến độ học tập cho Doanh nghiệp/NGO đối với các học viên đang nhận học bổng hoặc tham gia khóa học do họ tài trợ.</li>
                <li><strong>Yêu cầu pháp lý:</strong> Cung cấp thông tin cho cơ quan có thẩm quyền khi có yêu cầu hợp pháp.</li>
              </ul>
            </section>

            <section id="security" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Lưu trữ & Bảo mật</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Dữ liệu của bạn được lưu trữ an toàn trên máy chủ sử dụng các biện pháp mã hóa tiên tiến nhất để chống lại sự truy cập trái phép. 
                Chúng tôi áp dụng các tiêu chuẩn bảo mật hệ thống nghiêm ngặt để bảo vệ thông tin cá nhân và tổ chức. Dữ liệu sẽ được lưu trữ cho đến khi bạn yêu cầu xóa tài khoản hoặc ngừng cung cấp dịch vụ vĩnh viễn.
              </p>
            </section>

            <section id="rights" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Quyền của người dùng</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 leading-relaxed">
                <li>Quyền truy cập và cập nhật thông tin cá nhân thông qua bảng điều khiển tài khoản (Dashboard).</li>
                <li>Quyền yêu cầu xuất trích xuất bản sao dữ liệu cá nhân của mình.</li>
                <li>Quyền được lãng quên (Right to be forgotten): Bạn có quyền yêu cầu xóa bỏ hoàn toàn tài khoản và toàn bộ dữ liệu liên quan khỏi hệ thống bằng cách liên hệ với bộ phận CSKH.</li>
              </ul>
            </section>

            <section id="cookies" className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Sử dụng Cookie</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Nền tảng RESTART-35 sử dụng Cookie và các công nghệ theo dõi tương tự để duy trì phiên đăng nhập, cá nhân hóa trải nghiệm duyệt web và phân tích lưu lượng truy cập nhằm nâng cao chất lượng dịch vụ. Bạn có thể quản lý tùy chọn Cookie thông qua trình duyệt, nhưng việc từ chối Cookie có thể làm hạn chế một số tính năng của nền tảng.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicyPage;
