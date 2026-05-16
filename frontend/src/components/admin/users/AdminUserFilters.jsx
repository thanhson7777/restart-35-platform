import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';

const AdminUserFilters = ({ search, status, onSearchChange, onStatusChange }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Tìm kiếm người dùng..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full sm:w-40 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
      >
        <option value="ALL">Tất cả</option>
        <option value="true">Đang hoạt động</option>
        <option value="false">Không hoạt động</option>
      </select>
    </div>
  );
};

export default AdminUserFilters;
