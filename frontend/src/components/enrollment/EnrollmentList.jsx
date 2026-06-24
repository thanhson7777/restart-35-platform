import { useState } from 'react';
import { EnrollmentCard } from './EnrollmentCard';
import { CourseCardSkeleton } from '@/components/course/CourseCardSkeleton';
import { Card, Button } from '@/components/ui';
import { BookOpen, Award, GraduationCap, DollarSign, Play, MonitorPlay, Radio, MapPin, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { ENROLLMENT_STATUS } from '@/utils/constants';
import { formatPrice, formatCurrency } from '@/utils/formatter';
import { EnrollmentFundingSummary } from './EnrollmentSourceBadge';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: ENROLLMENT_STATUS.IN_PROGRESS, label: 'Đang học' },
  { key: ENROLLMENT_STATUS.COMPLETED, label: 'Hoàn thành' },
  { key: ENROLLMENT_STATUS.ENROLLED, label: 'Đã ghi danh' },
  { key: ENROLLMENT_STATUS.WAITLIST, label: 'Danh sách chờ' },
  { key: ENROLLMENT_STATUS.CANCELLED, label: 'Đã hủy' },
];



export const EnrollmentList = ({
  enrollments = [],
  loading = false,
  onCancel,
  onDrop,
  onViewProgress,
  onViewDetail,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const list = Array.isArray(enrollments)
    ? enrollments
    : Array.isArray(enrollments?.data)
    ? enrollments.data
    : [];

  // Compute stats metrics
  const totalCount = list.length;
  const isLearningStatus = (s) => s === ENROLLMENT_STATUS.IN_PROGRESS || s === ENROLLMENT_STATUS.ACTIVE;
  const activeCount = list.filter((e) => isLearningStatus(e.status)).length;
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
    const matchesStatus = activeStatusTab === 'all' 
      ? true 
      : (activeStatusTab === ENROLLMENT_STATUS.IN_PROGRESS 
          ? isLearningStatus(e.status) 
          : e.status === activeStatusTab);
    return matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedList = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
        <Card className="p-4 bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 shrink-0">
            <BookOpen className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Tổng số khóa</span>
            <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{totalCount}</span>
          </div>
        </Card>

        {/* Active learning */}
        <Card className="p-4 bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Play className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary/75 block">Đang học tập</span>
            <span className="text-lg font-extrabold text-primary">{activeCount}</span>
          </div>
        </Card>

        {/* Completed courses */}
        <Card className="p-4 bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <GraduationCap className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/75 block">Hoàn thành</span>
            <span className="text-lg font-extrabold text-emerald-500">{completedCount}</span>
          </div>
        </Card>

        {/* Tuition fee paid */}
        <Card className="p-4 bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <DollarSign className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500/75 block">Đã thanh toán</span>
            <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 truncate block">{formatCurrency(totalPaid)}</span>
          </div>
        </Card>
      </div>

      {/* ─── Filters & Selectors Panel ─── */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850/80 space-y-4">


        {/* Status Filters */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Trạng thái lớp học</span>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {STATUS_TABS.map((tab) => {
              const count = tab.key === 'all' 
                ? list.length 
                : (tab.key === ENROLLMENT_STATUS.IN_PROGRESS 
                    ? list.filter(e => isLearningStatus(e.status)).length 
                    : list.filter(e => e.status === tab.key).length);
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveStatusTab(tab.key);
                    setCurrentPage(1);
                  }}
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
          {paginatedList.map((enrollment) => (
            <div key={enrollment._id} className="space-y-3">

              <EnrollmentCard
                enrollment={enrollment}
                onCancel={onCancel}
                onDrop={onDrop}
                onViewProgress={onViewProgress}
                onViewDetail={onViewDetail}
              />

            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Hiển thị <span className="font-medium text-zinc-900 dark:text-zinc-100">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> trong <span className="font-medium text-zinc-900 dark:text-zinc-100">{filtered.length}</span> khóa học
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </Button>
                <div className="flex items-center gap-1 hidden sm:flex">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
