import React from 'react';
import { Badge, Card, SafeImage } from '@/components/ui';
import { Star, Clock, MapPin, Users, BookOpen, Play, Heart, Briefcase, Gift } from 'lucide-react';
import { formatPrice, formatDuration, formatMatchScore, formatVideoDuration } from '@/utils/formatter';
import { DeliveryTypeBadge } from './DeliveryTypeBadge';
import { FundingModelChip } from './FundingModelChip';

const LEVEL_LABELS = {
  beginner: 'Người mới',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

const LOCATION_ICONS = {
  online: '🌐',
  offline: '📍',
  hybrid: '🔄',
};

export const CourseCard = ({
  course,
  matchScore,
  onClick,
  onEnroll,
  actionSlot,
  variant = 'vertical', // 'vertical' | 'horizontal'
}) => {
  const {
    thumbnail,
    title,
    shortDescription,
    fee,
    isFree,
    scholarshipEligibility,
    duration,
    location,
    level,
    skills,
    rating,
    enrollmentCount,
    currentStudents,
    maxStudents,
    provider,
    delivery_type,
    funding_model,
    fundingConfig,
    sponsorshipData,
  } = course;

  // Migration fallbacks
  const actualIsFree = fundingConfig?.type === 'FREE' || isFree || fee === 0;
  const actualFee = fundingConfig?.price ?? fee ?? 0;
  const isSponsored = fundingConfig?.type === 'SPONSORED' || course.sponsorship?.hasSponsorship;
  const hasJobGuarantee = fundingConfig?.hasJobGuarantee || course.sponsorship?.hasJobGuarantee;
  const acceptsSponsorship = fundingConfig?.acceptsSponsorship;

  // Calculate final fee with sponsorship
  let finalFee = actualFee;
  let hasDiscount = false;
  
  if (sponsorshipData && actualFee > 0) {
    if (sponsorshipData.coverageType === 'FULL' || sponsorshipData.coverageType === 'full') {
      finalFee = 0;
      hasDiscount = true;
    } else if (sponsorshipData.amount > 0) {
      finalFee = Math.max(0, actualFee - sponsorshipData.amount);
      hasDiscount = true;
    }
  }
  
  const isFinalFree = actualIsFree || finalFee === 0;

  const isHorizontal = variant === 'horizontal';

  return (
    // Double-Bezel Nested Hardware Shell
    <div 
      className={`group p-1.5 rounded-[20px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-zinc-200/40 dark:hover:shadow-black/30 h-full flex`}
      onClick={onClick}
    >
      <Card
        variant="default"
        padding="none"
        className={`w-full rounded-[14px] bg-white dark:bg-zinc-950 overflow-hidden flex shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-zinc-150/80 dark:border-zinc-900 cursor-pointer ${
          isHorizontal ? 'flex-col sm:flex-row' : 'flex-col'
        }`}
      >
        {/* Thumbnail Section */}
        <div 
          className={`relative bg-muted overflow-hidden shrink-0 transition-all duration-500 ${
            isHorizontal 
              ? 'w-full sm:w-56 md:w-64 aspect-video sm:aspect-[4/3] md:aspect-video' 
              : 'aspect-video w-full'
          }`}
        >
          {thumbnail ? (
            <SafeImage
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted dark:bg-zinc-900 text-muted-foreground transition-transform duration-500 ease-out group-hover:scale-105">
              <BookOpen className="w-12 h-12 stroke-[1.2]" />
            </div>
          )}

          {/* Video Play Overlay */}
          {delivery_type === 'video' && (
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white flex items-center justify-center shadow-md scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                <Play className="w-5 h-5 fill-current ml-0.5" strokeWidth={1.5} />
              </div>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
            {delivery_type ? (
              <DeliveryTypeBadge deliveryType={delivery_type} size="sm" showIcon={true} />
            ) : (
              location?.type && (
                <Badge variant="secondary" className="bg-white/90 text-foreground text-xs shadow-sm">
                  {location.type === 'online' ? 'Trực tuyến' : location.type === 'offline' ? 'Tại lớp' : 'Kết hợp'}
                </Badge>
              )
            )}
            


            {hasJobGuarantee && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/95 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5 shadow-sm border-0 font-medium flex items-center gap-1"
              >
                <Briefcase className="w-3 h-3 fill-white" />
                Cam kết việc làm
              </Badge>
            )}


            
            {level && (
              <Badge
                variant="secondary"
                className="bg-white/95 dark:bg-zinc-900/95 text-foreground text-[10px] px-2 py-0.5 shadow-sm border border-zinc-200/50 dark:border-zinc-800 font-medium"
              >
                {LEVEL_LABELS[level] || level}
              </Badge>
            )}
            
            {scholarshipEligibility && (
              <Badge
                variant="secondary"
                className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 shadow-sm border-0 font-medium"
              >
                Học bổng
              </Badge>
            )}

            {sponsorshipData && (sponsorshipData.amount > 0 || sponsorshipData.coverageType === 'FULL' || sponsorshipData.coverageType === 'full') && (
              <Badge
                variant="secondary"
                className="bg-rose-500/95 hover:bg-rose-600 text-white text-[10px] px-2 py-0.5 shadow-sm border-0 font-medium flex items-center gap-1"
              >
                <Gift className="w-3 h-3 text-white" />
                {sponsorshipData.coverageType === 'FULL' || sponsorshipData.coverageType === 'full'
                  ? 'DN Tài trợ 100%' 
                  : `DN Tài trợ ${formatPrice(sponsorshipData.amount)}`}
              </Badge>
            )}
          </div>

          {/* Match score badge */}
          {matchScore != null && (
            <div className="absolute top-2.5 right-2.5 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {formatMatchScore(matchScore)}
            </div>
          )}

          {/* Video Duration Badge */}
          {duration && delivery_type === 'video' && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono shadow-sm">
              {formatVideoDuration(duration)}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1 min-w-0">
          {/* Funding Model & Provider Info */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {(funding_model || fundingConfig?.type) && (
              <FundingModelChip 
                fundingModel={actualIsFree ? 'free' : (funding_model === 'free' ? 'learner_paid' : (funding_model || 'learner_paid'))} 
                size="sm" 
              />
            )}
            {provider && (
              <span className="text-xs text-muted-foreground font-medium">
                by {provider.displayName}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-2 mb-2 leading-snug group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>

          {/* Short description */}
          {shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
              {shortDescription}
            </p>
          )}

          {/* Fee & Duration/Location Row */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            {/* Fee */}
            <div className="flex flex-col">
              {hasDiscount && !actualIsFree && (
                <span className="text-xs text-muted-foreground line-through font-medium">
                  {formatPrice(actualFee)}
                </span>
              )}
              <span className="text-lg font-bold text-primary leading-tight mt-auto">
                {isFinalFree ? (actualIsFree ? 'Miễn phí' : '0đ') : formatPrice(finalFee)}
              </span>
            </div>

            {/* Duration (if not video duration overlay) */}
            {duration && delivery_type !== 'video' && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                {formatDuration(duration)}
              </span>
            )}
          </div>

          {/* Footer Stats Row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-zinc-100 dark:border-zinc-900 pt-3.5 mt-auto">
            {rating?.average && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-foreground">{rating.average.toFixed(1)}</span>
                <span>({rating.count})</span>
              </span>
            )}
            
            {enrollmentCount != null && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{enrollmentCount} học viên</span>
              </span>
            )}
            
            {currentStudents != null && maxStudents > 0 && (
              <span className="ml-auto font-medium text-foreground">
                {currentStudents}/{maxStudents} chỗ
              </span>
            )}
          </div>
          {actionSlot && <div className="mt-3">{actionSlot}</div>}
        </div>
      </Card>
    </div>
  );
};
