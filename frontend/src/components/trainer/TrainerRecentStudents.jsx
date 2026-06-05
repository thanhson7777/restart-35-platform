import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCheck, ArrowUpRight } from 'lucide-react';
import { BezelCard, Avatar, Badge } from '@/components/ui';

export const TrainerRecentStudents = ({ students = [] }) => {
  const navigate = useNavigate();

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'dropped':
        return 'destructive';
      case 'waitlist':
      case 'waitlisted':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Đang học';
      case 'completed':
        return 'Hoàn thành';
      case 'dropped':
        return 'Bỏ học';
      case 'waitlist':
      case 'waitlisted':
        return 'Chờ duyệt';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <BezelCard className="flex flex-col h-full" padding="default">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Học viên mới đăng ký</h3>
            <p className="text-xs text-slate-400 mt-1">Các học viên vừa đăng ký vào khóa học của bạn</p>
          </div>
          <UserCheck size={20} className="text-[#3B82F6] opacity-80" />
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-4">
          {students.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
              Chưa có học viên đăng ký mới.
            </div>
          ) : (
            students.map((student, idx) => (
              <div
                key={student.enrollmentId || idx}
                onClick={() => navigate(`/trainer/enrollments/${student.enrollmentId}`)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/60 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={student.userAvatar}
                    alt={student.userName}
                    fallback={student.userName?.charAt(0).toUpperCase()}
                    size="default"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#3B82F6] transition-colors duration-200">
                      {student.userName}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-[150px] truncate">{student.courseTitle}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 text-right font-mono">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(student.status)}>
                      {getStatusLabel(student.status)}
                    </Badge>
                    <ArrowUpRight size={14} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                  </div>
                  <span className="text-[10px] text-slate-500">{formatDate(student.enrolledAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </BezelCard>
    </motion.div>
  );
};
