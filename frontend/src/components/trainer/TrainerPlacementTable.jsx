import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Avatar,
  Badge,
  Button,
  Input
} from '@/components/ui';
import {
  Building2,
  Search,
  Filter,
  ChevronDown,
  Eye,
  TrendingUp,
  Briefcase,
  Users
} from 'lucide-react';

const STATUS_CONFIG = {
  referred: {
    label: 'Vừa giới thiệu',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400'
  },
  interviewing: {
    label: 'Đang phỏng vấn',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400'
  },
  offered: {
    label: 'Đã nhận offer',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400'
  },
  started: {
    label: 'Đã đi làm',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
    dot: 'bg-green-400'
  },
  resigned: {
    label: 'Đã nghỉ',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400'
  }
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'referred', label: 'Vừa giới thiệu' },
  { value: 'interviewing', label: 'Đang phỏng vấn' },
  { value: 'offered', label: 'Đã nhận offer' },
  { value: 'started', label: 'Đã đi làm' },
  { value: 'resigned', label: 'Đã nghỉ' }
];

const formatSalary = (amount) => {
  if (!amount) return 'Thỏa thuận';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

export const TrainerPlacementTable = ({
  placements = [],
  loading = false,
  pagination = null,
  onPageChange = () => {},
  onStatusChange,
  onViewDetail
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const filteredPlacements = placements.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      (p.user?.displayName || '').toLowerCase().includes(searchLower) ||
      (p.company || '').toLowerCase().includes(searchLower) ||
      (p.position || '').toLowerCase().includes(searchLower) ||
      (p.course?.title || '').toLowerCase().includes(searchLower);

    const matchesStatus = !statusFilter || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse flex-1" />
          <div className="h-10 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-16 bg-slate-950 border border-slate-900/60 rounded-xl animate-pulse w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, công ty, vị trí..."
            className="pl-9 bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/40"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            <Filter size={15} />
            <span>
              {statusFilter
                ? STATUS_CONFIG[statusFilter]?.label || 'Tất cả'
                : 'Lọc trạng thái'}
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {statusDropdownOpen && (
            <div className="absolute top-full mt-2 right-0 w-48 bg-[#111827] border border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setStatusDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-blue-600/15 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {opt.value && STATUS_CONFIG[opt.value] && (
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[opt.value].dot}`} />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c101d] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/40 border-b border-slate-800">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-400 font-semibold py-4">Học viên</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Khóa học</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Công ty</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Vị trí</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Lương</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Trạng thái</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4">Ngày tạo</TableHead>
              <TableHead className="text-slate-400 font-semibold py-4 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlacements.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-48 text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                      <Briefcase size={24} className="text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-300">
                        {search || statusFilter
                          ? 'Không tìm thấy placement nào phù hợp.'
                          : 'Chưa có placement nào.'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-xs">
                        {search || statusFilter
                          ? 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                          : 'Khi học viên hoàn thành khóa học, bạn có thể giới thiệu việc làm cho họ.'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPlacements.map((placement) => {
                const statusCfg = STATUS_CONFIG[placement.status] || {
                  label: placement.status || 'N/A',
                  className: 'bg-slate-800 text-slate-400 border-slate-700',
                  dot: 'bg-slate-500'
                };

                return (
                  <TableRow
                    key={placement._id}
                    className="border-slate-850 hover:bg-slate-900/20 transition-all duration-200"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={placement.user?.avatar}
                          alt={placement.user?.displayName}
                          fallback={placement.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                          size="default"
                          className="bg-slate-800 text-slate-300 ring-1 ring-slate-800"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-sm">
                            {placement.user?.displayName || 'Chưa cập nhật'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {placement.user?.email || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-sm text-slate-300 max-w-[180px] block truncate" title={placement.course?.title}>
                        {placement.course?.title || 'N/A'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-600 shrink-0" />
                        <span className="text-sm text-slate-300 max-w-[160px] block truncate">
                          {placement.company || 'N/A'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-sm text-slate-300 max-w-[140px] block truncate">
                        {placement.position || 'N/A'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-sm font-semibold text-emerald-400 font-mono">
                        {formatSalary(placement.salary)}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge className={`px-2.5 py-0.5 border text-xs font-semibold flex items-center gap-1.5 rounded-md ${statusCfg.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-xs text-slate-400 font-mono">
                        {formatDate(placement.createdAt)}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetail?.(placement)}
                          className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 gap-1.5 transition-all duration-200 text-xs px-2.5 py-1.5"
                        >
                          <Eye size={14} />
                          Chi tiết
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <p className="text-xs text-slate-400">
            Hiển thị{' '}
            <span className="font-semibold text-white">
              {(pagination.currentPage - 1) * pagination.limit + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-white">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
            </span>{' '}
            trong tổng số{' '}
            <span className="font-semibold text-white">{pagination.totalRecords}</span> placement
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 text-xs px-3"
            >
              Trước
            </Button>

            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 3) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.currentPage - 2 + i;
              }

              const isCurrent = pagination.currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 text-xs px-3"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
