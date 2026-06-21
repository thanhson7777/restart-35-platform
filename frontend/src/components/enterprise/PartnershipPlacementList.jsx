import { useState, useEffect } from 'react';
import { Avatar, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Button } from '@/components/ui';
import { Calendar, CheckCircle, XCircle, MoreHorizontal, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { getPlacements, updatePlacementStatus } from '@/apis/placementApi';
import toast from 'react-hot-toast';

const STATUS_UI = {
  referred: { label: 'Đã giới thiệu', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  interviewing: { label: 'Đang phỏng vấn', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  offered: { label: 'Đã mời làm việc', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  accepted: { label: 'Đã nhận việc', color: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Đã từ chối', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  started: { label: 'Đã bắt đầu làm', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  resigned: { label: 'Đã nghỉ việc', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const PartnershipPlacementList = ({ partnershipId }) => {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [interviewDialog, setInterviewDialog] = useState({ isOpen: false, placementId: null, date: '' });
  const [offerDialog, setOfferDialog] = useState({ isOpen: false, placementId: null, salary: '', startDate: '' });

  const fetchPlacements = async () => {
    setLoading(true);
    try {
      const res = await getPlacements({ partnershipId, item_per_page: 100 });
      setPlacements(res.data?.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách ứng viên!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partnershipId) {
      fetchPlacements();
    }
  }, [partnershipId]);

  const handleUpdateStatus = async (id, status, extraData = {}) => {
    try {
      await updatePlacementStatus(id, { status, ...extraData });
      toast.success('Cập nhật trạng thái thành công!');
      fetchPlacements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const submitInterview = () => {
    if (!interviewDialog.date) return toast.error('Vui lòng chọn ngày phỏng vấn!');
    handleUpdateStatus(interviewDialog.placementId, 'interviewing', {
      interviewDate: new Date(interviewDialog.date).getTime()
    });
    setInterviewDialog({ isOpen: false, placementId: null, date: '' });
  };

  const submitOffer = () => {
    if (!offerDialog.salary || !offerDialog.startDate) return toast.error('Vui lòng nhập đủ thông tin!');
    handleUpdateStatus(offerDialog.placementId, 'offered', {
      offerDetails: {
        offeredSalary: Number(offerDialog.salary),
        startDate: new Date(offerDialog.startDate).getTime(),
        offeredDate: Date.now()
      }
    });
    setOfferDialog({ isOpen: false, placementId: null, salary: '', startDate: '' });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải danh sách...</div>;

  if (!placements.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] p-10 text-center text-sm text-[hsl(var(--admin-text-secondary))]">
        Chưa có ứng viên nào được giới thiệu từ hợp tác này. 
        <br />Học viên sẽ xuất hiện ở đây khi họ hoàn thành khóa học.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[hsl(var(--admin-border))] hover:bg-transparent">
              <TableHead className="text-[hsl(var(--admin-text-secondary))]">Ứng viên</TableHead>
              <TableHead className="text-[hsl(var(--admin-text-secondary))]">Trạng thái</TableHead>
              <TableHead className="text-[hsl(var(--admin-text-secondary))]">Thông tin thêm</TableHead>
              <TableHead className="text-[hsl(var(--admin-text-secondary))] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.map((placement) => {
              const ui = STATUS_UI[placement.status] || STATUS_UI.referred;
              return (
                <TableRow key={placement._id} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-hover))]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar src={placement.user?.avatar} fallback={placement.user?.displayName?.charAt(0)?.toUpperCase() || 'U'} className="h-10 w-10 border border-slate-200" />
                      <div>
                        <p className="text-sm font-bold text-[hsl(var(--admin-text-primary))]">{placement.user?.displayName || 'Học viên'}</p>
                        <p className="text-xs text-[hsl(var(--admin-text-muted))]">{placement.user?.email || '—'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={ui.color}>{ui.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-[hsl(var(--admin-text-secondary))] space-y-1">
                      {placement.status === 'interviewing' && placement.interviewDate && (
                        <p>Lịch PV: <span className="font-medium text-[hsl(var(--admin-text-primary))]">{new Date(placement.interviewDate).toLocaleString('vi-VN')}</span></p>
                      )}
                      {placement.status === 'offered' && placement.offerDetails?.offeredSalary && (
                        <>
                          <p>Lương: <span className="font-medium text-emerald-600">{new Intl.NumberFormat('vi-VN').format(placement.offerDetails.offeredSalary)} đ</span></p>
                          <p>Bắt đầu: <span className="font-medium">{new Date(placement.offerDetails.startDate).toLocaleDateString('vi-VN')}</span></p>
                        </>
                      )}
                      {(placement.status === 'accepted' || placement.status === 'started') && (
                        <p className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> Đã chốt</p>
                      )}
                      {placement.status === 'rejected' && (
                        <p className="text-rose-500 flex items-center gap-1"><XCircle size={12} /> Không phù hợp</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {placement.status === 'referred' && (
                        <Button 
                          variant="outline" 
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => setInterviewDialog({ isOpen: true, placementId: placement._id, date: '' })}
                        >
                          <Calendar className="mr-1 h-3.5 w-3.5" /> Lịch PV
                        </Button>
                      )}
                      
                      {['referred', 'interviewing'].includes(placement.status) && (
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setOfferDialog({ isOpen: true, placementId: placement._id, salary: '', startDate: '' })}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Gửi Offer
                        </Button>
                      )}

                      {placement.status === 'offered' && (
                        <span className="text-sm font-medium text-amber-600 flex items-center px-2 py-1">
                          <Clock className="mr-1 h-4 w-4" /> Đang đợi HV phản hồi
                        </span>
                      )}

                      {['referred', 'interviewing', 'offered'].includes(placement.status) && (
                        <Button 
                          variant="outline" 
                          className="text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => handleUpdateStatus(placement._id, 'rejected')}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Từ chối
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Lên lịch phỏng vấn Modal */}
      <Dialog open={interviewDialog.isOpen} onOpenChange={(v) => setInterviewDialog(prev => ({ ...prev, isOpen: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lên lịch phỏng vấn</DialogTitle>
            <DialogDescription>Chọn thời gian phỏng vấn cho ứng viên này.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Thời gian phỏng vấn</label>
              <Input type="datetime-local" value={interviewDialog.date} onChange={e => setInterviewDialog(prev => ({ ...prev, date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialog(prev => ({ ...prev, isOpen: false }))}>Hủy</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={submitInterview}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gửi Offer Modal */}
      <Dialog open={offerDialog.isOpen} onOpenChange={(v) => setOfferDialog(prev => ({ ...prev, isOpen: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi lời mời làm việc (Offer)</DialogTitle>
            <DialogDescription>Nhập thông tin lương và ngày bắt đầu làm việc dự kiến.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Mức lương đề xuất (VNĐ)</label>
              <Input type="number" placeholder="Ví dụ: 15000000" value={offerDialog.salary} onChange={e => setOfferDialog(prev => ({ ...prev, salary: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Ngày bắt đầu làm việc</label>
              <Input type="date" value={offerDialog.startDate} onChange={e => setOfferDialog(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialog(prev => ({ ...prev, isOpen: false }))}>Hủy</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={submitOffer}>Gửi Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnershipPlacementList;
