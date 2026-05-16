import { X, Check, AlertTriangle, Clock, Users, Star, BookOpen, Award } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { formatPrice, formatDuration } from '@/utils/formatter';

const STATUS_CONFIG = {
  draft: { label: 'Nháp', bg: 'bg-slate-100', text: 'text-slate-600' },
  pending: { label: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { label: 'Đã duyệt', bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { label: 'Từ chối', bg: 'bg-red-100', text: 'text-red-700' },
};

const LEVEL_LABELS = {
  beginner: 'Người mới bắt đầu',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

const AdminCourseDetailModal = ({ course, onClose, onApprove, onReject }) => {
  if (!course) return null;

  const status = STATUS_CONFIG[course.status] || STATUS_CONFIG.draft;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Chi tiết khóa học
            </h2>
            <p className="text-sm text-slate-500">
              {course.provider?.displayName || 'Không xác định'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Thumbnail & Basic Info */}
            <div className="flex gap-6">
              <div className="w-64 flex-shrink-0">
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      📚
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {course.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mb-4">
                  {course.provider?.displayName}
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{course.currentStudents || 0}/{course.maxStudents || '-'} học viên</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{course.duration ? formatDuration(course.duration) : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-slate-400" />
                    <span>
                      {course.rating?.average
                        ? `${course.rating.average.toFixed(1)} (${course.rating.count} đánh giá)`
                        : 'Chưa có đánh giá'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    {course.isFree || course.fee === 0
                      ? 'Miễn phí'
                      : formatPrice(course.fee)}
                  </div>
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            {course.status === 'rejected' && course.rejectionReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Lý do từ chối:</p>
                    <p className="text-sm text-red-700 mt-1">{course.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Danh mục</p>
                <p className="text-foreground">{course.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Cấp độ</p>
                <p className="text-foreground">{LEVEL_LABELS[course.level] || course.level || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Hình thức</p>
                <p className="text-foreground capitalize">
                  {course.location?.type === 'online' ? 'Trực tuyến' :
                   course.location?.type === 'offline' ? 'Tại lớp' :
                   course.location?.type === 'hybrid' ? 'Kết hợp' : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Học bổng</p>
                <p className="text-foreground">
                  {course.scholarshipEligibility ? 'Có hỗ trợ' : 'Không'}
                </p>
              </div>
            </div>

            {/* Short Description */}
            {course.shortDescription && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Mô tả ngắn</p>
                <p className="text-foreground">{course.shortDescription}</p>
              </div>
            )}

            {/* Full Description */}
            {course.description && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Mô tả chi tiết</p>
                <p className="text-foreground whitespace-pre-wrap">{course.description}</p>
              </div>
            )}

            {/* Skills */}
            {course.skills && course.skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Kỹ năng đạt được</p>
                <div className="flex flex-wrap gap-2">
                  {course.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Syllabus */}
            {course.syllabus && course.syllabus.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">
                  Giáo trình ({course.syllabus.length} buổi)
                </p>
                <div className="space-y-2">
                  {course.syllabus.map((session, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <p className="font-medium text-sm">
                        Buổi {index + 1}: {session.title || session.name || `Phần ${index + 1}`}
                      </p>
                      {session.duration && (
                        <p className="text-xs text-slate-500 mt-1">
                          Thời lượng: {session.duration}
                        </p>
                      )}
                      {session.description && (
                        <p className="text-sm text-slate-600 mt-1">
                          {session.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate */}
            {course.certificate && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Chứng chỉ</p>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{course.certificate}</span>
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-500">Ngày tạo</p>
                <p className="text-sm text-foreground">{formatDate(course.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Cập nhật lần cuối</p>
                <p className="text-sm text-foreground">{formatDate(course.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          {course.status === 'pending' && (
            <>
              <Button
                variant="outline"
                onClick={onReject}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Từ chối
              </Button>
              <Button
                onClick={onApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Duyệt khóa học
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCourseDetailModal;
