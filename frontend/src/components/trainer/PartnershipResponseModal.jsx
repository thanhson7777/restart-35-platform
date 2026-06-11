import React, { useState, useEffect } from 'react';
import { Send, X, BookOpen, CheckSquare, Square } from 'lucide-react';
import { Button, Textarea } from '@/components/ui';
import { getMyCourses } from '@/apis/trainerApi';

const PartnershipResponseModal = ({ isOpen, onClose, partnership, onSuccess, loading = false }) => {
  const [responseStatus, setResponseStatus] = useState('negotiating');
  const [responseText, setResponseText] = useState('');
  const [proposedCourseIds, setProposedCourseIds] = useState([]);
  const [myCourses, setMyCourses] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const fetchCourses = async () => {
        try {
          const res = await getMyCourses({ limit: 50 });
          setMyCourses(res.data?.data || []);
        } catch (err) {
          console.error('Lỗi lấy khóa học', err);
        }
      };
      fetchCourses();
    } else {
      setProposedCourseIds([]);
      setResponseText('');
      setResponseStatus('negotiating');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!responseText.trim()) return;
    onSuccess?.({
      status: responseStatus,
      proposedCourseIds: proposedCourseIds,
      message: responseText.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--admin-border))]">
          <div>
            <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))]">Phản hồi yêu cầu hợp tác</h3>
            {partnership?.enterprise?.displayName && (
              <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-0.5">{partnership.enterprise.displayName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-xs text-[hsl(var(--admin-text-muted))] font-medium mb-2">Trạng thái phản hồi</label>
            <div className="flex gap-2">
              {[
                { value: 'negotiating', label: 'Đàm phán', color: 'blue' },
                { value: 'rejected', label: 'Từ chối', color: 'red' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setResponseStatus(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    responseStatus === opt.value
                      ? opt.color === 'blue'
                        ? 'bg-[hsl(var(--admin-accent))] text-white border-[hsl(var(--admin-accent))]'
                        : 'bg-[hsl(var(--admin-danger))] text-white border-[hsl(var(--admin-danger))]'
                      : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:border-[hsl(var(--admin-border-strong))] hover:text-[hsl(var(--admin-text-primary))]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proposed Courses */}
          <div>
            <label className="block text-xs text-[hsl(var(--admin-text-muted))] font-medium mb-1.5">
              Khóa học đề xuất
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {myCourses.length === 0 ? (
                <p className="text-sm text-[hsl(var(--admin-text-muted))] italic">Bạn chưa có khóa học nào.</p>
              ) : (
                myCourses.map(course => {
                  const isSelected = proposedCourseIds.includes(course._id);
                  return (
                    <div
                      key={course._id}
                      onClick={() => {
                        setProposedCourseIds(prev =>
                          isSelected ? prev.filter(id => id !== course._id) : [...prev, course._id]
                        );
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[hsl(var(--admin-accent))]/10 border-[hsl(var(--admin-accent))]'
                          : 'bg-[hsl(var(--admin-surface-elevated))]/60 border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border-strong))]'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="text-[hsl(var(--admin-accent))] w-4 h-4" />
                        ) : (
                          <Square className="text-[hsl(var(--admin-text-faint))] w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))] truncate">
                          {course.title}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs text-[hsl(var(--admin-text-muted))]">
                          <span className="flex items-center gap-1">
                            <BookOpen size={12} /> {course.duration?.value || 0} {course.duration?.unit || 'giờ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Response Text */}
          <div>
            <label className="block text-xs text-[hsl(var(--admin-text-muted))] font-medium mb-1.5">Nội dung phản hồi</label>
            <Textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder="Viết phản hồi của bạn cho doanh nghiệp..."
              rows={4}
              className="bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] placeholder:text-[hsl(var(--admin-text-faint))] text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--admin-border))]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !responseText.trim()}
            className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))]/90 text-white border-none text-sm font-semibold gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Gửi phản hồi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartnershipResponseModal;
