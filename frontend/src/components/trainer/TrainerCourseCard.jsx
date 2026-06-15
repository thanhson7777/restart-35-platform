import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Calendar, Edit3, ArrowRight } from 'lucide-react';
import { Card, CardContent, Badge, Button, SafeImage } from '@/components/ui';

const TrainerCourseCard = ({ course }) => {
  const {
    _id,
    title,
    thumbnail,
    status = 'draft',
    currentStudents = 0,
    maxStudents = 30,
    syllabus = [],
    createdAt
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
        <div className="flex flex-col gap-2 pt-2">
          <Button
            asChild
            size="sm"
            className="w-full bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white shadow-sm gap-2"
          >
            <Link to={`/trainer/courses/${_id}/edit`}>
              <Edit3 className="h-4 w-4 shrink-0" />
              <span>Chỉnh sửa khóa học</span>
            </Link>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-accent))] text-[hsl(var(--admin-text-secondary))] gap-2"
            >
              <Link to={`/trainer/courses/${_id}/students`}>
                <Users className="h-4 w-4 shrink-0" />
                <span>Học viên</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-accent))] text-[hsl(var(--admin-text-secondary))] gap-2"
            >
              <Link to={`/trainer/courses/${_id}/schedule`}>
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Lịch học</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainerCourseCard;
