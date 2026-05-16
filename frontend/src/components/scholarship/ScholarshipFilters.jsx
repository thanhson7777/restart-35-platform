import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui';
import { Search, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang nhận đơn' },
  { value: 'paused', label: 'Tạm dừng' },
  { value: 'exhausted', label: 'Đã hết chỗ' },
  { value: 'expired', label: 'Đã hết hạn' },
];

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  page: 1,
};

export const ScholarshipFilters = ({ filters = DEFAULT_FILTERS, onChange }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleChange = useCallback(
    (key, value) => {
      onChange({ ...filters, [key]: value, page: 1 });
    },
    [filters, onChange]
  );

  const clearFilters = () => {
    setLocalSearch('');
    onChange({ ...DEFAULT_FILTERS });
  };

  const hasActiveFilters = filters.search || filters.status;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm học bổng..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-10"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onChange({ ...filters, search: '', page: 1 });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
    </div>
  );
};
