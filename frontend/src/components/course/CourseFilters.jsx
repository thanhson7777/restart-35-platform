import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui';
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SelectField } from '@/components/ui/SelectField';

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Mới cập nhật' },
  { value: 'enrollmentCount-desc', label: 'Phổ biến nhất' },
  { value: 'rating-desc', label: 'Đánh giá tốt nhất' },
  { value: 'fee-asc', label: 'Học phí thấp nhất' },
];

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả trình độ' },
  { value: 'beginner', label: 'Cơ bản (Beginner)' },
  { value: 'intermediate', label: 'Trung bình (Intermediate)' },
  { value: 'advanced', label: 'Nâng cao (Advanced)' }
];

const DELIVERY_OPTIONS = [
  { value: '', label: 'Tất cả hình thức học' },
  { value: 'live', label: 'Trực tuyến (Zoom/Meet)' },
  { value: 'offline', label: 'Trực tiếp tại trung tâm' }
];

const FEE_OPTIONS = [
  { value: '', label: 'Tất cả mức phí' },
  { value: 'free', label: 'Miễn phí' },
  { value: 'paid', label: 'Có tính phí' }
];

const SCHOLARSHIP_OPTIONS = [
  { value: '', label: 'Hỗ trợ học bổng' },
  { value: 'true', label: 'Có học bổng' },
  { value: 'false', label: 'Không học bổng' }
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
      let updatedValue = value;
      // Handle boolean conversion for filters
      if (key === 'isFree') {
        if (value === 'free') updatedValue = true;
        else if (value === 'paid') updatedValue = false;
        else updatedValue = '';
      }
      if (key === 'hasScholarship') {
        if (value === 'true') updatedValue = true;
        else if (value === 'false') updatedValue = false;
        else updatedValue = '';
      }
      onChange({ ...filters, [key]: updatedValue, page: 1 });
    },
    [filters, onChange]
  );

  const clearFilters = () => {
    const cleared = {
      search: '',
      category: '',
      level: '',
      isFree: '',
      hasScholarship: '',
      delivery_type: '',
      sortBy: 'createdAt',
      order: 'desc',
      page: 1,
    };
    setLocalSearch('');
    onChange(cleared);
  };

  const getFeeValue = () => {
    if (filters.isFree === true) return 'free';
    if (filters.isFree === false) return 'paid';
    return '';
  };

  const getScholarshipValue = () => {
    if (filters.hasScholarship === true) return 'true';
    if (filters.hasScholarship === false) return 'false';
    return '';
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.level ||
    filters.isFree !== '' && filters.isFree !== undefined && filters.isFree !== false || // wait, check if default isFree: false is treated as filter
    filters.hasScholarship !== '' && filters.hasScholarship !== undefined && filters.hasScholarship !== false ||
    filters.delivery_type
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-5">
      {/* Top Row: Search Input & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Search Input */}
        <div className="lg:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" strokeWidth={2} />
          <Input
            placeholder="Tìm kiếm khóa học theo tên hoặc kỹ năng học..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-11 pr-10 h-11 w-full rounded-xl border-slate-200 focus-visible:ring-blue-500 text-sm"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onChange({ ...filters, search: '', page: 1 });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700" />
            </button>
          )}
        </div>

        {/* Category Selector */}
        <div className="lg:col-span-4">
          <SelectField
            options={[
              { value: '', label: 'Tất cả danh mục học' },
              ...categories.map((cat) => ({ value: cat._id || cat.id, label: cat.name }))
            ]}
            value={filters.category || ''}
            onChange={(val) => handleChange('category', val)}
            className="h-11 rounded-xl border-slate-200 text-sm"
          />
        </div>

        {/* Mobile filter toggle / Reset Button */}
        <div className="lg:col-span-2 flex gap-2 w-full">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`lg:hidden flex items-center justify-center gap-2 h-11 px-4 rounded-xl border flex-1 transition-colors ${
              showMobileFilters
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-200 text-zinc-600 bg-white hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="text-sm font-semibold">Bộ lọc</span>
          </button>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-11 px-4 rounded-xl border-slate-200 text-zinc-500 hover:text-zinc-700 hover:bg-slate-50 flex items-center gap-1.5 text-sm font-semibold flex-1 lg:flex-none ml-auto"
            >
              <RotateCcw size={15} />
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* Second Row: Advanced Filters for Desktop */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 pt-5 border-t border-slate-100">
        {/* Delivery Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Hình thức học</label>
          <SelectField
            options={DELIVERY_OPTIONS}
            value={filters.delivery_type || ''}
            onChange={(val) => handleChange('delivery_type', val)}
            className="h-10 rounded-lg border-slate-200 text-xs"
          />
        </div>

        {/* Fee Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Học phí</label>
          <SelectField
            options={FEE_OPTIONS}
            value={getFeeValue()}
            onChange={(val) => handleChange('isFree', val)}
            className="h-10 rounded-lg border-slate-200 text-xs"
          />
        </div>

        {/* Sort option */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sắp xếp theo</label>
          <SelectField
            options={SORT_OPTIONS}
            value={`${filters.sortBy || 'createdAt'}-${filters.order || 'desc'}`}
            onChange={(val) => {
              const [sortBy, order] = val.split('-');
              onChange({ ...filters, sortBy, order, page: 1 });
            }}
            className="h-10 rounded-lg border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden"
          >
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Delivery Type */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Hình thức học</span>
                  <SelectField
                    options={DELIVERY_OPTIONS}
                    value={filters.delivery_type || ''}
                    onChange={(val) => handleChange('delivery_type', val)}
                    className="h-10 rounded-lg border-slate-200"
                  />
                </div>

                {/* Fee Type */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Học phí</span>
                  <SelectField
                    options={FEE_OPTIONS}
                    value={getFeeValue()}
                    onChange={(val) => handleChange('isFree', val)}
                    className="h-10 rounded-lg border-slate-200"
                  />
                </div>

                {/* Sort Option */}
                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sắp xếp theo</span>
                  <SelectField
                    options={SORT_OPTIONS}
                    value={`${filters.sortBy || 'createdAt'}-${filters.order || 'desc'}`}
                    onChange={(val) => {
                      const [sortBy, order] = val.split('-');
                      onChange({ ...filters, sortBy, order, page: 1 });
                    }}
                    className="h-10 rounded-lg border-slate-200"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
