import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, GraduationCap, BookOpen, TrendingUp,
  MessageSquare, Send, Briefcase, CheckCircle2
} from 'lucide-react';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Textarea } from '@/components/ui';
import { getPartnershipDetail,
  getPartnershipLearners,
  getPartnershipGraduates,
  getPartnershipStats,
  respondPartnership,
  negotiatePartnership,
  confirmPartnership,
  cancelPartnership
} from '@/apis/trainerApi';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: { label: 'Chờ phản hồi', color: 'text-[hsl(var(--admin-warning))] bg-[hsl(var(--admin-warning)_/_15%)]', border: 'border-[hsl(var(--admin-warning)_/_30%)]' },
  negotiating: { label: 'Đang đàm phán', color: 'text-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent)_/_15%)]', border: 'border-[hsl(var(--admin-accent)_/_30%)]' },
  active: { label: 'Đang hợp tác', color: 'text-[hsl(var(--admin-success))] bg-[hsl(var(--admin-success)_/_15%)]', border: 'border-[hsl(var(--admin-success)_/_30%)]' },
  cancelled: { label: 'Đã hủy', color: 'text-[hsl(var(--admin-text-muted))] bg-[hsl(var(--admin-text-muted)_/_15%)]', border: 'border-[hsl(var(--admin-text-muted)_/_30%)]' },
  expired: { label: 'Đã hết hạn', color: 'text-[hsl(var(--admin-danger))] bg-[hsl(var(--admin-danger)_/_15%)]', border: 'border-[hsl(var(--admin-danger)_/_30%)]' }
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
};

