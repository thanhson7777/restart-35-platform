import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Filter, Eye, CheckCircle, XCircle, RefreshCw, ChevronDown } from 'lucide-react';

import { Button, Badge, Input, Card, CardContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import {
  fetchEnterpriseApplications,
  selectEnterpriseApplications,
  selectEnterpriseApplicationsTotal,
  selectEnterpriseApplicationsLoading
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

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

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

export default function EnterpriseApplicationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get('jobId');

  const applications = useSelector(selectEnterpriseApplications);
  const total = useSelector(selectEnterpriseApplicationsTotal);
  const loading = useSelector(selectEnterpriseApplicationsLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState(jobIdFromUrl || 'all');
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    import('@/apis/recruitmentAPI').then(({ getEnterpriseJobs }) => {
      getEnterpriseJobs({ limit: 50, status: 'published' }).then(res => {
        if (res.data?.data) setJobs(res.data.data);
      }).catch(err => console.error(err));
    });
  }, []);

  const fetchApplications = useCallback(async () => {
    const params = { limit: 100 };
    if (jobFilter !== 'all') params.jobId = jobFilter;
    dispatch(fetchEnterpriseApplications(params));
  }, [dispatch, jobFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = applications.filter(app => {
    if (statusFilter === 'new' && !['new'].includes(app.status)) return false;
    if (statusFilter === 'reviewing' && !['reviewing', 'shortlisted'].includes(app.status)) return false;
    if (statusFilter === 'interviewing' && !['interview_scheduled', 'interviewed'].includes(app.status)) return false;
    if (statusFilter === 'hired' && !['offered', 'hired'].includes(app.status)) return false;
    if (statusFilter === 'rejected' && !['rejected', 'withdrawn'].includes(app.status)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.workerName?.toLowerCase().includes(query) ||
      app.worker?.name?.toLowerCase().includes(query) ||
      app.jobTitle?.toLowerCase().includes(query) ||
      app.job?.title?.toLowerCase().includes(query)
    );
  });

  // Group by status for stats
  const stats = applications.reduce((acc, app) => {
    acc.all++;
    if (['new'].includes(app.status)) acc.new++;
    if (['reviewing', 'shortlisted'].includes(app.status)) acc.reviewing++;
    if (['interview_scheduled', 'interviewed'].includes(app.status)) acc.interviewing++;
    if (['offered', 'hired'].includes(app.status)) acc.hired++;
    if (['rejected', 'withdrawn'].includes(app.status)) acc.rejected++;
    return acc;
  }, { all: 0, new: 0, reviewing: 0, interviewing: 0, hired: 0, rejected: 0 });

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[hsl(var(--admin-text-primary))]">Quản lý Ứng viên</h1>
            <p className="text-[hsl(var(--admin-text-muted))] text-sm mt-1">
              Xem và quản lý đơn ứng tuyển của doanh nghiệp.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { key: 'all', label: 'Tất cả', className: 'bg-slate-100 text-slate-700' },
            { key: 'new', label: 'Mới', className: 'bg-blue-100 text-blue-700' },
            { key: 'reviewing', label: 'Đang xem xét', className: 'bg-amber-100 text-amber-700' },
            { key: 'interviewing', label: 'Phỏng vấn', className: 'bg-indigo-100 text-indigo-700' },
            { key: 'hired', label: 'Duyệt', className: 'bg-emerald-100 text-emerald-700' },
            { key: 'rejected', label: 'Từ chối / Rút', className: 'bg-red-100 text-red-700' }
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setStatusFilter(stat.key)}
              className={`p-3 rounded-xl text-center transition-all ${statusFilter === stat.key
                  ? `${stat.className} ring-2 ring-offset-2 ring-[hsl(var(--admin-accent))]`
                  : `${stat.className} opacity-70 hover:opacity-100`
                }`}
            >
              <p className="text-xl font-bold">{stats[stat.key] || 0}</p>
              <p className="text-xs">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
            <Input
              placeholder="Tìm theo tên ứng viên, công việc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
                <SelectValue placeholder="Tất cả tin tuyển dụng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tin tuyển dụng</SelectItem>
                {jobs.map(job => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={fetchApplications} className="border-[hsl(var(--admin-border))] gap-2">
            <RefreshCw size={13} /> Làm mới
          </Button>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-[hsl(var(--admin-surface-elevated))] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Users size={40} className="text-[hsl(var(--admin-text-faint))] mb-4" />
            <p className="text-[hsl(var(--admin-text-muted))] font-medium">Chưa có đơn ứng tuyển nào.</p>
          </div>
        ) : (
          <Card className="bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[hsl(var(--admin-border))]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--admin-text-muted))]">Ứng viên</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--admin-text-muted))]">Công việc</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--admin-text-muted))]">Trạng thái</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--admin-text-muted))]">Ngày ứng tuyển</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[hsl(var(--admin-text-muted))]">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => {
                      const status = applicationStatusConfig[app.status] || applicationStatusConfig.new;
                      return (
                        <tr
                          key={app._id}
                          className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-surface-elevated))] cursor-pointer transition-colors"
                          onClick={() => navigate(`/enterprise/applications/${app._id}`)}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[hsl(var(--admin-accent-subtle))] flex items-center justify-center shrink-0">
                                <span className="text-sm font-medium text-[hsl(var(--admin-accent))]">
                                  {app.workerName?.[0] || app.worker?.name?.[0] || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-[hsl(var(--admin-text-primary))]">
                                  {app.workerName || app.worker?.name || 'Ứng viên'}
                                </p>
                                <p className="text-xs text-[hsl(var(--admin-text-muted))]">
                                  {app.workerEmail || app.worker?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">
                              {app.jobTitle || app.job?.title || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-[hsl(var(--admin-text-muted))]">
                            {formatDateTime(app.appliedAt)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/enterprise/applications/${app._id}`);
                              }}
                              className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-accent))]"
                            >
                              <Eye size={18} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
