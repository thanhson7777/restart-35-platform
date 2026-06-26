import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, Phone, Building, Clock, Eye, RefreshCw, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, Badge, Card, CardContent, Input } from '@/components/ui';
import {
  fetchEnterpriseInterviews,
  selectEnterpriseInterviews,
  selectEnterpriseInterviewsTotal,
  selectEnterpriseInterviewsLoading
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const interviewStatusConfig = {
  pending_confirmation: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  no_show: { label: 'Vắng mặt', className: 'bg-red-100 text-red-700 border-red-200' }
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

const getMeetingIcon = (type) => {
  switch (type) {
    case 'google_meet': return Video;
    case 'phone': return Phone;
    case 'office': return Building;
    default: return Video;
  }
};

export default function EnterpriseInterviewsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const interviews = useSelector(selectEnterpriseInterviews);
  const total = useSelector(selectEnterpriseInterviewsTotal);
  const loading = useSelector(selectEnterpriseInterviewsLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const fetchInterviews = useCallback(async () => {
    const params = { page, limit };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    dispatch(fetchEnterpriseInterviews(params));
  }, [dispatch, statusFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const filteredInterviews = interviews;
  
  const totalPages = Math.ceil(total / limit) || 1;

  // Group by status
  const statusStats = interviews.reduce((acc, interview) => {
    acc[interview.status] = (acc[interview.status] || 0) + 1;
    return acc;
  }, {});

  // Group by date
  const groupedByDate = filteredInterviews.reduce((acc, interview) => {
    const dateKey = new Date(interview.scheduledAt).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(interview);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Quản lý Phỏng vấn</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              Theo dõi và quản lý lịch phỏng vấn.
            </p>
          </div>
          <Button
            onClick={() => navigate('/enterprise/interviews/schedule')}
            className="gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white"
          >
            <Plus size={14} /> Đặt lịch mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'pending_confirmation', label: 'Chờ xác nhận', className: 'bg-amber-100 text-amber-700' },
            { key: 'confirmed', label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700' },
            { key: 'completed', label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700' },
            { key: 'cancelled', label: 'Đã hủy', className: 'bg-slate-200 text-slate-600' }
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setStatusFilter(stat.key)}
              className={`p-3 rounded-xl text-center transition-all ${
                statusFilter === stat.key
                  ? `${stat.className} ring-2 ring-[hsl(var(--admin-accent))]`
                  : `${stat.className} opacity-70 hover:opacity-100`
              }`}
            >
              <p className="text-xl font-bold">{statusStats[stat.key] || 0}</p>
              <p className="text-xs">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
            <Input
              placeholder="Tìm theo tên ứng viên, công việc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]"
            />
          </div>
          <Button variant="outline" onClick={fetchInterviews} className="border-[hsl(var(--admin-border))] gap-2">
            <RefreshCw size={13} /> Làm mới
          </Button>
        </div>

        {/* Interviews List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Calendar size={40} className="text-[hsl(var(--admin-text-faint))] mb-4" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có lịch phỏng vấn nào.</p>
            <Button
              onClick={() => navigate('/enterprise/interviews/schedule')}
              className="mt-4 gap-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent-hover))] text-white"
            >
              <Plus size={14} /> Đặt lịch phỏng vấn
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([dateKey, dateInterviews]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-medium text-[hsl(var(--admin-text-muted))] mb-3">
                  {new Date(dateKey).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="space-y-3">
                  {dateInterviews.map(interview => {
                    const status = interviewStatusConfig[interview.status] || interviewStatusConfig.pending_confirmation;
                    const MeetingIcon = getMeetingIcon(interview.meetingType);
                    return (
                      <div
                        key={interview._id}
                        onClick={() => navigate(`/enterprise/interviews/${interview._id}`)}
                        className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl p-4 hover:border-[hsl(var(--admin-accent))] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${
                              interview.status === 'confirmed' ? 'bg-emerald-100' :
                              interview.status === 'pending_confirmation' ? 'bg-emerald-100' :
                              interview.status === 'completed' ? 'bg-blue-100' : 'bg-slate-100'
                            }`}>
                              <MeetingIcon size={20} className={
                                interview.status === 'confirmed' ? 'text-emerald-600' :
                                interview.status === 'pending_confirmation' ? 'text-emerald-600' :
                                'text-slate-500'
                              } />
                            </div>
                            <div>
                              <p className="font-medium text-[hsl(var(--admin-text-primary))]">
                                {interview.workerName || interview.worker?.name || 'Ứng viên'}
                              </p>
                              <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                                {interview.jobTitle || interview.job?.title} • {interview.duration || 60} phút
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                                {new Date(interview.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                                {interview.meetingType === 'google_meet' ? 'Jitsi Meet' :
                                 interview.meetingType === 'office' ? 'Tại văn phòng' : 'Điện thoại'}
                              </p>
                            </div>
                            <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                            <Button variant="ghost" size="icon" className="text-[hsl(var(--admin-text-muted))]">
                              <Eye size={18} />
                            </Button>
                          </div>
                        </div>
                        {interview.meetingLink && (
                          <div className="mt-3 pt-3 border-t border-[hsl(var(--admin-border))]">
                            <a
                              href={interview.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[hsl(var(--admin-accent))] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {interview.meetingLink}
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-[hsl(var(--admin-border))]">
                <p className="text-sm text-[hsl(var(--admin-text-muted))]">
                  Hiển thị <span className="font-medium text-[hsl(var(--admin-text-primary))]">{((page - 1) * limit) + 1}</span> đến <span className="font-medium text-[hsl(var(--admin-text-primary))]">{Math.min(page * limit, total)}</span> trong số <span className="font-medium text-[hsl(var(--admin-text-primary))]">{total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 text-[hsl(var(--admin-text-secondary))]"><ChevronLeft size={16} /></Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                        return (
                          <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} onClick={() => setPage(pageNum)} className={`h-8 w-8 p-0 ${page === pageNum ? 'bg-[hsl(var(--admin-accent))] text-white hover:bg-[hsl(var(--admin-accent-hover))]' : 'text-[hsl(var(--admin-text-secondary))]'}`}>
                            {pageNum}
                          </Button>
                        );
                      }
                      if (pageNum === page - 2 || pageNum === page + 2) return <span key={pageNum} className="text-[hsl(var(--admin-text-muted))] px-1">...</span>;
                      return null;
                    })}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 text-[hsl(var(--admin-text-secondary))]"><ChevronRight size={16} /></Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
