import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, DollarSign, Filter, ChevronRight, ChevronLeft, Loader2, Star, Sparkles } from 'lucide-react';
import { Button, Input, Badge, Card, CardContent } from '@/components/ui';
import {
  fetchPublishedJobs,
  selectJobs,
  selectJobsTotal,
  selectJobsLoading,
  selectFilters,
  setFilters
} from '@/redux/recruitment/recruitmentSlice';
import { useDispatch, useSelector } from 'react-redux';
import { JOB_TYPE_OPTIONS } from '@/data/profileData';

const formatSalary = (salary) => {
  if (!salary) return 'Thoả thuận';
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  if (salary.min && salary.max) return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
  if (salary.min) return `Từ ${formatter.format(salary.min)}`;
  if (salary.max) return `Đến ${formatter.format(salary.max)}`;
  return 'Thoả thuận';
};

const formatDate = (date) => {
  if (!date) return '';
  const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
};

const JOB_TYPE_LABELS = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  'temporary': 'Tạm thời',
  'freelance': 'Freelance',
  'internship': 'Thực tập',
};

const LOCATION_TYPE_LABELS = {
  onsite: 'Tại văn phòng',
  remote: 'Từ xa',
  hybrid: 'Kết hợp',
};

const FeaturedJobCard = ({ job, onClick }) => (
  <div
    onClick={onClick}
    className="flex-1 min-w-0 bg-white border border-amber-200 rounded-xl p-4 hover:shadow-lg hover:border-amber-400 transition-all cursor-pointer"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
        <span className="text-amber-600 font-bold text-sm">
          {(job.enterpriseInfo?.name || 'DN').charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={12} className="text-amber-500 fill-current shrink-0" />
          <span className="text-xs font-semibold text-amber-600">Mới</span>
        </div>
        <h4 className="font-semibold text-sm text-[hsl(var(--foreground))] truncate">
          {job.title || job.job?.title}
        </h4>
        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
          {job.enterpriseInfo?.name || 'Doanh nghiệp'}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <MapPin size={10} />{job.location?.province || '—'}
          </span>
          <span>{formatSalary(job.salary)}</span>
        </div>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {JOB_TYPE_LABELS[job.job?.type] || job.job?.type}
      </Badge>
    </div>
  </div>
);

const JobCard = ({ job, onClick }) => {
  const isDeadlineSoon = job.deadline && (new Date(job.deadline) - new Date()) < 7 * 24 * 60 * 60 * 1000;
  return (
    <div
      onClick={onClick}
      className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 hover:border-[hsl(var(--primary))] hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[hsl(var(--foreground))] truncate mb-1">
            {job.title || job.job?.title}
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
            {job.enterpriseInfo?.name || job.enterprise?.name || job.company || 'Doanh nghiệp'}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {job.location?.province || job.province || '—'}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={14} />
              {formatSalary(job.salary)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="text-xs">
            {JOB_TYPE_LABELS[job.job?.type] || job.job?.type || 'Toàn thời gian'}
          </Badge>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {formatDate(job.createdAt || job.publishedAt)}
          </span>
        </div>
      </div>
      {(job.skills?.length > 0 || job.requirements?.skills?.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
          {(job.skills || job.requirements?.skills || []).slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            >
              {skill}
            </span>
          ))}
          {(job.skills?.length > 4 || job.requirements?.skills?.length > 4) && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              +{Math.max((job.skills?.length || 0) - 4, (job.requirements?.skills?.length || 0) - 4)}
            </span>
          )}
        </div>
      )}
      {isDeadlineSoon && job.deadline && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
            <Star size={10} className="fill-current" />
            Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
};

export default function RecruitmentSection() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const jobs = useSelector(selectJobs);
  const total = useSelector(selectJobsTotal);
  const loading = useSelector(selectJobsLoading);
  const filters = useSelector(selectFilters);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [localFilters, setLocalFilters] = useState({
    province: '',
    jobType: '',
    locationType: '',
    salaryMin: '',
    salaryMax: ''
  });

  const PAGE_SIZE = 12;

  const fetchJobs = useCallback(async (params = {}, page = 1) => {
    const p = params.page || page;
    dispatch(fetchPublishedJobs({
      page: p,
      limit: PAGE_SIZE,
      search: params.search !== undefined ? params.search : searchQuery,
      province: params.province !== undefined ? params.province : localFilters.province,
      type: params.type !== undefined ? params.type : localFilters.jobType,
      locationType: params.locationType !== undefined ? params.locationType : localFilters.locationType,
      salaryMin: params.salaryMin !== undefined ? params.salaryMin : localFilters.salaryMin,
      salaryMax: params.salaryMax !== undefined ? params.salaryMax : localFilters.salaryMax,
    }));
  }, [dispatch, searchQuery, localFilters]);

  useEffect(() => {
    fetchJobs({}, 1);
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchJobs({ search: searchQuery }, 1);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    setCurrentPage(1);
    fetchJobs(newFilters, 1);
  };

  const handleClearFilters = () => {
    setLocalFilters({ province: '', jobType: '', locationType: '', salaryMin: '', salaryMax: '' });
    setSearchQuery('');
    setCurrentPage(1);
    fetchJobs({}, 1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchJobs({}, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJobClick = (job) => {
    navigate(`/community/jobs/${job._id || job.id}`);
  };

  const featuredJobs = jobs.slice(0, 3);
  const paginatedJobs = jobs;
  const hasFilters = searchQuery || localFilters.province || localFilters.jobType || localFilters.locationType || localFilters.salaryMin || localFilters.salaryMax;

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Tìm kiếm theo tên công việc, địa điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 shrink-0"
        >
          <Filter size={14} /> Bộ lọc {hasFilters && <span className="w-2 h-2 rounded-full bg-white" />}
        </Button>
        <Button onClick={handleSearch} className="shrink-0">
          Tìm kiếm
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tỉnh/Thành phố</label>
                <Input
                  placeholder="VD: TP. Hồ Chí Minh"
                  value={localFilters.province}
                  onChange={(e) => handleFilterChange('province', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Loại hình công việc</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                  value={localFilters.jobType}
                  onChange={(e) => handleFilterChange('jobType', e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {JOB_TYPE_OPTIONS.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hình thức làm việc</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                  value={localFilters.locationType}
                  onChange={(e) => handleFilterChange('locationType', e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="onsite">{LOCATION_TYPE_LABELS.onsite}</option>
                  <option value="remote">{LOCATION_TYPE_LABELS.remote}</option>
                  <option value="hybrid">{LOCATION_TYPE_LABELS.hybrid}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lương tối thiểu (VND)</label>
                <Input
                  type="number"
                  placeholder="VD: 5000000"
                  value={localFilters.salaryMin}
                  onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lương tối đa (VND)</label>
                <Input
                  type="number"
                  placeholder="VD: 15000000"
                  value={localFilters.salaryMax}
                  onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
                />
              </div>
            </div>
            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs">
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {loading ? 'Đang tải...' : (
            <>Tìm thấy <span className="font-semibold text-[hsl(var(--foreground))]">{total}</span> việc làm</>
          )}
        </p>
        {hasFilters && (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Trang {currentPage} / {Math.ceil(total / PAGE_SIZE) || 1}
          </span>
        )}
      </div>

      {/* Featured Jobs Banner */}
      {!loading && !hasFilters && featuredJobs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-500 fill-current" />
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">Việc làm mới nhất</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {featuredJobs.map(job => (
              <FeaturedJobCard
                key={job._id || job.id}
                job={job}
                onClick={() => handleJobClick(job)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-[hsl(var(--muted-foreground))]" />
          </div>
          <p className="text-[hsl(var(--muted-foreground))] font-medium mb-1">
            Không tìm thấy việc làm phù hợp.
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
          </p>
          {hasFilters && (
            <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <JobCard
              key={job._id || job.id}
              job={job}
              onClick={() => handleJobClick(job)}
            />
          ))}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={16} />
              </Button>
              {Array.from({ length: Math.min(5, Math.ceil(total / PAGE_SIZE)) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-9"
                  >
                    {page}
                  </Button>
                );
              })}
              {Math.ceil(total / PAGE_SIZE) > 5 && currentPage < Math.ceil(total / PAGE_SIZE) && (
                <>
                  <span className="text-sm text-[hsl(var(--muted-foreground))] px-1">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.ceil(total / PAGE_SIZE))}
                    className="w-9"
                  >
                    {Math.ceil(total / PAGE_SIZE)}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(total / PAGE_SIZE)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
