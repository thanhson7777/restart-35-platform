import { cn } from '@/utils/cn';

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'worker', label: 'Người lao động' },
  { key: 'enterprise', label: 'Doanh nghiệp' },
  { key: 'trainer', label: 'Giảng viên' },
  { key: 'ngo', label: 'Tổ chức' },
  { key: 'admin', label: 'Quản trị' }
];

const AdminUserTabs = ({ activeTab, onTabChange, counts }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
      {tabs.map((tab) => {
        const count = counts?.[tab.key]?.total || 0;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200',
              isActive
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                isActive
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-slate-200 text-slate-600'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AdminUserTabs;
