import { Badge } from '@/components/ui';

const STATUS_CONFIG = {
  pending: {
    label: 'Đang chờ duyệt',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
  },
  waitlist: {
    label: 'Danh sách chờ',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  enrolled: {
    label: 'Đã ghi danh',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  in_progress: {
    label: 'Đang học',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
  },
  active: {
    label: 'Đang học',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
  },
  completed: {
    label: 'Hoàn thành',
    bg: 'bg-green-100',
    text: 'text-green-700',
  },
  dropped: {
    label: 'Đã bỏ',
    bg: 'bg-red-100',
    text: 'text-red-700',
  },
  cancelled: {
    label: 'Đã hủy',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
  },
  on_hold: {
    label: 'Tạm dừng',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
};

export const EnrollmentStatus = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
};
