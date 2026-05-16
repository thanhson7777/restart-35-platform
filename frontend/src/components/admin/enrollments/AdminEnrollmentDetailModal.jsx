import { useState } from 'react';
import { X, User, BookOpen, GraduationCap, FileText, Award, Star, DollarSign, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Button, Badge, Avatar } from '@/components/ui';
import { Progress } from '@/components/ui/Progress';
import { formatPrice, formatDate } from '@/utils/formatter';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: User },
  { id: 'progress', label: 'Tiến độ', icon: BookOpen },
  { id: 'assessments', label: 'Điểm thi', icon: GraduationCap },
  { id: 'attendance', label: 'Điểm danh', icon: CheckCircle },
  { id: 'scholarship', label: 'Học bổng', icon: DollarSign },
  { id: 'reviews', label: 'Đánh giá', icon: Star }
];

const STATUS_CONFIG = {
  enrolled: { label: 'Đã đăng ký', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  in_progress: { label: 'Đang tiến hành', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  completed: { label: 'Hoàn thành', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  waitlist: { label: 'Chờ xếp lớp', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  dropped: { label: 'Đã bỏ cuộc', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  cancelled: { label: 'Đã hủy', bgColor: 'bg-slate-100', textColor: 'text-slate-500' }
};

const AdminEnrollmentDetailModal = ({ enrollment, open, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!open || !enrollment) return null;

  const status = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.enrolled;

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* User Info */}
      <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
        <Avatar
          src={enrollment.user?.avatar}
          name={enrollment.user?.displayName}
          size="lg"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{enrollment.user?.displayName || 'N/A'}</h3>
          <p className="text-sm text-slate-600">{enrollment.user?.email || '-'}</p>
          <p className="text-sm text-slate-500">{enrollment.user?.phone || '-'}</p>
        </div>
        <Badge className={`${status.bgColor} ${status.textColor} border-0`}>
          {status.label}
        </Badge>
      </div>

      {/* Course Info */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Thông tin khóa học
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Khóa học</p>
            <p className="font-medium">{enrollment.course?.title || enrollment.courseTitle || 'N/A'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Hình thức</p>
            <p className="font-medium">{enrollment.course?.location?.type || 'Online'}</p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Ngày đăng ký
          </p>
          <p className="font-medium text-sm">{formatDate(enrollment.enrolledAt)}</p>
        </div>
        <div className="p-3 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Ngày bắt đầu
          </p>
          <p className="font-medium text-sm">{formatDate(enrollment.startDate) || 'Chưa bắt đầu'}</p>
        </div>
        <div className="p-3 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Award className="w-3 h-3" /> Ngày hoàn thành
          </p>
          <p className="font-medium text-sm">{formatDate(enrollment.completedAt) || '-'}</p>
        </div>
      </div>

      {/* Fee */}
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          Thông tin học phí
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-600">Tổng học phí</p>
            <p className="text-lg font-bold text-green-700">{formatPrice(enrollment.fee?.total || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Đã thanh toán</p>
            <p className="text-lg font-bold text-green-600">{formatPrice(enrollment.fee?.paid || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Còn nợ</p>
            <p className="text-lg font-bold text-amber-600">{formatPrice(enrollment.fee?.pending || 0)}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {enrollment.notes && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700 mb-1 font-medium">Ghi chú</p>
          <p className="text-sm text-amber-800">{enrollment.notes}</p>
        </div>
      )}
    </div>
  );

  const renderProgressTab = () => {
    const progress = enrollment.progress || {};
    const percentage = progress.percentage || 0;

    return (
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Tiến độ học tập</span>
            <span className="text-2xl font-bold text-primary">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Buổi học hiện tại: {progress.currentLesson || 0}</span>
            <span>Tổng buổi: {progress.totalLessons || 0}</span>
          </div>
        </div>

        {/* Completion Status */}
        {enrollment.status === 'completed' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <Award className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Khóa học đã hoàn thành!</p>
              <p className="text-sm text-green-600">
                Hoàn thành ngày: {formatDate(enrollment.completedAt)}
              </p>
            </div>
          </div>
        )}

        {/* Certificate */}
        {enrollment.status === 'completed' && (
          <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-2" />
            <p className="font-medium text-slate-700">Chứng chỉ hoàn thành</p>
            <p className="text-sm text-slate-500 mt-1">
              Học viên đủ điều kiện nhận chứng chỉ
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Tải xuống chứng chỉ
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderAssessmentsTab = () => {
    const assessments = enrollment.assessments || [];

    if (assessments.length === 0) {
      return (
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Chưa có điểm thi nào</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {assessments.map((assessment, index) => (
          <div key={index} className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{assessment.name}</p>
                <p className="text-xs text-slate-500">
                  Ngày thi: {formatDate(assessment.date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{assessment.score ?? '-'}/100</p>
                {assessment.passed !== null && (
                  <Badge variant={assessment.passed ? 'success' : 'destructive'} className="mt-1">
                    {assessment.passed ? 'Đạt' : 'Không đạt'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAttendanceTab = () => {
    const attendance = enrollment.attendance || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-green-600">{attendance.present || 0}</p>
            <p className="text-xs text-slate-600 mt-1">Có mặt</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-red-600">{attendance.absent || 0}</p>
            <p className="text-xs text-slate-600 mt-1">Vắng mặt</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-amber-600">{attendance.late || 0}</p>
            <p className="text-xs text-slate-600 mt-1">Trễ</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-slate-600">{attendance.totalSessions || 0}</p>
            <p className="text-xs text-slate-600 mt-1">Tổng buổi</p>
          </div>
        </div>

        {attendance.totalSessions > 0 && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Tỷ lệ tham gia</p>
            <div className="flex items-center gap-3">
              <Progress
                value={((attendance.present || 0) / attendance.totalSessions) * 100}
                className="flex-1"
              />
              <span className="text-sm font-medium">
                {Math.round(((attendance.present || 0) / attendance.totalSessions) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScholarshipTab = () => {
    const scholarship = enrollment.scholarship || {};

    if (!scholarship.scholarshipId) {
      return (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Không có học bổng</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-6 h-6 text-purple-600" />
            <span className="font-medium text-purple-800">Thông tin học bổng</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600">Mức hỗ trợ</p>
              <p className="font-medium">
                {scholarship.coverage === 'full' ? '100%' :
                 scholarship.coverage === 'partial' ? '50%' : '0%'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Số tiền tài trợ</p>
              <p className="font-medium text-green-600">{formatPrice(scholarship.fundedAmount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-500">Đã giải ngân</p>
            <p className="font-bold text-green-600">{formatPrice(scholarship.disbursedAmount || 0)}</p>
          </div>
          <div className="p-3 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-500">Clawback</p>
            <p className="font-bold text-red-600">{formatPrice(scholarship.clawbackAmount || 0)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewsTab = () => (
    <div className="text-center py-12">
      <Star className="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <p className="text-slate-500">Chưa có đánh giá nào</p>
      <p className="text-sm text-slate-400 mt-1">
        Đánh giá sẽ hiển thị sau khi khóa học hoàn thành
      </p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'progress': return renderProgressTab();
      case 'assessments': return renderAssessmentsTab();
      case 'attendance': return renderAttendanceTab();
      case 'scholarship': return renderScholarshipTab();
      case 'reviews': return renderReviewsTab();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Chi tiết đăng ký</h2>
            <p className="text-sm text-slate-500">
              {enrollment.course?.title || enrollment.courseTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminEnrollmentDetailModal;
