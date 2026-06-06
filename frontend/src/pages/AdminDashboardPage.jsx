import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout, AdminPageTitle } from '@/components/layout';
import { BezelCard } from '@/components/ui';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { AdminRecentEnrollments } from '@/components/admin/AdminRecentEnrollments';
import { getAdminEnrollmentStats } from '@/apis';
import { TrendingUp } from 'lucide-react';

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    getAdminEnrollmentStats()
      .then((res) => {
        if (res.success) {
          setStats(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
    totalEnrollments = 0,
    revenueThisMonth = 0,
    dropoutRate = 0,
    pendingCourses = 0,
    recentEnrollments = [],
    topCourses = [],
    revenueByMonth = []
  } = stats;

  return (
    <AdminLayout className="min-h-screen">
      {/* Header and Title */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <AdminPageTitle
          title={
            <span className="text-[hsl(var(--admin-text-primary))] font-extrabold tracking-tight">Tổng quan quản trị</span>
          }
          subtitle="Theo dõi chỉ số tăng trưởng, tuyển sinh và tiến trình học tập của toàn hệ thống"
        />
        <div className="flex items-center gap-2 self-start md:self-center bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] p-1.5 rounded-full">
          <span className="text-xs text-[hsl(var(--admin-text-muted))] px-3">
            Hom nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="mb-8">
        <AdminStatsCards stats={{ totalEnrollments, revenueThisMonth, dropoutRate, pendingCourses }} />
      </div>

      {/* Main Grid: Revenue & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AdminRevenueChart data={revenueByMonth} />
        </div>
        <div>
          <AdminQuickActions />
        </div>
      </div>

      {/* Second Grid: Recent Enrollments & Top Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminRecentEnrollments enrollments={recentEnrollments} />
        </div>
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <BezelCard className="flex flex-col h-full">
              <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight mb-6">Khóa học hàng đầu</h3>
              <div className="space-y-4 flex-1">
                {topCourses.length === 0 ? (
                  <div className="py-8 text-center text-[hsl(var(--admin-text-muted))] text-sm">
                    Chưa có dữ liệu khóa học.
                  </div>
                ) : (
                  topCourses.map((course, index) => (
                    <div
                      key={course.courseId}
                      className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-accent))]/30 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] flex items-center justify-center font-bold text-[13px] text-[hsl(var(--admin-accent))] shrink-0 group-hover:bg-[hsl(var(--admin-accent))] group-hover:text-white transition-colors duration-300">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[hsl(var(--admin-text-primary))] truncate group-hover:text-[hsl(var(--admin-accent))] transition-colors duration-300">
                            {course.title}
                          </p>
                          <span className="text-[10px] text-[hsl(var(--admin-text-muted))] block mt-0.5">
                            ID: {course.courseId.slice(-6)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-extrabold text-[hsl(var(--admin-text-primary))] tabular-nums">{course.enrollments}</span>
                        <span className="text-[10px] text-[hsl(var(--admin-text-muted))]">hoc vien</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BezelCard>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
