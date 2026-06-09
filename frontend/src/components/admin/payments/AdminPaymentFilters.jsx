import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Đang chờ' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'failed', label: 'Thất bại' },
  { key: 'refunded', label: 'Đã hoàn' },
];

const GATEWAY_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'vnpay', label: 'VNPay' },
  { key: 'momo', label: 'MoMo' },
  { key: 'bank_transfer', label: 'Chuyển khoản' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Mới nhất' },
  { value: 'createdAt-asc', label: 'Cũ nhất' },
  { value: 'amount-desc', label: 'Số tiền cao nhất' },
  { value: 'amount-asc', label: 'Số tiền thấp nhất' },
];

const AdminPaymentFilters = ({ filters, onChange, onSearch }) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || '');
  const [dateTo, setDateTo] = useState(filters.dateTo || '');

  const handleSearch = () => {
    onChange({ ...filters, search: searchValue, dateFrom, dateTo, page: 1 });
    onSearch?.();
  };

  const handleStatusChange = (status) => {
    onChange({ ...filters, status: status === 'all' ? '' : status, page: 1 });
    onSearch?.();
  };

  const handleGatewayChange = (gateway) => {
    onChange({ ...filters, gateway: gateway === 'all' ? '' : gateway, page: 1 });
    onSearch?.();
  };

  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split('-');
    onChange({ ...filters, sortBy, sortOrder, page: 1 });
    onSearch?.();
  };

  const clearFilters = () => {
    setSearchValue('');
    setDateFrom('');
    setDateTo('');
    onChange({ status: '', gateway: '', search: '', dateFrom: '', dateTo: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1 });
    onSearch?.();
  };

  const hasActiveFilters = filters.search || filters.status || filters.gateway || filters.dateFrom || filters.dateTo;
  const sortValue = `${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`;

  return (
    <div className="bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] rounded-2xl p-4 mb-6">
      {/* Search + Date */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã giao dịch..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
              bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
              placeholder:text-[hsl(var(--admin-text-muted))]
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30
              focus:border-[hsl(var(--admin-accent))]/50 text-sm"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
            bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
            text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30"
        />
        <span className="self-center text-[hsl(var(--admin-text-muted))]">-</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 border border-[hsl(var(--admin-border))] rounded-xl
            bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-primary))]
            text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30"
        />
        <Button onClick={handleSearch} size="sm" className="h-10">Tìm kiếm</Button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = (tab.key === 'all' && !filters.status) || filters.status === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-[hsl(var(--admin-accent))] text-white'
                  : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Gateway Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--admin-border))] pb-4">
        {GATEWAY_TABS.map((tab) => {
          const isActive = (tab.key === 'all' && !filters.gateway) || filters.gateway === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleGatewayChange(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  : 'text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-surface-elevated))] hover:text-[hsl(var(--admin-text-primary))] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sort & Clear */}
      <div className="flex flex-wrap items-center gap-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-muted))]">
          <Filter className="w-4 h-4" />
          <span>Sắp xếp:</span>
        </div>
        <select
          value={sortValue}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--admin-border))] rounded-xl
            bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))]
            text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--admin-accent))]/30 h-10"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-danger))]"
          >
            <X className="w-4 h-4 mr-1" />
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[hsl(var(--admin-border))]">
          {filters.search && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Tìm: {filters.search}
              <button onClick={() => { setSearchValue(''); onChange({ ...filters, search: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Trạng thái: {STATUS_TABS.find((t) => t.key === filters.status)?.label}
              <button onClick={() => { onChange({ ...filters, status: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.gateway && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Cổng: {GATEWAY_TABS.find((t) => t.key === filters.gateway)?.label}
              <button onClick={() => { onChange({ ...filters, gateway: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1 bg-[hsl(var(--admin-surface-elevated))] text-[hsl(var(--admin-text-secondary))] border border-[hsl(var(--admin-border))]">
              Ngày: {filters.dateFrom || '...'} - {filters.dateTo || '...'}
              <button onClick={() => { setDateFrom(''); setDateTo(''); onChange({ ...filters, dateFrom: '', dateTo: '', page: 1 }); onSearch?.(); }} className="ml-1 hover:text-[hsl(var(--admin-danger))]"><X className="w-3 h-3" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPaymentFilters;
