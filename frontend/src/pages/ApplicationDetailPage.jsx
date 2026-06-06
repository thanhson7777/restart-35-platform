import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { ApplicationStatus } from '@/components/shared/ApplicationStatus';
import { DocumentUpload } from '@/components/application/DocumentUpload';
import { getApplicationById, appealApplication } from '@/apis/applicationApi';
import { formatDate, formatPrice } from '@/utils/formatter';
import toast from 'react-hot-toast';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';
import {
  ArrowLeft, CheckCircle2, Clock, FileText,
  MessageSquare, AlertCircle
} from 'lucide-react';

const TIMELINE_STEPS = [
  { key: 'created', label: 'Tạo đơn' },
  { key: 'submitted', label: 'Đã nộp' },
  { key: 'reviewing', label: 'Đang xét duyệt' },
  { key: 'decided', label: 'Kết quả' },
];

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appealing, setAppealing] = useState(false);
  const [appealReason, setAppealReason] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getApplicationById(id);
        setApp(res.data);
      } catch (err) {
        console.error('Error fetching application:', err);
        setError('Không thể tải thông tin đơn.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error('Vui lòng nhập lý do kháng cáo.');
      return;
    }
    setAppealing(true);
    try {
      await appealApplication(id, appealReason);
      toast.success('Đã gửi kháng cáo!');
      const res = await getApplicationById(id);
      setApp(res.data);
      setAppealReason('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Kháng cáo thất bại.';
      toast.error(msg);
    } finally {
      setAppealing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-16 text-center">
        <p className="text-destructive font-medium mb-4">{error || 'Không tìm thấy đơn.'}</p>
        <Button variant="outline" onClick={() => navigate('/my-applications')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Button>
      </div>
    );
  }

  const getStepStatus = (step) => {
    const status = app.status;
    if (step.key === 'created') return status !== 'draft' ? 'done' : 'active';
    if (step.key === 'submitted') return ['submitted', 'reviewing', 'approved', 'rejected', 'waitlist'].includes(status) ? 'done' : 'pending';
    if (step.key === 'reviewing') return ['reviewing', 'approved', 'rejected', 'waitlist'].includes(status) ? 'done' : 'pending';
    if (step.key === 'decided') return ['approved', 'rejected', 'waitlist'].includes(status) ? 'done' : 'pending';
    return 'pending';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border py-8">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/my-applications')}
            className="mb-4 pl-0 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{app.course?.title || 'Đơn xin học bổng'}</h1>
                <ApplicationStatus status={app.status} />
              </div>
              {app.scholarship?.title && (
                <p className="text-muted-foreground text-sm">{app.scholarship.title}</p>
              )}
            </div>
            {app.approvedAmount && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Số tiền được duyệt</p>
                <p className="text-2xl font-bold text-green-600">{formatPrice(app.approvedAmount)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Tiến trình</h2>
                <div className="flex items-center">
                  {TIMELINE_STEPS.map((step, i) => {
                    const stepStatus = getStepStatus(step);
                    return (
                      <div key={step.key} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                            ${stepStatus === 'done' ? 'bg-green-500 text-white'
                              : stepStatus === 'active' ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground'}
                          `}>
                            {stepStatus === 'done' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <p className="text-xs mt-1.5 text-center max-w-[60px]">{step.label}</p>
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 ${
                            stepStatus === 'done' ? 'bg-green-500' : 'bg-muted'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Motivation letter */}
            {app.motivationLetter && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Thư xin học bổng
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {app.motivationLetter}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {app.documents?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Tài liệu đính kèm
                  </h2>
                  <DocumentUpload
                    documents={app.documents}
                    readOnly
                  />
                </CardContent>
              </Card>
            )}

            {/* Review notes */}
            {(app.reviewNotes || app.rejectionReason) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    {app.status === 'rejected' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {app.status === 'rejected' ? 'Lý do từ chối' : 'Ghi chú'}
                  </h2>
                  {app.rejectionReason && (
                    <p className="text-muted-foreground">{app.rejectionReason}</p>
                  )}
                  {app.reviewNotes && (
                    <p className="text-muted-foreground">{app.reviewNotes}</p>
                  )}
                  {app.reviewedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Xem xét: {formatDate(app.reviewedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Appeal section */}
            {app.status === 'rejected' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold mb-3">Kháng cáo</h2>
                  {app.appeals?.length > 0 ? (
                    <div className="space-y-3">
                      {app.appeals.map((appeal, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                appeal.status === 'accepted' ? 'success'
                                  : appeal.status === 'rejected' ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {appeal.status === 'pending' ? 'Đang chờ'
                                : appeal.status === 'accepted' ? 'Được chấp nhận'
                                : 'Bị từ chối'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(appeal.submittedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{appeal.reason}</p>
                          {appeal.response && (
                            <p className="text-sm mt-2 bg-muted rounded p-2">
                              Phản hồi: {appeal.response}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        placeholder="Nhập lý do kháng cáo..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm resize-none"
                      />
                      <Button
                        onClick={handleAppeal}
                        disabled={appealing}
                        className="w-full"
                      >
                        {appealing ? 'Đang gửi...' : 'Gửi kháng cáo'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar info */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Thông tin đơn</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày tạo</span>
                    <span>{formatDate(app.createdAt)}</span>
                  </div>
                  {app.submittedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngày nộp</span>
                      <span>{formatDate(app.submittedAt)}</span>
                    </div>
                  )}
                  {app.approvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngày duyệt</span>
                      <span>{formatDate(app.approvedAt)}</span>
                    </div>
                  )}
                  {app.requestedAmount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tiền yêu cầu</span>
                      <span>{formatPrice(app.requestedAmount)}</span>
                    </div>
                  )}
                  {app.approvedAmount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tiền duyệt</span>
                      <span className="font-medium text-green-600">{formatPrice(app.approvedAmount)}</span>
                    </div>
                  )}
                  {app.coverage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mức tài trợ</span>
                      <Badge variant={app.coverage === 'full' ? 'success' : 'secondary'} className="text-xs">
                        {app.coverage === 'full' ? '100%' : app.coverage === 'partial' ? 'Một phần' : 'Không'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {app.course && (
              <Card
                variant="interactive"
                onClick={() => navigate(`/courses/${app.course._id}`)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Khóa học đã đăng ký</h3>
                  {app.course.thumbnail && (
                    <img
                      src={app.course.thumbnail}
                      alt={app.course.title}
                      className="w-full aspect-video object-cover rounded-lg mb-2"
                    />
                  )}
                  <p className="text-sm font-medium">{app.course.title}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      </div>
      <Footer />
    </>
  );
}
