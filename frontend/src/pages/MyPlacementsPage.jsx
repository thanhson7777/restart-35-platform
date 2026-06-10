import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { fetchMyPlacements, selectPlacements, selectPlacementsLoading, submitPlacementFeedback } from '@/redux/placement/placementSlice';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { Briefcase, MapPin, DollarSign, Calendar, ChevronRight, Star, Send, X } from 'lucide-react';
import { formatDate, formatPrice } from '@/utils/formatter';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  referred: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  interviewing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  offered: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  accepted: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  started: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  resigned: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const STATUS_LABELS = {
  referred: 'Đã giới thiệu',
  interviewing: 'Đang phỏng vấn',
  offered: 'Đã nhận offer',
  accepted: 'Đã chấp nhận',
  started: 'Đang làm việc',
  rejected: 'Từ chối',
  resigned: 'Đã nghỉ việc',
};

export default function MyPlacementsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const placements = useSelector(selectPlacements);
  const loading = useSelector(selectPlacementsLoading);
  const currentUser = useSelector(selectCurrentUser);

  const [feedbackPlacement, setFeedbackPlacement] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return
    dispatch(fetchMyPlacements());
  }, [dispatch, currentUser?._id]);

  const openFeedback = (placement) => {
    setFeedbackPlacement(placement);
    setRating(placement.feedback?.rating || 0);
    setComment(placement.feedback?.comment || '');
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error('Vui lòng chọn số sao đánh giá');
      return;
    }
    setSubmitting(true);
    try {
      const result = await dispatch(submitPlacementFeedback({
        id: feedbackPlacement._id,
        data: { rating, comment }
      })).unwrap();
      toast.success('Cảm ơn bạn đã gửi đánh giá!');
      setFeedbackPlacement(null);
      dispatch(fetchMyPlacements());
    } catch (err) {
      toast.error(err?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vị trí việc làm của tôi</h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi tiến trình việc làm đã được giới thiệu
            </p>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && placements.length === 0 && (
          <Card className="p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold mb-2">Chưa có vị trí việc làm</h3>
            <p className="text-sm text-muted-foreground">
              Bạn chưa được giới thiệu vào vị trí việc làm nào.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {placements.map((placement) => {
            const statusKey = placement.status || 'referred';
            const employerName = placement.employer?.name || placement.employerName;
            const jobTitle = placement.job?.title || placement.jobTitle || placement.position;

            return (
              <Card key={placement._id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">
                          {jobTitle || 'Vị trí chưa có tiêu đề'}
                        </h3>
                        <p className="text-muted-foreground font-medium mt-0.5">
                          {employerName || 'Chưa có thông tin nhà tuyển dụng'}
                        </p>
                      </div>
                      <Badge className={`shrink-0 ml-4 ${STATUS_COLORS[statusKey] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[statusKey] || statusKey}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      {placement.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 shrink-0" />
                          {placement.location}
                        </span>
                      )}
                      {placement.job?.salary && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 shrink-0" />
                          {formatPrice(placement.job.salary)}
                        </span>
                      )}
                      {placement.startDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 shrink-0" />
                          Từ {formatDate(placement.startDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => navigate(`/placements/${placement._id}`)}
                      >
                        Xem chi tiết
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      {(placement.status === 'started' || placement.status === 'accepted' || placement.status === 'offered') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFeedback(placement)}
                        >
                          {placement.feedback?.rating ? (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              Đã đánh giá
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4" />
                              Đánh giá
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feedback Modal */}
        {feedbackPlacement && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Đánh giá vị trí việc làm</h3>
                  <button onClick={() => setFeedbackPlacement(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Đánh giá trải nghiệm làm việc tại {feedbackPlacement.job?.title || feedbackPlacement.position || 'vị trí này'}
                </p>

                {/* Star Rating */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {rating === 1 && 'Rất không hài lòng'}
                  {rating === 2 && 'Không hài lòng'}
                  {rating === 3 && 'Bình thường'}
                  {rating === 4 && 'Hài lòng'}
                  {rating === 5 && 'Rất hài lòng'}
                  {rating === 0 && 'Chọn số sao'}
                </p>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn (tùy chọn)..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none mb-4"
                />

                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submitting || rating === 0}
                  className="w-full gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Gửi đánh giá
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
