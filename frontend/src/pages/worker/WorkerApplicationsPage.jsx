import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, RefreshCw, ChevronRight, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';

import { Button, Badge, Card, CardContent } from '@/components/ui';
import {
  fetchMyApplications,
  withdrawMyApplication,
  selectMyApplications,
  selectMyApplicationsTotal,
  selectMyApplicationsLoading
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';

const applicationStatusConfig = {
  new: { label: 'Mới', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  reviewing: { label: 'Đang xem', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shortlisted: { label: 'Shortlist', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  interview_scheduled: { label: 'Đã lên lịch PV', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  interviewed: { label: 'Đã PV', className: 'bg-teal-100 text-teal-700 border-teal-200' },
  offered: { label: 'Đã offer', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  hired: { label: 'Đã tuyển', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 border-red-200' },
  withdrawn: { label: 'Rút đơn', className: 'bg-slate-200 text-slate-600 border-slate-300' }
};

const statusSteps = [
  'new',
  'reviewing',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'offered',
  'hired'
];

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const getStatusStep = (status) => {
  return statusSteps.indexOf(status);
};

export default function WorkerApplicationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const applications = useSelector(selectMyApplications);
  const total = useSelector(selectMyApplicationsTotal);
  const loading = useSelector(selectMyApplicationsLoading);

  const [statusFilter, setStatusFilter] = useState('all');
  const [withdrawModal, setWithdrawModal] = useState({ open: false, applicationId: null, jobTitle: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchApplications = useCallback(async () => {
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    dispatch(fetchMyApplications(params));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleWithdraw = async () => {
    if (!withdrawModal.applicationId) return;
    setWithdrawing(true);
    try {
      await dispatch(withdrawMyApplication(withdrawModal.applicationId)).unwrap();
      toast.success('Đã rút đơn ứng tuyển thành công.');
      setWithdrawModal({ open: false, applicationId: null, jobTitle: '' });
      fetchApplications();
    } catch (err) {
      toast.error(err || 'Không thể rút đơn. Vui lòng thử lại.');
    } finally {
      setWithdrawing(false);
    }
  };

  const openWithdrawModal = (e, app) => {
    e.stopPropagation();
    setWithdrawModal({ open: true, applicationId: app._id, jobTitle: app.jobTitle || app.job?.title });
  };

  // Group by status for stats
  const statusStats = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="max-w-6xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Đơn ứng tuyển của tôi</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Theo dõi trạng thái các đơn ứng tuyển của bạn.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { key: 'all', label: 'Tổng', className: 'bg-slate-100 text-slate-700' },
            { key: 'new', label: 'Mới', className: 'bg-blue-100 text-blue-700' },
            { key: 'interview_scheduled', label: 'Phỏng vấn', className: 'bg-indigo-100 text-indigo-700' },
            { key: 'hired', label: 'Đã tuyển', className: 'bg-green-100 text-green-700' }
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setStatusFilter(stat.key)}
              className={`p-4 rounded-xl text-center transition-all ${
                statusFilter === stat.key
                  ? `${stat.className} ring-2 ring-[hsl(var(--primary))]`
                  : `${stat.className} opacity-70 hover:opacity-100`
              }`}
            >
              <p className="text-2xl font-bold">{stat.key === 'all' ? total : (statusStats[stat.key] || 0)}</p>
              <p className="text-xs">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Applications List */}
        <Button variant="outline" onClick={fetchApplications} className="mb-6 gap-2">
          <RefreshCw size={13} /> Làm mới
        </Button>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-[hsl(var(--muted))] mb-4" />
            <p className="text-[hsl(var(--muted-foreground))] mb-4">Bạn chưa ứng tuyển công việc nào.</p>
            <Button onClick={() => navigate('/community')} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/90]">
              Tìm việc ngay
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => {
              const status = applicationStatusConfig[app.status] || applicationStatusConfig.new;
              const currentStep = getStatusStep(app.status);
              
              return (
                <div
                  key={app._id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 hover:border-[hsl(var(--primary))] transition-all cursor-pointer"
                  onClick={() => navigate(`/my/applications/${app._id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">
                        {app.jobTitle || app.job?.title}
                      </h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {app.enterpriseName || app.enterprise?.name || app.company}
                      </p>
                    </div>
                    <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                  </div>

                  {/* Timeline Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatDateTime(app.appliedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {statusSteps.map((step, idx) => {
                        const isActive = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div
                            key={step}
                            className={`flex-1 h-1 rounded-full ${
                              isActive ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
                            }`}
                            title={applicationStatusConfig[step]?.label}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                      <Clock size={14} />
                      <span>Ứng tuyển {formatDateTime(app.appliedAt)}</span>
                      {(app.jobId || app.job?._id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/community/jobs/${app.jobId || app.job?._id}`); }}
                          className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs transition-colors"
                        >
                          <ExternalLink size={12} /> Xem tin
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === 'new' || app.status === 'reviewing' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => openWithdrawModal(e, app)}
                        >
                          <Trash2 size={14} /> Rút đơn
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" className="gap-1">
                        Chi tiết <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={withdrawModal.open} onOpenChange={(open) => !open && setWithdrawModal({ open: false, applicationId: null, jobTitle: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              Xác nhận rút đơn
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn rút đơn ứng tuyển cho vị trí "{withdrawModal.jobTitle}" không?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setWithdrawModal({ open: false, applicationId: null, jobTitle: '' })}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? 'Đang rút đơn...' : 'Xác nhận rút đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
