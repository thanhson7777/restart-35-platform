import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, MapPin, ExternalLink, Edit, Trash2, CheckCircle2, AlertTriangle, Eye, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { BezelCard } from '@/components/ui';
import ScheduleSessionEditor from './ScheduleSessionEditor';
import { motion, AnimatePresence } from 'framer-motion';

const ScheduleBuilder = ({
  course,
  schedule,
  onSaveSession,
  onCancelSession,
  onPublishSchedule,
  onDeleteSchedule,
  onInitializeSchedule,
  loading = false
}) => {
  const navigate = useNavigate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // States for initializing schedule
  const [initTitle, setInitTitle] = useState('');
  const [initStartDate, setInitStartDate] = useState('');
  const [initEndDate, setInitEndDate] = useState('');

  // Handle opening editor for new session
  const handleAddSessionClick = () => {
    setSelectedSession(null);
    setIsEdit(false);
    setEditorOpen(true);
  };

  // Handle opening editor for edit
  const handleEditSessionClick = (session) => {
    setSelectedSession(session);
    setIsEdit(true);
    setEditorOpen(true);
  };

  // Helper to calculate session week
  const getSessionWeek = (sessionDateMs, scheduleStartDateMs) => {
    if (!scheduleStartDateMs || !sessionDateMs) return 1;
    const diffTime = sessionDateMs - scheduleStartDateMs;
    if (diffTime < 0) return 1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    try {
      const d = new Date(dateValue);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const handleInitSubmit = (e) => {
    e.preventDefault();
    if (!initTitle.trim() || !initStartDate || !initEndDate) return;

    onInitializeSchedule({
      title: initTitle.trim(),
      startDate: new Date(initStartDate).getTime(),
      endDate: new Date(initEndDate).getTime(),
      location: {
        type: course?.location?.type || 'online',
        address: course?.location?.address || '',
        link: course?.location?.link || ''
      }
    });
  };

  // Group and sort sessions by week
  const getGroupedSessions = () => {
    if (!schedule || !schedule.sessions) return {};
    
    const groups = {};
    schedule.sessions.forEach(session => {
      const week = getSessionWeek(session.date, schedule.startDate);
      if (!groups[week]) groups[week] = [];
      groups[week].push(session);
    });

    // Sort weeks and sessions
    const sortedGroups = {};
    Object.keys(groups)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(week => {
        sortedGroups[week] = groups[week].sort((a, b) => {
          return a.date - b.date || a.startTime.localeCompare(b.startTime);
        });
      });

    return sortedGroups;
  };

  const groupedSessions = getGroupedSessions();
  const nextSessionNumber = schedule?.sessions ? schedule.sessions.length + 1 : 1;

  // Render initialization form if no schedule exists
  if (!schedule) {
    return (
      <BezelCard className="p-8 max-w-xl mx-auto">
        <div className="text-center mb-6">
          <Calendar className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-white tracking-tight">Khởi tạo lịch học</h3>
          <p className="text-xs text-slate-400 mt-1">Khóa học này hiện chưa được cấu hình lịch học chi tiết.</p>
        </div>

        <form onSubmit={handleInitSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Tiêu đề lịch học
            </label>
            <input
              type="text"
              placeholder="VD: Lịch học Lập trình Full-stack K1"
              value={initTitle}
              onChange={(e) => setInitTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                Ngày bắt đầu khóa
              </label>
              <input
                type="date"
                value={initStartDate}
                onChange={(e) => setInitStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                Ngày kết thúc khóa
              </label>
              <input
                type="date"
                value={initEndDate}
                onChange={(e) => setInitEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-550 border-blue-500 text-white rounded-full py-2.5 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo lịch học mới'}
          </Button>
        </form>
      </BezelCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule Info / Stats */}
      <BezelCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none blur-xl" />
        
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-white tracking-tight">{schedule.title}</h3>
            <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              schedule.status === 'published'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {schedule.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Thời gian: {formatDate(schedule.startDate)} → {formatDate(schedule.endDate)} | Quy mô: {schedule.sessions?.length || 0} buổi học
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          {schedule.status === 'draft' && (
            <Button
              onClick={onPublishSchedule}
              className="bg-emerald-600 hover:bg-emerald-550 border-emerald-500 text-white rounded-full px-5 py-2 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              disabled={loading}
            >
              Công bố lịch
            </Button>
          )}

          <Button
            onClick={handleAddSessionClick}
            className="bg-blue-600 hover:bg-blue-550 border-blue-500 text-white rounded-full px-5 py-2 text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all flex items-center gap-1.5"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Thêm buổi học
          </Button>

          <Button
            variant="outline"
            onClick={onDeleteSchedule}
            className="bg-slate-950 border-slate-850 text-rose-400 hover:text-white hover:bg-rose-950/20 rounded-full px-4 py-2 text-xs font-bold transition-all"
            disabled={loading}
          >
            Xóa lịch
          </Button>
        </div>
      </BezelCard>

      {/* Week-by-Week Timeline */}
      <div className="space-y-8">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="p-16 border border-dashed border-slate-850 bg-slate-950/10 rounded-2xl text-center">
            <Calendar className="w-12 h-12 text-slate-650 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-slate-400 font-semibold">Lịch học trống</p>
            <p className="text-xs text-slate-500 mt-1">Hãy click vào nút "Thêm buổi học" phía trên để xây dựng chương trình học.</p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([week, sessions]) => (
            <div key={week} className="space-y-4">
              {/* Week Title */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold font-mono text-blue-450 uppercase tracking-wider">Tuần {week}</span>
                <div className="h-px bg-slate-800/80 flex-1" />
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((sess) => (
                  <motion.div
                    key={sess.sessionNumber}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative"
                  >
                    <BezelCard
                      outerClassName={`h-full hover:scale-[1.01] transition-all duration-300 ${
                        sess.status === 'cancelled' ? 'border-rose-950/45 opacity-60' : 'hover:border-blue-500/20'
                      }`}
                      innerClassName="p-4 flex flex-col justify-between h-full bg-slate-950/30"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <Badge className="bg-slate-900 border border-slate-800 text-slate-350 text-[9px] font-bold font-mono px-2 py-0.5 rounded-md">
                            BUỔI {sess.sessionNumber}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            sess.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : sess.status === 'cancelled'
                              ? 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {sess.status === 'completed' ? 'Đã hoàn thành' :
                             sess.status === 'cancelled' ? 'Đã hủy' : 'Sắp diễn ra'}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-white truncate">{sess.title}</h4>
                        {sess.topic && (
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{sess.topic}</p>
                        )}
                      </div>

                      {/* Meta Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-900/60 space-y-2 text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{formatDate(sess.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{sess.startTime} - {sess.endTime} ({sess.duration}m)</span>
                        </div>
                        
                        {sess.location?.type === 'offline' && sess.location.address && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">{sess.location.address}</span>
                          </div>
                        )}
                        
                        {sess.location?.type !== 'offline' && sess.location?.link && (
                          <a
                            href={sess.location.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-450 hover:underline hover:text-blue-400 cursor-pointer font-bold truncate"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sess.location.link}</span>
                          </a>
                        )}
                      </div>

                      {/* Actions Over Row */}
                      {sess.status !== 'cancelled' && (
                        <div className="flex items-center gap-1.5 mt-4 justify-end">
                          <button
                            onClick={() => navigate(`/admin/courses/${schedule.courseId}/schedule/session/${sess.sessionNumber}/attendance`)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[#3B82F6] hover:bg-[#3B82F6]/10 hover:border-[#3B82F6]/30 flex items-center justify-center transition-all cursor-pointer"
                            title="Ghi điểm danh"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleEditSessionClick(sess)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => onCancelSession(sess.sessionNumber)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-450 hover:text-rose-350 hover:border-rose-500/30 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </BezelCard>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Drawer */}
      <AnimatePresence>
        {editorOpen && (
          <ScheduleSessionEditor
            session={selectedSession}
            isEdit={isEdit}
            nextSessionNumber={nextSessionNumber}
            onClose={() => setEditorOpen(false)}
            onSave={(payload) => {
              onSaveSession(payload, isEdit);
              setEditorOpen(false);
            }}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleBuilder;
