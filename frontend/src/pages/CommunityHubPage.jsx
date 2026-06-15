import { useState } from 'react';
import { Users, GraduationCap, MessageCircle, Calendar } from 'lucide-react';
import { Navbar } from '@/components/landing';
import TabNavigation from '@/components/community/TabNavigation';
import RecruitmentSection from '@/components/community/RecruitmentSection';
import EventListSection from '@/components/community/EventListSection';
import CommunityCourseSection from '@/components/community/CommunityCourseSection';
import CommunityForumSection from '@/components/community/CommunityForumSection';

const TABS = [
  { id: 'jobs', label: 'Doanh nghiệp tuyển dụng', icon: Users, description: 'Việc làm từ các doanh nghiệp' },
  { id: 'courses', label: 'Khóa học', icon: GraduationCap, description: 'Khóa học từ Trainer' },
  { id: 'community', label: 'Chia sẻ kinh nghiệp', icon: MessageCircle, description: 'Trao đổi với cộng đồng' },
  { id: 'events', label: 'Sự kiện & Tài trợ', icon: Calendar, description: 'Sự kiện và chương trình tài trợ' }
];

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
      <Icon size={32} className="text-[hsl(var(--muted-foreground))]" />
    </div>
    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{title}</h3>
    <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm">{description}</p>
  </div>
);

export default function CommunityHubPage() {
  const [activeTab, setActiveTab] = useState('jobs');

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Premium Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 border-b border-slate-800 py-16 lg:py-24">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 p-32 bg-blue-500 rounded-full blur-[150px] opacity-20 -mr-20 -mt-20"></div>
          
          <div className="container relative mx-auto px-6 text-center">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-sm">
              Cộng đồng <span className="text-blue-400">Restart 35+</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
              Không gian chia sẻ, học hỏi và phát triển sự nghiệp dành riêng cho lực lượng lao động giàu kinh nghiệm. Mở ra cơ hội mới cùng hàng ngàn thành viên.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          <div className="py-8">
            {activeTab === 'jobs' && <RecruitmentSection />}

            {activeTab === 'courses' && (
              <CommunityCourseSection />
            )}

            {activeTab === 'community' && (
              <CommunityForumSection />
            )}

            {activeTab === 'events' && (
              <EventListSection />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
