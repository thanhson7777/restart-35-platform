import React, { useState, useEffect } from 'react';
import { Button, Textarea } from '@/components/ui';
import { BookMarked, Play, Trash2, Clock, Plus } from 'lucide-react';
import { createVideoNote, getVideoNotesByLesson, deleteVideoNote } from '@/apis/courseApi';
import toast from 'react-hot-toast';

// Helper to format seconds (e.g. 75 -> "01:15")
const formatTimestamp = (secs) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const VideoNoteEditor = ({ lessonId, currentTime = 0, onSeek }) => {
  const [noteContent, setNoteContent] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch notes for the current lesson
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await getVideoNotesByLesson(lessonId);
      setNotes(Array.isArray(res.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      console.warn('API notes failed, reading from localStorage:', err);
      const local = localStorage.getItem(`notes_${lessonId}`);
      setNotes(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) {
      fetchNotes();
    }
  }, [lessonId]);

  const handleSubmitNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Vui lòng nhập nội dung ghi chú.');
      return;
    }

    setSubmitting(true);
    const newNote = {
      lessonId,
      timestamp: Math.floor(currentTime),
      content: noteContent.trim(),
    };

    try {
      const res = await createVideoNote(newNote);
      toast.success('Đã lưu ghi chú thành công!');
      setNoteContent('');
      fetchNotes();
    } catch (err) {
      console.warn('API save note failed, saving to localStorage:', err);
      // LocalStorage fallback
      const currentLocal = localStorage.getItem(`notes_${lessonId}`);
      const list = currentLocal ? JSON.parse(currentLocal) : [];
      const mockIdNote = {
        _id: `note_mock_${Date.now()}`,
        ...newNote,
        createdAt: new Date().toISOString()
      };
      const updatedList = [...list, mockIdNote].sort((a, b) => a.timestamp - b.timestamp);
      localStorage.setItem(`notes_${lessonId}`, JSON.stringify(updatedList));
      setNotes(updatedList);
      setNoteContent('');
      toast.success('Đã lưu ghi chú thành công (Offline)!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteVideoNote(noteId);
      toast.success('Đã xóa ghi chú.');
      fetchNotes();
    } catch (err) {
      console.warn('API delete note failed, deleting from localStorage:', err);
      const currentLocal = localStorage.getItem(`notes_${lessonId}`);
      if (currentLocal) {
        const list = JSON.parse(currentLocal);
        const filteredList = list.filter((n) => n._id !== noteId);
        localStorage.setItem(`notes_${lessonId}`, JSON.stringify(filteredList));
        setNotes(filteredList);
      }
      toast.success('Đã xóa ghi chú.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Editor Box */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Tạo ghi chú nhanh tại: <span className="font-mono text-primary font-bold">{formatTimestamp(currentTime)}</span>
          </label>
        </div>
        
        <div className="flex flex-col gap-2">
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú bài học..."
            rows={2}
            className="text-xs bg-zinc-900 border border-zinc-800 text-white rounded-xl focus:ring-primary/20 placeholder-zinc-650"
          />
          <Button
            size="sm"
            onClick={handleSubmitNote}
            disabled={submitting}
            className="text-xs font-bold rounded-xl gap-1 py-3 self-end"
          >
            <Plus className="w-3.5 h-3.5" />
            Lưu ghi chú tại {formatTimestamp(currentTime)}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-2 pt-4 border-t border-zinc-800/60">
        <div className="flex justify-between items-center text-xs text-zinc-400">
          <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <BookMarked className="w-3.5 h-3.5 text-zinc-550" />
            Ghi chú bài học ({notes.length})
          </span>
        </div>

        {notes.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-2 text-center">Chưa có ghi chú nào cho bài học này.</p>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {notes.map((note) => (
              <div 
                key={note._id}
                className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <button
                    onClick={() => onSeek && onSeek(note.timestamp)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/10 text-primary font-mono text-[10.5px] font-bold hover:bg-primary/25 transition-all shrink-0"
                  >
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(note.timestamp)}
                  </button>
                  <p className="text-zinc-300 leading-relaxed break-words mt-1 pr-2">
                    {note.content}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteNote(note._id)}
                  className="p-1 rounded bg-zinc-850 text-zinc-450 hover:text-rose-500 hover:bg-zinc-800 transition-colors shrink-0"
                  title="Xóa ghi chú"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
