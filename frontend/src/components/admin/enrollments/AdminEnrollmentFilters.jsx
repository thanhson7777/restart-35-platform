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
    <div className="mb-6 p-4 rounded-2xl bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))]">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          <Input
            type="text"
            placeholder="Tìm kiếm học viên, khóa học..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-11 bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] placeholder-[hsl(var(--admin-text-muted))] focus:border-[hsl(var(--admin-accent))]/50 rounded-xl h-10 w-full"
          />
        </div>

        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-4 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/30 focus:border-[hsl(var(--admin-accent))]/50 min-w-[180px] h-10 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-secondary))]">
              {opt.label}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2 bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl h-10 px-4"
        >
          <Filter className="w-4 h-4 text-[hsl(var(--admin-accent))]" />
          <span>Lọc nâng cao</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-2 bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-hover))] rounded-xl h-10 px-4"
        >
          <Download className="w-4 h-4 text-[hsl(var(--admin-success))]" />
          <span>Xuất dữ liệu</span>
        </Button>

        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl h-10 px-4 transition-all"
          >
            <X className="w-4 h-4" />
            <span>Xóa lọc</span>
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[hsl(var(--admin-border))] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[hsl(var(--admin-text-muted))] mb-1.5 uppercase tracking-wider">
                  Khóa học
                </label>
                <select
                  value={filters.courseId || ''}
                  onChange={(e) => handleChange('courseId', e.target.value)}
                  className="w-full px-4 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--admin-accent))]/30 focus:border-[hsl(var(--admin-accent))]/50 h-10 cursor-pointer"
                >
                  <option value="" className="bg-[hsl(var(--admin-surface))] text-[hsl(var(--admin-text-muted))]">Tất cả khóa học</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[hsl(var(--admin-text-muted))] mb-1.5 uppercase tracking-wider">
                  Từ ngày
                </label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] focus:border-[hsl(var(--admin-accent))]/50 rounded-xl h-10 w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[hsl(var(--admin-text-muted))] mb-1.5 uppercase tracking-wider">
                  Đến ngày
                </label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] focus:border-[hsl(var(--admin-accent))]/50 rounded-xl h-10 w-full"
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
