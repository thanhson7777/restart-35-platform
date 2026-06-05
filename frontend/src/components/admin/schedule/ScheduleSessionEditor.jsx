import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Link as LinkIcon, BookOpen, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { motion } from 'framer-motion';

const LOCATION_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid'
};

const ScheduleSessionEditor = ({
  session,
  isEdit = false,
  nextSessionNumber = 1,
  onClose,
  onSave,
  loading = false
}) => {
  // Form states
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [locationType, setLocationType] = useState(LOCATION_TYPES.ONLINE);
  const [address, setAddress] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Load session data if editing
  useEffect(() => {
    if (isEdit && session) {
      setTitle(session.title || '');
      setTopic(session.topic || '');
      
      // Format date timestamp to YYYY-MM-DD
      if (session.date) {
        try {
          const d = new Date(session.date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setDate(`${yyyy}-${mm}-${dd}`);
        } catch (e) {
          setDate('');
        }
      } else {
        setDate('');
      }

      setStartTime(session.startTime || '09:00');
      setEndTime(session.endTime || '12:00');
      setLocationType(session.location?.type || LOCATION_TYPES.ONLINE);
      setAddress(session.location?.address || '');
      setLink(session.location?.link || '');
      setNotes(session.notes || '');
    } else {
      // Set defaults for new session
      setTitle('');
      setTopic('');
      
      // Default date to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      
      setStartTime('09:00');
      setEndTime('12:00');
      setLocationType(LOCATION_TYPES.ONLINE);
      setAddress('');
      setLink('');
      setNotes('');
    }
    setError('');
  }, [session, isEdit, nextSessionNumber]);

  // Handle save
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề buổi học.');
      return;
    }
    if (!date) {
      setError('Vui lòng chọn ngày học.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      return;
    }

    // Convert date string (local timezone) to timestamp in ms
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone shifts
    const dateTimestamp = dateObj.getTime();

    // Calculate duration in minutes
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const durationMin = (endH * 60 + endM) - (startH * 60 + startM);

    if (durationMin <= 0) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    const payload = {
      sessionNumber: isEdit && session ? session.sessionNumber : nextSessionNumber,
      title: title.trim(),
      topic: topic.trim(),
      date: dateTimestamp,
      startTime,
      endTime,
      duration: durationMin,
      notes: notes.trim(),
      location: {
        type: locationType,
        address: locationType !== LOCATION_TYPES.ONLINE ? address.trim() : null,
        link: locationType !== LOCATION_TYPES.OFFLINE ? link.trim() : null
      }
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-lg bg-[#0b0f19] border-l border-slate-850 h-screen shadow-2xl flex flex-col z-10 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">
              {isEdit ? `Chỉnh sửa Buổi ${session?.sessionNumber}` : `Thêm Buổi ${nextSessionNumber}`}
            </h2>
            <p className="text-xs text-slate-450 mt-0.5">Nhập các chi tiết, nội dung giảng dạy và địa điểm học tập</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-950 border border-slate-850 rounded-full text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Tiêu đề buổi học *
            </label>
            <Input
              type="text"
              placeholder="VD: Khai giảng & Nhập môn"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 rounded-xl h-10 w-full"
              required
            />
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Chủ đề cốt lõi / Đề cương sơ lược
            </label>
            <textarea
              placeholder="Nhập nội dung chính của buổi học này..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full min-h-[80px] p-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 resize-y"
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" /> Ngày học *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 rounded-xl h-10 w-full"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" /> Bắt đầu
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 rounded-xl h-10 w-full"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" /> Kết thúc
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 rounded-xl h-10 w-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Type */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Hình thức học tập
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LOCATION_TYPES).map(([key, value]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setLocationType(value)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    locationType === value
                      ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {value === LOCATION_TYPES.ONLINE ? 'Online' :
                   value === LOCATION_TYPES.OFFLINE ? 'Offline' : 'Hybrid'}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Location Fields */}
          {locationType !== LOCATION_TYPES.ONLINE && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-400" /> Địa chỉ lớp học / Phòng học *
              </label>
              <Input
                type="text"
                placeholder="VD: Phòng chuyên đề A3, Tầng 3, Lab 1"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 rounded-xl h-10 w-full"
                required={locationType !== LOCATION_TYPES.ONLINE}
              />
            </div>
          )}

          {locationType !== LOCATION_TYPES.OFFLINE && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LinkIcon className="w-3 h-3 text-emerald-400" /> Link meeting online (Google Meet, Zoom...)
              </label>
              <Input
                type="url"
                placeholder="VD: https://meet.google.com/abc-xyz-123"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 rounded-xl h-10 w-full"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Lưu ý đặc biệt dành cho học viên
            </label>
            <textarea
              placeholder="VD: Chuẩn bị laptop và cài sẵn Python..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] p-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 resize-y"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-slate-850 bg-slate-950/20 flex gap-3 justify-end">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="bg-slate-950 border-slate-850 text-slate-400 hover:text-white rounded-full px-5 py-2 hover:bg-slate-900"
            disabled={loading}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-550 border-blue-500 text-white rounded-full px-6 py-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu buổi học'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ScheduleSessionEditor;
