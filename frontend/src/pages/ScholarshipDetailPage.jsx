import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { ApplicationForm } from '@/components/application/ApplicationForm';
import { EligibilityIndicator } from '@/components/shared/EligibilityIndicator';
import {
  getScholarshipById,
  checkScholarshipEligibility
} from '@/apis/scholarshipApi';
import {
  getMyApplications,
  createApplication,
  getApplicationById
} from '@/apis/applicationApi';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/redux/user/userSlice';
import {
  formatScholarshipAmount,
  formatDeadline,
  formatDate,
  formatRecipientCount
} from '@/utils/formatter';
import { SCHOLARSHIP_COVERAGE } from '@/utils/constants';
import toast from 'react-hot-toast';
import {
  Award, Calendar, Users, MapPin, GraduationCap,
  CheckCircle2, XCircle, BookOpen, ArrowLeft
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';

const COVERAGE_LABELS = {
  full: 'Miễn phí 100%',
  partial: 'Tài trợ một phần',
  none: 'Tự chi trả',
};

const COVERAGE_COLORS = {
  full: 'bg-green-100 text-green-700',
  partial: 'bg-blue-100 text-blue-700',
  none: 'bg-gray-100 text-gray-600',
};

export default function ScholarshipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [scholarship, setScholarship] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [myApplicationStatus, setMyApplicationStatus] = useState(null); // 'none' | 'draft' | 'submitted' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(true);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getScholarshipById(id);
      setScholarship(res.data);

      if (currentUser) {
        setEligibilityLoading(true);
        try {
          const eligRes = await checkScholarshipEligibility(id);
          setEligibility(eligRes.data);
        } catch (e) {
          console.error('Eligibility check error:', e);
        } finally {
          setEligibilityLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching scholarship:', err);
      setError('Không thể tải thông tin học bổng.');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  const fetchExistingApplication = useCallback(async () => {
    if (!currentUser) return;
    try {
      const appsRes = await getMyApplications({ scholarshipId: id });
      const apps = appsRes.data?.data || appsRes.data || [];
      const myApp = apps.find(a =>
        a.scholarshipId === id ||
        a.scholarship?._id === id ||
        a.scholarshipId === id
      );
      if (myApp) {
        setExistingApplication(myApp);
        setMyApplicationStatus(myApp.status);
      } else {
        setMyApplicationStatus('none');
        setExistingApplication(null);
      }
    } catch {
      setMyApplicationStatus('none');
    }
  }, [id, currentUser]);

  useEffect(() => {
    fetchData();
    fetchExistingApplication();
  }, [fetchData, fetchExistingApplication]);

  const handleSaveDraft = async (data) => {
    setIsSaving(true);
    try {
      const res = await createApplication({
        scholarshipId: data.scholarshipId,
        courseId: data.courseId,
        motivationLetter: data.motivationLetter,
      });
      setExistingApplication(res.data);
      setMyApplicationStatus('draft');
      toast.success('Đã lưu nháp đơn!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Lưu thất bại.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!existingApplication) {
      toast.error('Vui lòng lưu nháp trước.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { submitApplication } = await import('@/apis/applicationApi');
      await submitApplication(existingApplication._id);
      toast.success('Nộp đơn thành công!');
      setMyApplicationStatus('submitted');
      navigate('/my-applications');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Nộp đơn thất bại.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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

  if (error || !scholarship) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-16 text-center">
        <p className="text-destructive font-medium mb-4">{error || 'Không tìm thấy học bổng.'}</p>
        <Button variant="outline" onClick={() => navigate('/scholarships')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Button>
      </div>
    );
  }

  const { eligibilityCriteria, linkedCourses, applicationPeriod, maxRecipients, currentRecipients } = scholarship;
  const progress = maxRecipients > 0 ? Math.round((currentRecipients / maxRecipients) * 100) : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Light Gradient Header */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-[hsl(var(--admin-border))] shadow-sm py-12">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/scholarships')}
              className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] mb-6 pl-0 gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
            </Button>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                {scholarship.ngo && (
                  <p className="text-[hsl(var(--admin-text-muted))] text-sm mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-accent))] text-xs font-bold flex items-center justify-center">
                      {scholarship.ngo.displayName?.charAt(0)?.toUpperCase()}
                    </span>
                    {scholarship.ngo.displayName}
                  </p>
                )}
                <h1 className="text-3xl font-bold text-[hsl(var(--admin-text-primary))] mb-3">{scholarship.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-[hsl(var(--admin-text-muted))] text-sm">
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {formatScholarshipAmount(scholarship.amountPerRecipient)}/người
                  </span>
                  {applicationPeriod?.endDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Hạn: {formatDeadline(applicationPeriod.endDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {formatRecipientCount(currentRecipients, maxRecipients)}
                  </span>
                </div>
              </div>

              {/* Recipients progress */}
              {maxRecipients > 0 && (
                <div className="lg:w-64 bg-[hsl(var(--admin-accent-subtle))] border border-[hsl(var(--admin-border))] rounded-lg p-4">
                  <p className="text-[hsl(var(--admin-text-muted))] text-sm mb-2">Số người nhận</p>
                  <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))] mb-3">{currentRecipients}/{maxRecipients}</p>
                  <div className="h-2 bg-[hsl(var(--admin-border))] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        progress >= 90 ? 'bg-red-500' : progress >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs mt-2">{progress}% đã nhận</p>
                </div>
              )}
            </div>
          </div>
        </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {scholarship.description && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Giới thiệu</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {scholarship.description}
                </p>
              </section>
            )}

            {/* Eligibility criteria */}
            {eligibilityCriteria && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Điều kiện đủ điều kiện</h2>
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {eligibilityCriteria.ageMin && eligibilityCriteria.ageMax && (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Độ tuổi</p>
                            <p className="text-xs text-muted-foreground">
                              Từ {eligibilityCriteria.ageMin} đến {eligibilityCriteria.ageMax} tuổi
                            </p>
                          </div>
                        </div>
                      )}
                      {eligibilityCriteria.maxIncome != null && (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Thu nhập tối đa</p>
                            <p className="text-xs text-muted-foreground">
                              {formatScholarshipAmount(eligibilityCriteria.maxIncome)}/tháng
                            </p>
                          </div>
                        </div>
                      )}
                      {eligibilityCriteria.provinces?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Khu vực</p>
                            <p className="text-xs text-muted-foreground">
                              {eligibilityCriteria.provinces.join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                      {eligibilityCriteria.targetSkills?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Kỹ năng ưu tiên</p>
                            <p className="text-xs text-muted-foreground">
                              {eligibilityCriteria.targetSkills.join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                      {eligibilityCriteria.education?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Trình độ học vấn</p>
                            <p className="text-xs text-muted-foreground">
                              {eligibilityCriteria.education.join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                      {eligibilityCriteria.employmentStatus?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Tình trạng việc làm</p>
                            <p className="text-xs text-muted-foreground">
                              {eligibilityCriteria.employmentStatus.join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Linked courses */}
            {linkedCourses?.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Khóa học được tài trợ</h2>
                <div className="space-y-3">
                  {linkedCourses.map((lc, i) => (
                    <Card key={lc.courseId || i}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lc.courseId}</p>
                            {lc.maxAmount && (
                              <p className="text-xs text-muted-foreground">
                                Tài trợ tối đa: {formatScholarshipAmount(lc.maxAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-medium shrink-0 ${COVERAGE_COLORS[lc.coverage || 'partial']}`}>
                          {COVERAGE_LABELS[lc.coverage || 'partial']}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar: Application form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {!currentUser ? (
                <Card>
                  <CardContent className="p-4 text-center space-y-3">
                    <Award className="w-10 h-10 text-primary mx-auto opacity-50" />
                    <p className="font-medium text-sm">Đăng nhập để nộp đơn</p>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => navigate('/auth')}
                    >
                      Đăng nhập / Đăng ký
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {eligibilityLoading ? (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-center text-muted-foreground">Kiểm tra điều kiện...</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {eligibility && (
                        <div className="mb-4">
                          <EligibilityIndicator eligibility={eligibility} />
                        </div>
                      )}
                      {/* Application Status Banner */}
                      {myApplicationStatus && myApplicationStatus !== 'none' && (
                        <Card className={`mb-4 ${
                          myApplicationStatus === 'submitted' ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' :
                          myApplicationStatus === 'approved' ? 'border-green-300 bg-green-50 dark:bg-green-950/20' :
                          myApplicationStatus === 'rejected' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                          'border-gray-300 bg-gray-50 dark:bg-gray-900/20'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {myApplicationStatus === 'submitted' && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Đã nộp đơn</Badge>}
                              {myApplicationStatus === 'approved' && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Đã duyệt</Badge>}
                              {myApplicationStatus === 'rejected' && <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Bị từ chối</Badge>}
                              {myApplicationStatus === 'draft' && <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Đang nháp</Badge>}
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {myApplicationStatus === 'submitted' && 'Đơn của bạn đã được nộp. Vui lòng chờ xét duyệt.'}
                                {myApplicationStatus === 'approved' && 'Chúc mừng! Đơn của bạn đã được duyệt.'}
                                {myApplicationStatus === 'rejected' && 'Đơn của bạn không được duyệt. Vui lòng liên hệ để biết chi tiết.'}
                                {myApplicationStatus === 'draft' && 'Đơn của bạn chưa được nộp. Vui lòng nộp để được xét duyệt.'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {(!eligibility || eligibility.eligible !== false) && (
                        myApplicationStatus !== 'submitted' && myApplicationStatus !== 'approved' ? (
                        <ApplicationForm
                          scholarship={scholarship}
                          existingApplication={existingApplication}
                          onSaveDraft={handleSaveDraft}
                          onSubmit={handleSubmit}
                          isSaving={isSaving}
                          isSubmitting={isSubmitting}
                        />
                        ) : null
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      </div>
      <Footer />
    </>
  );
}
