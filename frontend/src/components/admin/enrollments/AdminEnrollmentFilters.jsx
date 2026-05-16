import { useState } from 'react';
import { Search, Filter, X, Download } from 'lucide-react';
import { Button, Input } from '@/components/ui';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'enrolled', label: 'Đã đăng ký' },
  { value: 'in_progress', label: 'Đang tiến hành' },
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
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      {/* Search & Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm theo tên học viên, khóa học..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[180px]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Advanced Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Lọc nâng cao
        </Button>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>

        {/* Reset */}
        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 text-slate-500"
          >
            <X className="w-4 h-4" />
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Course Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Khóa học
            </label>
            <select
              value={filters.courseId || ''}
              onChange={(e) => handleChange('courseId', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Tất cả khóa học</option>
              {/* Options will be populated from API */}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Từ ngày
            </label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Đến ngày
            </label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEnrollmentFilters;