export default function TrainerPartnershipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partnership, setPartnership] = useState(null);
  const [learners, setLearners] = useState([]);
  const [graduates, setGraduates] = useState([]);
  const [partnershipStats, setPartnershipStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('learners');
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('negotiating');
  const [proposedCourseIds, setProposedCourseIds] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, learnersRes, graduatesRes, statsRes] = await Promise.all([
        getPartnershipDetail(id),
        getPartnershipLearners(id, { limit: 50 }),
        getPartnershipGraduates(id, { limit: 50 }),
        getPartnershipStats(id).catch(() => ({ data: { data: null } }))
      ]);
      setPartnership(detailRes.data?.data);
      setLearners(learnersRes.data?.data || []);
      setGraduates(graduatesRes.data?.data || []);
      setPartnershipStats(statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching partnership detail:', err);
      toast.error(err.response?.data?.message || 'Không thể tải chi tiết partnership.');
      navigate('/trainer/partnerships');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRespond = async () => {
    if (!responseText.trim()) { toast.error('Vui lòng nhập nội dung phản hồi.'); return; }
    setActionLoading(true);
    try {
      await respondPartnership(id, {
        status: responseStatus,
        proposedCourseIds: proposedCourseIds.split(',').map(s => s.trim()).filter(Boolean),
        message: responseText.trim()
      });
      toast.success('Phản hồi thành công!');
      setShowResponseModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phản hồi thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy partnership này?')) return;
    setActionLoading(true);
    try {
      await cancelPartnership(id, { reason: 'Trainer chủ động hủy' });
      toast.success('Đã hủy partnership.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hủy thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-48 bg-[hsl(var(--admin-surface-elevated))] rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-32 bg-[hsl(var(--admin-surface))] rounded-2xl animate-pulse border border-[hsl(var(--admin-border))]" />)}
        </div>
        <div className="h-96 bg-[hsl(var(--admin-surface))] rounded-2xl animate-pulse border border-[hsl(var(--admin-border))]" />
      </div>
    );
  }

  if (!partnership) return null;

  const config = STATUS_CONFIG[partnership.status] || STATUS_CONFIG.pending;
  const summary = partnership.summary || {};
  const recruitment = partnership.recruitmentNeeds || {};
  const agreedTerms = partnership.agreedTerms || {};
  const stats = partnership.stats || {};

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/trainer/partnerships')}
        className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-primary))] gap-2 pl-0"
      >
        <ArrowLeft size={16} /> Quay lại danh sách
      </Button>

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))] truncate">
              {partnership.enterprise?.displayName || 'Partnership'}
            </h1>
            <Badge className={`${config.color} ${config.border} border text-xs font-bold`}>
              {config.label}
            </Badge>
          </div>
          {recruitment.jobTitle && (
            <p className="text-[hsl(var(--admin-text-muted))] text-sm">
              Tuyển dụng: <span className="font-semibold text-[hsl(var(--admin-text-primary))]">{recruitment.jobTitle}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={() => navigate(`/trainer/partnerships/${id}/respond`)}
            className="border-[hsl(var(--admin-accent))]/40 text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-subtle))] text-sm gap-2"
          >
            <MessageSquare size={14} /> Màn hình phản hồi
          </Button>
          {partnership.status === 'pending' && (
            <>
              <Button
                onClick={() => setShowResponseModal(true)}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none gap-2 text-sm font-semibold"
              >
                <MessageSquare size={14} /> Phản hồi nhanh
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={actionLoading}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm"
              >
                Hủy
              </Button>
            </>
          )}
          {partnership.status === 'negotiating' && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowResponseModal(true)}
                className="border-[hsl(var(--admin-accent))]/40 text-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-subtle))] text-sm gap-2"
              >
                <TrendingUp size={14} /> Tiếp tục đàm phán
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={actionLoading}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm"
              >
                Hủy
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng học viên', value: partnershipStats?.totalLearners ?? summary.totalLearners ?? 0, icon: Users, color: 'text-[hsl(var(--admin-accent))]' },
          { label: 'Đang học', value: partnershipStats?.pendingLearners ?? summary.pendingLearners ?? 0, icon: BookOpen, color: 'text-[hsl(var(--admin-warning))]' },
          { label: 'Đã tốt nghiệp', value: partnershipStats?.totalGraduates ?? summary.totalGraduates ?? 0, icon: GraduationCap, color: 'text-[hsl(var(--admin-success))]' },
          { label: 'Revenue', value: formatCurrency(partnershipStats?.revenue ?? 0), icon: TrendingUp, color: 'text-purple-500' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-[hsl(var(--admin-surface-elevated))]`}><Icon size={16} className={color} /></div>
              <p className="text-xs text-[hsl(var(--admin-text-muted))] font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">{value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Recruitment Needs */}
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
            <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-sm mb-4 flex items-center gap-2">
              <Briefcase size={15} className="text-[hsl(var(--admin-accent))]" /> Nhu cầu tuyển dụng
            </h3>
            <div className="space-y-3">
              {recruitment.jobTitle && (
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Vị trí</p>
                  <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{recruitment.jobTitle}</p>
                </div>
              )}
              {recruitment.salaryRange && (
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Mức lương</p>
                  <p className="text-sm font-medium text-[hsl(var(--admin-success))]">
                    {formatCurrency(recruitment.salaryRange.min)} - {formatCurrency(recruitment.salaryRange.max)} VND
                  </p>
                </div>
              )}
              {recruitment.jobQuantity && (
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Số lượng</p>
                  <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{recruitment.jobQuantity} người</p>
                </div>
              )}
              {recruitment.targetSkills?.length > 0 && (
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Kỹ năng yêu cầu</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recruitment.targetSkills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] text-xs rounded-md font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {recruitment.requirements?.length > 0 && (
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-1">Yêu cầu khác</p>
                  <ul className="space-y-1">
                    {recruitment.requirements.map((r, i) => (
                      <li key={i} className="text-xs text-[hsl(var(--admin-text-secondary))] flex items-start gap-1.5">
                        <span className="text-[hsl(var(--admin-accent))] mt-0.5 shrink-0">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Agreement Terms */}
          {partnership.status !== 'pending' && agreedTerms && (
            <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-5">
              <h3 className="font-bold text-[hsl(var(--admin-text-primary))] text-sm mb-4 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[hsl(var(--admin-success))]" /> Thỏa thuận hợp tác
              </h3>
              <div className="space-y-3">
                {agreedTerms.tuitionFeePerLearner && (
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Phí/learner</p>
                    <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{formatCurrency(agreedTerms.tuitionFeePerLearner)}</p>
                  </div>
                )}
                {agreedTerms.paymentTerms && (
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-muted))] mb-0.5">Thanh toán</p>
                    <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{agreedTerms.paymentTerms}</p>
                  </div>
                )}
                {agreedTerms.placementGuarantee && (
                  <Badge className="bg-[hsl(var(--admin-success)_/_15%)] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success)_/_30%)] border text-xs font-semibold">
                    Cam kết tuyển dụng ({agreedTerms.guaranteePeriodMonths} tháng)
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl overflow-hidden">
            <div className="px-5 pt-5">
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] mb-4">
                  <TabsTrigger value="learners" className="data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white gap-1.5">
                    <Users size={13} /> Học viên ({learners.length})
                  </TabsTrigger>
                  <TabsTrigger value="graduates" className="data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white gap-1.5">
                    <GraduationCap size={13} /> Tốt nghiệp ({graduates.length})
                  </TabsTrigger>
                  <TabsTrigger value="courses" className="data-[state=active]:bg-[hsl(var(--admin-accent))] data-[state=active]:text-white gap-1.5">
                    <BookOpen size={13} /> Khóa học ({partnership.linkedCourses?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="learners">
                  {learners.length === 0 ? (
                    <p className="text-[hsl(var(--admin-text-muted))] text-sm py-8 text-center">Chưa có học viên.</p>
                  ) : (
                    <div className="space-y-3">
                      {learners.map(l => (
                        <div key={l._id} className="flex items-center justify-between p-4 bg-[hsl(var(--admin-surface-elevated))]/40 rounded-xl border border-[hsl(var(--admin-border))]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[hsl(var(--admin-accent)_/_20%)] rounded-full flex items-center justify-center text-[hsl(var(--admin-accent))] font-bold text-xs">
                              {l.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{l.user?.displayName || 'Học viên'}</p>
                              <p className="text-xs text-[hsl(var(--admin-text-muted))]">{l.user?.email || ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[hsl(var(--admin-text-muted))]">{l.course?.title || ''}</p>
                            <p className="text-xs text-[hsl(var(--admin-accent))]">{l.progress?.percentage || 0}% hoàn thành</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="graduates">
                  {graduates.length === 0 ? (
                    <p className="text-[hsl(var(--admin-text-muted))] text-sm py-8 text-center">Chưa có học viên tốt nghiệp.</p>
                  ) : (
                    <div className="space-y-3">
                      {graduates.map(g => (
                        <div key={g._id} className="flex items-center justify-between p-4 bg-[hsl(var(--admin-surface-elevated))]/40 rounded-xl border border-[hsl(var(--admin-success)_/_20%)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[hsl(var(--admin-success)_/_20%)] rounded-full flex items-center justify-center text-[hsl(var(--admin-success))] font-bold text-xs">
                              {g.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{g.user?.displayName || 'Học viên'}</p>
                              <p className="text-xs text-[hsl(var(--admin-text-muted))]">{g.user?.email || ''}</p>
                            </div>
                          </div>
                          <Badge className="bg-[hsl(var(--admin-success)_/_15%)] text-[hsl(var(--admin-success))] border-[hsl(var(--admin-success)_/_30%)] border text-xs font-semibold">
                            <GraduationCap size={11} /> Đã tốt nghiệp
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="courses">
                  {(!partnership.linkedCourses || partnership.linkedCourses.length === 0) ? (
                    <p className="text-[hsl(var(--admin-text-muted))] text-sm py-8 text-center">Chưa có khóa học liên kết.</p>
                  ) : (
                    <div className="space-y-3">
                      {partnership.linkedCourses.map(c => (
                        <div key={c._id} className="flex items-center justify-between p-4 bg-[hsl(var(--admin-surface-elevated))]/40 rounded-xl border border-[hsl(var(--admin-border))]">
                          <div>
                            <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{c.title}</p>
                            <Badge className="mt-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border-[hsl(var(--admin-border))] text-xs">{c.status}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/trainer/courses/${c._id}/students`)}
                            className="text-[hsl(var(--admin-accent))] hover:text-[hsl(var(--admin-accent))] text-xs gap-1"
                          >
                            Xem học viên <ArrowLeft size={12} className="rotate-180" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-[var(--admin-shadow-lg)]">
            <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))]">Phản hồi yêu cầu hợp tác</h3>
              <button onClick={() => setShowResponseModal(false)} className="p-1.5 rounded-lg text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[hsl(var(--admin-text-muted))] mb-1.5">Trạng thái phản hồi</label>
                <div className="flex gap-2">
                  {[{ value: 'negotiating', label: 'Đàm phán' }, { value: 'rejected', label: 'Từ chối' }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setResponseStatus(opt.value)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                        responseStatus === opt.value
                          ? opt.value === 'negotiating' ? 'bg-[hsl(var(--admin-accent))] text-white border-[hsl(var(--admin-accent))]' : 'bg-[hsl(var(--admin-danger))] text-white border-[hsl(var(--admin-danger))]'
                          : 'border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-muted))] hover:border-[hsl(var(--admin-border-strong))]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[hsl(var(--admin-text-muted))] mb-1.5">Khóa học đề xuất (IDs, cách nhau bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={proposedCourseIds}
                  onChange={e => setProposedCourseIds(e.target.value)}
                  placeholder="courseId1, courseId2"
                  className="w-full bg-[hsl(var(--admin-surface-elevated))]/60 border border-[hsl(var(--admin-border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--admin-text-primary))] placeholder:text-[hsl(var(--admin-text-muted))] focus:outline-none focus:border-[hsl(var(--admin-accent))]/60"
                />
              </div>

              <div>
                <label className="block text-xs text-[hsl(var(--admin-text-muted))] mb-1.5">Nội dung phản hồi</label>
                <Textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  placeholder="Nhập nội dung phản hồi cho doanh nghiệp..."
                  rows={4}
                  className="bg-[hsl(var(--admin-surface-elevated))]/60 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] placeholder:text-[hsl(var(--admin-text-muted))] text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--admin-border))]">
              <Button
                variant="outline"
                onClick={() => setShowResponseModal(false)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm"
              >
                Hủy
              </Button>
              <Button
                onClick={handleRespond}
                disabled={actionLoading || !responseText.trim()}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none text-sm font-semibold gap-2"
              >
                {actionLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                Gửi phản hồi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
