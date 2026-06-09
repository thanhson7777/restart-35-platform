import { Card, Badge, SafeImage } from '@/components/ui';
import { Progress } from '@/components/ui';
import { formatDeadline, formatScholarshipAmount, formatRecipientCount } from '@/utils/formatter';
import { SCHOLARSHIP_STATUS } from '@/utils/constants';
import { Calendar, Users, CheckCircle2, XCircle, Award } from 'lucide-react';

const STATUS_CONFIG = {
  active:   { label: 'Đang nhận đơn', bg: 'bg-green-100', text: 'text-green-700' },
  paused:   { label: 'Tạm dừng',     bg: 'bg-amber-100', text: 'text-amber-700' },
  exhausted:{ label: 'Đã hết chỗ',    bg: 'bg-red-100',   text: 'text-red-700'   },
  draft:    { label: 'Nháp',          bg: 'bg-gray-100',  text: 'text-gray-600'  },
  expired:  { label: 'Đã hết hạn',    bg: 'bg-red-100',   text: 'text-red-700'   },
};

export const ScholarshipCard = ({ scholarship, onClick }) => {
  if (!scholarship) return null;

  const {
    thumbnail,
    title,
    description,
    ngo,
    amountPerRecipient,
    applicationPeriod,
    maxRecipients,
    currentRecipients,
    status,
    eligibility,
    categories,
  } = scholarship;

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const progress = maxRecipients > 0 ? Math.round((currentRecipients / maxRecipients) * 100) : 0;

  return (
    <Card
      variant="interactive"
      className="overflow-hidden flex flex-col h-full"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {thumbnail ? (
          <SafeImage src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <Award className="w-10 h-10 text-primary/30" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Eligibility badge */}
        {eligibility?.eligible === true && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <CheckCircle2 className="w-3 h-3" />
              Đủ điều kiện
            </span>
          </div>
        )}
        {eligibility?.eligible === false && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <XCircle className="w-3 h-3" />
              Không đủ điều kiện
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* NGO */}
        {ngo && (
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
              {ngo.displayName?.charAt(0)?.toUpperCase()}
            </span>
            {ngo.displayName}
          </p>
        )}

        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-snug">
          {title}
        </h3>

        {/* Short description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
            {description}
          </p>
        )}

        {/* Amount */}
        <div className="mb-3">
          <span className="text-base font-bold text-primary">
            {formatScholarshipAmount(amountPerRecipient)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">/người</span>
        </div>

        {/* Deadline */}
        {applicationPeriod?.endDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Hạn nộp: {formatDeadline(applicationPeriod.endDate)}</span>
          </div>
        )}

        {/* Recipients progress */}
        {maxRecipients > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {formatRecipientCount(currentRecipients, maxRecipients)}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 90 ? 'bg-red-500' : progress >= 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Categories */}
        {categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-border">
            {categories.slice(0, 2).map((cat, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {cat}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
