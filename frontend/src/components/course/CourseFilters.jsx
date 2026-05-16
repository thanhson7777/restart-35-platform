import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả cấp độ' },
  { value: 'beginner', label: 'Người mới' },
  { value: 'intermediate', label: 'Trung bình' },
  { value: 'advanced', label: 'Nâng cao' },
];

const SORT_OPTIONS = [
  { value: 'enrollmentCount', label: 'Phổ biến nhất' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'createdAt', label: 'Mới nhất' },
  { value: 'fee', label: 'Học phí thấp nhất' },
];

export const CourseFilters = ({ filters, onChange, categories = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounce search input (300ms)
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
    const cleared = {
      search: '',
      category: '',
      level: '',
      isFree: false,
      hasScholarship: false,
      sortBy: 'enrollmentCount',
      order: 'desc',
      page: 1,
    };
    setLocalSearch('');
    onChange(cleared);
  };

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.level ||
    filters.isFree ||
    filters.hasScholarship;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm khóa học..."
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

      {/* Desktop filters */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        {/* Category */}
        <select
          value={filters.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat._id || cat.id} value={cat._id || cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Level */}
        <select
          value={filters.level || ''}
          onChange={(e) => handleChange('level', e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Free checkbox */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.isFree || false}
            onChange={(e) => handleChange('isFree', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Miễn phí
        </label>

        {/* Has scholarship checkbox */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hasScholarship || false}
            onChange={(e) => handleChange('hasScholarship', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Có học bổng
        </label>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline ml-auto"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Mobile filter toggle */}
      <div className="md:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 text-sm px-3 py-2 border border-border rounded-lg hover:bg-muted"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Bộ lọc
          {hasActiveFilters && (
            <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
              !
            </span>
          )}
        </button>

        {showMobileFilters && (
          <div className="mt-3 p-4 border border-border rounded-lg bg-card space-y-3">
            {/* Category */}
            <select
              value={filters.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Level */}
            <select
              value={filters.level || ''}
              onChange={(e) => handleChange('level', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Checkboxes */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.isFree || false}
                onChange={(e) => handleChange('isFree', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Miễn phí
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hasScholarship || false}
                onChange={(e) => handleChange('hasScholarship', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Có học bổng
            </label>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Sắp xếp:
        </span>
        <select
          value={`${filters.sortBy || 'enrollmentCount'}-${filters.order || 'desc'}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split('-');
            handleChange('sortBy', sortBy);
            handleChange('order', order);
          }}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {SORT_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={`${opt.value}-desc`}
            >
              {opt.label} ↓
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
