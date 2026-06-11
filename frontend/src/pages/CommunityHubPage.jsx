import { useState } from 'react';
import { Users, GraduationCap, MessageCircle, Calendar } from 'lucide-react';
import { Navbar } from '@/components/landing';
import TabNavigation from '@/components/community/TabNavigation';
import RecruitmentSection from '@/components/community/RecruitmentSection';
import EventListSection from '@/components/community/EventListSection';
import CommunityCourseSection from '@/components/community/CommunityCourseSection';

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
        {/* Light Gradient Header */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] shadow-sm py-10">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-[hsl(var(--admin-text-primary))] mb-2">Cộng đồng</h1>
            <p className="text-[hsl(var(--admin-text-muted))]">
              Kết nối, học hỏi và phát triển cùng cộng đồng người lao động 35+
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
              <EmptyState
                icon={MessageCircle}
                title="Chia sẻ kinh nghiệm"
                description="Tính năng chia sẻ kinh nghiệm sẽ sớm được cập nhật."
              />
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
