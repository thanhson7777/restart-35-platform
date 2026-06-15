import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Progress, Avatar, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { HeroSection, CoreProblemsSection, StatsBar, SolutionsSection, LandingLayout, Navbar, CourseCategories, PopularCourses, CTASection, HowItWorksSection, FeaturesSection, TestimonialsSection, Footer } from '@/components/landing';
import { StatsCard, CourseProgressCard, JobCard, ActivityItem, SkillBadge, QuickAction } from '@/components/dashboard';
import { CourseCard } from '@/components/course';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { Agentation } from 'agentation';
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import WorkerProfilePage from '@/pages/WorkerProfilePage';

import WorkerAccountSettingsPage from '@/pages/worker/WorkerAccountSettingsPage';
import JobsPage from '@/pages/JobsPage';
import JobDetailPage from '@/pages/JobDetailPage';
import CoursesPage from '@/pages/CoursesPage';
import CourseDetailPage from '@/pages/CourseDetailPage';
import CourseCurriculumPage from '@/pages/CourseCurriculumPage';
import MyEnrollmentsPage from '@/pages/MyEnrollmentsPage';
import MyEnrollmentDetailPage from '@/pages/MyEnrollmentDetailPage';
import VideoLearningPage from '@/pages/VideoLearningPage';
import CertificatePage from '@/pages/my-enrollments/CertificatePage';
import OpportunityMapPage from '@/pages/OpportunityMapPage';
import ForumPage from '@/pages/community/ForumPage';
import ForumPostDetailPage from '@/pages/ForumPostDetailPage';
import MentorFindPage from '@/pages/community/MentorFindPage';
import ScholarshipPage from '@/pages/ScholarshipPage';
import ScholarshipDetailPage from '@/pages/ScholarshipDetailPage';
import MyOutcomesPage from '@/pages/MyOutcomesPage';
import MyPlacementsPage from '@/pages/MyPlacementsPage';
import MySuccessStatsPage from '@/pages/MySuccessStatsPage';
import MyLearningRecordsPage from '@/pages/MyLearningRecordsPage';
import MySchedulesPage from '@/pages/MySchedulesPage';
import MySponsorshipsPage from '@/pages/MySponsorshipsPage';
import MentorBookingPage from '@/pages/MentorBookingPage';
import MyMentorSessionsPage from '@/pages/MyMentorSessionsPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import AdminCoursesPage from '@/pages/AdminCoursesPage';
import AdminEnrollmentsPage from '@/pages/admin/AdminEnrollmentsPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import ScheduleBuilderPage from '@/pages/admin/ScheduleBuilderPage';
import AdminScholarshipsPage from '@/pages/AdminScholarshipsPage';
import AdminOrganizationsPage from '@/pages/admin/AdminOrganizationsPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminApplicationsPage from '@/pages/admin/AdminApplicationsPage';
import AttendancePage from '@/pages/admin/AttendancePage';
import CheckinPage from '@/pages/my-enrollments/CheckinPage';
import { fetchCurrentUser, selectCurrentUser } from '@/redux/user/userSlice';
import TrainerLayout from '@/components/trainer/TrainerLayout';
import EnterpriseLayout from '@/components/enterprise/EnterpriseLayout';
import NgoLayout from '@/components/ngo/NgoLayout';
import TrainerDashboardPage from '@/pages/trainer/TrainerDashboardPage';
import TrainerCoursesPage from '@/pages/trainer/TrainerCoursesPage';
import TrainerCourseFormPage from '@/pages/trainer/TrainerCourseFormPage';
import TrainerCourseStudentsPage from '@/pages/trainer/TrainerCourseStudentsPage';
import TrainerCourseSchedulePage from '@/pages/trainer/TrainerCourseSchedulePage';
import TrainerEnrollmentsPage from '@/pages/trainer/TrainerEnrollmentsPage';
import TrainerEnrollmentDetailPage from '@/pages/trainer/TrainerEnrollmentDetailPage';
import TrainerSchedulePage from '@/pages/trainer/TrainerSchedulePage';
import TrainerPlacementsPage from '@/pages/trainer/TrainerPlacementsPage';
import TrainerReviewsPage from '@/pages/trainer/TrainerReviewsPage';
import TrainerPartnershipsPage from '@/pages/trainer/TrainerPartnershipsPage';
import TrainerPartnershipDetailPage from '@/pages/trainer/TrainerPartnershipDetailPage';
import TrainerPartnershipRespondPage from '@/pages/trainer/TrainerPartnershipRespondPage';
import EnterpriseDashboardPage from '@/pages/enterprise/EnterpriseDashboardPage';
import EnterprisePartnershipsPage from '@/pages/enterprise/EnterprisePartnershipsPage';
import EnterprisePartnershipCreatePage from '@/pages/enterprise/EnterprisePartnershipCreatePage';
import EnterprisePartnershipDetailPage from '@/pages/enterprise/EnterprisePartnershipDetailPage';
import EnterpriseSponsorshipsPage from '@/pages/enterprise/EnterpriseSponsorshipsPage';
import EnterpriseSponsorshipCreatePage from '@/pages/enterprise/EnterpriseSponsorshipCreatePage';
import EnterpriseJobsPage from '@/pages/enterprise/EnterpriseJobsPage';
import EnterpriseJobCreatePage from '@/pages/enterprise/EnterpriseJobCreatePage';
import EnterpriseJobDetailPage from '@/pages/enterprise/EnterpriseJobDetailPage';
import EnterpriseApplicationsPage from '@/pages/enterprise/EnterpriseApplicationsPage';
import EnterpriseApplicationDetailPage from '@/pages/enterprise/EnterpriseApplicationDetailPage';
import EnterpriseInterviewsPage from '@/pages/enterprise/EnterpriseInterviewsPage';
import EnterpriseInterviewSchedulePage from '@/pages/enterprise/EnterpriseInterviewSchedulePage';
import EnterpriseInterviewDetailPage from '@/pages/enterprise/EnterpriseInterviewDetailPage';
import EnterpriseOffersPage from '@/pages/enterprise/EnterpriseOffersPage';
import EnterpriseOfferDetailPage from '@/pages/enterprise/EnterpriseOfferDetailPage';
import EnterpriseOfferCreatePage from '@/pages/enterprise/EnterpriseOfferCreatePage';
import WorkerApplicationsPage from '@/pages/worker/WorkerApplicationsPage';
import WorkerApplicationDetailPage from '@/pages/worker/WorkerApplicationDetailPage';
import WorkerInterviewsPage from '@/pages/worker/WorkerInterviewsPage';
import WorkerOffersPage from '@/pages/worker/WorkerOffersPage';
import WorkerAnalyticsPage from '@/pages/worker/WorkerAnalyticsPage';
import WorkerPostsPage from '@/pages/worker/WorkerPostsPage';
import CommunityHubPage from '@/pages/CommunityHubPage';
import CommunityJobDetailPage from '@/pages/community/CommunityJobDetailPage';
import EventDetailPage from '@/pages/community/EventDetailPage';
import NgoImpactDashboardPage from '@/pages/ngo/NgoImpactDashboardPage';
import NgoSponsorshipsPage from '@/pages/ngo/NgoSponsorshipsPage';
import NgoSponsorshipCreatePage from '@/pages/ngo/NgoSponsorshipCreatePage';
import NgoSponsorshipLearnersPage from '@/pages/ngo/NgoSponsorshipLearnersPage';
import NgoEventsPage from '@/pages/ngo/NgoEventsPage';
import NgoEventCreatePage from '@/pages/ngo/NgoEventCreatePage';
import CertificateVerifyPage from '@/pages/CertificateVerifyPage';
import AccountVerificationPage from '@/pages/AccountVerificationPage';
import { VNPayReturnPage } from '@/pages/payment/VNPayReturnPage';
import AdminPendingJobsPage from '@/pages/admin/AdminPendingJobsPage';
import AdminJobReviewPage from '@/pages/admin/AdminJobReviewPage';
import AdminIsaRepaymentsPage from '@/pages/admin/AdminIsaRepaymentsPage';
import AdminFundingConfigsPage from '@/pages/admin/AdminFundingConfigsPage';
import AdminCertificatesPage from '@/pages/admin/AdminCertificatesPage';
import AdminPlacementsPage from '@/pages/admin/AdminPlacementsPage';
import AdminReviewsModerationPage from '@/pages/admin/AdminReviewsModerationPage';
import AdminLearningRecordsPage from '@/pages/admin/AdminLearningRecordsPage';
import AdminInteractionsPage from '@/pages/admin/AdminInteractionsPage';
import AdminEscoSyncPage from '@/pages/admin/AdminEscoSyncPage';
import AdminJobCategoriesPage from '@/pages/admin/AdminJobCategoriesPage';
import AdminCourseCategoriesPage from '@/pages/admin/AdminCourseCategoriesPage';
import IsaDashboardPage from '@/pages/IsaDashboardPage';
import WorkerLayout from '@/components/worker/WorkerLayout';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const currentUser = useSelector(selectCurrentUser);
  const isAuthenticated = !!localStorage.getItem('accessToken');

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && currentUser) {
    const userRole = currentUser.role;
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

function App() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  // Fetch user data on app load if token exists
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && !currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);
  return (
    <BrowserRouter basename='/'>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--success))',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'white',
            },
          },
        }}
      />
      <Routes>
        {/* Auth Page */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/courses" element={<AdminCoursesPage />} />
        <Route path="/admin/course-categories" element={<ProtectedRoute allowedRoles={['admin']}><AdminCourseCategoriesPage /></ProtectedRoute>} />
        <Route path="/admin/courses/:id/schedule" element={<ScheduleBuilderPage />} />
        <Route path="/admin/courses/:id/schedule/session/:sessionNumber/attendance" element={<AttendancePage />} />
        <Route path="/admin/enrollments" element={<AdminEnrollmentsPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/applications" element={<AdminApplicationsPage />} />
        <Route path="/admin/jobs/pending" element={<AdminPendingJobsPage />} />
        <Route path="/admin/jobs/:id/review" element={<AdminJobReviewPage />} />
        <Route path="/admin/organizations" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrganizationsPage /></ProtectedRoute>} />
        <Route path="/admin/job-categories" element={<ProtectedRoute allowedRoles={['admin']}><AdminJobCategoriesPage /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<AdminPaymentsPage />} />
        <Route path="/admin/scholarships" element={<AdminScholarshipsPage />} />
        <Route path="/admin/isa-repayments" element={<AdminIsaRepaymentsPage />} />
        <Route path="/admin/funding-configs" element={<AdminFundingConfigsPage />} />
        <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
        <Route path="/admin/placements" element={<ProtectedRoute allowedRoles={['admin']}><AdminPlacementsPage /></ProtectedRoute>} />
        <Route path="/admin/reviews" element={<AdminReviewsModerationPage />} />

        <Route path="/admin/interactions" element={<AdminInteractionsPage />} />
        <Route path="/admin/esco-sync" element={<AdminEscoSyncPage />} />

        {/* Trainer Routes */}
        <Route path="/trainer" element={<TrainerLayout><TrainerDashboardPage /></TrainerLayout>} />
        <Route path="/trainer/courses" element={<TrainerLayout><TrainerCoursesPage /></TrainerLayout>} />
        <Route path="/trainer/courses/new" element={<TrainerLayout><TrainerCourseFormPage /></TrainerLayout>} />
        <Route path="/trainer/courses/:id/edit" element={<TrainerLayout><TrainerCourseFormPage /></TrainerLayout>} />
        <Route path="/trainer/courses/:id/students" element={<TrainerLayout><TrainerCourseStudentsPage /></TrainerLayout>} />
        <Route path="/trainer/courses/:id/schedule" element={<TrainerLayout><TrainerCourseSchedulePage /></TrainerLayout>} />
        <Route path="/trainer/enrollments" element={<TrainerLayout><TrainerEnrollmentsPage /></TrainerLayout>} />
        <Route path="/trainer/enrollments/:id" element={<TrainerLayout><TrainerEnrollmentDetailPage /></TrainerLayout>} />
        <Route path="/trainer/schedule" element={<TrainerLayout><TrainerSchedulePage /></TrainerLayout>} />
        <Route path="/trainer/partnerships" element={<TrainerLayout><TrainerPartnershipsPage /></TrainerLayout>} />
        <Route path="/trainer/partnerships/:id" element={<TrainerLayout><TrainerPartnershipDetailPage /></TrainerLayout>} />
        <Route path="/trainer/partnerships/:id/respond" element={<TrainerLayout><TrainerPartnershipRespondPage /></TrainerLayout>} />
        <Route path="/trainer/placements" element={<TrainerLayout><TrainerPlacementsPage /></TrainerLayout>} />
        <Route path="/trainer/reviews" element={<TrainerLayout><TrainerReviewsPage /></TrainerLayout>} />

        {/* Enterprise Routes */}
        <Route path="/enterprise" element={<Navigate to="/enterprise/dashboard" replace />} />
        <Route path="/enterprise/dashboard" element={<EnterpriseLayout><EnterpriseDashboardPage /></EnterpriseLayout>} />
        <Route path="/enterprise/partnerships" element={<EnterpriseLayout><EnterprisePartnershipsPage /></EnterpriseLayout>} />
        <Route path="/enterprise/partnerships/create" element={<EnterpriseLayout><EnterprisePartnershipCreatePage /></EnterpriseLayout>} />
        <Route path="/enterprise/partnerships/:id" element={<EnterpriseLayout><EnterprisePartnershipDetailPage /></EnterpriseLayout>} />
        <Route path="/enterprise/sponsorships" element={<EnterpriseLayout><EnterpriseSponsorshipsPage /></EnterpriseLayout>} />
        <Route path="/enterprise/sponsorships/create" element={<EnterpriseLayout><EnterpriseSponsorshipCreatePage /></EnterpriseLayout>} />
        {/* Enterprise Recruitment Routes */}
        <Route path="/enterprise/recruitment" element={<EnterpriseLayout><EnterpriseJobsPage /></EnterpriseLayout>} />
        <Route path="/enterprise/recruitment/create" element={<EnterpriseLayout><EnterpriseJobCreatePage /></EnterpriseLayout>} />
        <Route path="/enterprise/recruitment/:id" element={<EnterpriseLayout><EnterpriseJobDetailPage /></EnterpriseLayout>} />
        <Route path="/enterprise/recruitment/:id/edit" element={<EnterpriseLayout><EnterpriseJobCreatePage /></EnterpriseLayout>} />
        <Route path="/enterprise/applications" element={<EnterpriseLayout><EnterpriseApplicationsPage /></EnterpriseLayout>} />
        <Route path="/enterprise/applications/:id" element={<EnterpriseLayout><EnterpriseApplicationDetailPage /></EnterpriseLayout>} />
        <Route path="/enterprise/interviews" element={<EnterpriseLayout><EnterpriseInterviewsPage /></EnterpriseLayout>} />
        <Route path="/enterprise/interviews/schedule" element={<EnterpriseLayout><EnterpriseInterviewSchedulePage /></EnterpriseLayout>} />
        <Route path="/enterprise/interviews/:id" element={<EnterpriseLayout><EnterpriseInterviewDetailPage /></EnterpriseLayout>} />
        <Route path="/enterprise/offers" element={<EnterpriseLayout><EnterpriseOffersPage /></EnterpriseLayout>} />
        <Route path="/enterprise/offers/create" element={<EnterpriseLayout><EnterpriseOfferCreatePage /></EnterpriseLayout>} />
        <Route path="/enterprise/offers/:id" element={<EnterpriseLayout><EnterpriseOfferDetailPage /></EnterpriseLayout>} />

        {/* NGO Routes */}
        <Route path="/ngo" element={<Navigate to="/ngo/dashboard/impact" replace />} />
        <Route path="/ngo/dashboard/impact" element={<NgoLayout><NgoImpactDashboardPage /></NgoLayout>} />
        <Route path="/ngo/sponsorships" element={<NgoLayout><NgoSponsorshipsPage /></NgoLayout>} />
        <Route path="/ngo/sponsorships/create" element={<NgoLayout><NgoSponsorshipCreatePage /></NgoLayout>} />
        <Route path="/ngo/sponsorships/:id/learners" element={<NgoLayout><NgoSponsorshipLearnersPage /></NgoLayout>} />
        <Route path="/ngo/events" element={<NgoLayout><NgoEventsPage /></NgoLayout>} />
        <Route path="/ngo/events/create" element={<NgoLayout><NgoEventCreatePage /></NgoLayout>} />

        {/* Worker Layout Routes */}
        <Route path="/worker" element={<Navigate to="/my-enrollments" replace />} />
        <Route path="/worker/profile" element={<WorkerLayout><WorkerProfilePage /></WorkerLayout>} />
        <Route path="/worker/account-settings" element={<WorkerLayout><WorkerAccountSettingsPage /></WorkerLayout>} />
        <Route path="/worker/analytics" element={<WorkerLayout><WorkerAnalyticsPage /></WorkerLayout>} />
        <Route path="/worker/community" element={<WorkerLayout><Outlet /></WorkerLayout>}>
          <Route index element={<Navigate to="/worker/community/forum" replace />} />
          <Route path="forum" element={<ForumPage />} />
          <Route path="forum/:id" element={<ForumPostDetailPage />} />
          <Route path="mentors" element={<MentorFindPage />} />
          <Route path="my-posts" element={<WorkerPostsPage />} />
        </Route>
        {/* Community Hub */}
        <Route path="/community" element={<CommunityHubPage />} />
        <Route path="/community/forum/:id" element={<ForumPostDetailPage />} />
        <Route path="/community/jobs/:id" element={<CommunityJobDetailPage />} />
        <Route path="/community/events/:id" element={<EventDetailPage />} />
        {/* Jobs Page */}
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        {/* Worker Recruitment Routes */}
        <Route path="/my/applications" element={<WorkerLayout><WorkerApplicationsPage /></WorkerLayout>} />
        <Route path="/my/applications/:id" element={<WorkerLayout><WorkerApplicationDetailPage /></WorkerLayout>} />
        <Route path="/my/interviews" element={<WorkerLayout><WorkerInterviewsPage /></WorkerLayout>} />
        <Route path="/my/interviews/:id" element={<WorkerLayout><WorkerInterviewsPage /></WorkerLayout>} />
        <Route path="/my/offers" element={<WorkerLayout><WorkerOffersPage /></WorkerLayout>} />
        <Route path="/my/offers/:id" element={<WorkerLayout><WorkerOffersPage /></WorkerLayout>} />
        {/* Courses */}
        <Route path="/courses" element={<WorkerLayout><CoursesPage /></WorkerLayout>} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/courses/:id/curriculum" element={<CourseCurriculumPage />} />
        {/* My ISA */}
        <Route path="/my-isa" element={
          <WorkerLayout>
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <IsaDashboardPage />
            </ProtectedRoute>
          </WorkerLayout>
        } />
        {/* My Enrollments */}
        <Route path="/my-enrollments" element={<WorkerLayout><MyEnrollmentsPage /></WorkerLayout>} />
        <Route path="/my-enrollments/:id" element={<WorkerLayout><MyEnrollmentDetailPage /></WorkerLayout>} />
        <Route path="/my-enrollments/:id/checkin" element={<WorkerLayout><CheckinPage /></WorkerLayout>} />
        <Route path="/my-enrollments/:id/learn" element={<WorkerLayout><VideoLearningPage /></WorkerLayout>} />
        <Route path="/my-enrollments/:id/certificate" element={<WorkerLayout><CertificatePage /></WorkerLayout>} />
        <Route path="/verify/:code" element={<WorkerLayout><CertificatePage /></WorkerLayout>} />
        <Route path="/certificates/verify/:code" element={<WorkerLayout><CertificatePage /></WorkerLayout>} />
        <Route path="/verify-certificate" element={<WorkerLayout><CertificateVerifyPage /></WorkerLayout>} />
        <Route path="/account/verification" element={<WorkerLayout><AccountVerificationPage /></WorkerLayout>} />
        <Route path="/opportunity-map" element={
          <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <OpportunityMapPage />
          </div>
        } />
        {/* Scholarships */}
        <Route path="/scholarships" element={<ScholarshipPage />} />
        <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />
        {/* My Applications */}
        <Route path="/my-outcomes" element={<WorkerLayout><MyOutcomesPage /></WorkerLayout>} />
        {/* About */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        {/* Contact */}
        <Route path="/contact" element={<ContactPage />} />
        {/* Payment Return */}
        <Route path="/payment/vnpay-return" element={<VNPayReturnPage />} />
        {/* My Placements */}
        <Route path="/my-placements" element={<WorkerLayout><MyPlacementsPage /></WorkerLayout>} />
        {/* My Learning Records */}
        <Route path="/my-learning-records" element={<WorkerLayout><MyLearningRecordsPage /></WorkerLayout>} />
        <Route path="/my-schedules" element={<WorkerLayout><MySchedulesPage /></WorkerLayout>} />
        <Route path="/my-sponsorships" element={<WorkerLayout><MySponsorshipsPage /></WorkerLayout>} />
        <Route path="/mentor/booking" element={<WorkerLayout><MentorBookingPage /></WorkerLayout>} />
        <Route path="/my-mentor-sessions" element={<WorkerLayout><MyMentorSessionsPage /></WorkerLayout>} />
        <Route path="/my-success-stats" element={<WorkerLayout><MySuccessStatsPage /></WorkerLayout>} />
        {/* Landing Page */}
        <Route path="/" element={
          <LandingLayout>
            <Navbar />
            <HeroSection />
            <StatsBar />
            <CoreProblemsSection />
            <SolutionsSection />
            <HowItWorksSection />
            <CourseCategories />
            <PopularCourses />
            <FeaturesSection />
            <TestimonialsSection />
            <CTASection />
            <Footer />
          </LandingLayout>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Agentation />
    </BrowserRouter>
  );
}

// Dashboard Example Component
function DashboardExample() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-page py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Xin chào, Nguyễn Văn A! 👋</h1>
          <p className="text-muted-foreground">Chúc bạn một ngày học tập hiệu quả!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Khóa học đã hoàn thành"
            value="8"
            change="+2 so với tháng trước"
            changeType="positive"
            icon={BookOpen}
          />
          <StatsCard
            title="Đang theo học"
            value="3"
            change="Tiến độ tốt"
            changeType="positive"
            icon={PlayCircle}
          />
          <StatsCard
            title="Việc làm phù hợp"
            value="12"
            change="5 việc mới"
            changeType="positive"
            icon={Briefcase}
          />
          <StatsCard
            title="Chứng chỉ"
            value="5"
            change="+1 tháng này"
            changeType="positive"
            icon={Award}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continue Learning */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Tiếp tục học</h2>
                <a href="/courses" className="text-sm text-primary hover:underline">Xem tất cả</a>
              </div>
              <div className="grid gap-4">
                <CourseProgressCard
                  title="Nghề hàn xuất khí cơ bản"
                  category="Kỹ thuật"
                  progress={65}
                  thumbnail="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=250&fit=crop"
                  instructor="Trần Văn B"
                  lessonsCompleted={13}
                  totalLessons={20}
                />
                <CourseProgressCard
                  title="Lập trình Python cho người mới"
                  category="IT & Công nghệ"
                  progress={30}
                  thumbnail="https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop"
                  instructor="Lê Thị C"
                  lessonsCompleted={6}
                  totalLessons={20}
                />
              </div>
            </section>

            {/* Recommended Jobs */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Việc làm phù hợp</h2>
                <a href="/jobs" className="text-sm text-primary hover:underline">Xem tất cả</a>
              </div>
              <div className="grid gap-4">
                <JobCard
                  title="Thợ hàn xuất khí"
                  company="Công ty TNHH ABC"
                  location="TP. Hồ Chí Minh"
                  salary="8-12 triệu"
                  type="Toàn thời gian"
                  tags={['Hàn xì', 'Cơ khí', 'Kỹ thuật']}
                  matchScore={95}
                  postedDate="2 ngày trước"
                />
                <JobCard
                  title="Kỹ thuật viên cơ khí"
                  company="Nhà máy XYZ"
                  location="Bình Dương"
                  salary="10-15 triệu"
                  type="Toàn thời gian"
                  tags={['Cơ khí', 'Máy móc', 'Bảo trì']}
                  matchScore={88}
                  postedDate="5 ngày trước"
                />
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Skills */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Kỹ năng của bạn</h3>
                <div className="flex flex-wrap gap-2">
                  <SkillBadge name="Hàn xì" level="intermediate" />
                  <SkillBadge name="Cơ khí" level="beginner" />
                  <SkillBadge name="Python" level="beginner" />
                  <SkillBadge name="Điện tử" level="intermediate" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Thao tác nhanh</h3>
                <div className="grid grid-cols-2 gap-3">
                  <QuickAction icon={BookOpen} label="Khóa học" href="/courses" />
                  <QuickAction icon={Briefcase} label="Việc làm" href="/jobs" />
                  <QuickAction icon={FileText} label="Bài thi" href="/exams" />
                  <QuickAction icon={User} label="Hồ sơ" href="/profile" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Hoạt động gần đây</h3>
                <div className="divide-y divide-border">
                  <ActivityItem
                    type="course"
                    title="Hoàn thành bài 5"
                    description="Nghề hàn xuất khí cơ bản"
                    time="2 giờ trước"
                    icon={PlayCircle}
                  />
                  <ActivityItem
                    type="certificate"
                    title="Nhận chứng chỉ"
                    description="Chứng chỉ Python cơ bản"
                    time="1 ngày trước"
                    icon={Award}
                  />
                  <ActivityItem
                    type="job"
                    title="Ứng tuyển thành công"
                    description="Thợ hàn - Công ty ABC"
                    time="3 ngày trước"
                    icon={Briefcase}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Courses Example
function CoursesExample() {
  const [activeTab, setActiveTab] = useState('all');

  const courses = [
    {
      id: 1,
      title: 'Lập trình Python cơ bản',
      category: 'IT & Công nghệ',
      instructor: 'Lê Thị C',
      price: 'Miễn phí',
      rating: 4.8,
      students: 1234,
      duration: '12 giờ',
      level: 'Người mới',
      isFree: true,
      thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop',
    },
    {
      id: 2,
      title: 'Nghề hàn xuất khí cơ bản',
      category: 'Kỹ thuật',
      instructor: 'Trần Văn B',
      price: '499,000đ',
      originalPrice: '799,000đ',
      rating: 4.9,
      students: 856,
      duration: '20 giờ',
      level: 'Cơ bản',
      isBestseller: true,
      thumbnail: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=250&fit=crop',
    },
    {
      id: 3,
      title: 'Nấu ăn Việt Nam chuyên nghiệp',
      category: 'Nấu ăn',
      instructor: 'Nguyễn Thị D',
      price: '799,000đ',
      rating: 4.7,
      students: 2341,
      duration: '30 giờ',
      level: 'Trung bình',
      thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=250&fit=crop',
    },
    {
      id: 4,
      title: 'May đo thời trang',
      category: 'May mặc',
      instructor: 'Phạm Thị E',
      price: '399,000đ',
      rating: 4.6,
      students: 678,
      duration: '15 giờ',
      level: 'Cơ bản',
      thumbnail: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=250&fit=crop',
    },
    {
      id: 5,
      title: 'Lái xe ô tô B2',
      category: 'Lái xe',
      instructor: 'Hoàng Văn F',
      price: '5,500,000đ',
      rating: 4.8,
      students: 1234,
      duration: '60 giờ',
      level: 'Cơ bản',
      thumbnail: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop',
    },
    {
      id: 6,
      title: 'Marketing Online',
      category: 'Kinh doanh',
      instructor: 'Đặng Thị G',
      price: '599,000đ',
      rating: 4.5,
      students: 987,
      duration: '18 giờ',
      level: 'Trung bình',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
    },
  ];

  const categories = ['Tất cả', 'IT & Công nghệ', 'Kỹ thuật', 'Nấu ăn', 'May mặc', 'Lái xe', 'Kinh doanh'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-page py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Khóa học</h1>
          <p className="text-muted-foreground">Khám phá hơn 50 khóa học chất lượng</p>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              category={course.category}
              instructor={course.instructor}
              price={course.price}
              originalPrice={course.originalPrice}
              rating={course.rating}
              students={course.students}
              duration={course.duration}
              isFree={course.isFree}
              isBestseller={course.isBestseller}
              thumbnail={course.thumbnail}
              onClick={() => window.location.href = `/courses/${course.id}`}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Course Detail Example
function CourseDetailExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* Course Header */}
      <div className="bg-slate-900 text-white py-8">
        <div className="container-page">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Badge variant="outline" className="mb-4 border-white/20 text-white">
                Kỹ thuật
              </Badge>
              <h1 className="text-3xl font-bold mb-4">Nghề hàn xuất khí cơ bản</h1>
              <p className="text-lg text-slate-300 mb-6">
                Học cách hàn xì từ cơ bản đến nâng cao, được giảng dạy bởi chuyên gia hàng đầu.
              </p>
              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1">
                  <StarIcon className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">4.9</span>
                  <span className="text-slate-400">(856 đánh giá)</span>
                </span>
                <span className="text-slate-300">856 học viên</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Avatar fallback="TB" />
                <span className="text-sm">Giảng viên: Trần Văn B</span>
              </div>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <img
                    src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=340&fit=crop"
                    alt="Course"
                    className="w-full aspect-video object-cover rounded-lg mb-4"
                  />
                  <div className="text-center">
                    <span className="text-3xl font-bold">499,000đ</span>
                    <span className="text-slate-400 line-through ml-2">799,000đ</span>
                  </div>
                  <Button className="w-full mt-4">Đăng ký khóa học</Button>
                  <ul className="mt-6 space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-success" />
                      20 bài học video
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-success" />
                      Truy cập trọn đời
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-success" />
                      Chứng chỉ hoàn thành
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-success" />
                      Hỗ trợ 24/7
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <main className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="curriculum">Nội dung</TabsTrigger>
                <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Mô tả khóa học</h3>
                    <p className="text-muted-foreground mb-6">
                      Khóa học này cung cấp kiến thức toàn diện về nghề hàn xuất khí, từ những khái niệm cơ bản đến các kỹ thuật nâng cao. Bạn sẽ được học cách sử dụng các thiết bị hàn, hiểu về an toàn lao động và thực hành các bài hàn thực tế.
                    </p>
                    <h3 className="font-semibold mb-4">Bạn sẽ học được gì?</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span>Các loại mối hàn và ứng dụng</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span>Sử dụng thành thạo máy hàn</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span>Quy trình hàn an toàn</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span>Đọc bản vẽ kỹ thuật</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="curriculum">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="border border-border rounded-lg">
                        <div className="px-4 py-3 bg-muted font-medium">Phần 1: Giới thiệu (3 bài)</div>
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between py-2">
                            <span className="flex items-center gap-2">
                              <PlayIcon className="h-4 w-4" /> Giới thiệu về nghề hàn
                            </span>
                            <span className="text-muted-foreground text-sm">10:00</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="flex items-center gap-2">
                              <PlayIcon className="h-4 w-4" /> Các loại mối hàn
                            </span>
                            <span className="text-muted-foreground text-sm">15:00</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="flex items-center gap-2">
                              <FileTextIcon className="h-4 w-4" /> Tài liệu học tập
                            </span>
                            <span className="text-muted-foreground text-sm">PDF</span>
                          </div>
                        </div>
                      </div>
                      <div className="border border-border rounded-lg">
                        <div className="px-4 py-3 bg-muted font-medium">Phần 2: An toàn lao động (4 bài)</div>
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between py-2">
                            <span className="flex items-center gap-2">
                              <PlayIcon className="h-4 w-4" /> Trang bị bảo hộ
                            </span>
                            <span className="text-muted-foreground text-sm">12:00</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="flex items-center gap-2">
                              <PlayIcon className="h-4 w-4" /> Quy định an toàn
                            </span>
                            <span className="text-muted-foreground text-sm">18:00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="reviews">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-center">
                        <span className="text-4xl font-bold">4.9</span>
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <StarIcon key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">856 đánh giá</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="border-b border-border pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar size="sm" fallback="NA" />
                          <span className="font-medium">Nguyễn Anh</span>
                          <div className="flex gap-0.5 ml-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <StarIcon key={i} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Khóa học rất bổ ích, giảng viên dạy chi tiết và dễ hiểu.</p>
                      </div>
                      <div className="border-b border-border pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar size="sm" fallback="TB" />
                          <span className="font-medium">Trần Bình</span>
                          <div className="flex gap-0.5 ml-2">
                            {[1, 2, 3, 4].map((i) => (
                              <StarIcon key={i} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Nội dung phong phú, có nhiều bài thực hành.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Jobs Example
function JobsExample() {
  const jobs = [
    {
      id: 1,
      title: 'Thợ hàn xuất khí',
      company: 'Công ty TNHH ABC',
      location: 'TP. Hồ Chí Minh',
      salary: '8-12 triệu',
      type: 'Toàn thời gian',
      tags: ['Hàn xì', 'Cơ khí', 'Kỹ thuật'],
      matchScore: 95,
      postedDate: '2 ngày trước',
      logo: 'https://api.dicebear.com/7.x/initials/svg?seed=ABC',
    },
    {
      id: 2,
      title: 'Kỹ thuật viên cơ khí',
      company: 'Nhà máy XYZ',
      location: 'Bình Dương',
      salary: '10-15 triệu',
      type: 'Toàn thời gian',
      tags: ['Cơ khí', 'Máy móc', 'Bảo trì'],
      matchScore: 88,
      postedDate: '5 ngày trước',
      logo: 'https://api.dicebear.com/7.x/initials/svg?seed=XYZ',
    },
    {
      id: 3,
      title: 'Lập trình viên Python',
      company: 'Tech Solutions',
      location: 'TP. Hồ Chí Minh',
      salary: '15-20 triệu',
      type: 'Toàn thời gian',
      tags: ['Python', 'IT', 'Backend'],
      matchScore: 75,
      postedDate: '1 tuần trước',
      logo: 'https://api.dicebear.com/7.x/initials/svg?seed=TS',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-page py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Việc làm phù hợp</h1>
          <p className="text-muted-foreground">Dựa trên kỹ năng và sở thích của bạn</p>
        </div>

        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} variant="interactive">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <img src={job.logo} alt={job.company} className="h-16 w-16 rounded-lg bg-muted" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-muted-foreground">{job.company}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-success font-medium">
                        <DollarSign className="h-4 w-4" /> {job.salary}
                      </span>
                      <Badge variant="outline">{job.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.tags.map((tag) => (
                        <Badge key={tag} variant="muted">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex md:flex-col items-center gap-3">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success font-bold">
                        {job.matchScore}%
                      </div>
                      <span className="text-xs text-muted-foreground">Phù hợp</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Lưu</Button>
                      <Button size="sm">Nộp đơn</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Icons
const BookOpen = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const PlayCircle = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

const Briefcase = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>
);

const Award = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

const FileText = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
  </svg>
);

const User = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const PlayIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const FileTextIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MapPin = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const DollarSign = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export default App;
