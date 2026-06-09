import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard, SafeImage } from '@/components/ui';
import { Calendar, User, MapPin, DollarSign, Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const AdminApprovalList = ({ courses = [], onApprove, onReject, onView }) => {
  const getDeliveryBadge = (type) => {
    const deliveryMap = {
      online: { text: 'Online', class: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
      offline: { text: 'Offline', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      blended: { text: 'Blended', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    };
    const style = deliveryMap[type] || {
      text: type,
      class: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${style.class}`}>
        {style.text}
      </span>
    );
  };

  const getFormattedDate = (dateValue) => {
    if (!dateValue) return '';
    try {
      return format(new Date(dateValue), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.length === 0 ? (
        <div className="col-span-full py-16 text-center text-[hsl(var(--admin-text-muted))] text-sm">
          Chưa có khóa học nào đang chờ phê duyệt.
        </div>
      ) : (
        courses.map((course, index) => (
          <motion.div
            key={course._id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <BezelCard
              outerClassName="h-full hover:border-[hsl(var(--admin-accent))]/30 hover:scale-[1.01] transition-all duration-300"
              innerClassName="flex flex-col h-full justify-between"
              padding="none"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-[hsl(var(--admin-surface-elevated))] border-b border-[hsl(var(--admin-border))]">
                <SafeImage
                  src={course.thumbnail || 'https://picsum.photos/seed/course-thumb/400/250'}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  {getDeliveryBadge(course.location?.type || 'online')}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-[hsl(var(--admin-text-primary))] leading-snug tracking-tight mb-2 truncate-2-lines min-h-[44px]">
                    {course.title}
                  </h4>

                  <div className="space-y-2 mt-4 text-xs text-[hsl(var(--admin-text-muted))]">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[hsl(var(--admin-accent))]" />
                      <span className="truncate">Người dạy: {course.instructorName || course.providerName || 'Giảng viên Restart'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[hsl(var(--admin-accent))]" />
                      <span>Ngày gửi: {getFormattedDate(course.createdAt)}</span>
                    </div>
                    {course.location?.type === 'offline' && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[hsl(var(--admin-accent))]" />
                        <span className="truncate">Địa điểm: {course.location?.address || 'N/A'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-[hsl(var(--admin-accent))]" />
                      <span className="font-bold text-[hsl(var(--admin-text-primary))]">
                        {course.isFree ? 'Miễn phí' : `${course.fee?.toLocaleString()} VND`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[hsl(var(--admin-border))]">
                  <button
                    onClick={() => onView(course)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full
                      border border-[hsl(var(--admin-border))]
                      bg-[hsl(var(--admin-surface-elevated))]
                      text-[hsl(var(--admin-text-secondary))]
                      hover:bg-[hsl(var(--admin-surface-hover))]
                      text-xs font-semibold transition-colors duration-200 active:scale-[0.98]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem chi tiết</span>
                  </button>

                  <button
                    onClick={() => onApprove(course)}
                    className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all duration-300 active:scale-[0.9]"
                    title="Duyệt"
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onReject(course)}
                    className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 active:scale-[0.9]"
                    title="Từ chối"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </BezelCard>
          </motion.div>
        ))
      )}
    </div>
  );
};
