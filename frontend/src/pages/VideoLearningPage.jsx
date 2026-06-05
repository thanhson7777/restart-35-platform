import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from '@/components/ui';
import { getEnrollmentById, getCourseLessons, recordVideoProgress, markLessonComplete } from '@/apis/courseApi';
import { VideoLessonSidebar } from '@/components/video/VideoLessonSidebar';
import { VideoNoteEditor } from '@/components/video/VideoNoteEditor';
import { VideoBookmarkList } from '@/components/video/VideoBookmarkList';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Clock, Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VideoLearningPage() {
  const { id } = useParams(); // Enrollment ID
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [enrollment, setEnrollment] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Fetch enrollment detail and course lessons
  useEffect(() => {
    const fetchLearningData = async () => {
      setLoading(true);
      try {
        const enrollRes = await getEnrollmentById(id);
        const enrollData = enrollRes.data || enrollRes;
        setEnrollment(enrollData);

        const courseId = enrollData.courseId || enrollData.course?._id;
        if (courseId) {
          const lessonsRes = await getCourseLessons(courseId);
          const list = Array.isArray(lessonsRes.data)
            ? lessonsRes.data
            : Array.isArray(lessonsRes?.data?.data)
            ? lessonsRes.data.data
            : [];
          
          if (list.length > 0) {
            setLessons(list);
            // Default current lesson to first incomplete lesson, or first lesson overall
            const firstIncomplete = list.find((l) => !l.completed);
            setCurrentLesson(firstIncomplete || list[0]);
          } else {
            // Fallback mock lessons for demo
            setLessons(MOCK_LESSONS);
            setCurrentLesson(MOCK_LESSONS[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching learning workspace data:', err);
        toast.error('Không thể tải không gian học tập.');
        // Fallback mock enrollment
        setEnrollment(MOCK_ENROLLMENT);
        setLessons(MOCK_LESSONS);
        setCurrentLesson(MOCK_LESSONS[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningData();
  }, [id]);

  // Throttled API progress sync (Send progress every 20 seconds while playing)
  useEffect(() => {
    if (!isPlaying || !currentLesson) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const seconds = Math.floor(videoRef.current.currentTime);
        recordVideoProgress(currentLesson._id, { watchedSeconds: seconds })
          .catch((err) => console.warn('Progress recording failed:', err));
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isPlaying, currentLesson]);

  // Video timeupdate handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Video metadata loaded handler
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  // Playback speed selector
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Mute / Unmute selector
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Timeline seek selector
  const handleTimelineChange = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Full screen selector
  const toggleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  // Seek time handler (called from note editor or bookmarks)
  const handleSeek = (seconds) => {
    setCurrentTime(seconds);
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
    toast.success(`Đã nhảy tới phút ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is writing in inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          }
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullScreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration]);

  // Video ended handler -> auto complete and play next lesson
  const handleVideoEnded = async () => {
    setIsPlaying(false);
    if (!currentLesson) return;

    try {
      await markLessonComplete(currentLesson._id);
      
      // Update completion mark inside lessons list
      const updatedLessons = lessons.map((l) =>
        l._id === currentLesson._id ? { ...l, completed: true } : l
      );
      setLessons(updatedLessons);

      // Trigger recalculation of progress percentage in parent layout
      const completedCount = updatedLessons.filter((l) => l.completed).length;
      const newPct = Math.round((completedCount / updatedLessons.length) * 100);
      setEnrollment((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          percentage: newPct,
          completedLessons: completedCount,
        },
      }));

      toast.success('Chúc mừng! Bạn đã hoàn thành bài học này 🎉');

      // Find next lesson
      const currentIndex = lessons.findIndex((l) => l._id === currentLesson._id);
      if (currentIndex !== -1 && currentIndex + 1 < lessons.length) {
        setCurrentLesson(lessons[currentIndex + 1]);
        // Delay playing slightly to allow src transition
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true));
          }
        }, 300);
      }
    } catch (err) {
      console.warn('Failed marking lesson complete:', err);
    }
  };

  // Nav lessons
  const handlePrevLesson = () => {
    const currentIndex = lessons.findIndex((l) => l._id === currentLesson?._id);
    if (currentIndex > 0) {
      setCurrentLesson(lessons[currentIndex - 1]);
      setIsPlaying(false);
    }
  };

  const handleNextLesson = () => {
    const currentIndex = lessons.findIndex((l) => l._id === currentLesson?._id);
    if (currentIndex !== -1 && currentIndex + 1 < lessons.length) {
      setCurrentLesson(lessons[currentIndex + 1]);
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <div className="space-y-4 w-96 max-w-sm px-4">
          <Skeleton className="h-4 w-1/2 bg-zinc-800" />
          <Skeleton className="h-10 w-full bg-zinc-800" />
          <Skeleton className="h-56 w-full bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const isFirstLesson = lessons.findIndex((l) => l._id === currentLesson?._id) === 0;
  const isLastLesson = lessons.findIndex((l) => l._id === currentLesson?._id) === lessons.length - 1;

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col md:flex-row overflow-hidden text-white">
      
      {/* LEFT AREA: Video Workspace Player & Tools Tabs */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Workspace Navbar Header */}
        <header className="px-5 py-4 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0 pr-4">
            <button 
              onClick={() => navigate(`/my-enrollments/${id}`)}
              className="p-2 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              title="Quay lại chi tiết khóa học"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
                Không gian học tập chuyên sâu
              </span>
              <h2 className="text-sm font-bold truncate text-white">
                {enrollment?.course?.title || 'Khóa học của tôi'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => navigate('/my-enrollments')}
            className="p-2 rounded-full hover:bg-zinc-900 text-zinc-450 hover:text-white transition-colors shrink-0"
            title="Đóng lớp học"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Video Player Box */}
        <div className="bg-black aspect-video md:flex-1 md:aspect-auto max-h-[60vh] md:max-h-none relative overflow-hidden flex items-center justify-center group/player">
          {currentLesson ? (
            <video
              ref={videoRef}
              src={currentLesson.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain"
              poster={currentLesson.thumbnail || 'https://picsum.photos/seed/poster/800/450'}
              onClick={togglePlay}
            />
          ) : (
            <div className="text-zinc-550 text-xs">Không tìm thấy bài học khả dụng.</div>
          )}

          {/* Interactive Custom Overlay Controllers */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 space-y-3 z-10">
            {/* Custom Range Timeline Slider */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleTimelineChange}
                className="flex-1 h-1 rounded bg-white/20 accent-primary cursor-pointer focus:outline-none"
              />
              <span className="text-[10.5px] font-mono text-zinc-300 select-none">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Play/Pause toggle */}
                <button onClick={togglePlay} className="text-white hover:text-primary transition-colors focus:outline-none">
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Mute/Volume toggler */}
                <button onClick={toggleMute} className="text-white hover:text-primary transition-colors focus:outline-none">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Speed selector */}
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-lg border border-white/5 text-[10px] font-bold">
                  <span className="text-zinc-400 font-semibold select-none">Tốc độ:</span>
                  {[1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-1.5 py-0.5 rounded transition-all ${
                        playbackSpeed === s ? 'bg-primary text-zinc-950' : 'hover:bg-white/15'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Full screen toggle */}
                <button onClick={toggleFullScreen} className="text-white hover:text-primary transition-colors focus:outline-none">
                  <Maximize className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Workspace controls and utilities */}
        <div className="bg-zinc-900 border-t border-zinc-800/60 p-4 shrink-0 flex items-center justify-between gap-4 text-xs font-semibold select-none">
          <Button
            variant="ghost"
            onClick={handlePrevLesson}
            disabled={isFirstLesson}
            className="text-white hover:bg-zinc-800/50 rounded-xl px-4 py-2 hover:text-white"
          >
            ← Bài học trước
          </Button>

          {currentLesson && (
            <span className="text-zinc-450 font-bold">
              Bài học {lessons.indexOf(currentLesson) + 1} / {lessons.length}
            </span>
          )}

          <Button
            variant="ghost"
            onClick={handleNextLesson}
            disabled={isLastLesson}
            className="text-white hover:bg-zinc-800/50 rounded-xl px-4 py-2 hover:text-white"
          >
            Bài học tiếp theo →
          </Button>
        </div>

        {/* Notes & Bookmarks Workspace utilities panel */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 z-10 scrollbar-thin">
          {currentLesson ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left pane details */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Đang phát bài giảng</span>
                  <h3 className="text-base font-extrabold text-white leading-tight">
                    Bài {lessons.indexOf(currentLesson) + 1}: {currentLesson.title}
                  </h3>
                </div>
                
                {currentLesson.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal whitespace-pre-line bg-zinc-900/35 border border-zinc-900 p-4 rounded-2xl">
                    {currentLesson.description}
                  </p>
                )}
              </div>

              {/* Right tabs tools */}
              <div>
                <Tabs defaultValue="notes" className="space-y-4">
                  <TabsList className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-850">
                    <TabsTrigger value="notes" className="flex-1 rounded-lg text-xs font-bold py-2">
                      📝 Viết ghi chú
                    </TabsTrigger>
                    <TabsTrigger value="bookmarks" className="flex-1 rounded-lg text-xs font-bold py-2">
                      🔖 Ghim bài học
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="notes" className="focus:outline-none">
                    <VideoNoteEditor
                      lessonId={currentLesson._id || currentLesson.id}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                    />
                  </TabsContent>

                  <TabsContent value="bookmarks" className="focus:outline-none">
                    <VideoBookmarkList
                      lessonId={currentLesson._id || currentLesson.id}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-zinc-500 text-sm">Vui lòng chọn bài học từ danh sách.</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Weekly curriculum directory */}
      <aside className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-zinc-900 h-[45vh] md:h-full">
        <VideoLessonSidebar
          lessons={lessons}
          currentLessonId={currentLesson?._id || currentLesson?.id}
          onSelectLesson={(lesson) => {
            setCurrentLesson(lesson);
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          progress={enrollment?.progress}
        />
      </aside>

    </div>
  );
}

// Fallback Mock data
const MOCK_ENROLLMENT = {
  _id: 'mock-enroll-1',
  status: 'in_progress',
  progress: {
    percentage: 25,
    completedLessons: 1,
    totalLessons: 4,
  },
  course: {
    title: 'Lập trình Python cho người 35+ định hướng nghề nghiệp',
  },
};

const MOCK_LESSONS = [
  {
    _id: 'lesson-mock-1',
    id: 'lesson-mock-1',
    title: 'Giới thiệu lộ trình học tập và Phương pháp học Python hiệu quả',
    duration: 345,
    weekNumber: 1,
    completed: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://picsum.photos/seed/python1/640/360',
    description: 'Bài học này giới thiệu về cấu trúc giáo trình, các công cụ sẽ sử dụng trong suốt khóa học và phương pháp tiếp cận Python tối ưu cho học viên 35 tuổi trở lên.'
  },
  {
    _id: 'lesson-mock-2',
    id: 'lesson-mock-2',
    title: 'Cài đặt môi trường lập trình VS Code & Chạy chương trình đầu tiên',
    duration: 512,
    weekNumber: 1,
    completed: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://picsum.photos/seed/python2/640/360',
    description: 'Hướng dẫn từng bước cách tải và cài đặt Visual Studio Code, Python 3 trên hệ điều hành Windows và viết dòng lệnh in thông tin chào mừng ra màn hình.'
  },
  {
    _id: 'lesson-mock-3',
    id: 'lesson-mock-3',
    title: 'Biến, kiểu dữ liệu nguyên thủy & Cách khai báo biến đúng chuẩn',
    duration: 418,
    weekNumber: 2,
    completed: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://picsum.photos/seed/python3/640/360',
    description: 'Tìm hiểu về khái niệm ô nhớ, biến trong Python, các kiểu dữ liệu cơ bản bao gồm số nguyên (int), số thực (float), chuỗi ký tự (string) và kiểu logic (boolean).'
  },
  {
    _id: 'lesson-mock-4',
    id: 'lesson-mock-4',
    title: 'Toán tử số học, toán tử so sánh & Cú pháp rẽ nhánh điều kiện',
    duration: 654,
    weekNumber: 2,
    completed: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://picsum.photos/seed/python4/640/360',
    description: 'Làm quen với toán tử cộng, trừ, nhân, chia, lấy dư trong tính toán số học, toán tử so sánh bằng/lớn hơn/nhỏ hơn và cấu trúc điều khiển rẽ nhánh if - elif - else.'
  }
];
