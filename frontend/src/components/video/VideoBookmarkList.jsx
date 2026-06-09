import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { Bookmark, Clock, Trash2, Plus, BookmarkCheck } from 'lucide-react';
import { toggleVideoBookmark, getVideoBookmarks } from '@/apis/courseApi';
import toast from 'react-hot-toast';

// Helper to format seconds (e.g. 150 -> "02:30")
const formatTimestamp = (secs) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const VideoBookmarkList = ({ lessonId, enrollmentId, currentTime = 0, onSeek }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await getVideoBookmarks(lessonId);
      const list = Array.isArray(res.data) ? res.data
        : Array.isArray(res?.data?.data) ? res.data.data
        : [];
      setBookmarks(list);
      localStorage.setItem(`bookmarks_${lessonId}`, JSON.stringify(list));
    } catch (err) {
      console.warn('API bookmarks failed, reading from localStorage:', err);
      const local = localStorage.getItem(`bookmarks_${lessonId}`);
      setBookmarks(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) {
      fetchBookmarks();
    }
  }, [lessonId]);

  const handleAddBookmark = async () => {
    if (!enrollmentId) {
      toast.error('Không xác định được khóa học. Vui lòng thử lại.');
      return;
    }

    const timestampSec = Math.floor(currentTime);

    // Check duplicate by timestamp
    if (bookmarks.some((b) => b.timestamp === timestampSec)) {
      toast.error('Mốc thời gian này đã được đánh dấu.');
      return;
    }

    const title = prompt('Nhập tên gợi nhớ mốc đánh dấu này:', `Ghim tại ${formatTimestamp(timestampSec)}`);
    if (title === null) return;
    const finalTitle = title.trim() || `Ghim tại ${formatTimestamp(timestampSec)}`;

    const tempId = `bmark_${Date.now()}`;
    const optimisticBookmark = {
      _id: tempId,
      lessonId,
      enrollmentId,
      timestamp: timestampSec,
      title: finalTitle,
      createdAt: new Date().toISOString(),
    };

    try {
      await toggleVideoBookmark(lessonId, {
        enrollmentId,
        title: finalTitle,
        bookmarked: true,
      });
      // Refresh from server to get real ID
      await fetchBookmarks();
      toast.success('Đã ghim mốc bài học!');
    } catch (err) {
      console.warn('API bookmark failed, updating localStorage:', err);
      const updated = [...bookmarks, optimisticBookmark].sort((a, b) => a.timestamp - b.timestamp);
      localStorage.setItem(`bookmarks_${lessonId}`, JSON.stringify(updated));
      setBookmarks(updated);
      toast.success('Đã ghim mốc bài học (Offline)!');
    }
  };

  const handleDeleteBookmark = async (bookmarkId, timestampSec) => {
    if (!enrollmentId) {
      toast.error('Không xác định được khóa học.');
      return;
    }
    try {
      await toggleVideoBookmark(lessonId, {
        enrollmentId,
        bookmarked: false,
      });
      // Refresh from server
      await fetchBookmarks();
      toast.success('Đã gỡ ghim.');
    } catch (err) {
      console.warn('API remove bookmark failed, updating localStorage:', err);
      const updated = bookmarks.filter((b) => b._id !== bookmarkId);
      localStorage.setItem(`bookmarks_${lessonId}`, JSON.stringify(updated));
      setBookmarks(updated);
      toast.success('Đã gỡ ghim.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Button */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          Đánh dấu mốc bài học
        </label>
        <Button
          size="sm"
          onClick={handleAddBookmark}
          className="text-xs font-bold rounded-xl gap-1.5 h-8 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800"
        >
          <Bookmark className="w-3.5 h-3.5" />
          Ghim tại {formatTimestamp(currentTime)}
        </Button>
      </div>

      {/* Bookmarks List */}
      <div className="space-y-2 pt-4 border-t border-zinc-800/60">
        <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-zinc-400">
          <BookmarkCheck className="w-3.5 h-3.5 text-zinc-550" />
          Mốc ghim đã lưu ({bookmarks.length})
        </span>

        {bookmarks.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-2 text-center">Chưa có ghim đánh dấu nào.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {bookmarks.map((bmark) => (
              <div
                key={bmark._id}
                className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <button
                    onClick={() => onSeek && onSeek(bmark.timestamp)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/10 text-primary font-mono text-[10px] font-bold hover:bg-primary/20 transition-all shrink-0"
                  >
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(bmark.timestamp)}
                  </button>
                  <p className="text-zinc-200 font-semibold truncate mt-1">
                    {bmark.title}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteBookmark(bmark._id, bmark.timestamp)}
                  className="p-1 rounded bg-zinc-850 text-zinc-450 hover:text-rose-500 hover:bg-zinc-800 transition-colors shrink-0"
                  title="Xóa ghim"
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
