import { useState } from 'react';
import { ApplicationCard } from './ApplicationCard';
import { Skeleton } from '@/components/ui';
import { FileText } from 'lucide-react';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'draft', label: 'Nháp' },
  { key: 'submitted', label: 'Đã nộp' },
  { key: 'reviewing', label: 'Đang xét duyệt' },
  { key: 'approved', label: 'Được duyệt' },
  { key: 'rejected', label: 'Bị từ chối' },
  { key: 'waitlist', label: 'Danh sách chờ' },
];

const normalizeList = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

export const ApplicationList = ({
  applications = [],
  loading = false,
  onView,
  onCancel,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const list = normalizeList(applications);

  const filtered =
    activeTab === 'all'
      ? list
      : list.filter((e) => e.status === activeTab);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? list.length
              : list.filter((e) => e.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {activeTab === 'all'
              ? 'Bạn chưa nộp đơn xin học bổng nào'
              : `Không có đơn ở trạng thái "${tab?.label}"`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Truy cập trang học bổng để nộp đơn
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app._id || app.id}
              application={app}
              onView={() => onView?.(app)}
              onCancel={() => onCancel?.(app)}
              onSubmit={() => onSubmit?.(app)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
