import React, { useState } from 'react';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import RecommendationAnalyticsPage from './RecommendationAnalyticsPage';
import AdminLearningRecordsPage from './AdminLearningRecordsPage';
import AdminOverviewDashboard from './AdminOverviewDashboard';

const AdminAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <AdminPageTitle
            title="Báo cáo & Phân tích"
            subtitle="Tổng hợp hiệu quả Gợi ý khóa học, Tiến độ học tập và Hoạt động tổng quan"
          />
        </div>

        <div className="flex gap-1 p-1 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-[hsl(var(--admin-accent))] text-white'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
            }`}
          >
            Tổng quan (Overview)
          </button>
          <button
            onClick={() => setActiveTab('recommendation')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'recommendation'
                ? 'bg-[hsl(var(--admin-accent))] text-white'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
            }`}
          >
            Gợi ý khóa học
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'learning'
                ? 'bg-[hsl(var(--admin-accent))] text-white'
                : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
            }`}
          >
            Tiến độ học tập
          </button>
        </div>

        <div className="mt-4">
          {activeTab === 'overview' && <AdminOverviewDashboard />}
          {activeTab === 'recommendation' && <RecommendationAnalyticsPage />}
          {activeTab === 'learning' && <AdminLearningRecordsPage />}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
