import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, TrendingUp, Clock, CheckCircle2, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { TrainerPlacementTable } from '@/components/trainer/TrainerPlacementTable';
import { PlacementFormModal } from '@/components/trainer/PlacementFormModal';
import {
  getPlacements,
  updatePlacementStatus,
  getPlacementById
} from '@/apis/courseApi';
import toast from 'react-hot-toast';

const STATUS_COUNTS_INITIAL = {
  total: 0,
  referred: 0,
  interviewing: 0,
  offered: 0,
  started: 0,
  resigned: 0
};

const PlacementStatusModal = ({ isOpen, onClose, placement, onSave }) => {
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && placement) {
      setNewStatus(placement.status || '');
    }
  }, [isOpen, placement]);

  const handleSave = async () => {
    if (!newStatus || newStatus === placement?.status) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      await updatePlacementStatus(placement._id, { status: newStatus });
      toast.success('Cập nhật trạng thái thành công!');
      onSave?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !placement) return null;

  const STATUS_OPTIONS = [
    { value: 'referred', label: 'Vừa giới thiệu', color: 'amber' },
    { value: 'interviewing', label: 'Đang phỏng vấn', color: 'blue' },
    { value: 'offered', label: 'Đã nhận offer', color: 'purple' },
    { value: 'started', label: 'Đã đi làm', color: 'green' },
    { value: 'resigned', label: 'Đã nghỉ', color: 'gray' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-[var(--admin-shadow-lg)]">
        <div className="flex items-center justify-between border-b border-[hsl(var(--admin-border))] p-5">
          <div>
            <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))]">Cập nhật trạng thái</h3>
            <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-0.5">{placement?.user?.displayName} - {placement?.company}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setNewStatus(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
                newStatus === opt.value
                  ? opt.color === 'amber' ? 'bg-[hsl(var(--admin-warning)_/_15%)] border-[hsl(var(--admin-warning)_/_40%)] text-[hsl(var(--admin-warning))]' :
                    opt.color === 'blue' ? 'bg-[hsl(var(--admin-accent)_/_15%)] border-[hsl(var(--admin-accent)_/_40%)] text-[hsl(var(--admin-accent))]' :
                    opt.color === 'purple' ? 'bg-purple-500/15 border-purple-500/40 text-purple-500' :
                    opt.color === 'green' ? 'bg-[hsl(var(--admin-success)_/_15%)] border-[hsl(var(--admin-success)_/_40%)] text-[hsl(var(--admin-success))]' :
                    'bg-[hsl(var(--admin-text-muted)_/_15%)] border-[hsl(var(--admin-text-muted)_/_40%)] text-[hsl(var(--admin-text-muted))]'
                  : 'bg-[hsl(var(--admin-surface-elevated))]/40 border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:border-[hsl(var(--admin-border-strong))]'
              }`}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 ${
                opt.color === 'amber' ? 'bg-[hsl(var(--admin-warning))]' :
                opt.color === 'blue' ? 'bg-[hsl(var(--admin-accent))]' :
                opt.color === 'purple' ? 'bg-purple-500' :
                opt.color === 'green' ? 'bg-[hsl(var(--admin-success))]' :
                'bg-[hsl(var(--admin-text-muted))]'
              }`} />
              <span className="text-sm font-medium">{opt.label}</span>
              {newStatus === opt.value && (
                <svg className="ml-auto w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--admin-border))] p-5">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm py-2 px-4">
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || newStatus === placement?.status}
            className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none text-sm py-2 px-5 font-semibold"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function TrainerPlacementsPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  });
  const [statusCounts, setStatusCounts] = useState(STATUS_COUNTS_INITIAL);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [detailPlacement, setDetailPlacement] = useState(null);

  const fetchPlacements = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlacements({ page, limit: 10 });
      const data = res.data?.data || [];
      const paginationData = res.data?.pagination || {};
      setPlacements(data);
      setPagination({
        currentPage: paginationData.page || 1,
        totalPages: paginationData.totalPages || 1,
        totalRecords: paginationData.totalRecords || data.length,
        limit: paginationData.limit || 10
      });

      const counts = { ...STATUS_COUNTS_INITIAL };
      data.forEach(p => {
        if (p.status === 'referred') counts.referred++;
        else if (p.status === 'interviewing') counts.interviewing++;
        else if (p.status === 'offered') counts.offered++;
        else if (p.status === 'started') counts.started++;
        else if (p.status === 'resigned') counts.resigned++;
      });
      counts.total = paginationData.totalRecords || data.length;
      setStatusCounts(counts);
    } catch (err) {
      console.error('Error fetching placements:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách placement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacements(1);
  }, [fetchPlacements]);

  const handlePageChange = (page) => {
    fetchPlacements(page);
  };

  const handleViewDetail = async (placement) => {
    try {
      const res = await getPlacementById(placement._id);
      setDetailPlacement(res.data?.data || placement);
    } catch {
      setDetailPlacement(placement);
    }
    setShowDetailModal(true);
  };

  const handleStatusChange = (placement) => {
    setSelectedPlacement(placement);
    setShowStatusModal(true);
  };

  const handleFormSuccess = () => {
    fetchPlacements(pagination.currentPage);
  };

  const handleStatusSave = () => {
    fetchPlacements(pagination.currentPage);
  };

  const stats = [
    {
      label: 'Tổng Placement',
      value: statusCounts.total,
      icon: Briefcase,
      color: 'blue'
    },
    {
      label: 'Đang phỏng vấn',
      value: statusCounts.interviewing,
      icon: Clock,
      color: 'amber'
    },
    {
      label: 'Đã đi làm',
      value: statusCounts.started,
      icon: CheckCircle2,
      color: 'green'
    },
    {
      label: 'Đã nghỉ',
      value: statusCounts.resigned,
      icon: TrendingUp,
      color: 'gray'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--admin-text-primary))]">Quản lý việc làm</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              Theo dõi và giới thiệu cơ hội việc làm cho học viên tốt nghiệp.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedPlacement(null);
              setShowFormModal(true);
            }}
            className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none gap-2 text-sm py-2.5 px-4 font-semibold rounded-xl"
          >
            <Plus size={16} />
            Thêm Placement
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const colorMap = {
            blue: 'border-[hsl(var(--admin-accent))]/20 bg-[hsl(var(--admin-accent))]/5',
            amber: 'border-[hsl(var(--admin-warning))]/20 bg-[hsl(var(--admin-warning))]/5',
            green: 'border-[hsl(var(--admin-success))]/20 bg-[hsl(var(--admin-success))]/5',
            gray: 'border-[hsl(var(--admin-text-muted))]/20 bg-[hsl(var(--admin-text-muted))]/5'
          };
          const iconMap = {
            blue: 'text-[hsl(var(--admin-accent))]',
            amber: 'text-[hsl(var(--admin-warning))]',
            green: 'text-[hsl(var(--admin-success))]',
            gray: 'text-[hsl(var(--admin-text-muted))]'
          };

          return (
            <div
              key={stat.label}
              className={`rounded-xl border bg-[hsl(var(--admin-surface))] p-4 ${colorMap[stat.color]}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[hsl(var(--admin-text-muted))] font-medium">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-[hsl(var(--admin-text-primary))] mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[hsl(var(--admin-surface))] ${iconMap[stat.color]}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="border border-[hsl(var(--admin-danger))]/30 bg-[hsl(var(--admin-danger))]/5 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--admin-danger))]">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlacements(pagination.currentPage)}
            className="border-[hsl(var(--admin-danger))]/30 text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger))]/10 text-xs gap-1.5"
          >
            <RefreshCw size={13} />
            Thử lại
          </Button>
        </div>
      )}

      {/* Table */}
      <TrainerPlacementTable
        placements={placements}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onViewDetail={handleViewDetail}
        onStatusChange={handleStatusChange}
      />

      {/* Form Modal */}
      <PlacementFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleFormSuccess}
        placement={selectedPlacement}
      />

      {/* Status Update Modal */}
      <PlacementStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        placement={selectedPlacement}
        onSave={handleStatusSave}
      />

      {/* Detail Modal */}
      {detailPlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl shadow-[var(--admin-shadow-lg)]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--admin-border))] p-5">
              <div>
                <h3 className="text-base font-bold text-[hsl(var(--admin-text-primary))]">Chi tiết Placement</h3>
                <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-0.5">
                  {detailPlacement.user?.displayName} - {detailPlacement.company}
                </p>
              </div>
              <button onClick={() => { setShowDetailModal(false); setDetailPlacement(null); }}
                className="p-1.5 rounded-lg text-[hsl(var(--admin-text-muted))] hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text-primary))] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs">Học viên</p>
                  <p className="text-[hsl(var(--admin-text-primary))] font-semibold">{detailPlacement.user?.displayName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs">Khóa học</p>
                  <p className="text-[hsl(var(--admin-text-primary))] font-semibold">{detailPlacement.course?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs">Công ty</p>
                  <p className="text-[hsl(var(--admin-text-primary))] font-semibold">{detailPlacement.company || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs">Vị trí</p>
                  <p className="text-[hsl(var(--admin-text-primary))] font-semibold">{detailPlacement.position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs">Lương</p>
                  <p className="text-[hsl(var(--admin-success))] font-semibold">
                    {detailPlacement.salary
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(detailPlacement.salary)
                      : 'Thỏa thuận'}
                  </p>
                </div>
                <div>
                  <p className="text-[hsl(var(--admin-text-muted))] text-xs">Loại công việc</p>
                  <p className="text-[hsl(var(--admin-text-primary))] font-semibold">{detailPlacement.employmentType || 'N/A'}</p>
                </div>
                {detailPlacement.startedDate && (
                  <div>
                    <p className="text-[hsl(var(--admin-text-muted))] text-xs">Ngày bắt đầu</p>
                    <p className="text-[hsl(var(--admin-text-primary))] font-semibold">
                      {new Date(detailPlacement.startedDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}
                {detailPlacement.notes && (
                  <div className="col-span-2">
                    <p className="text-[hsl(var(--admin-text-muted))] text-xs">Ghi chú</p>
                    <p className="text-[hsl(var(--admin-text-secondary))] text-sm">{detailPlacement.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--admin-border))] p-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailPlacement(null);
                }}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-hover))] text-sm"
              >
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  handleStatusChange(detailPlacement);
                }}
                className="bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))] text-white border-none text-sm font-semibold"
              >
                Cập nhật trạng thái
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
