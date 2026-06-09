import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'isa', label: 'ISA' },
  { key: 'income_based', label: 'Income Based' },
  { key: 'full_isa', label: 'Full ISA' },
  { key: 'inactive', label: 'Không hoạt động' },
];

const AdminFundingFilters = ({ filters, onChange, onSearch }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearch = () => {
    onChange({ ...filters, search: searchValue, page: 1 });
    onSearch?.();
  };
  const handleTabChange = (type) => {
    const mapped = type === 'all' ? '' : type === 'inactive' ? 'inactive' : type;
    onChange({ ...filters, type: mapped, page: 1 });
    onSearch?.();
  };
  const clearFilters = () => {
    setSearchValue('');
    onChange({ type: '', search: '', page: 1 });
    onSearch?.();
  };
  const hasActiveFilters = filters.search || filters.type;
  const activeKey = !filters.type ? 'all' : filters.type === 'inactive' ? 'inactive' : filters.type;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-4 mb-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          <input
            type="text" placeholder="Tìm kiếm khóa học..." value={searchValue}
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

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = activeKey === tab.key;
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
          {filters.type && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Loại: {TABS.find((t) => t.key === activeKey)?.label}
              <button onClick={() => { onChange({ ...filters, type: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}
            className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-danger))]">
            <X className="w-4 h-4 mr-1" /> Xóa lọc
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminFundingFilters;
