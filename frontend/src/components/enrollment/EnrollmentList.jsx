import { useState } from 'react';
import { EnrollmentCard } from './EnrollmentCard';
import { CourseCardSkeleton } from '@/components/course/CourseCardSkeleton';
import { BookOpen } from 'lucide-react';
import { ENROLLMENT_STATUS } from '@/utils/constants';

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
  onViewProgress,
  onViewDetail,
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const list = Array.isArray(enrollments)
    ? enrollments
    : Array.isArray(enrollments?.data)
    ? enrollments.data
    : [];

  const filtered =
    activeTab === 'all'
      ? list
      : list.filter((e) => e.status === activeTab);

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
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                {list.filter((e) => e.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Bạn chưa đăng ký khóa học nào
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Khám phá các khóa học và bắt đầu học tập ngay
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
