import React from 'react';
import { Badge } from '@/components/ui';
import { Play, Video, MapPin, Layers } from 'lucide-react';

const DELIVERY_CONFIG = {
  video: {
    label: 'Video bài giảng',
    icon: Play,
    className: 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40',
  },
  live: {
    label: 'Học trực tuyến (Live)',
    icon: Video,
    className: 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40',
  },
  offline: {
    label: 'Học tại lớp (Offline)',
    icon: MapPin,
    className: 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40',
  },
  blended: {
    label: 'Học kết hợp (Blended)',
    icon: Layers,
    className: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40',
  },
};

export const DeliveryTypeBadge = ({
  deliveryType,
  size = 'sm', // 'sm' | 'md'
  showIcon = true,
  className = '',
}) => {
  const config = DELIVERY_CONFIG[deliveryType] || DELIVERY_CONFIG.offline;
  const Icon = config.icon;
  
  // Custom sizes following 8pt grid spacing and thin styling
  const sizeClass = size === 'sm' 
    ? 'text-[11px] px-2.5 py-0.5 rounded-full' 
    : 'text-[13px] px-3 py-1 rounded-full';

  return (
    <Badge 
      variant="outline"
      className={`${config.className} ${sizeClass} gap-1.5 font-medium transition-all duration-300 hover:scale-[1.02] ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3" strokeWidth={2.0} />}
      <span>{config.label}</span>
    </Badge>
  );
};
