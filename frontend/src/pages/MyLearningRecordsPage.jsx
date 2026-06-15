import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, Badge, Skeleton } from '@/components/ui';
import { fetchMyLearningRecords, selectLearningRecords, selectLearningRecordsLoading } from '@/redux/learningRecord/learningRecordSlice';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { BookOpen, Clock, CheckCircle, PlayCircle, FileText, Calendar, Award } from 'lucide-react';
import { formatDate } from '@/utils/formatter';


const EVENT_TYPE_CONFIG = {
  lesson_started: {
    label: 'Bắt đầu bài',
    icon: PlayCircle,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  lesson_completed: {
    label: 'Hoàn thành bài',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  enrollment_created: {
    label: 'Ghi danh',
    icon: BookOpen,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  enrollment_completed: {
    label: 'Hoàn thành khóa',
    icon: Award,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  video_watched: {
    label: 'Xem video',
    icon: PlayCircle,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  },
  note_created: {
    label: 'Ghi chú',
    icon: FileText,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  checkin: {
    label: 'Điểm danh',
    icon: CheckCircle,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  },
};

const getEventConfig = (eventType) => {
  return EVENT_TYPE_CONFIG[eventType] || {
    label: eventType || 'Hoạt động',
    icon: Clock,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
};

export default function MyLearningRecordsPage() {
  const dispatch = useDispatch();
  const records = useSelector(selectLearningRecords);
  const loading = useSelector(selectLearningRecordsLoading);
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    if (!currentUser) return
    dispatch(fetchMyLearningRecords());
  }, [dispatch, currentUser?._id]);

  const renderRecordDetails = (record) => {
    const metadata = record.metadata || {};

    if (metadata.courseName || metadata.courseId) {
      return (
        <p className="text-sm text-muted-foreground">
          Khóa học: <span className="font-medium">{metadata.courseName || metadata.courseId}</span>
        </p>
      );
    }
    if (metadata.lessonTitle || metadata.lessonId) {
      return (
        <p className="text-sm text-muted-foreground">
          Bài học: <span className="font-medium">{metadata.lessonTitle || metadata.lessonId}</span>
        </p>
      );
    }
    if (metadata.message) {
      return <p className="text-sm text-muted-foreground">{metadata.message}</p>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bản ghi học tập</h1>
            <p className="text-sm text-muted-foreground">
              Lịch sử hoạt động học tập của bạn
            </p>
          </div>
        </div>

        {/* Stats summary */}
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Tổng hoạt động', value: records.length },
              {
                label: 'Hoàn thành',
                value: records.filter(r => r.event_type === 'lesson_completed' || r.event_type === 'enrollment_completed').length,
              },
              {
                label: 'Bài đang học',
                value: records.filter(r => r.event_type === 'lesson_started' || r.event_type === 'video_watched').length,
              },
              {
                label: 'Khóa đã ghi danh',
                value: records.filter(r => r.event_type === 'enrollment_created').length,
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && records.length === 0 && (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold mb-2">Chưa có bản ghi học tập</h3>
            <p className="text-sm text-muted-foreground">
              Bạn chưa có hoạt động học tập nào được ghi nhận.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {records.map((record) => {
            const config = getEventConfig(record.event_type);
            const IconComponent = config.icon;

            return (
              <Card key={record._id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{config.label}</span>
                        {record.event_type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                            {record.event_type}
                          </span>
                        )}
                      </div>
                      {renderRecordDetails(record)}
                      {record.createdAt && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(record.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

    </div>
  );
}
