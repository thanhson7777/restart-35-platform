import React from 'react';

const statusConfig = {
  // Application Status
  new: { label: 'Mới', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  reviewing: { label: 'Đang xem', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shortlisted: { label: 'Shortlist', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  interview_scheduled: { label: 'Đã lên lịch PV', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  interviewed: { label: 'Đã PV', className: 'bg-teal-100 text-teal-700 border-teal-200' },
  offered: { label: 'Đã offer', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  hired: { label: 'Đã tuyển', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 border-red-200' },
  withdrawn: { label: 'Rút đơn', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  // Job Status
  draft: { label: 'Bản nháp', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  pending_approval: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  published: { label: 'Đã đăng', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: 'Đã đóng', className: 'bg-red-100 text-red-700 border-red-200' },
  expired: { label: 'Hết hạn', className: 'bg-slate-200 text-slate-500 border-slate-300' },
  // Interview Status
  pending_confirmation: { label: 'Chờ xác nhận', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rescheduled: { label: 'Đã hoãn', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-600 border-slate-300' },
  no_show: { label: 'Vắng mặt', className: 'bg-red-100 text-red-700 border-red-200' },
  // Offer Status
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  accepted: { label: 'Đã chấp nhận', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

export default function ApplicationStatusBadge({ status, size = 'default', className = '' }) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200' };
  
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.className} ${sizeClasses} ${className}`}>
      {config.label}
    </span>
  );
}
