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
        {/* Premium Bright Hero Section */}
        <div className="relative overflow-hidden bg-white border-b border-zinc-200/80 pt-24 pb-20 lg:pt-32 lg:pb-28">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          {/* Soft Mesh Blobs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] opacity-60"></div>
          
          <div className="container relative mx-auto px-4 flex flex-col items-center text-center z-10">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/50 border border-blue-100/80 text-blue-600 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Nơi kết nối và phát triển
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-zinc-900 mb-6 leading-[1.1] max-w-4xl mx-auto">
              Cộng đồng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Restart 35+</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Không gian chia sẻ, học hỏi và phát triển sự nghiệp dành riêng cho lực lượng lao động giàu kinh nghiệm. Khám phá việc làm, khóa học và sự kiện nổi bật.
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
