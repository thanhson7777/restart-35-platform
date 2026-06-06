import { Badge } from '@/components/ui';
import { Building2, HeartHandshake, Layers3 } from 'lucide-react';

const typeConfig = {
  enterprise: {
    label: 'Enterprise',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    icon: Building2
  },
  ngo: {
    label: 'NGO',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    icon: HeartHandshake
  },
  mixed: {
    label: 'Co-funded',
    className: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    icon: Layers3
  }
};

const SponsorshipBadge = ({ type = 'enterprise', coverage, children }) => {
  const config = typeConfig[type] || typeConfig.enterprise;
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} border inline-flex items-center gap-1.5`}>
      <Icon size={12} />
      <span>{children || config.label}</span>
      {coverage ? <span className="opacity-80">· {coverage}</span> : null}
    </Badge>
  );
};

export default SponsorshipBadge;
