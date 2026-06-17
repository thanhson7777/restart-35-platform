import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Button, Textarea, Badge, Skeleton } from '@/components/ui';
import { getPartnershipDetail, cancelPartnership } from '@/apis/trainerApi';
import toast from 'react-hot-toast';

export default function TrainerPartnershipRespondPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partnership, setPartnership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { 
    fetchPartnership(); 
  }, [fetchPartnership]);

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }
    setSubmitting(true);
    try {
      await cancelPartnership(id, { reason: rejectReason.trim() });
      toast.success('Đã từ chối yêu cầu.');
      navigate(`/trainer/partnerships/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Từ chối thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCourse = () => {
    navigate(`/trainer/courses/new?partnershipId=${id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 rounded-2xl bg-[hsl(var(--admin-surface-elevated))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/trainer/partnerships/${id}`)} className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] pl-0 gap-2">
        <ArrowLeft size={16} /> Quay lại chi tiết
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Phản hồi Yêu cầu Tạo Khóa học</h1>
          <Badge className="bg-[hsl(var(--admin-accent)_/_15%)] text-[hsl(var(--admin-accent))] border border-[hsl(var(--admin-accent)_/_20%)]">
            {partnership?.status || 'pending'}
          </Badge>
        </div>
        <p className="text-[hsl(var(--admin-text-muted))] text-sm">
          Từ: {partnership?.enterprise?.displayName || 'Doanh nghiệp'} · Tuyển dụng: {partnership?.recruitmentNeeds?.jobTitle || 'Nhu cầu'} ({partnership?.recruitmentNeeds?.jobQuantity} người)
        </p>
      </div>

      <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-8 space-y-6 max-w-3xl">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex gap-4">
          <BookOpen className="text-blue-500 shrink-0 w-6 h-6" />
          <div>
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">Yêu cầu thiết kế khóa học</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-2 leading-relaxed">
              Doanh nghiệp mong muốn bạn thiết kế một khóa học mới chuyên biệt dành cho <strong>{partnership?.recruitmentNeeds?.jobQuantity} ứng viên</strong> trúng tuyển vị trí <strong>{partnership?.recruitmentNeeds?.jobTitle}</strong>.
            </p>
            {partnership?.proposedSponsorship?.budget > 0 && (
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-2 font-semibold">
                Ngân sách tài trợ: {new Intl.NumberFormat('vi-VN').format(partnership.proposedSponsorship.budget)} VNĐ
              </p>
            )}
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-4 italic">
              Nếu bạn chấp nhận, hệ thống sẽ chuyển bạn sang trang soạn thảo Giáo trình và Tự động điền các thông tin của yêu cầu này.
            </p>
          </div>
        </div>

        {!rejectMode ? (
          <div className="flex gap-4 pt-4">
            <Button onClick={handleCreateCourse} size="lg" className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white gap-2 px-8">
              <CheckCircle size={18} /> Chấp nhận & Soạn giáo trình
            </Button>
            <Button onClick={() => setRejectMode(true)} variant="outline" size="lg" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20 gap-2">
              <XCircle size={18} /> Từ chối yêu cầu
            </Button>
          </div>
        ) : (
          <div className="pt-4 border-t border-[hsl(var(--admin-border))] space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--admin-text-secondary))] mb-2">Lý do từ chối</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Nhập lý do từ chối. Nếu có ngân sách, tiền sẽ được hoàn trả vào ví doanh nghiệp..."
                className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border-strong))] text-[hsl(var(--admin-text-primary))]"
              />
            </div>
            
            {partnership?.proposedSponsorship?.budget > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 w-5 h-5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Hoàn trả tiền tài trợ</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
                    Doanh nghiệp sẽ được hoàn lại số tiền <strong>{new Intl.NumberFormat('vi-VN').format(partnership.proposedSponsorship.budget)} VNĐ</strong> đang đóng băng vào tài khoản khả dụng.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleReject} disabled={submitting} variant="destructive" className="gap-2">
                {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </Button>
              <Button variant="outline" onClick={() => setRejectMode(false)} className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]">
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
