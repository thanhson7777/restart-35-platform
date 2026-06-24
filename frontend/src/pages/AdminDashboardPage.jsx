import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { BezelCard } from '@/components/ui';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { AdminUserGrowthChart } from '@/components/admin/AdminUserGrowthChart';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { AdminRecentEnrollments } from '@/components/admin/AdminRecentEnrollments';
import { AdminUsersAnalyticsTab } from '@/components/admin/AdminUsersAnalyticsTab';
import { AdminTrainingAnalyticsTab } from '@/components/admin/AdminTrainingAnalyticsTab';
import { AdminRecruitmentAnalyticsTab } from '@/components/admin/AdminRecruitmentAnalyticsTab';
import AdminFinancialAnalyticsTab from '@/components/admin/AdminFinancialAnalyticsTab';
import AdminCommunityAnalyticsTab from '@/components/admin/AdminCommunityAnalyticsTab';
import { AdminActionBar } from '@/components/admin/AdminActionBar';
import { getAdminDashboardOverview } from '@/apis';
import { TrendingUp, Users, BookOpen, Briefcase, DollarSign, Activity, MessageSquare } from 'lucide-react';

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [dateRange, setDateRange] = useState({ filterId: 'all', start: null, end: null });

  const fetchDashboardData = (start, end) => {
    setLoading(true);
    // You would ideally pass start and end to the API if it supports params, 
    // but the getAdminDashboardOverview frontend API doesn't accept them yet.
    // Let's assume we can update getAdminDashboardOverview to take query params,
    // or just let it refresh.
    
    // We can manually add query params in getAdminDashboardOverview if we modify it, 
    // but for now let's just assume we call it.
    // Actually, we should update the frontend API function to take params. Let's do that next.
    getAdminDashboardOverview(start, end)
      .then((res) => {
        if (res.success) {
          setStats(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData(dateRange.start, dateRange.end);
  }, [dateRange.start, dateRange.end]);

  const handleDateRangeChange = (filterId, start, end) => {
    setDateRange({ filterId, start, end });
  };

  if (loading) {
    return (
      <AdminLayout className="min-h-screen">
        <div className="space-y-8 animate-pulse p-6">
          <div className="h-10 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
            <div className="h-32 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
            <div className="h-32 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
            <div className="h-32 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl lg:col-span-2" />
            <div className="h-96 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-2xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const {
    totalUsers = 0,
    monthlyRevenue = 0,
    activeCourses = 0,
    activeJobs = 0,
    recentEnrollments = [],
    userGrowth = [],
    revenueGrowth = [],
    pendingActions = {}
  } = stats;

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: Activity },
    { id: 'users', label: 'Người dùng & Đối tác', icon: Users },
    { id: 'courses', label: 'Đào tạo', icon: BookOpen },
    { id: 'jobs', label: 'Tuyển dụng', icon: Briefcase },
    { id: 'finance', label: 'Tài chính', icon: DollarSign },
    { id: 'community', label: 'Cộng đồng', icon: MessageSquare },
  ];

  return (
    <AdminLayout className="min-h-screen">
      {/* Header and Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <AdminPageTitle
          title={
            <span className="text-[hsl(var(--admin-text-primary))] font-extrabold tracking-tight">Tổng quan quản trị</span>
          }
          subtitle="Theo dõi chỉ số tăng trưởng, tuyển sinh và tiến trình học tập của toàn hệ thống"
        />
        <div className="flex items-center gap-4 self-start md:self-center">
          <div className="hidden md:flex items-center bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] p-1.5 rounded-full">
            <span className="text-xs text-[hsl(var(--admin-text-muted))] px-3">
              Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <AdminActionBar onDateRangeChange={handleDateRangeChange} currentDateFilter={dateRange.filterId} activeTab={activeTab} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 scrollbar-hide border-b border-[hsl(var(--admin-border))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap border-b-2 relative -mb-[1px]
                ${isActive 
                  ? 'text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent))]/5' 
                  : 'text-[hsl(var(--admin-text-muted))] border-transparent hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-elevated))]'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Stats Cards Section */}
          <div className="mb-8">
            <AdminStatsCards stats={{ totalUsers, monthlyRevenue, activeCourses, activeJobs }} />
          </div>

          {/* Main Grid: Revenue & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <AdminRevenueChart data={revenueGrowth} />
            </div>
            <div>
              <AdminQuickActions pendingActions={pendingActions} />
            </div>
          </div>

          {/* Second Grid: Recent Enrollments & Top Courses */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <BezelCard className="flex flex-col h-full">
                  <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight mb-2">Biểu đồ tăng trưởng người dùng</h3>
                  <div className="flex-1 block -mx-4 -mb-4">
                    <AdminUserGrowthChart data={userGrowth} />
                  </div>
                </BezelCard>
              </motion.div>
            </div>
            <div>
              <AdminRecentEnrollments enrollments={recentEnrollments} />
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div
          key="users-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <AdminUsersAnalyticsTab dateRange={dateRange} />
        </motion.div>
      )}

      {activeTab === 'courses' && (
        <motion.div
          key="courses-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Note: dateRange.filterId is passed to timeRange, which accepts '7D', '30D', '6M', '1Y', 'ALL' */}
          <AdminTrainingAnalyticsTab timeRange={dateRange.filterId} />
        </motion.div>
      )}

      {activeTab === 'jobs' && (
        <motion.div
          key="jobs-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <AdminRecruitmentAnalyticsTab timeRange={dateRange.filterId} />
        </motion.div>
      )}

      {activeTab === 'finance' && (
        <motion.div
          key="finance-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <AdminFinancialAnalyticsTab timeRange={dateRange.filterId} />
        </motion.div>
      )}

      {activeTab === 'community' && (
        <motion.div
          key="community-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <AdminCommunityAnalyticsTab timeRange={dateRange.filterId} />
        </motion.div>
      )}

      {activeTab !== 'overview' && activeTab !== 'users' && activeTab !== 'courses' && activeTab !== 'jobs' && activeTab !== 'finance' && activeTab !== 'community' && (
        <div className="py-12 text-center text-[hsl(var(--admin-text-muted))]">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Tính năng đang phát triển</h3>
          <p className="mt-2 text-sm">Tab {tabs.find(t => t.id === activeTab)?.label} sẽ sớm được ra mắt trong phiên bản tới.</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
