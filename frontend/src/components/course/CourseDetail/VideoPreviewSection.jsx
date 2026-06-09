import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, SafeImage } from '@/components/ui';
import { Play, X, Lock, PlayCircle, Clock } from 'lucide-react';
import { getPreviewLessons } from '@/apis/courseApi';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to format seconds (e.g. 350 -> "05:50")
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const VideoPreviewSection = ({ courseId }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  // Fetch preview lessons on load
  useEffect(() => {
    const fetchPreviews = async () => {
      setLoading(true);
      try {
        const res = await getPreviewLessons(courseId);
        const list = Array.isArray(res.data) 
          ? res.data 
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
        
        if (list.length > 0) {
          setLessons(list);
        } else {
          // Fallback mockup preview data for demonstrations
          setLessons(MOCK_PREVIEWS);
        }
      } catch (err) {
        console.warn('API error, falling back to mock previews:', err);
        setLessons(MOCK_PREVIEWS);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviews();
  }, [courseId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="space-y-3">
            <div className="aspect-video w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro info panel */}
      <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 dark:bg-emerald-950/5 dark:border-emerald-900/10">
        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
          <PlayCircle className="w-4 h-4 stroke-[2]" />
          Học thử miễn phí
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Bạn có thể xem trước một số bài học giới thiệu dưới đây mà không cần ghi danh để tìm hiểu phương pháp giảng dạy và nội dung thực tế của khóa học.
        </p>
      </div>

      {/* Preview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map((lesson, idx) => (
          // Double-Bezel nested hardware shell
          <motion.div
            key={lesson._id || lesson.id || idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="group p-1.5 rounded-[20px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/85 transition-all duration-300 hover:scale-[1.01]"
          >
            <Card 
              className="rounded-[14px] bg-white dark:bg-zinc-950 overflow-hidden border border-zinc-100 dark:border-zinc-900 shadow-sm cursor-pointer flex flex-col h-full"
              onClick={() => setActiveVideo(lesson)}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                <SafeImage
                  src={lesson.thumbnail || `https://picsum.photos/seed/lesson-${idx}/400/225`}
                  alt={lesson.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-white/95 text-zinc-900 flex items-center justify-center shadow-md scale-95 group-hover:scale-100 transition-all duration-300 ease-out">
                    <Play className="w-4 h-4 fill-current ml-0.5" strokeWidth={2} />
                  </div>
                </div>

                {/* Duration Badge */}
                {lesson.duration > 0 && (
                  <span className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-sm">
                    {formatTime(lesson.duration)}
                  </span>
                )}

                {/* Unlock badge */}
                <span className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                  Mở khóa học thử
                </span>
              </div>

              {/* Title Info */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                  Bài học {lesson.lessonNumber || idx + 1}
                </span>
                <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug group-hover:text-primary transition-colors flex-1">
                  {lesson.title}
                </h5>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Thời lượng: {formatTime(lesson.duration)}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Video Preview Popup Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
            onClick={() => setActiveVideo(null)}
          >
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="relative w-full max-w-3xl rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Title */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 text-white">
                <div className="min-w-0 pr-6">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-0.5">
                    Đang phát bài học thử
                  </span>
                  <h4 className="text-sm font-bold truncate">
                    {activeVideo.title}
                  </h4>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video bg-black">
                <video
                  src={activeVideo.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={activeVideo.thumbnail ? encodeURI(activeVideo.thumbnail) : 'https://picsum.photos/seed/video-poster/800/450'}
                />
              </div>

              {/* Footer CTA */}
              <div className="px-5 py-4 bg-zinc-950 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                <p className="text-xs text-zinc-450 leading-snug max-w-md text-center sm:text-left">
                  Yêu thích nội dung bài giảng? Hãy đăng ký khóa học để mở khóa toàn bộ lộ trình học tập, tài liệu đi kèm và được chấm điểm bài tập trực tiếp.
                </p>
                <Button 
                  onClick={() => {
                    setActiveVideo(null);
                    // Scroll to sidebar / trigger register
                    const element = document.getElementById('enrollment-section');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap"
                >
                  Đăng ký khóa học ngay
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mock preview data for fallback
const MOCK_PREVIEWS = [
  {
    _id: 'prev-1',
    lessonNumber: 1,
    title: 'Giới thiệu tổng quan lộ trình & Phương pháp học tập cho người 35+',
    duration: 345, // 5:45
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://picsum.photos/seed/lesson-1/640/360',
  },
  {
    _id: 'prev-2',
    lessonNumber: 2,
    title: 'Xây dựng tư duy nghề nghiệp & Chuẩn bị công cụ chuyển đổi số',
    duration: 512, // 8:32
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://picsum.photos/seed/lesson-2/640/360',
  },
  {
    _id: 'prev-3',
    lessonNumber: 3,
    title: 'Bài thực hành số 1: Hướng dẫn cài đặt và thao tác môi trường cơ sở',
    duration: 418, // 6:58
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://picsum.photos/seed/lesson-3/640/360',
  },
];
