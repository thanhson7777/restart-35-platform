import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui';
import { Search, SlidersHorizontal, X, Play, Video, MapPin, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả cấp độ' },
  { value: 'beginner', label: 'Người mới bắt đầu' },
  { value: 'intermediate', label: 'Trung bình / Đã biết' },
  { value: 'advanced', label: 'Nâng cao / Chuyên sâu' },
];

const SORT_OPTIONS = [
  { value: 'enrollmentCount', label: 'Phổ biến nhất' },
  { value: 'rating', label: 'Đánh giá tốt nhất' },
  { value: 'createdAt', label: 'Mới cập nhật' },
  { value: 'fee', label: 'Học phí thấp nhất' },
];

const FUNDING_OPTIONS = [
  { value: '', label: 'Tất cả hỗ trợ tài chính' },
  { value: 'free', label: 'Miễn phí' },
  { value: 'learner_paid', label: 'Trả phí' },
  { value: 'isa', label: 'ISA - Học trước trả sau' },
  { value: 'enterprise_funded', label: 'Doanh nghiệp chi trả' },
  { value: 'batch', label: 'Đóng phí theo đợt' },
];

const DELIVERY_TYPES = [
  { value: '', label: 'Tất cả', icon: null },
  { value: 'video', label: 'Video bài giảng', icon: Play },
  { value: 'live', label: 'Live trực tuyến', icon: Video },
  { value: 'offline', label: 'Tại lớp (Offline)', icon: MapPin },
  { value: 'blended', label: 'Học kết hợp (Blended)', icon: Layers },
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
      level: '',
      isFree: false,
      hasScholarship: false,
      delivery_type: '',
      funding_model: '',
      sortBy: 'enrollmentCount',
      order: 'desc',
      page: 1,
    };
    setLocalSearch('');
    onChange(cleared);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.level ||
    filters.isFree ||
    filters.hasScholarship ||
    filters.delivery_type ||
    filters.funding_model
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

        {/* Level */}
        <select
          value={filters.level || ''}
          onChange={(e) => handleChange('level', e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Funding Model */}
        <select
          value={filters.funding_model || ''}
          onChange={(e) => handleChange('funding_model', e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          {FUNDING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Free checkbox */}
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={filters.isFree || false}
            onChange={(e) => handleChange('isFree', e.target.checked)}
            className="w-4 h-4 accent-primary rounded border-zinc-300 focus:ring-primary/25"
          />
          Miễn phí
        </label>

        {/* Has scholarship checkbox */}
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={filters.hasScholarship || false}
            onChange={(e) => handleChange('hasScholarship', e.target.checked)}
            className="w-4 h-4 accent-primary rounded border-zinc-300 focus:ring-primary/25"
          />
          Học bổng
        </label>

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

      {/* Desktop Delivery Type Chip Selection */}
      <div className="hidden md:flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold mr-2">Hình thức học:</span>
        {DELIVERY_TYPES.map((dt) => {
          const Icon = dt.icon;
          const isActive = filters.delivery_type === dt.value || (dt.value === '' && !filters.delivery_type);
          
          return (
            <button
              key={dt.value}
              onClick={() => handleChange('delivery_type', dt.value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300 select-none ${
                isActive
                  ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm dark:bg-white dark:border-white dark:text-zinc-900'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" strokeWidth={2.0} />}
              <span>{dt.label}</span>
            </button>
          );
        })}
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

              {/* Level */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">Trình độ</span>
                <select
                  value={filters.level || ''}
                  onChange={(e) => handleChange('level', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-zinc-700 dark:text-zinc-350"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Funding Model */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">Mô hình tài chính</span>
                <select
                  value={filters.funding_model || ''}
                  onChange={(e) => handleChange('funding_model', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-zinc-700 dark:text-zinc-350"
                >
                  {FUNDING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Delivery Type Chips */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block">Hình thức học</span>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_TYPES.map((dt) => {
                    const Icon = dt.icon;
                    const isActive = filters.delivery_type === dt.value || (dt.value === '' && !filters.delivery_type);

                    return (
                      <button
                        key={dt.value}
                        onClick={() => handleChange('delivery_type', dt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isActive
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-950'
                            : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {Icon && <Icon className="w-3 h-3" strokeWidth={2.0} />}
                        <span>{dt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-650 dark:text-zinc-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isFree || false}
                    onChange={(e) => handleChange('isFree', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  Miễn phí
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-650 dark:text-zinc-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasScholarship || false}
                    onChange={(e) => handleChange('hasScholarship', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  Học bổng
                </label>
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
            value={`${filters.sortBy || 'enrollmentCount'}-${filters.order || 'desc'}`}
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
