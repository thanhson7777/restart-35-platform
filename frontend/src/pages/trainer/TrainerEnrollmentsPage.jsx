import React, { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, SlidersHorizontal, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTrainerEnrollments, getMyCourses } from '@/apis/courseApi';
import { BezelCard, Input, SelectField, Button } from '@/components/ui';
import { TrainerStudentTable } from '@/components/trainer/TrainerStudentTable';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang học' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'suspended', label: 'Tạm ngưng' },
  { value: 'failed', label: 'Đã trượt' },
  { value: 'dropped', label: 'Bỏ học' }
];

const RISK_OPTIONS = [
  { value: 'ALL', label: 'Tất cả mức nguy cơ' },
  { value: 'low', label: 'Nguy cơ thấp' },
  { value: 'medium', label: 'Nguy cơ trung bình' },
  { value: 'high', label: 'Nguy cơ cao' },
  { value: 'critical', label: 'Cực kỳ nguy cấp' }
];

const TrainerEnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Filter States
  const [searchText, setSearchText] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Fetch Courses owned by the Trainer to populate filter options
  const fetchCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const res = await getMyCourses();
      if (res.data?.success) {
        setCourses(res.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch trainer courses:', err);
      toast.error('Không thể tải danh sách khóa học của bạn');
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  // Fetch Enrollments based on page and filters
  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10
      };

      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      if (courseFilter !== 'ALL') {
        params.courseId = courseFilter;
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (riskFilter !== 'ALL') {
        params.riskLevel = riskFilter;
      }

      const res = await getTrainerEnrollments(params);
      if (res.data?.success) {
        setEnrollments(res.data?.data?.enrollments || []);
        setPagination(res.data?.data?.pagination || null);
      }
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
      toast.error('Không thể tải danh sách học viên');
    } finally {
      setLoading(false);
    }
  }, [page, searchText, courseFilter, statusFilter, riskFilter]);

  // Load courses on mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Load enrollments when filters or page changes
  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Reset Filters helper
  const handleResetFilters = () => {
    setSearchText('');
    setCourseFilter('ALL');
    setStatusFilter('ALL');
    setRiskFilter('ALL');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const courseOptions = [
    { value: 'ALL', label: 'Tất cả khóa học' },
    ...courses.map(c => ({ value: c._id, label: c.title }))
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] flex items-center gap-2">
          Quản lý học viên
        </h1>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm">
          Theo dõi tiến trình, đánh giá kết quả và thực hiện can thiệp kịp thời đối với học viên của bạn.
        </p>
      </div>

      {/* Filter Bar */}
      <BezelCard className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-5" padding="default">
        <div className="flex items-center gap-2 mb-4 text-[hsl(var(--admin-text-secondary))]">
          <SlidersHorizontal size={16} className="text-[hsl(var(--admin-accent))]" />
          <span className="text-sm font-semibold uppercase tracking-wider">Bộ lọc tìm kiếm</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Search Box */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="block text-xs font-semibold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Tìm kiếm</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--admin-text-muted))]" />
              <Input
                type="text"
                placeholder="Tên học viên hoặc email..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] text-sm placeholder:text-[hsl(var(--admin-text-muted))] focus:border-[hsl(var(--admin-accent))] h-10 w-full"
              />
            </div>
          </div>

          {/* Course Filter */}
          <div className="md:col-span-1">
            <SelectField
              label="Khóa học"
              value={courseFilter}
              options={courseOptions}
              onChange={(val) => {
                setCourseFilter(val);
                setPage(1);
              }}
              disabled={coursesLoading}
              placeholder="Chọn khóa học..."
              className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-1">
            <SelectField
              label="Trạng thái học"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              placeholder="Chọn trạng thái..."
            />
          </div>

          {/* Risk Level Filter */}
          <div className="md:col-span-1">
            <SelectField
              label="Nguy cơ bỏ học"
              value={riskFilter}
              options={RISK_OPTIONS}
              onChange={(val) => {
                setRiskFilter(val);
                setPage(1);
              }}
              placeholder="Chọn mức nguy cơ..."
            />
          </div>
        </div>

        {/* Action button inside Filter Bar */}
        {(searchText || courseFilter !== 'ALL' || statusFilter !== 'ALL' || riskFilter !== 'ALL') && (
          <div className="flex justify-end mt-4 pt-4 border-t border-[hsl(var(--admin-surface-elevated))]/60">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] font-semibold gap-1.5 transition-all duration-200"
            >
              <RotateCcw size={14} />
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </BezelCard>

      {/* Main Student Table */}
      <BezelCard className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] p-6" padding="default">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-[hsl(var(--admin-success))]" />
            <h2 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Danh sách học tập</h2>
          </div>
          {pagination && (
            <span className="text-xs text-[hsl(var(--admin-text-muted))] font-mono">
              Tổng số: {pagination.totalRecords} học viên
            </span>
          )}
        </div>

        <TrainerStudentTable
          enrollments={enrollments}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </BezelCard>
    </div>
  );
};

export default TrainerEnrollmentsPage;
