import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui';

const AdminLearningFilters = ({ filters, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const handleReset = () => {
    onChange({
      search: '',
      enrollmentStatus: '',
      riskLevel: '',
      courseId: '',
      page: 1,
      limit: 10,
    });
  };

  return (
    <div className="flex flex-wrap gap-3 mb-5 p-4 bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-xl">
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        <input
          type="text"
          placeholder="Tìm worker, khóa học..."
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg text-sm text-[hsl(var(--admin-text-primary))] placeholder:text-[hsl(var(--admin-text-muted))] focus:outline-none focus:border-[hsl(var(--admin-accent))]"
        />
      </div>

      <select
        value={filters.enrollmentStatus || ''}
        onChange={(e) => handleChange('enrollmentStatus', e.target.value)}
        className="px-3 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none focus:border-[hsl(var(--admin-accent))]"
      >
        <option value="">Trạng thái Enrollment</option>
        <option value="active">Đang học</option>
        <option value="completed">Hoàn thành</option>
        <option value="dropped">Đã bỏ</option>
      </select>

      <select
        value={filters.riskLevel || ''}
        onChange={(e) => handleChange('riskLevel', e.target.value)}
        className="px-3 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none focus:border-[hsl(var(--admin-accent))]"
      >
        <option value="">Mức độ rủi ro</option>
        <option value="low">Thấp</option>
        <option value="medium">Trung bình</option>
        <option value="high">Cao</option>
        <option value="critical">Nguy cấp</option>
      </select>

      <select
        value={filters.limit || 10}
        onChange={(e) => handleChange('limit', Number(e.target.value))}
        className="px-3 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-lg text-sm text-[hsl(var(--admin-text-primary))] focus:outline-none focus:border-[hsl(var(--admin-accent))]"
      >
        <option value={10}>10 / trang</option>
        <option value={25}>25 / trang</option>
        <option value={50}>50 / trang</option>
      </select>

      <Button variant="outline" size="sm" onClick={handleReset}>
        <Filter className="w-4 h-4 mr-1" />
        Reset
      </Button>
    </div>
  );
};

export default AdminLearningFilters;
