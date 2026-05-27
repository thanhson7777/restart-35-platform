import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'draft', label: 'Nháp' },
  { key: 'archived', label: 'Lưu trữ' },
];

const AdminCourseFilters = ({ filters, onChange, onSearch, stats }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearch = () => {
    onChange({ ...filters, search: searchValue });
    onSearch();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTabChange = (status) => {
    onChange({ ...filters, status, page: 1 });
    onSearch();
  };

  const handleFilterChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
    onSearch();
  };

  const clearFilters = () => {
    const newFilters = {
      status: 'all',
      search: '',
      category: '',
      level: '',
      location: '',
      fee: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
    };
    setSearchValue('');
    onChange(newFilters);
    onSearch();
  };

  const hasActiveFilters =
    filters.category || filters.level || filters.location || filters.fee;

  const getCount = (key) => {
    if (!stats) return null;
    if (key === 'all') return stats.total;
    return stats[key];
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       text-sm"
          />
        </div>
        <Button onClick={handleSearch} size="sm">
          Tìm kiếm
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {TABS.map((tab) => {
          const count = getCount(tab.key);
          const isActive = filters.status === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {tab.label}
              {count !== null && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isActive
                      ? 'bg-primary-foreground/20'
                      : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          <span>Bộ lọc:</span>
        </div>

        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả danh mục</option>
          <option value="tech">Công nghệ thông tin</option>
          <option value="business">Kinh doanh</option>
          <option value="language">Ngôn ngữ</option>
          <option value="design">Thiết kế</option>
          <option value="marketing">Marketing</option>
        </select>

        <select
          value={filters.level || ''}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả cấp độ</option>
          <option value="beginner">Người mới bắt đầu</option>
          <option value="intermediate">Trung cấp</option>
          <option value="advanced">Nâng cao</option>
        </select>

        <select
          value={filters.location || ''}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả hình thức</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <select
          value={filters.fee || ''}
          onChange={(e) => handleFilterChange('fee', e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả học phí</option>
          <option value="free">Miễn phí</option>
          <option value="paid">Có phí</option>
        </select>

        <select
          value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            handleFilterChange('sortBy', sortBy);
            handleFilterChange('sortOrder', sortOrder);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="createdAt-desc">Mới nhất</option>
          <option value="createdAt-asc">Cũ nhất</option>
          <option value="enrollmentCount-desc">Nhiều đăng ký nhất</option>
          <option value="rating-average-desc">Đánh giá cao nhất</option>
          <option value="fee-desc">Học phí cao nhất</option>
          <option value="fee-asc">Học phí thấp nhất</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4 mr-1" />
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Danh mục: {filters.category}
              <button
                onClick={() => handleFilterChange('category', '')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.level && (
            <Badge variant="secondary" className="gap-1">
              Cấp độ: {filters.level}
              <button
                onClick={() => handleFilterChange('level', '')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              Hình thức: {filters.location}
              <button
                onClick={() => handleFilterChange('location', '')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.fee && (
            <Badge variant="secondary" className="gap-1">
              Học phí: {filters.fee === 'free' ? 'Miễn phí' : 'Có phí'}
              <button
                onClick={() => handleFilterChange('fee', '')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCourseFilters;
