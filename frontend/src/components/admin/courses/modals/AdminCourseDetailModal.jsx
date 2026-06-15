import { X, Check, AlertTriangle, Clock, Users, Star, BookOpen, Award } from 'lucide-react';
import { Button, Badge, SafeImage } from '@/components/ui';
import { formatPrice, formatDuration } from '@/utils/formatter';

const STATUS_CONFIG = {
  draft: { label: 'Nháp', bg: 'bg-[hsl(var(--admin-surface-elevated))]', text: 'text-[hsl(var(--admin-text-muted))]' },
  pending: { label: 'Chờ duyệt', bg: 'bg-amber-500/10', text: 'text-amber-500' },
  approved: { label: 'Đã duyệt', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  rejected: { label: 'Từ chối', bg: 'bg-rose-500/10', text: 'text-rose-500' },
};

const AdminCourseDetailModal = ({ course, onClose, onApprove, onReject }) => {
  if (!course) return null;

  const status = STATUS_CONFIG[course.status] || STATUS_CONFIG.draft;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--admin-border))]">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--admin-text-primary))]">Chi tiết khóa học</h2>
            <p className="text-sm text-[hsl(var(--admin-text-muted))]">{course.provider?.displayName || 'Không xác định'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[hsl(var(--admin-text-muted))]" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            <div className="flex gap-6">
              <div className="w-64 flex-shrink-0">
                <div className="aspect-video rounded-lg overflow-hidden bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))]">
                  {course.thumbnail ? (
                    <SafeImage src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[hsl(var(--admin-text-muted))]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-[hsl(var(--admin-text-primary))]">{course.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>{status.label}</span>
                </div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-4">{course.provider?.displayName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                    <Users className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                    <span>{course.currentStudents || 0}/{course.maxStudents || '-'} học viên</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                    <Clock className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
                    <span>{course.duration ? formatDuration(course.duration) : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>
                      {course.rating?.average ? `${course.rating.average.toFixed(1)} (${course.rating.count} đánh giá)` : 'Chưa có đánh giá'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--admin-accent))]">
                    {course.fundingConfig?.type === 'FREE' ? 'Miễn phí' : formatPrice(course.fundingConfig?.price || 0)}
                  </div>
                </div>
              </div>
            </div>

            {course.status === 'rejected' && course.rejectionReason && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-rose-500">Lý do từ chối:</p>
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">{course.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-1">Danh mục</p>
                <p className="text-[hsl(var(--admin-text-primary))]">{course.category?.name || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-1">Hình thức</p>
                <p className="text-[hsl(var(--admin-text-primary))] capitalize">
                  {course.location?.type === 'online' ? 'Trực tuyến' :
                   course.location?.type === 'offline' ? 'Tại lớp' :
                   course.location?.type === 'hybrid' ? 'Kết hợp' : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-1">Học bổng</p>
                <p className="text-[hsl(var(--admin-text-primary))]">{course.scholarshipEligibility ? 'Có hỗ trợ' : 'Không'}</p>
              </div>
            </div>

            {course.shortDescription && (
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-2">Mô tả ngắn</p>
                <p className="text-[hsl(var(--admin-text-primary))]">{course.shortDescription}</p>
              </div>
            )}

            {course.description && (
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-2">Mô tả chi tiết</p>
                <p className="text-[hsl(var(--admin-text-secondary))] whitespace-pre-wrap">{course.description}</p>
              </div>
            )}

            {course.skills && course.skills.length > 0 && (
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-2">Kỹ năng đạt được</p>
                <div className="flex flex-wrap gap-2">
                  {course.skills.map((skill, index) => (
                    <Badge key={index} className="bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {course.syllabus && course.syllabus.length > 0 && (
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-2">Giáo trình ({course.syllabus.length} buổi)</p>
                <div className="space-y-2">
                  {course.syllabus.map((session, index) => (
                    <div key={index} className="p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                      <p className="font-medium text-sm text-[hsl(var(--admin-text-primary))]">
                        Buổi {index + 1}: {session.title || session.name || `Phần ${index + 1}`}
                      </p>
                      {session.duration && <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-1">Thời lượng: {session.duration}</p>}
                      {session.description && <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">{session.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {course.certificate && (
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))] mb-2">Chứng chỉ</p>
                <div className="flex items-center gap-2 p-3 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl">
                  <Award className="w-5 h-5 text-[hsl(var(--admin-accent))]" />
                  <span className="text-[hsl(var(--admin-text-primary))]">{course.certificate}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[hsl(var(--admin-border))]">
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))]">Ngày tạo</p>
                <p className="text-sm text-[hsl(var(--admin-text-primary))] tabular-nums">{formatDate(course.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--admin-text-muted))]">Cập nhật lần cuối</p>
                <p className="text-sm text-[hsl(var(--admin-text-primary))] tabular-nums">{formatDate(course.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]">
          <Button variant="outline" onClick={onClose} className="border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl">Đóng</Button>
          {course.status === 'pending' && (
            <>
              <Button variant="outline" onClick={onReject}
                className="border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl">
                Từ chối
              </Button>
              <Button onClick={onApprove} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
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
