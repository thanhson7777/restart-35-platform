import { Users, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui';

const AdminUserStats = ({ stats, activeTab, loading }) => {
  const currentStats = stats?.[activeTab] || {
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0
  };

  const statItems = [
    {
      label: 'Tổng cộng',
      value: currentStats.total,
      icon: Users,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50'
    },
    {
      label: 'Đang hoạt động',
      value: currentStats.active,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Mới tháng này',
      value: currentStats.newThisMonth,
      icon: UserPlus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Không hoạt động',
      value: currentStats.inactive,
      icon: UserX,
      color: 'text-slate-400',
      bgColor: 'bg-slate-50'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200 p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{item.label}</span>
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {item.value.toLocaleString('vi-VN')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminUserStats;
