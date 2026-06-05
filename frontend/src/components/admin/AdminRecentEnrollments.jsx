import React from 'react';
import { motion } from 'framer-motion';
import { BezelCard, Avatar } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export const AdminRecentEnrollments = ({ enrollments = [] }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { text: 'Đang học', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      in_progress: { text: 'Đang học', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      completed: { text: 'Hoàn thành', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      dropped: { text: 'Đã hủy', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
      suspended: { text: 'Tạm dừng', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      waitlist: { text: 'Chờ lớp', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    };

    const style = statusMap[status] || { text: status, class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${style.class}`}>
        {style.text}
      </span>
    );
  };

  const getFormattedTime = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    } catch (e) {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <BezelCard className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Hoạt động ghi danh gần đây</h3>
            <p className="text-xs text-slate-400 mt-1">Danh sách học viên đăng ký học mới nhất trong ngày</p>
          </div>
          <button
            onClick={() => navigate('/admin/enrollments')}
            className="text-xs text-[#3B82F6] hover:underline font-medium"
          >
            Xem tất cả
          </button>
        </div>

        <div className="divide-y divide-slate-800/60 overflow-hidden">
          {enrollments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Chưa có dữ liệu ghi danh nào gần đây.
            </div>
          ) : (
            enrollments.map((enrol, index) => (
              <div
                key={enrol._id}
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-slate-900/30 px-2 -mx-2 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={enrol.userAvatar}
                    fallback={enrol.userName?.charAt(0) || 'U'}
                    className="w-10 h-10 border border-slate-800 shadow-sm"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-100 truncate">{enrol.userName}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{enrol.courseTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-16 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#3B82F6] h-full rounded-full"
                          style={{ width: `${enrol.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{enrol.progress}%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">{getFormattedTime(enrol.enrolledAt)}</span>
                  </div>
                  {getStatusBadge(enrol.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
