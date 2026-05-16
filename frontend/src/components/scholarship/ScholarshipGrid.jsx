import { ScholarshipCard } from './ScholarshipCard';
import { ScholarshipCardSkeleton } from './ScholarshipCardSkeleton';
import { Award } from 'lucide-react';

const normalizeList = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

export const ScholarshipGrid = ({
  scholarships = [],
  loading = false,
  onScholarshipClick,
  emptyMessage = 'Không tìm thấy học bổng nào',
}) => {
  const list = normalizeList(scholarships);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ScholarshipCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Award className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Thử thay đổi bộ lọc hoặc quay lại sau
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {list.map((scholarship) => (
        <ScholarshipCard
          key={scholarship._id || scholarship.id}
          scholarship={scholarship}
          onClick={() => onScholarshipClick?.(scholarship)}
        />
      ))}
    </div>
  );
};
