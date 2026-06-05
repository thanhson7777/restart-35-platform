import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Calendar, Edit3, ArrowRight } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@/components/ui';

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
    pending: { text: 'Chờ duyệt', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    approved: { text: 'Đã duyệt', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    published: { text: 'Đã xuất bản', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold' }
  };

  const currentStatus = statusConfig[status] || statusConfig.draft;

  return (
    <Card className="group overflow-hidden border border-[#1f2937] bg-[#111827] transition-all duration-300 hover:-translate-y-1 hover:border-[#374151] hover:shadow-xl hover:shadow-black/40">
      {/* Course Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#001D4A]/60 to-[#0b0f19] transition-transform duration-500 group-hover:scale-105">
            <BookOpen className="h-12 w-12 text-blue-500/40" />
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
          <h3 className="line-clamp-2 text-base font-semibold text-white group-hover:text-blue-400 transition-colors h-12" title={title}>
            {title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">Ngày tạo: {formattedDate}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 border-y border-[#1f2937] py-3 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
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
        <div className="grid grid-cols-2 gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#1f2937] bg-transparent hover:bg-slate-800 hover:text-white"
          >
            <Link to={`/trainer/courses/${_id}/students`}>
              <Users className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
              Học viên
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#1f2937] bg-transparent hover:bg-slate-800 hover:text-white"
          >
            <Link to={`/trainer/courses/${_id}/schedule`}>
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
              Lịch học
            </Link>
          </Button>
        </div>

        <Button
          asChild
          size="sm"
          className="w-full bg-[#001D4A] hover:bg-[#002e75] text-white border-none mt-2"
        >
          <Link to={`/trainer/courses/${_id}/edit`}>
            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
            Chỉnh sửa khóa học
            <ArrowRight className="ml-auto h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default TrainerCourseCard;
