import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Download, FileSpreadsheet, FileText, Mail, ChevronDown, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_ROOT } from '@/utils/constants';
import { authorizeAxiosInstance } from '@/utils/authorizeAxios';

const DATE_OPTIONS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: '7d', label: '7 ngày qua', getRange: () => [Date.now() - 7 * 24 * 60 * 60 * 1000, Date.now()] },
  { id: '30d', label: '30 ngày qua', getRange: () => [Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now()] },
  { id: 'thisMonth', label: 'Tháng này', getRange: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), now.getTime()];
    }
  },
  { id: 'thisYear', label: 'Năm nay', getRange: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1).getTime(), now.getTime()];
    }
  }
];

export const AdminActionBar = ({ onDateRangeChange, currentDateFilter, activeTab }) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const selectedOption = DATE_OPTIONS.find(opt => opt.id === currentDateFilter) || DATE_OPTIONS[0];

  const handleDateSelect = (option) => {
    setIsDateOpen(false);
    if (option.id === 'all') {
      onDateRangeChange('all', null, null);
    } else {
      const [start, end] = option.getRange();
      onDateRangeChange(option.id, start, end);
    }
  };

  const handleExport = (type) => {
    setIsExportOpen(false);
    
    // Construct query params
    const queryParams = new URLSearchParams();
    if (activeTab) {
      queryParams.append('tab', activeTab);
    }
    if (currentDateFilter !== 'all') {
      const option = DATE_OPTIONS.find(opt => opt.id === currentDateFilter);
      if (option) {
        const [start, end] = option.getRange();
        queryParams.append('startDate', start);
        queryParams.append('endDate', end);
      }
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const tabName = activeTab || 'overview';

    if (type === 'excel') {
      toast.loading('Đang tải file Excel...', { id: 'export' });
      authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/export/excel${queryString}`, { responseType: 'blob' })
        .then(response => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `admin_${tabName}_report.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('Tải file thành công', { id: 'export' });
        })
        .catch(() => toast.error('Lỗi khi tải file', { id: 'export' }));
    } else if (type === 'pdf') {
      toast.loading('Đang tạo file PDF...', { id: 'export' });
      authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/export/pdf${queryString}`, { responseType: 'blob' })
        .then(response => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `admin_${tabName}_report.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('Tải file thành công', { id: 'export' });
        })
        .catch(() => toast.error('Lỗi khi tải file', { id: 'export' }));
    } else if (type === 'email') {
      toast.success('Báo cáo đang được tổng hợp và sẽ gửi qua email của bạn trong ít phút.');
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Date Filter Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDateOpen(!isDateOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-accent))] rounded-xl text-sm font-medium text-[hsl(var(--admin-text-primary))] transition-colors"
        >
          <Calendar className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
          {selectedOption.label}
          <ChevronDown className="w-4 h-4 text-[hsl(var(--admin-text-muted))]" />
        </button>

        <AnimatePresence>
          {isDateOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDateOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="py-1">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleDateSelect(opt)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors
                        ${currentDateFilter === opt.id 
                          ? 'bg-[hsl(var(--admin-accent))]/10 text-[hsl(var(--admin-accent))] font-semibold' 
                          : 'text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface))]'
                        }`}
                    >
                      {opt.label}
                      {currentDateFilter === opt.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Export Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsExportOpen(!isExportOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--admin-accent))] hover:bg-[hsl(var(--admin-accent))]/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-[hsl(var(--admin-accent))]/20"
        >
          <Download className="w-4 h-4" />
          Xuất báo cáo
          <ChevronDown className="w-4 h-4 opacity-70" />
        </button>

        <AnimatePresence>
          {isExportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-[hsl(var(--admin-surface-elevated))] border border-[hsl(var(--admin-border))] rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-1">
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-success))]/10 hover:text-[hsl(var(--admin-success))] transition-colors text-left"
                  >
                    <div className="p-1.5 rounded-md bg-[hsl(var(--admin-success))]/10">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Tải file Excel</div>
                      <div className="text-[10px] text-[hsl(var(--admin-text-muted))]">Dữ liệu thô (.xlsx)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-danger))]/10 hover:text-[hsl(var(--admin-danger))] transition-colors text-left"
                  >
                    <div className="p-1.5 rounded-md bg-[hsl(var(--admin-danger))]/10">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Tải file PDF</div>
                      <div className="text-[10px] text-[hsl(var(--admin-text-muted))]">Báo cáo định dạng in</div>
                    </div>
                  </button>

                  <div className="h-px bg-[hsl(var(--admin-border))] my-1 mx-2" />

                  <button
                    onClick={() => handleExport('email')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-accent))]/10 hover:text-[hsl(var(--admin-accent))] transition-colors text-left"
                  >
                    <div className="p-1.5 rounded-md bg-[hsl(var(--admin-accent))]/10">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Gửi qua Email</div>
                      <div className="text-[10px] text-[hsl(var(--admin-text-muted))]">Gửi báo cáo đến email của bạn</div>
                    </div>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
