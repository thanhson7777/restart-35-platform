import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, MapPin, DollarSign, Filter, ChevronRight, ChevronLeft, Loader2, Star, Sparkles, X } from 'lucide-react';
import { Button, Input, Badge, Card, CardContent } from '@/components/ui';
import { SelectField } from '@/components/ui/SelectField';
import { Navbar } from '@/components/landing';
import Footer from '@/components/layout/Footer';
import { getJobCategoriesAPI } from '@/apis/jobCategoryApi';
import {
  fetchPublishedJobs,
  selectJobs,
  selectJobsTotal,
  selectJobsLoading,
  selectFilters
} from '@/redux/recruitment/recruitmentSlice';
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
    className="flex-1 min-w-0 bg-white border border-blue-100 rounded-2xl p-5 hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 relative overflow-hidden"
  >
    {/* Decorative Top Line */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
    
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
        <span className="text-blue-600 font-bold text-lg">
          {(job.enterpriseInfo?.name || 'DN').charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={14} className="text-blue-500 fill-current shrink-0" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mới nhất</span>
        </div>
        <h4 className="font-bold text-base text-zinc-900 truncate hover:text-blue-600 transition-colors">
          {job.title || job.job?.title}
        </h4>
        <p className="text-sm text-zinc-500 truncate mt-0.5">
          {job.enterpriseInfo?.name || 'Doanh nghiệp'}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-blue-500" />{job.location?.province || '—'}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign size={13} className="text-emerald-500" />{formatSalary(job.salary)}
          </span>
        </div>
      </div>
      <Badge className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 text-xs py-1 px-2.5 rounded-full shrink-0 font-semibold" variant="outline">
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
      className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-blue-400 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-zinc-900 truncate mb-1 hover:text-blue-600 transition-colors">
              {job.title || job.job?.title}
            </h3>
            <p className="text-sm font-medium text-zinc-500">
              {job.enterpriseInfo?.name || job.enterprise?.name || job.company || 'Doanh nghiệp đối tác'}
            </p>
          </div>
          <Badge className="bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 text-xs py-1 px-2.5 rounded-full font-semibold shrink-0" variant="outline">
            {JOB_TYPE_LABELS[job.job?.type] || job.job?.type || 'Toàn thời gian'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 mt-4">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin size={15} className="text-blue-500" />
            {job.location?.province || job.province || '—'}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-md">
            <DollarSign size={15} className="text-emerald-500" />
            {formatSalary(job.salary)}
          </span>
        </div>

        {(job.skills?.length > 0 || job.requirements?.skills?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-slate-100">
            {(job.skills || job.requirements?.skills || []).slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50/50 text-blue-600 border border-blue-100/50"
              >
                {skill}
              </span>
            ))}
            {(job.skills?.length > 3 || job.requirements?.skills?.length > 3) && (
              <span className="text-xs font-semibold text-zinc-400 self-center ml-1">
                +{Math.max((job.skills?.length || 0) - 3, (job.requirements?.skills?.length || 0) - 3)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
        <span className="text-xs text-zinc-400 font-medium">
          Đăng {formatDate(job.createdAt || job.publishedAt)}
        </span>
        {isDeadlineSoon && job.deadline ? (
          <span className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
            <Star size={12} className="fill-current text-amber-500" />
            Gấp: {new Date(job.deadline).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
          </span>
        ) : job.deadline ? (
          <span className="text-xs text-zinc-400 font-medium">
            Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default function PartnerJobsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const jobs = useSelector(selectJobs);
  const total = useSelector(selectJobsTotal);
  const loading = useSelector(selectJobsLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [localFilters, setLocalFilters] = useState({
    categoryId: '',
    province: '',
    jobType: '',
    locationType: '',
    salaryMin: '',
  });
  const [categories, setCategories] = useState([]);

  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getJobCategoriesAPI();
        if (res.success) {
          setCategories(res.data || []);
        }
      } catch (error) {
        console.error('Error fetching job categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch jobs reactively when filters, keyword, or page change
  useEffect(() => {
    dispatch(fetchPublishedJobs({
      page: currentPage,
      limit: PAGE_SIZE,
      search: searchKeyword,
      categoryId: localFilters.categoryId,
      province: localFilters.province,
      type: localFilters.jobType,
      locationType: localFilters.locationType,
      salaryMin: localFilters.salaryMin,
    }));
  }, [dispatch, currentPage, searchKeyword, localFilters]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchKeyword(searchQuery);
  };

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setLocalFilters({ categoryId: '', province: '', jobType: '', locationType: '', salaryMin: '' });
    setSearchQuery('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJobClick = (job) => {
    navigate(`/partner-jobs/${job._id || job.id}`);
  };

  const featuredJobs = jobs.slice(0, 3);
  const hasFilters = searchQuery || searchKeyword || localFilters.categoryId || localFilters.province || localFilters.jobType || localFilters.locationType || localFilters.salaryMin;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pt-[88px]">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={12} className="fill-current text-blue-500" />
            Doanh nghiệp đồng hành
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 leading-tight">
            Doanh nghiệp <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Tuyển dụng</span>
          </h1>
          <p className="text-zinc-500 mt-2 text-base md:text-lg max-w-3xl font-medium">
            Khám phá các cơ hội nghề nghiệp chất lượng cao từ các doanh nghiệp đối tác uy tín cam kết đồng hành hỗ trợ lao động trên 35 tuổi.
          </p>
        </div>

        {/* Top Horizontal Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Search Job Name */}
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Nhập tên công việc, doanh nghiệp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-11 w-full rounded-xl border-slate-200 focus-visible:ring-blue-500"
              />
            </div>

            {/* Category Select */}
            <div className="lg:col-span-4">
              <SelectField
                options={[
                  { value: '', label: 'Tất cả danh mục nghề' },
                  ...categories.map(c => ({ value: c._id, label: c.name }))
                ]}
                value={localFilters.categoryId}
                onChange={(val) => handleFilterChange('categoryId', val)}
                className="h-11 rounded-xl border-slate-200"
              />
            </div>

            {/* Main Action Buttons */}
            <div className="lg:col-span-3 flex gap-2">
              <Button onClick={handleSearch} className="h-11 flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Tìm kiếm
              </Button>
              {hasFilters && (
                <Button variant="outline" onClick={handleClearFilters} className="h-11 px-3.5 rounded-xl border-slate-200 text-zinc-500 hover:text-zinc-700 hover:bg-slate-50">
                  <X size={18} />
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
            {/* Province Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tỉnh / Thành phố</label>
              <Input
                placeholder="Ví dụ: TP. Hồ Chí Minh"
                className="h-10 rounded-lg border-slate-200 text-sm"
                value={localFilters.province}
                onChange={(e) => handleFilterChange('province', e.target.value)}
              />
            </div>

            {/* Job Type Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Loại hình</label>
              <SelectField
                options={[
                  { value: '', label: 'Tất cả loại hình' },
                  ...JOB_TYPE_OPTIONS
                ]}
                value={localFilters.jobType}
                onChange={(val) => handleFilterChange('jobType', val)}
                className="h-10 rounded-lg border-slate-200 text-sm"
              />
            </div>

            {/* Location Type Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Hình thức làm việc</label>
              <SelectField
                options={[
                  { value: '', label: 'Tất cả hình thức' },
                  { value: 'onsite', label: LOCATION_TYPE_LABELS.onsite },
                  { value: 'remote', label: LOCATION_TYPE_LABELS.remote },
                  { value: 'hybrid', label: LOCATION_TYPE_LABELS.hybrid }
                ]}
                value={localFilters.locationType}
                onChange={(val) => handleFilterChange('locationType', val)}
                className="h-10 rounded-lg border-slate-200 text-sm"
              />
            </div>

            {/* Salary Min Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mức lương từ (VND)</label>
              <Input
                type="number"
                placeholder="Ví dụ: 8000000"
                className="h-10 rounded-lg border-slate-200 text-sm"
                value={localFilters.salaryMin}
                onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Featured Jobs Section */}
        {!loading && !hasFilters && featuredJobs.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-blue-500 fill-current" />
              <h3 className="font-bold text-lg text-zinc-950">Tin tuyển dụng tiêu biểu</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        {/* Jobs Search Results Status */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
          <p className="text-sm font-semibold text-zinc-500">
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Đang tải danh sách...</span>
            ) : (
              <>Tìm thấy <span className="text-blue-600 font-bold">{total}</span> vị trí tuyển dụng</>
            )}
          </p>
          {!loading && total > 0 && (
            <span className="text-xs font-bold text-zinc-400 uppercase">
              Trang {currentPage} / {totalPages}
            </span>
          )}
        </div>

        {/* Main Jobs Listing */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-2" />
            <p className="text-sm text-zinc-400 font-medium">Đang cập nhật danh sách việc làm mới...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white border border-slate-150 rounded-2xl text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Search size={28} className="text-slate-400" />
            </div>
            <h4 className="text-zinc-800 font-bold text-lg mb-1">Không tìm thấy kết quả phù hợp</h4>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              Chúng tôi không tìm thấy việc làm nào khớp với bộ lọc của bạn. Hãy thử thay đổi từ khóa hoặc xóa bớt tiêu chí lọc.
            </p>
            {hasFilters && (
              <Button variant="outline" className="rounded-xl border-slate-200" onClick={handleClearFilters}>
                Xóa tất cả bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Grid layout for Jobs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map(job => (
                <JobCard
                  key={job._id || job.id}
                  job={job}
                  onClick={() => handleJobClick(job)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-1.5 pt-6">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="rounded-xl border-slate-200 h-9 w-9 p-0"
                >
                  <ChevronLeft size={16} />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => {
                  const page = i + 1;
                  // Only show current page, first, last, and pages close to current
                  if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        onClick={() => handlePageChange(page)}
                        className={`h-9 w-9 rounded-xl font-bold ${page === currentPage ? 'bg-blue-600 text-white' : 'border-slate-200 text-zinc-600'}`}
                      >
                        {page}
                      </Button>
                    );
                  }
                  if (page === 2 || page === totalPages - 1) {
                    return <span key={page} className="text-zinc-400 px-1 font-bold text-sm">...</span>;
                  }
                  return null;
                })}
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="rounded-xl border-slate-200 h-9 w-9 p-0"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
