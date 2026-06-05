import { useState } from 'react';
import { EnrollmentCard } from './EnrollmentCard';
import { CourseCardSkeleton } from '@/components/course/CourseCardSkeleton';
import { Card } from '@/components/ui';
import { BookOpen, Award, GraduationCap, DollarSign, Play } from 'lucide-react';
import { ENROLLMENT_STATUS } from '@/utils/constants';
import { formatPrice } from '@/utils/formatter';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: ENROLLMENT_STATUS.IN_PROGRESS, label: 'Đang học' },
  { key: ENROLLMENT_STATUS.COMPLETED, label: 'Hoàn thành' },
  { key: ENROLLMENT_STATUS.ENROLLED, label: 'Đã ghi danh' },
  { key: ENROLLMENT_STATUS.WAITLIST, label: 'Danh sách chờ' },
  { key: ENROLLMENT_STATUS.CANCELLED, label: 'Đã hủy' },
];

const DELIVERY_TABS = [
  { key: 'all', label: 'Tất cả hình thức' },
  { key: 'video', label: '📺 Video tự học' },
  { key: 'live', label: '🔴 Tương tác Live' },
  { key: 'offline', label: '📍 Lớp tập trung' },
  { key: 'blended', label: '🔄 Học kết hợp' },
];

export const EnrollmentList = ({
  enrollments = [],
  loading = false,
  onCancel,
  onViewProgress,
  onViewDetail,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [activeDeliveryFilter, setActiveDeliveryFilter] = useState('all');

  const list = Array.isArray(enrollments)
    ? enrollments
    : Array.isArray(enrollments?.data)
    ? enrollments.data
    : [];

  // Compute stats metrics
  const totalCount = list.length;
  const activeCount = list.filter((e) => e.status === ENROLLMENT_STATUS.IN_PROGRESS).length;
  const completedCount = list.filter((e) => e.status === ENROLLMENT_STATUS.COMPLETED).length;
  
  // Calculate total tuition paid (summarize from paid installments)
  const totalPaid = list.reduce((acc, curr) => {
    if (curr.installments && curr.installments.length > 0) {
      const paidSum = curr.installments
        .filter((inst) => inst.status === 'paid')
        .reduce((sum, inst) => sum + inst.amount, 0);
      return acc + paidSum;
    }
    return acc;
  }, 0);

  // Apply filters
  const filtered = list.filter((e) => {
    const matchesStatus = activeStatusTab === 'all' || e.status === activeStatusTab;
    const matchesDelivery = activeDeliveryFilter === 'all' || e.course?.delivery_type === activeDeliveryFilter;
    return matchesStatus && matchesDelivery;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Stats Dashboard Header ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total enrollments */}
        <div className="p-1 rounded-[16px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80">
          <Card className="p-4 rounded-[12px] bg-white dark:bg-zinc-950 border border-zinc-150/40 dark:border-zinc-900 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 shrink-0">
              <BookOpen className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Tổng số khóa</span>
              <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{totalCount}</span>
            </div>
          </Card>
        </div>

        {/* Active learning */}
        <div className="p-1 rounded-[16px] bg-primary/5 border border-primary/10">
          <Card className="p-4 rounded-[12px] bg-white dark:bg-zinc-950 border border-zinc-150/40 dark:border-zinc-900 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Play className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary/75 block">Đang học tập</span>
              <span className="text-lg font-extrabold text-primary">{activeCount}</span>
            </div>
          </Card>
        </div>

        {/* Completed courses */}
        <div className="p-1 rounded-[16px] bg-emerald-500/5 border border-emerald-500/10">
          <Card className="p-4 rounded-[12px] bg-white dark:bg-zinc-950 border border-zinc-150/40 dark:border-zinc-900 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <GraduationCap className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/75 block">Hoàn thành</span>
              <span className="text-lg font-extrabold text-emerald-500">{completedCount}</span>
            </div>
          </Card>
        </div>

        {/* Tuition fee paid */}
        <div className="p-1 rounded-[16px] bg-amber-500/5 border border-amber-500/10">
          <Card className="p-4 rounded-[12px] bg-white dark:bg-zinc-950 border border-zinc-150/40 dark:border-zinc-900 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <DollarSign className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500/75 block">Đã thanh toán</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 truncate block">{formatPrice(totalPaid)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Filters & Selectors Panel ─── */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850/80 space-y-4">
        {/* Delivery Type Filters */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Hình thức học</span>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {DELIVERY_TABS.map((tab) => {
              const count = tab.key === 'all' ? list.length : list.filter(e => e.course?.delivery_type === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveDeliveryFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    activeDeliveryFilter === tab.key
                      ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filters */}
        <div className="space-y-1.5 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-850/50">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Trạng thái lớp học</span>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {STATUS_TABS.map((tab) => {
              const count = tab.key === 'all' ? list.length : list.filter(e => e.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveStatusTab(tab.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    activeStatusTab === tab.key
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Enrollment List Render ─── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
          <BookOpen className="w-14 h-14 text-zinc-300 dark:text-zinc-700 mb-4" strokeWidth={1.5} />
          <p className="text-base font-bold text-zinc-700 dark:text-zinc-300">
            Không tìm thấy khóa học nào
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[34ch] mx-auto leading-relaxed">
            Bạn chưa đăng ký khóa học nào ở bộ lọc này hoặc chưa ghi danh chương trình nào.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((enrollment) => (
            <EnrollmentCard
              key={enrollment._id}
              enrollment={enrollment}
              onCancel={onCancel}
              onViewProgress={onViewProgress}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
};
