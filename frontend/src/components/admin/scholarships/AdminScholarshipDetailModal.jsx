import { useState } from 'react';
import { X, ExternalLink, MapPin, Users, Calendar, DollarSign, BookOpen, FileText } from 'lucide-react';
import { Button, Badge, Progress, Avatar, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  draft: { label: 'Nháp', className: 'bg-slate-100 text-slate-700' },
  active: { label: 'Đang hoạt động', className: 'bg-green-100 text-green-700' },
  paused: { label: 'Tạm dừng', className: 'bg-amber-100 text-amber-700' },
  exhausted: { label: 'Đã hết ngân sách', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Hết hạn', className: 'bg-gray-100 text-gray-700' },
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '-';
  }
};

const AdminScholarshipDetailModal = ({ scholarship, open, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');

  if (!open || !scholarship) return null;

  const statusInfo = statusConfig[scholarship.status] || statusConfig.draft;
  const budgetPercentage = scholarship.budget > 0
    ? Math.round((scholarship.spent / scholarship.budget) * 100)
    : 0;

  const eligibility = scholarship.eligibilityCriteria || {};
  const applicationStats = scholarship.applicationStats?.byStatus || {};
  const totalApplications = Object.values(applicationStats).reduce((sum, count) => sum + count, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <img
              src={scholarship.thumbnail || 'https://via.placeholder.com/80x60?text=Học+bổng'}
              alt={scholarship.title}
              className="w-20 h-14 rounded-lg object-cover bg-slate-100"
            />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {scholarship.title}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                {scholarship.ngo && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Avatar
                      src={scholarship.ngo.avatar}
                      fallback={scholarship.ngo.displayName?.charAt(0) || 'N'}
                      size="xs"
                    />
                    <span>{scholarship.ngo.displayName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="info">Thông tin chung</TabsTrigger>
              <TabsTrigger value="eligibility">Điều kiện nhận</TabsTrigger>
              <TabsTrigger value="courses">Khóa học liên kết</TabsTrigger>
              <TabsTrigger value="applications">
                Đơn đăng ký
                {totalApplications > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalApplications}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab 1: Thông tin chung */}
          <TabsContent value="info" className="space-y-6">
            {scholarship.description && (
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Mô tả</h3>
                <p className="text-sm text-slate-600">{scholarship.description}</p>
              </div>
            )}

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Ngân sách</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(scholarship.budget)}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Đã sử dụng</span>
                    <span>{formatCurrency(scholarship.spent)} ({budgetPercentage}%)</span>
                  </div>
                  <Progress value={budgetPercentage} className="h-2" />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Còn lại: <span className="font-medium text-green-600">{formatCurrency(scholarship.remaining)}</span>
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Người nhận</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {scholarship.currentRecipients || 0} / {scholarship.maxRecipients}
                </p>
                <div className="mt-3">
                  <Progress
                    value={scholarship.maxRecipients > 0 ? (scholarship.currentRecipients / scholarship.maxRecipients) * 100 : 0}
                    className="h-2"
                    variant={scholarship.currentRecipients >= scholarship.maxRecipients ? 'destructive' : 'default'}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Mỗi người: <span className="font-medium">{formatCurrency(scholarship.amountPerRecipient)}</span>
                </p>
              </div>
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Thời gian nhận đơn</span>
                </div>
                <p className="text-sm text-slate-900">
                  {formatDate(scholarship.applicationPeriod?.startDate)} - {formatDate(scholarship.applicationPeriod?.endDate)}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Thời gian giải ngân</span>
                </div>
                <p className="text-sm text-slate-900">
                  {formatDate(scholarship.disbursementPeriod?.startDate)} - {formatDate(scholarship.disbursementPeriod?.endDate)}
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Thống kê đơn đăng ký</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{totalApplications}</p>
                  <p className="text-xs text-slate-600">Tổng đơn</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-600">{applicationStats.submitted || 0}</p>
                  <p className="text-xs text-slate-600">Chờ duyệt</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{applicationStats.approved || 0}</p>
                  <p className="text-xs text-slate-600">Đã duyệt</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{applicationStats.rejected || 0}</p>
                  <p className="text-xs text-slate-600">Từ chối</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Điều kiện nhận */}
          <TabsContent value="eligibility" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-600 mb-1">Độ tuổi</h4>
                <p className="text-lg font-semibold text-slate-900">
                  {eligibility.ageMin || 18} - {eligibility.ageMax || 65} tuổi
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-600 mb-1">Thu nhập tối đa</h4>
                <p className="text-lg font-semibold text-slate-900">
                  {eligibility.maxIncome ? formatCurrency(eligibility.maxIncome) : 'Không giới hạn'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-600 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Khu vực áp dụng
              </h4>
              {eligibility.provinces && eligibility.provinces.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {eligibility.provinces.map((province, index) => (
                    <Badge key={index} variant="secondary">{province}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Tất cả các tỉnh/thành</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-600 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Kỹ năng phù hợp
              </h4>
              {eligibility.targetSkills && eligibility.targetSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {eligibility.targetSkills.map((skill, index) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Tất cả kỹ năng</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-600 mb-2">Trình độ học vấn</h4>
              {eligibility.education && eligibility.education.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {eligibility.education.map((edu, index) => (
                    <Badge key={index} variant="secondary">{edu}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Tất cả trình độ</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-600 mb-2">Tình trạng việc làm</h4>
              {eligibility.employmentStatus && eligibility.employmentStatus.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {eligibility.employmentStatus.map((status, index) => (
                    <Badge key={index} variant="secondary">
                      {status === 'unemployed' ? 'Thất nghiệp' :
                       status === 'underemployed' ? 'Thiếu việc làm' :
                       status === 'employed' ? 'Đang làm' : 'Đã nghỉ hưu'}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Tất cả tình trạng</p>
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Khóa học liên kết */}
          <TabsContent value="courses">
            {scholarship.linkedCourses && scholarship.linkedCourses.length > 0 ? (
              <div className="space-y-3">
                {scholarship.linkedCourses.map((course, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">Khóa học ID: {course.courseId}</p>
                        <p className="text-sm text-slate-500">
                          Phạm vi: {course.coverage === 'full' ? 'Toàn phần' :
                                    course.coverage === 'partial' ? 'Một phần' : 'Không'}
                          {course.maxAmount && ` (Tối đa: ${formatCurrency(course.maxAmount)})`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Chưa có khóa học nào được liên kết</p>
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Đơn đăng ký */}
          <TabsContent value="applications">
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Danh sách đơn đăng ký sẽ được hiển thị tại đây</p>
              <p className="text-sm text-slate-400 mt-1">
                (Có thể tích hợp thêm bảng đơn đăng ký chi tiết)
              </p>
            </div>
          </TabsContent>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminScholarshipDetailModal;
