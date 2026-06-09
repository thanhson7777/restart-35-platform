import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ kích hoạt' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'default', label: 'Vi phạm' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Mới nhất' },
  { value: 'createdAt-asc', label: 'Cũ nhất' },
  { value: 'totalAmount-desc', label: 'Số tiền cao nhất' },
  { value: 'totalAmount-asc', label: 'Số tiền thấp nhất' },
];

const AdminIsaFilters = ({ filters, onChange, onSearch }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearch = () => {
    onChange({ ...filters, search: searchValue, page: 1 });
    onSearch?.();
  };
  const handleTabChange = (status) => {
    onChange({ ...filters, status: status === 'all' ? '' : status, page: 1 });
    onSearch?.();
  };
  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split('-');
    onChange({ ...filters, sortBy, sortOrder, page: 1 });
    onSearch?.();
  };
  const clearFilters = () => {
    setSearchValue('');
    onChange({ status: '', search: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1 });
    onSearch?.();
  };
  const hasActiveFilters = filters.search || filters.status;
  const sortValue = `${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-4 mb-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          <input
            type="text" placeholder="Tìm kiếm worker..." value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
              bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
              placeholder:text-[hsl(var(--admin-text-muted))]
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
              focus:border-[hsl(var(--admin-accent))]/50 text-sm"
          />
        </div>
        <Button onClick={handleSearch} size="sm" className="h-10">Tìm kiếm</Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--admin-border))] pb-4">
        {TABS.map((tab) => {
          const isActive = (tab.key === 'all' && !filters.status) || filters.status === tab.key;
          return (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all
                ${isActive
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))]'
                }`}>
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-muted))]">
          <Filter className="w-4 h-4" />
          <span>Sắp xếp:</span>
        </div>
        <select value={sortValue} onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--admin-border))] rounded-xl
            bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))]
            text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 h-10">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}
            className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-danger))]">
            <X className="w-4 h-4 mr-1" /> Xóa lọc
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[hsl(var(--admin-border))]">
          {filters.search && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Tìm kiếm: {filters.search}
              <button onClick={() => { setSearchValue(''); onChange({ ...filters, search: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Trạng thái: {TABS.find((t) => t.key === filters.status)?.label || filters.status}
              <button onClick={() => { onChange({ ...filters, status: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminIsaFilters;
