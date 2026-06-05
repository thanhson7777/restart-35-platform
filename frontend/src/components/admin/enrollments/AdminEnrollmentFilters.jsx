import { useState } from 'react';
import { Search, Filter, X, Download } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'enrolled', label: 'Đã đăng ký' },
  { value: 'in_progress', label: 'Đang học' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'waitlist', label: 'Chờ xếp lớp' },
  { value: 'dropped', label: 'Đã bỏ cuộc' },
  { value: 'cancelled', label: 'Đã hủy' }
];

const AdminEnrollmentFilters = ({ filters, onFiltersChange, onExport }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value, page: 1 });
  };

  const handleReset = () => {
    onFiltersChange({
      page: 1,
      limit: 10
    });
  };

  const hasActiveFilters = () => {
    return filters.search || filters.status || filters.courseId || filters.startDate || filters.endDate;
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-slate-950/40 border border-slate-900">
      {/* Search & Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm học viên, khóa học..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-11 bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500/50 rounded-xl h-10 w-full"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-4 py-2 bg-slate-950/60 border border-slate-800 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 min-w-[180px] h-10 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>

        {/* Advanced Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2 bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 rounded-full h-10 px-4"
        >
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Lọc nâng cao</span>
        </Button>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-2 bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 rounded-full h-10 px-4"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Xuất dữ liệu</span>
        </Button>

        {/* Reset */}
        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1 text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded-full h-10 px-4 transition-all"
          >
            <X className="w-4 h-4" />
            <span>Xóa lọc</span>
          </Button>
        )}
      </div>

      {/* Advanced Filters with motion animation */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Course Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">
                  Khóa học
                </label>
                <select
                  value={filters.courseId || ''}
                  onChange={(e) => handleChange('courseId', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 h-10 cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Tất cả khóa học</option>
                  {/* Options will be populated from API */}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">
                  Từ ngày
                </label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-slate-200 focus:border-blue-500/50 rounded-xl h-10 w-full"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">
                  Đến ngày
                </label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-slate-200 focus:border-blue-500/50 rounded-xl h-10 w-full"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEnrollmentFilters;
