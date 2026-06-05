import React from 'react';
import { Avatar, Card, Badge } from '@/components/ui';
import { Award, BookOpen, Star, ShieldCheck, Mail, Globe } from 'lucide-react';

export const CourseInstructorInfo = ({ provider }) => {
  if (!provider) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Chưa có thông tin giảng viên cho khóa học này.
      </div>
    );
  }

  const {
    displayName,
    verified,
    email,
    website,
    bio = 'Giảng viên chuyên môn giàu kinh nghiệm đào tạo thực tế, tận tâm hỗ trợ học viên 35+ trong việc tiếp cận kiến thức mới và tái cấu trúc định hướng nghề nghiệp.',
    stats = {
      coursesCount: 12,
      averageRating: 4.8,
      totalStudents: 1420,
    },
    expertise = ['Chuyển đổi số', 'Kỹ năng số', 'Định hướng nghề nghiệp', 'Kỹ năng thực hành'],
  } = provider;

  return (
    // Double-Bezel Nested Hardware Card
    <div className="group p-1.5 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/85 transition-all duration-300">
      <Card
        variant="default"
        padding="lg"
        className="rounded-[18px] bg-white dark:bg-zinc-950 overflow-hidden border border-zinc-150/60 dark:border-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col md:flex-row gap-8"
      >
        {/* Left Side: Avatar and Stats */}
        <div className="flex flex-col items-center md:items-start shrink-0 text-center md:text-left space-y-4">
          <div className="relative">
            <Avatar 
              src={provider.avatarUrl || provider.avatar} 
              fallback={displayName?.[0] || 'T'} 
              className="w-24 h-24 sm:w-28 sm:h-28 text-2xl font-bold border-2 border-zinc-100 dark:border-zinc-800 shadow-sm"
            />
            {verified && (
              <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-zinc-950 shadow-sm" title="Giảng viên đã xác minh">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center justify-center md:justify-start gap-1">
              {displayName}
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              Đơn vị đào tạo đối tác
            </p>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-2.5 text-zinc-400 dark:text-zinc-500">
            {email && (
              <a href={`mailto:${email}`} className="hover:text-primary transition-colors">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Globe className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
          </div>
        </div>

        {/* Right Side: Details & Biography */}
        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Tiểu sử & Kinh nghiệm</span>
            <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
              {bio}
            </p>
          </div>

          {/* Stats Badges Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Khóa học</span>
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                {stats.coursesCount}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Đánh giá</span>
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                {stats.averageRating.toFixed(1)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                <Award className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Học viên</span>
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                {stats.totalStudents.toLocaleString()}+
              </p>
            </div>
          </div>

          {/* Expertise badges */}
          {expertise?.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">Lĩnh vực chuyên môn</span>
              <div className="flex flex-wrap gap-1.5">
                {expertise.map((exp, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="bg-zinc-50 border border-zinc-200/60 text-zinc-650 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-350 text-[10.5px] px-2 py-0.5 font-medium"
                  >
                    {exp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
