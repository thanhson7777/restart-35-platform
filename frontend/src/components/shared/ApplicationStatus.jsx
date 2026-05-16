const STATUS_CONFIG = {
  draft:     { label: 'Nháp',          bg: 'bg-gray-100',   text: 'text-gray-600' },
  submitted: { label: 'Đã nộp',         bg: 'bg-blue-100',   text: 'text-blue-700' },
  reviewing: { label: 'Đang xét duyệt', bg: 'bg-amber-100', text: 'text-amber-700' },
  approved:  { label: 'Được duyệt',     bg: 'bg-green-100',  text: 'text-green-700' },
  rejected:  { label: 'Bị từ chối',     bg: 'bg-red-100',    text: 'text-red-700' },
  waitlist:  { label: 'Danh sách chờ',  bg: 'bg-purple-100', text: 'text-purple-700' },
};

export const ApplicationStatus = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};
