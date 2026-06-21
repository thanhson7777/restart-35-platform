import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { getEnrollmentStats, getMyCourses, getTrainerSchedules, getEnterpriseStudents, getMyCourseStats } from '@/apis/trainerApi';
import { getDropoutRisk } from '@/apis/learningRecordApi';
import { TrainerStatsCards } from '@/components/trainer/TrainerStatsCards';
import { TrainerEnrollmentTrendChart } from '@/components/trainer/TrainerEnrollmentTrendChart';
import { TrainerRevenueChart } from '@/components/trainer/TrainerRevenueChart';
import { TrainerCourseStatusChart } from '@/components/trainer/TrainerCourseStatusChart';
import { TrainerPartnershipTrendChart } from '@/components/trainer/TrainerPartnershipTrendChart';
import { TrainerRecentStudents } from '@/components/trainer/TrainerRecentStudents';
import { TrainerQuickActions } from '@/components/trainer/TrainerQuickActions';
import { TrainerEnterpriseStudentsWidget } from '@/components/trainer/TrainerEnterpriseStudentsWidget';
import { Skeleton } from '@/components/ui';

const TrainerDashboardPage = () => {
  const currentUser = useSelector(selectCurrentUser);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [courseStats, setCourseStats] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [dropoutRisk, setDropoutRisk] = useState({});
  const [enterpriseStudents, setEnterpriseStudents] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, coursesRes, courseStatsRes, schedulesRes, riskRes, enterpriseRes] = await Promise.all([
        getEnrollmentStats().catch(err => {
          console.error('Error fetching enrollment stats:', err);
          return { data: { data: {} } };
        }),
        getMyCourses().catch(err => {
          console.error('Error fetching courses:', err);
          return { data: { data: [] } };
        }),
        getMyCourseStats().catch(err => {
          console.error('Error fetching course stats:', err);
          return { data: { data: {} } };
        }),
        getTrainerSchedules({ limit: 100 }).catch(err => {
          console.error('Error fetching schedules:', err);
          return { data: { data: [] } };
        }),
        getDropoutRisk().catch(err => {
          console.error('Error fetching dropout risk:', err);
          return { data: { data: {} } };
        }),
        getEnterpriseStudents().catch(err => {
          console.error('Error fetching enterprise students:', err);
          return { data: { data: null } };
        })
      ]);

      setStats(statsRes.data?.data || {});
      setCourses(coursesRes.data?.data || []);
      setCourseStats(courseStatsRes.data?.data || {});
      setSchedules(schedulesRes.data?.data || []);
      setDropoutRisk(riskRes.data?.data || {});
      setEnterpriseStudents(enterpriseRes.data?.data || null);
    } catch (err) {
      console.error('Unexpected error loading dashboard:', err);
      toast.error('Có lỗi xảy ra khi tải dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-6 rounded-[2rem] bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] h-28 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-7 w-16 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
            </div>
          ))}
        </div>

        {/* Middle Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-[2rem] bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] h-96">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="p-6 rounded-[2rem] bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] h-96">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] h-16">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-2 w-16 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="p-6 rounded-[2rem] bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] h-36">
          <Skeleton className="h-4 w-28 mb-4 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const trainerName = currentUser?.displayName || 'Giảng viên';

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">
          Chào mừng quay trở lại, {trainerName}!
        </h1>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm">
          Dưới đây là tổng quan hoạt động và số liệu giảng dạy của bạn trên hệ thống.
        </p>
      </div>

      {/* Stats Cards Section */}
      <TrainerStatsCards
        stats={stats}
        courses={courses}
        courseStats={courseStats}
        schedules={schedules}
        dropoutRisk={dropoutRisk}
        enterpriseStudents={enterpriseStudents}
      />

      {/* Row 2: Trends & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrainerEnrollmentTrendChart data={stats.monthlyTrend || []} />
        <TrainerRevenueChart data={stats.revenueByMonth || []} />
      </div>

      {/* Row 3: Course Status & Partnership Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TrainerCourseStatusChart courses={courses} courseStats={courseStats} />
        </div>
        <div className="lg:col-span-2">
          <TrainerPartnershipTrendChart data={enterpriseStudents?.trend || []} />
        </div>
      </div>

      {/* Row 4: Recent Students & Enterprise Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrainerRecentStudents students={stats.recentEnrollments || []} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          {enterpriseStudents && enterpriseStudents.total > 0 && (
            <TrainerEnterpriseStudentsWidget data={enterpriseStudents} />
          )}
          {/* Quick Action Buttons */}
          <TrainerQuickActions />
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboardPage;
