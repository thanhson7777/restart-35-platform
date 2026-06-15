import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
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

  const hasActiveFilters = filters.category || filters.level || filters.location || filters.fee;

  const getCount = (key) => {
    if (!stats) return null;
    if (key === 'all') return stats.total;
    return stats[key];
  };

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-4 mb-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))] placeholder-[hsl(var(--admin-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 focus:border-[hsl(var(--admin-accent))]/50 text-sm"
          />
        </div>
        <Button onClick={handleSearch} size="sm" className="h-10">
          Tìm kiếm
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--admin-border))] pb-4">
        {TABS.map((tab) => {
          const count = getCount(tab.key);
          const isActive = filters.status === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
              }`}
            >
              {tab.label}
              {count !== null && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isActive
                    ? 'bg-white/20'
                    : 'bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-muted))]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-muted))]">
          <Filter className="w-4 h-4" />
          <span>Bộ lọc:</span>
        </div>

        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--admin-border))] rounded-xl bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 h-10"
        >
          <option value="">Tất cả danh mục</option>
          <option value="tech">Công nghệ thông tin</option>
          <option value="business">Kinh doanh</option>
          <option value="language">Ngôn ngữ</option>
          <option value="design">Thiết kế</option>
          <option value="marketing">Marketing</option>
        </select>


        <select
          value={filters.location || ''}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--admin-border))] rounded-xl bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 h-10"
        >
          <option value="">Tất cả hình thức</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <select
          value={filters.fee || ''}
          onChange={(e) => handleFilterChange('fee', e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--admin-border))] rounded-xl bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 h-10"
        >
          <option value="">Tất cả học phí</option>
          <option value="free">Miễn phí</option>
          <option value="paid">Có phí</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-[hsl(var(--admin-text-muted))] hover:text-rose-500"
          >
            <X className="w-4 h-4 mr-1" />
            Xóa lọc
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[hsl(var(--admin-border))]">
          {filters.category && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border-[hsl(var(--admin-border))]">
              Danh mục: {filters.category}
              <button onClick={() => handleFilterChange('category', '')} className="ml-1 hover:text-rose-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.level && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border-[hsl(var(--admin-border))]">
              Cấp độ: {filters.level}
              <button onClick={() => handleFilterChange('level', '')} className="ml-1 hover:text-rose-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border-[hsl(var(--admin-border))]">
              Hình thức: {filters.location}
              <button onClick={() => handleFilterChange('location', '')} className="ml-1 hover:text-rose-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.fee && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border-[hsl(var(--admin-border))]">
              Học phí: {filters.fee === 'free' ? 'Miễn phí' : 'Có phí'}
              <button onClick={() => handleFilterChange('fee', '')} className="ml-1 hover:text-rose-500">
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
