/**
 * Shared constants dùng cho các trang recruitment của worker:
 * - WorkerApplicationsPage
 * - WorkerApplicationDetailPage
 */

export const applicationStatusConfig = {
  new:                  { label: 'Tiếp nhận',       className: 'bg-blue-100 text-blue-700 border-blue-200' },
  reviewing:            { label: 'Đang xem xét',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  shortlisted:          { label: 'Qua vòng hồ sơ',  className: 'bg-blue-100 text-blue-700 border-blue-200' },
  interview_scheduled:  { label: 'Sắp phỏng vấn',   className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  interviewed:          { label: 'Chờ kết quả PV',  className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  offered:              { label: 'Nhận Offer',      className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  hired:                { label: 'Trúng tuyển',     className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected:             { label: 'Chưa phù hợp',    className: 'bg-red-100 text-red-700 border-red-200' },
  withdrawn:            { label: 'Đã rút đơn',      className: 'bg-slate-200 text-slate-600 border-slate-300' },
}

/** Thứ tự các trạng thái để render progress bar */
export const APPLICATION_STATUS_STEPS = [
  'new',
  'reviewing',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'offered',
  'hired',
]

/** Dùng cho ApplicationDetailPage (có label đầy đủ hơn) */
export const APPLICATION_STATUS_STEPS_LABELED = [
  { key: 'new',                 label: 'Đã nộp' },
  { key: 'reviewing',           label: 'Đang xem' },
  { key: 'shortlisted',         label: 'Shortlist' },
  { key: 'interview_scheduled', label: 'Lên lịch PV' },
  { key: 'interviewed',         label: 'Phỏng vấn' },
  { key: 'offered',             label: 'Offer' },
  { key: 'hired',               label: 'Tuyển' },
]

/** Helper: lấy index bước hiện tại trong progress bar */
export const getStatusStepIndex = (status) =>
  APPLICATION_STATUS_STEPS_LABELED.findIndex((s) => s.key === status)

/** Helper: format ngày giờ theo locale vi-VN */
export const formatApplicationDateTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('vi-VN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Helper: format ngày (không có giờ) */
export const formatApplicationDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('vi-VN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}
