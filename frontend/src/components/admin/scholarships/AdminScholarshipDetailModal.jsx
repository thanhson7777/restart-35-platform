import { useState } from 'react';
import { X, MapPin, Users, Calendar, DollarSign, BookOpen, FileText } from 'lucide-react';
import { Button, Badge, Progress, Avatar } from '@/components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const statusConfig = {
  draft: { label: 'Nháp', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
  active: { label: 'Đang hoạt động', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  paused: { label: 'Tạm dừng', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  exhausted: { label: 'Đã hết ngân sách', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  expired: { label: 'Hết hạn', className: 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]' },
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy', { locale: vi }); }
  catch { return '-'; }
};

const StatCard = ({ label, value, colorClass, icon: Icon }) => (
  <div className={`p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl`}>
    <div className={`flex items-center gap-2 mb-2`}>
      {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
      <span className="text-sm font-medium text-[hsl(var(--admin-text-muted))]">{label}</span>
    </div>
    <p className={`text-2xl font-bold ${colorClass.replace('text-', 'text-')}`}>{value}</p>
  </div>
);

const AdminScholarshipDetailModal = ({ scholarship, open, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');

  if (!open || !scholarship) return null;

  const statusInfo = statusConfig[scholarship.status] || statusConfig.draft;
  const budgetPercentage = scholarship.budget > 0 ? Math.round((scholarship.spent / scholarship.budget) * 100) : 0;
  const eligibility = scholarship.eligibilityCriteria || {};
  const applicationStats = scholarship.applicationStats?.byStatus || {};
  const totalApplications = Object.values(applicationStats).reduce((sum, count) => sum + count, 0) || 0;

  const tabs = [
    { key: 'info', label: 'Thông tin chung' },
    { key: 'eligibility', label: 'Điều kiện nhận' },
    { key: 'courses', label: 'Khóa học liên kết' },
    { key: 'applications', label: 'Đơn đăng ký' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex items-center gap-4">
            <img
              src={scholarship.thumbnail || 'https://picsum.photos/seed/sch/80/60'}
              alt={scholarship.title}
              className="w-20 h-14 rounded-lg object-cover bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]"
            />
            <div>
              <h2 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">{scholarship.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                  {statusConfig[scholarship.status]?.label || scholarship.status}
                </span>
                {scholarship.ngo && (
                  <span className="flex items-center gap-1.5 text-sm text-[hsl(var(--admin-text-muted))]">
                    <Avatar src={scholarship.ngo.avatar} fallback={scholarship.ngo.displayName?.charAt(0) || 'N'} className="w-5 h-5" />
                    {scholarship.ngo.displayName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-[hsl(var(--admin-border))] overflow-x-auto bg-[hsl(var(--admin-surface-elevated))]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {scholarship.description && (
                <div>
                  <h3 className="font-medium text-[hsl(var(--admin-text-primary))] mb-2">Mô tả</h3>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{scholarship.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <DollarSign className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
                    <span className="text-sm font-medium">Ngân sách</span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{formatCurrency(scholarship.budget)}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-[hsl(var(--admin-text-muted))] mb-1">
                      <span>Đã sử dụng</span>
                      <span>{formatCurrency(scholarship.spent)} ({budgetPercentage}%)</span>
                    </div>
                    <Progress value={budgetPercentage} className="h-2" />
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-2">
                    Còn lại: <span className="text-emerald-500 font-semibold">{formatCurrency(scholarship.remaining)}</span>
                  </p>
                </div>

                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Người nhận</span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
                    {scholarship.currentRecipients || 0} / {scholarship.maxRecipients}
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={scholarship.maxRecipients > 0 ? (scholarship.currentRecipients / scholarship.maxRecipients) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-2">
                    Mỗi người: <span className="text-[hsl(var(--admin-text-primary))] font-semibold">{formatCurrency(scholarship.amountPerRecipient)}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Thời gian nhận đơn</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                    {formatDate(scholarship.applicationPeriod?.startDate)} - {formatDate(scholarship.applicationPeriod?.endDate)}
                  </p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <div className="flex items-center gap-2 text-[hsl(var(--admin-text-muted))] mb-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Thời gian giải ngân</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--admin-text-primary))]">
                    {formatDate(scholarship.disbursementPeriod?.startDate)} - {formatDate(scholarship.disbursementPeriod?.endDate)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-[hsl(var(--admin-text-primary))] mb-3">Thống kê đơn đăng ký</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Tổng đơn', value: totalApplications, color: 'text-[hsl(var(--admin-accent))]' },
                    { label: 'Chờ duyệt', value: applicationStats.submitted || 0, color: 'text-amber-500' },
                    { label: 'Đã duyệt', value: applicationStats.approved || 0, color: 'text-emerald-500' },
                    { label: 'Từ chối', value: applicationStats.rejected || 0, color: 'text-rose-500' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl text-center">
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eligibility' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <h4 className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mb-1">Độ tuổi</h4>
                  <p className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">{eligibility.ageMin || 18} - {eligibility.ageMax || 65} tuổi</p>
                </div>
                <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <h4 className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mb-1">Thu nhập tối đa</h4>
                  <p className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">{eligibility.maxIncome ? formatCurrency(eligibility.maxIncome) : 'Không giới hạn'}</p>
                </div>
              </div>

              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <h4 className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-rose-500" /> Khu vực áp dụng
                </h4>
                {eligibility.provinces && eligibility.provinces.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {eligibility.provinces.map((prov, i) => (
                      <Badge key={i} className="bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">{prov}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[hsl(var(--admin-text-muted))]">Tất cả các tỉnh/thành</p>
                )}
              </div>

              <div className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                <h4 className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mb-2 flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-purple-500" /> Kỹ năng phù hợp
                </h4>
                {eligibility.targetSkills && eligibility.targetSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {eligibility.targetSkills.map((skill, i) => (
                      <Badge key={i} className="bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">{skill}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[hsl(var(--admin-text-muted))]">Tất cả kỹ năng</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div>
              {scholarship.linkedCourses && scholarship.linkedCourses.length > 0 ? (
                <div className="space-y-3">
                  {scholarship.linkedCourses.map((course, i) => (
                    <div key={i} className="p-4 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
                        <div>
                          <p className="font-medium text-[hsl(var(--admin-text-primary))]">Khóa học ID: {course.courseId}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                            Phạm vi: {course.coverage === 'full' ? 'Toàn phần' : course.coverage === 'partial' ? 'Một phần' : 'Không'}
                            {course.maxAmount && ` (Tối đa: ${formatCurrency(course.maxAmount)})`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[hsl(var(--admin-text-muted))]">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Chưa có khóa học nào được liên kết</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="text-center py-8 text-[hsl(var(--admin-text-muted))]">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Danh sách đơn đăng ký sẽ được hiển thị tại đây</p>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">(Có thể tích hợp thêm bảng đơn đăng ký chi tiết)</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))]">
          <Button variant="outline" onClick={onClose} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminScholarshipDetailModal;
