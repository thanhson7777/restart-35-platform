import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, MapPin, ExternalLink, Edit, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { BezelCard } from '@/components/ui';
import ScheduleSessionEditor from './ScheduleSessionEditor';
import { motion, AnimatePresence } from 'framer-motion';

const ScheduleBuilder = ({ course, schedule, onSaveSession, onCancelSession, onPublishSchedule, onDeleteSchedule, onInitializeSchedule, loading = false }) => {
  const navigate = useNavigate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [initTitle, setInitTitle] = useState('');
  const [initStartDate, setInitStartDate] = useState('');
  const [initEndDate, setInitEndDate] = useState('');

  const handleAddSessionClick = () => { setSelectedSession(null); setIsEdit(false); setEditorOpen(true); };
  const handleEditSessionClick = (session) => { setSelectedSession(session); setIsEdit(true); setEditorOpen(true); };

  const getSessionWeek = (sessionDateMs, scheduleStartDateMs) => {
    if (!scheduleStartDateMs || !sessionDateMs) return 1;
    const diffDays = Math.floor((sessionDateMs - scheduleStartDateMs) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    try {
      return new Date(dateValue).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return ''; }
  };

  const handleInitSubmit = (e) => {
    e.preventDefault();
    if (!initTitle.trim() || !initStartDate || !initEndDate) return;
    onInitializeSchedule({ title: initTitle.trim(), startDate: new Date(initStartDate).getTime(), endDate: new Date(initEndDate).getTime(), location: { type: course?.location?.type || 'online', address: course?.location?.address || '', link: course?.location?.link || '' } });
  };

  const getGroupedSessions = () => {
    if (!schedule || !schedule.sessions) return {};
    const groups = {};
    schedule.sessions.forEach(session => {
      const week = getSessionWeek(session.date, schedule.startDate);
      if (!groups[week]) groups[week] = [];
      groups[week].push(session);
    });
    const sortedGroups = {};
    Object.keys(groups).sort((a, b) => Number(a) - Number(b)).forEach(week => {
      sortedGroups[week] = groups[week].sort((a, b) => a.date - b.date || a.startTime.localeCompare(b.startTime));
    });
    return sortedGroups;
  };

  const groupedSessions = getGroupedSessions();
  const nextSessionNumber = schedule?.sessions ? schedule.sessions.length + 1 : 1;

  if (!schedule) {
    return (
      <BezelCard className="p-8 max-w-xl mx-auto">
        <div className="text-center mb-6">
          <Calendar className="w-12 h-12 text-[hsl(var(--admin-accent))] mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">Khởi tạo lịch học</h3>
          <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Khóa học này hiện chưa được cấu hình lịch học chi tiết.</p>
        </div>
        <form onSubmit={handleInitSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Tiêu đề lịch học</label>
            <input type="text" placeholder="VD: Lịch học Lập trình Full-stack K1" value={initTitle}
              onChange={(e) => setInitTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/30 focus:border-[hsl(var(--admin-accent))]/50"
              required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày bắt đầu khóa</label>
              <input type="date" value={initStartDate} onChange={(e) => setInitStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/30" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[hsl(var(--admin-text-muted))] uppercase tracking-wider">Ngày kết thúc khóa</label>
              <input type="date" value={initEndDate} onChange={(e) => setInitEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/30" required />
            </div>
          </div>
          <Button type="submit" className="w-full mt-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white rounded-full py-2.5" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo lịch học mới'}
          </Button>
        </form>
      </BezelCard>
    );
  }

  return (
    <div className="space-y-6">
      <BezelCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${schedule.status === 'published' ? 'from-[hsl(var(--admin-success))]/10' : 'from-[hsl(var(--admin-accent))]/10'} to-transparent rounded-bl-full pointer-events-none opacity-70`} />
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[hsl(var(--admin-text-primary))] tracking-tight">{schedule.title}</h3>
            <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${schedule.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              {schedule.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
            </Badge>
          </div>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">Thời gian: {formatDate(schedule.startDate)} → {formatDate(schedule.endDate)} | Quy mô: {schedule.sessions?.length || 0} buổi học</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          {schedule.status === 'draft' && (
            <Button onClick={onPublishSchedule} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2 text-xs font-bold" disabled={loading}>Công bố lịch</Button>
          )}
          <Button onClick={handleAddSessionClick} className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white rounded-full px-5 py-2 text-xs font-bold flex items-center gap-1.5" disabled={loading}>
            <Plus className="w-4 h-4" /> Thêm buổi học
          </Button>
          <Button variant="outline" onClick={onDeleteSchedule} className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-rose-500 hover:bg-rose-500/10 rounded-full px-4 py-2 text-xs font-bold" disabled={loading}>Xóa lịch</Button>
        </div>
      </BezelCard>

      <div className="space-y-8">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="p-16 border border-dashed border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/50 rounded-2xl text-center">
            <Calendar className="w-12 h-12 text-[hsl(var(--admin-text-muted))] mx-auto mb-3 opacity-60" />
            <p className="text-sm text-[hsl(var(--admin-text-muted))] font-semibold">Lịch học trống</p>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Hãy click vào nút "Thêm buổi học" phía trên để xây dựng chương trình học.</p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([week, sessions]) => (
            <div key={week} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-[hsl(var(--admin-accent))] uppercase tracking-wider">Tuần {week}</span>
                <div className="h-px bg-[hsl(var(--admin-border))] flex-1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((sess) => (
                  <motion.div key={sess.sessionNumber} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="relative">
                    <BezelCard outerClassName={`h-full hover:border-[hsl(var(--admin-accent))]/30 transition-all duration-300 ${sess.status === 'cancelled' ? 'opacity-60' : ''}`} innerClassName="p-4 flex flex-col justify-between h-full">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge className="bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] text-[9px] font-bold px-2 py-0.5 rounded-md">BUỔI {sess.sessionNumber}</Badge>
                        <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${sess.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : sess.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-[hsl(var(--admin-accent))]/10 text-[hsl(var(--admin-accent))] border-[hsl(var(--admin-accent))]/20'}`}>
                          {sess.status === 'completed' ? 'Đã hoàn thành' : sess.status === 'cancelled' ? 'Đã hủy' : 'Sắp diễn ra'}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-[hsl(var(--admin-text-primary))] truncate">{sess.title}</h4>
                        {sess.topic && <p className="text-xs text-[hsl(var(--admin-text-muted))] line-clamp-2 mt-1">{sess.topic}</p>}
                      </div>
                      <div className="mt-4 pt-3 border-t border-[hsl(var(--admin-border))] space-y-2 text-[10px] text-[hsl(var(--admin-text-muted))]">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[hsl(var(--admin-accent))] shrink-0" /><span>{formatDate(sess.date)}</span></div>
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[hsl(var(--admin-accent))] shrink-0" /><span>{sess.startTime} - {sess.endTime} ({sess.duration}m)</span></div>
                        {sess.location?.type === 'offline' && sess.location?.address && <div className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /><span className="truncate">{sess.location.address}</span></div>}
                        {sess.location?.type !== 'offline' && sess.location?.link && <a href={sess.location.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[hsl(var(--admin-accent))] hover:underline truncate"><ExternalLink className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{sess.location.link}</span></a>}
                      </div>
                      {sess.status !== 'cancelled' && (
                        <div className="flex items-center gap-1.5 mt-4 justify-end">
                          <button onClick={() => navigate(`/admin/courses/${schedule.courseId}/schedule/session/${sess.sessionNumber}/attendance`)}
                            className="p-1.5 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))]/10 hover:border-[hsl(var(--admin-accent))]/30 transition-all" title="Ghi điểm danh">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleEditSessionClick(sess)} className="p-1.5 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:border-[hsl(var(--admin-border-strong))] transition-all">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onCancelSession(sess.sessionNumber)} className="p-1.5 rounded-lg bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all">
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

      <AnimatePresence>
        {editorOpen && (
          <ScheduleSessionEditor session={selectedSession} isEdit={isEdit} nextSessionNumber={nextSessionNumber}
            onClose={() => setEditorOpen(false)} onSave={(payload) => { onSaveSession(payload, isEdit); setEditorOpen(false); }} loading={loading} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleBuilder;
