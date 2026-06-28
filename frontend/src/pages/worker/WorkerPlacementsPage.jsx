import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, XCircle, RefreshCw, ExternalLink, Info, Calendar, Search } from 'lucide-react';

import { Button, Badge, Card, CardContent, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { getMyPlacements, updatePlacementStatus } from '@/apis/placementApi';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';

const STATUS_UI = {
  referred: { label: 'Chờ xét duyệt', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  interviewing: { label: 'Đang phỏng vấn', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  offered: { label: 'Đã nhận Offer', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  accepted: { label: 'Đã chấp nhận', color: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Đã từ chối', color: 'bg-red-100 text-red-700 border-red-200' },
  started: { label: 'Đã đi làm', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  resigned: { label: 'Đã nghỉ việc', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const formatCurrency = (amount, currency = 'VND') => {
  if (!amount) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function WorkerPlacementsPage() {
  const navigate = useNavigate();
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Simple useDebounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [acceptModal, setAcceptModal] = useState({ open: false, placementId: null });
  const [rejectModal, setRejectModal] = useState({ open: false, placementId: null });
  const [actionLoading, setActionLoading] = useState(null);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchPlacements = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, item_per_page: 5 }; // Giới hạn 5 item mỗi trang cho dễ test
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getMyPlacements(params);
      setPlacements(res.data?.data || []);
      
      const total = res.data?.pagination?.total || 0;
      const limit = res.data?.pagination?.item_per_page || 5;
      setTotalPages(Math.ceil(total / limit) || 1);
    } catch (error) {
      toast.error('Không thể tải danh sách cơ hội việc làm!');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  const handleAccept = async () => {
    setActionLoading('accept');
    try {
      await updatePlacementStatus(acceptModal.placementId, { status: 'accepted' });
      toast.success('Bạn đã chấp nhận cơ hội việc làm thành công!');
      setAcceptModal({ open: false, placementId: null });
      fetchPlacements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await updatePlacementStatus(rejectModal.placementId, { status: 'rejected' });
      toast.success('Đã từ chối cơ hội việc làm!');
      setRejectModal({ open: false, placementId: null });
      fetchPlacements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="max-w-6xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Cơ hội việc làm Đối tác</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Quản lý các cơ hội việc làm (Placement) nhận được từ các chương trình liên kết đào tạo.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'all', label: 'Tổng số', className: 'bg-slate-100 text-slate-700' },
            { key: 'referred', label: 'Chờ xét duyệt', className: 'bg-blue-100 text-blue-700' },
            { key: 'offered', label: 'Đang chờ xác nhận', className: 'bg-emerald-100 text-emerald-700' },
            { key: 'accepted', label: 'Đã nhận việc', className: 'bg-indigo-100 text-indigo-700' },
            { key: 'rejected', label: 'Đã từ chối', className: 'bg-rose-100 text-rose-700' }
          ].map(stat => (
            <div
              key={stat.key}
              className={`p-4 rounded-xl text-center ${stat.className}`}
            >
              <p className="text-2xl font-bold">
                {stat.key === 'all' 
                  ? placements.length 
                  : placements.filter(p => p.status === stat.key || (stat.key === 'accepted' && ['accepted', 'started'].includes(p.status))).length}
              </p>
              <p className="text-xs font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm tên công ty, công việc..." 
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="referred">Chờ xét duyệt</SelectItem>
              <SelectItem value="offered">Đang chờ xác nhận</SelectItem>
              <SelectItem value="accepted">Đã nhận việc</SelectItem>
              <SelectItem value="rejected">Đã từ chối</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchPlacements} className="gap-2 ml-auto">
            <RefreshCw size={13} /> Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : placements.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={48} className="mx-auto text-[hsl(var(--muted))] mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Bạn chưa có cơ hội việc làm nào từ các khóa học đối tác.
              <br />Hoàn thành xuất sắc khóa học để được doanh nghiệp tuyển dụng nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {placements.map(placement => {
              const ui = STATUS_UI[placement.status] || STATUS_UI.referred;
              const hasOffer = placement.status === 'offered' || placement.offerDetails?.offeredSalary;
              
              return (
                <Card
                  key={placement._id}
                  className={`bg-[hsl(var(--card))] border transition-all ${
                    placement.status === 'offered'
                      ? 'border-emerald-300 shadow-emerald-50 bg-emerald-50/10'
                      : 'border-[hsl(var(--border))]'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                            {placement.job?.title || 'Vị trí công việc'}
                          </h3>
                          <Badge className={`${ui.color} text-xs border`}>{ui.label}</Badge>
                        </div>
                        <p className="text-[hsl(var(--muted-foreground))] flex items-center gap-1 font-medium">
                          {placement.employer?.name || 'Doanh nghiệp'}
                        </p>
                      </div>
                      
                      {hasOffer && (
                        <div className="text-right">
                          <p className="text-xl font-bold text-[hsl(var(--foreground))]">
                            {formatCurrency(placement.offerDetails?.offeredSalary, placement.job?.currency)}
                          </p>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Lương đề xuất</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Giới thiệu từ khóa học</p>
                        <button 
                          onClick={() => navigate(`/my/courses/${placement.courseId}`)}
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={12} /> Xem khóa học
                        </button>
                      </div>
                      
                      
                      {hasOffer && placement.offerDetails?.startDate && (
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Ngày bắt đầu dự kiến</p>
                          <p className="text-sm font-medium">
                            {formatDate(placement.offerDetails.startDate)}
                          </p>
                        </div>
                      )}

                      {placement.startedDate && (
                        <div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Ngày đi làm thực tế</p>
                          <p className="text-sm font-medium text-indigo-600">
                            {formatDate(placement.startedDate)}
                          </p>
                        </div>
                      )}
                    </div>

                    {placement.notes && (
                      <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                          <Info size={12} /> Ghi chú từ doanh nghiệp:
                        </p>
                        <p className="text-sm">{placement.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {placement.status === 'offered' && (
                      <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
                        <p className="text-sm text-emerald-600 font-medium">Doanh nghiệp đã gửi Offer cho bạn!</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setRejectModal({ open: true, placementId: placement._id })}
                          >
                            <XCircle size={14} className="mr-2" /> Từ chối
                          </Button>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setAcceptModal({ open: true, placementId: placement._id })}
                          >
                            <CheckCircle size={14} className="mr-2" /> Chấp nhận Offer
                          </Button>
                        </div>
                      </div>
                    )}

                    {['accepted', 'started'].includes(placement.status) && (
                      <div className="flex items-center pt-4 border-t border-emerald-200">
                        <p className="text-sm text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle size={14} /> Bạn đã chấp nhận cơ hội việc làm này
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button 
              variant="outline" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="bg-white"
            >
              Trang trước
            </Button>
            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
              Trang {page} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="bg-white"
            >
              Trang sau
            </Button>
          </div>
        )}
      </div>

      {/* Accept Modal */}
      <Dialog open={acceptModal.open} onOpenChange={(open) => !open && setAcceptModal({ open: false, placementId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-emerald-700 flex items-center gap-2">
              <CheckCircle size={20} /> Chấp nhận Cơ hội việc làm
            </DialogTitle>
            <DialogDescription>
              Bạn xác nhận đồng ý với mức lương đề xuất và ngày đi làm dự kiến từ Doanh nghiệp chứ? Doanh nghiệp sẽ nhận được thông báo ngay lập tức.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAcceptModal({ open: false, placementId: null })}>
              Hủy
            </Button>
            <Button onClick={handleAccept} disabled={actionLoading === 'accept'} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Xác nhận chấp nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, placementId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <XCircle size={20} /> Từ chối Cơ hội việc làm
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn từ chối cơ hội việc làm này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, placementId: null })}>
              Đóng
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading === 'reject'}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
