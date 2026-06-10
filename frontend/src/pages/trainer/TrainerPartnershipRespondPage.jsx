import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { Button, Textarea, Badge, Skeleton } from '@/components/ui';
import {
  getPartnershipDetail,
  respondPartnership,
  negotiatePartnership,
  confirmPartnership,
  cancelPartnership
} from '@/apis/trainerApi';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'negotiating', label: 'Đàm phán' },
  { value: 'active', label: 'Chấp nhận & kích hoạt' },
  { value: 'rejected', label: 'Từ chối' }
];

export default function TrainerPartnershipRespondPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partnership, setPartnership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [responseStatus, setResponseStatus] = useState('negotiating');
  const [proposedCourseIds, setProposedCourseIds] = useState('');

  const fetchPartnership = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPartnershipDetail(id);
      setPartnership(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải partnership.');
      navigate('/trainer/partnerships');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchPartnership(); }, [fetchPartnership]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: responseStatus,
        proposedCourseIds: proposedCourseIds.split(',').map(s => s.trim()).filter(Boolean),
        message: message.trim()
      };

      if (responseStatus === 'negotiating') {
        await negotiatePartnership(id, payload);
      } else if (responseStatus === 'active') {
        await respondPartnership(id, { ...payload, status: 'negotiating' });
        await confirmPartnership(id, {
          agreedTerms: {
            linkedCourseIds: payload.proposedCourseIds,
            paymentTerms: 'Theo thỏa thuận giữa trainer và enterprise',
            referralBonus: partnership?.agreedTerms?.referralBonus || partnership?.referralBonus || 0
          }
        });
      } else {
        await cancelPartnership(id, { reason: message.trim() });
      }

      toast.success('Đã gửi phản hồi partnership.');
      navigate(`/trainer/partnerships/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phản hồi thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/trainer/partnerships/${id}`)} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
        <ArrowLeft size={16} /> Quay lại chi tiết
      </Button>

      {loading ? (
        <Skeleton className="h-96 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />
      ) : (
        <>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Phản hồi Partnership</h1>
              <Badge className="bg-[hsl(var(--admin-accent)_/_15%)] text-[hsl(var(--admin-accent))] border border-[hsl(var(--admin-accent)_/_20%]">{partnership?.status || 'pending'}</Badge>
            </div>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm">
              {partnership?.enterprise?.displayName || 'Doanh nghiệp'} · {partnership?.recruitmentNeeds?.jobTitle || 'Nhu cầu tuyển dụng'}
            </p>
          </div>

          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-6 space-y-5 max-w-3xl">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Hình thức phản hồi</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {STATUS_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResponseStatus(option.value)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      responseStatus === option.value
                        ? 'border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-subtle))] text-[hsl(var(--admin-text-primary))]'
                        : 'border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/60 text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Khóa học đề xuất (ID, cách nhau bằng dấu phẩy)</label>
              <input
                value={proposedCourseIds}
                onChange={(e) => setProposedCourseIds(e.target.value)}
                placeholder="6651f...,6652a..."
                className="w-full rounded-xl border border-[hsl(var(--admin-border-strong))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Nội dung phản hồi</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Nhập thông điệp phản hồi cho doanh nghiệp..."
                className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] gap-2">
                <Send size={14} /> {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/trainer/partnerships/${id}`)} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
                Hủy
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
