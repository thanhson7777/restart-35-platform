import { Badge, Card } from '@/components/ui';
import { Star, Clock, MapPin, Users, BookOpen } from 'lucide-react';
import { formatPrice, formatDuration, formatMatchScore } from '@/utils/formatter';

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
  } = course;

  return (
    <Card
      variant="interactive"
      className="overflow-hidden flex flex-col h-full"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {level && (
            <Badge
              variant="secondary"
              className="bg-white/90 text-foreground text-xs"
            >
              {LEVEL_LABELS[level] || level}
            </Badge>
          )}
          {scholarshipEligibility && (
            <Badge
              variant="secondary"
              className="bg-green-100/90 text-green-700 text-xs"
            >
              Học bổng
            </Badge>
          )}
        </div>

        {/* Match score badge */}
        {matchScore != null && (
          <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {formatMatchScore(matchScore)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 mb-1 leading-snug">
          {title}
        </h3>

        {/* Provider */}
        {provider && (
          <p className="text-xs text-muted-foreground mb-2">
            {provider.displayName}
          </p>
        )}

        {/* Short description */}
        {shortDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {shortDescription}
          </p>
        )}

        {/* Fee */}
        <div className="mb-3">
          <span className="text-lg font-bold text-primary">
            {isFree || fee === 0 ? 'Miễn phí' : formatPrice(fee)}
          </span>
        </div>

        {/* Duration & Location */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(duration)}
            </span>
          )}
          {location?.type && (
            <span className="flex items-center gap-1">
              {LOCATION_ICONS[location.type] || '📍'}
              {location.type === 'online'
                ? 'Trực tuyến'
                : location.type === 'offline'
                ? 'Tại lớp'
                : 'Kết hợp'}
            </span>
          )}
        </div>

        {/* Rating & Enrollment count */}
        <div className="flex items-center gap-4 text-sm border-t border-border pt-3">
          {rating?.average && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{rating.average.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({rating.count})
              </span>
            </span>
          )}
          {enrollmentCount != null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {enrollmentCount} học viên
            </span>
          )}
          {currentStudents != null && maxStudents > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {currentStudents}/{maxStudents} chỗ
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
