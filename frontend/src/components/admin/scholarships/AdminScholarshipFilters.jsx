import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'draft', label: 'Nháp' },
  { key: 'paused', label: 'Tạm dừng' },
  { key: 'exhausted', label: 'Đã hết ngân sách' },
  { key: 'expired', label: 'Hết hạn' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Mới nhất' },
  { value: 'createdAt-asc', label: 'Cũ nhất' },
  { value: 'budget-desc', label: 'Ngân sách cao nhất' },
  { value: 'budget-asc', label: 'Ngân sách thấp nhất' },
  { value: 'currentRecipients-desc', label: 'Nhiều người nhận nhất' },
];

const AdminScholarshipFilters = ({ filters, onChange, onSearch }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearch = () => {
    onChange({ ...filters, search: searchValue, page: 1 });
    onSearch?.();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTabChange = (status) => {
    const newStatus = status === 'all' ? '' : status;
    onChange({ ...filters, status: newStatus, page: 1 });
    onSearch?.();
  };

  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split('-');
    onChange({ ...filters, sortBy, sortOrder, page: 1 });
    onSearch?.();
  };

  const clearFilters = () => {
    setSearchValue('');
    onChange({
      status: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
    });
    onSearch?.();
  };

  const hasActiveFilters = filters.search || filters.status;

  const sortValue = `${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm học bổng..."
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
          const isActive = (tab.key === 'all' && !filters.status) || filters.status === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          <span>Sắp xếp:</span>
        </div>

        <select
          value={sortValue}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Tìm kiếm: {filters.search}
              <button
                onClick={() => {
                  setSearchValue('');
                  onChange({ ...filters, search: '', page: 1 });
                  onSearch?.();
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Trạng thái: {
                TABS.find(t => t.key === filters.status)?.label || filters.status
              }
              <button
                onClick={() => {
                  onChange({ ...filters, status: '', page: 1 });
                  onSearch?.();
                }}
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

export default AdminScholarshipFilters;
