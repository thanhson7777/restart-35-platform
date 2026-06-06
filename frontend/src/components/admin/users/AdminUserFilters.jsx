import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';

const AdminUserFilters = ({ search, status, onSearchChange, onStatusChange }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        <Input
          type="text"
          placeholder="Tìm kiếm người dùng..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-[hsl(var(--admin-surface-elevated))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-primary))] rounded-xl h-10"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[hsl(var(--admin-surface-elevated))] rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-[hsl(var(--admin-text-muted))]" />
          </button>
        )}
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full sm:w-40 h-10 px-3 rounded-xl border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 transition-all"
      >
        <option value="ALL">Tất cả</option>
        <option value="true">Đang hoạt động</option>
        <option value="false">Không hoạt động</option>
      </select>
    </div>
  );
};

export default AdminUserFilters;
