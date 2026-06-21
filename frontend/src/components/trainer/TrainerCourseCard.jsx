import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Calendar, Edit3, ArrowRight, Video, Globe, MapPin, XCircle } from 'lucide-react';
import { Card, CardContent, Badge, Button, SafeImage } from '@/components/ui';

const TrainerCourseCard = ({ course, onRefresh, onCancelApproval }) => {
  const {
    _id,
    title,
    thumbnail,
    status = 'draft',
    currentStudents = 0,
    maxStudents = 30,
    syllabus = [],
    createdAt,
    delivery_type
  } = course;

  // Format creation date
  const formattedDate = createdAt 
    ? new Date(createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : 'N/A';

  // Status mapping to colors and display text
  const statusConfig = {
    draft: { text: 'Nháp', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
    pending: { text: 'Chờ duyệt', className: 'bg-[hsl(var(--admin-warning))]/15 text-[hsl(var(--admin-warning))] border-[hsl(var(--admin-warning))]/30' },
    approved: { text: 'Đã duyệt', className: 'bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/30' },
    published: { text: 'Đã xuất bản', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold' }
  };

  const currentStatus = statusConfig[status] || statusConfig.draft;

  const getDeliveryTypeBadge = () => {
    switch (delivery_type) {
      case 'video':
        return { text: 'Video', icon: <Video className="w-3 h-3 mr-1" />, color: 'bg-blue-500/80 text-white' };
      case 'live':
        return { text: 'Trực tuyến', icon: <Globe className="w-3 h-3 mr-1" />, color: 'bg-purple-500/80 text-white' };
      case 'offline':
        return { text: 'Trực tiếp', icon: <MapPin className="w-3 h-3 mr-1" />, color: 'bg-orange-500/80 text-white' };
      default:
        return { text: 'Khác', icon: null, color: 'bg-gray-500/80 text-white' };
    }
  };
  const deliveryBadge = getDeliveryTypeBadge();

  return (
    <Card className="group overflow-hidden border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--admin-border))] hover:shadow-xl hover:shadow-black/40">
      {/* Course Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-[hsl(var(--admin-surface-elevated))]">
        {thumbnail ? (
          <SafeImage
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#001D4A]/60 to-[hsl(var(--admin-surface))] transition-transform duration-500 group-hover:scale-105">
            <BookOpen className="h-12 w-12 text-[hsl(var(--admin-accent))]/40" />
          </div>
        )}
        
        {/* Status Badge overlay */}
        <div className="absolute left-3 top-3">
          <Badge variant="outline" className={`backdrop-blur-md px-2.5 py-1 ${currentStatus.className}`}>
            {currentStatus.text}
          </Badge>
        </div>

        {/* Delivery Type Badge overlay */}
        <div className="absolute right-3 top-3">
          <Badge variant="secondary" className={`backdrop-blur-md px-2.5 py-1 border-none font-medium flex items-center ${deliveryBadge.color} hover:${deliveryBadge.color}`}>
            {deliveryBadge.icon}
            {deliveryBadge.text}
          </Badge>
        </div>
      </div>

      {/* Course Content */}
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold text-[hsl(var(--admin-text-primary))] group-hover:text-[hsl(var(--admin-accent))] transition-colors h-12" title={title}>
            {title}
          </h3>
          <p className="mt-1 text-xs text-[hsl(var(--admin-text-muted))]">Ngày tạo: {formattedDate}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 border-y border-[hsl(var(--admin-border))] py-3 text-xs text-[hsl(var(--admin-text-secondary))]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[hsl(var(--admin-accent))]" />
            <span>
              <strong>{currentStudents}</strong>/{maxStudents} học viên
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-500" />
            <span>
              <strong>{syllabus.length}</strong> bài học
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled
                className="bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-faint))] cursor-not-allowed shadow-sm gap-1.5 border-[hsl(var(--admin-border))] px-2"
                title="Khóa học đang chờ duyệt"
              >
                <Edit3 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Chỉnh sửa</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancelApproval && onCancelApproval(_id)}
                className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-warning))] text-[hsl(var(--admin-text-secondary))] shadow-sm px-2 gap-1.5"
                title="Rút yêu cầu duyệt"
              >
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Hủy duyệt</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="col-span-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white shadow-sm p-0"
            >
              <Link to={`/trainer/courses/${_id}/edit`} className="flex items-center justify-center gap-2 w-full h-full">
                <Edit3 className="h-4 w-4 shrink-0" />
                <span>Chỉnh sửa khóa học</span>
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className={`border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-accent))] text-[hsl(var(--admin-text-secondary))] p-0 ${delivery_type === 'video' ? 'col-span-2' : ''}`}
          >
            <Link to={`/trainer/courses/${_id}/students`} className="flex items-center justify-center gap-2 w-full h-full">
              <Users className="h-4 w-4 shrink-0" />
              <span>Học viên</span>
            </Link>
          </Button>

          {delivery_type !== 'video' && (
            <Button
              variant="outline"
              size="sm"
              className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-accent))] text-[hsl(var(--admin-text-secondary))] p-0"
            >
              <Link to={`/trainer/courses/${_id}/schedule`} className="flex items-center justify-center gap-2 w-full h-full">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Lịch học</span>
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainerCourseCard;
