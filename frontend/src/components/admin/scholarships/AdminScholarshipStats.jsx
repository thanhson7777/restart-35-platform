import { Award, CheckCircle, Clock, Wallet, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';

const statusConfig = {
  total: {
    icon: Award,
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  active: {
    icon: CheckCircle,
    color: 'green',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  pending: {
    icon: Clock,
    color: 'amber',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  budget: {
    icon: Wallet,
    color: 'purple',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
};

const formatCurrency = (value) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value?.toLocaleString('vi-VN') || '0';
};

const AdminScholarshipStats = ({ stats, loading }) => {
  const statItems = [
    {
      key: 'total',
      label: 'Tổng học bổng',
      value: stats?.scholarships?.total || 0,
      isMoney: false,
    },
    {
      key: 'active',
      label: 'Đang hoạt động',
      value: stats?.scholarships?.active || 0,
      isMoney: false,
    },
    {
      key: 'pending',
      label: 'Đơn chờ duyệt',
      value: stats?.applications?.pending || 0,
      isMoney: false,
      urgent: true,
    },
    {
      key: 'budget',
      label: 'Tổng ngân sách',
      value: stats?.scholarships?.totalBudget || 0,
      isMoney: true,
      format: formatCurrency,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="w-16 h-5 bg-slate-200 rounded" />
              </div>
              <div className="mt-4">
                <div className="w-20 h-8 bg-slate-200 rounded" />
                <div className="w-28 h-4 bg-slate-200 rounded mt-2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => {
        const config = statusConfig[item.key];
        const Icon = config.icon;
        const displayValue = item.isMoney && item.format
          ? item.format(item.value)
          : item.value?.toLocaleString('vi-VN') || '0';

        return (
          <Card
            key={item.key}
            className={`p-6 hover:shadow-lg transition-shadow ${
              item.urgent && item.value > 0 ? 'ring-2 ring-amber-200' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              {item.urgent && item.value > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Cần xử lý
                </span>
              )}
            </div>

            <div className="mt-4">
              <p className="text-3xl font-bold text-foreground">
                {displayValue}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {item.label}
              </p>
            </div>

            {item.urgent && item.value > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-100">
                <p className="text-xs text-amber-600">
                  {item.value} đơn đang chờ bạn duyệt
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default AdminScholarshipStats;
