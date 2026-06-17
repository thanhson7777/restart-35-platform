import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SORT_OPTIONS = [
  { value: 'enrollmentCount', label: 'Phổ biến nhất' },
  { value: 'rating', label: 'Đánh giá tốt nhất' },
  { value: 'createdAt', label: 'Mới cập nhật' },
  { value: 'fee', label: 'Học phí thấp nhất' },
];

export const CourseFilters = ({ filters, onChange, categories = [] }) => {
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
  }, [localSearch, filters.search, onChange]);

  // Sync state if filters.search is changed from outside (e.g. clearFilters)
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

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
      sortBy: 'createdAt',
      order: 'desc',
      page: 1,
    };
    setLocalSearch('');
    onChange(cleared);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category
  );

  return (
    <div className="space-y-4">
      {/* Search Bar & Mobile Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
          <Input
            placeholder="Tìm kiếm khóa học theo tên hoặc kỹ năng..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-10 py-5 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-primary/20 text-sm"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onChange({ ...filters, search: '', page: 1 });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-white" />
            </button>
          )}
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`md:hidden flex items-center justify-center gap-2 px-4 rounded-xl border transition-all duration-300 ${
            showMobileFilters 
              ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:border-white' 
              : 'border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 hover:bg-zinc-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-xs font-semibold">Bộ lọc</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* Desktop Filters (Category, Level, Funding Model, Checkboxes) */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        {/* Category */}
        <select
          value={filters.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat._id || cat.id} value={cat._id || cat.id}>
              {cat.name}
            </option>
          ))}
        </select>


        {/* Clear Filters (Desktop) */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors ml-auto flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Xóa bộ lọc
          </button>
        )}
      </div>


      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden"
          >
            <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
              {/* Category */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">Danh mục</span>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-zinc-700 dark:text-zinc-350"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat._id || cat.id} value={cat._id || cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>


              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/95 transition-colors mt-2"
                >
                  <X className="w-4 h-4" />
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort & Quick Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-zinc-150 dark:border-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Sắp xếp theo:</span>
          <select
            value={`${filters.sortBy || 'createdAt'}-${filters.order || 'desc'}`}
            onChange={(e) => {
              const [sortBy, order] = e.target.value.split('-');
              handleChange('sortBy', sortBy);
              handleChange('order', order);
            }}
            className="px-3 py-1.5 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={`${opt.value}-desc`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
