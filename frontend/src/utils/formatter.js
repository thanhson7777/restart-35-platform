export const interceptorLoadingElement = (calling) => {
  const elements = document.querySelectorAll('.interceptor-loading')

  for (let i = 0; i < elements.length; i++) {
    if (calling) {
      elements[i].style.opacity = '0.5'
      elements[i].style.pointerEvents = 'none'
    } else {
      elements[i].style.opacity = ''
      elements[i].style.pointerEvents = ''
    }
  }
}
export const generateSlug = (text) => {
  return text.toString().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ─── Course & Enrollment formatters ────────────────────────────────────────────

export const formatPrice = (amount) => {
  if (amount === 0 || amount == null) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

export const formatDuration = (duration) => {
  if (!duration) return '';
  const unitLabels = {
    hours: 'giờ',
    weeks: 'tuần',
    months: 'tháng',
    days: 'ngày',
  };
  return `${duration.value} ${unitLabels[duration.unit] || duration.unit}`;
};

export const formatVideoDuration = (duration) => {
  if (!duration) return '';

  // String format: "HH:MM" or "HH:MM:SS"
  if (typeof duration === 'string' && /^\d+(:\d+)+$/.test(duration)) {
    return duration;
  }

  // Number: seconds
  if (typeof duration === 'number') {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  // Object: { value, unit }
  if (typeof duration === 'object' && duration.value != null) {
    const unitLabels = {
      hours: 'giờ',
      weeks: 'tuần',
      months: 'tháng',
      days: 'ngày',
    };
    const label = unitLabels[duration.unit] || duration.unit;
    return `${duration.value} ${label}`;
  }

  return String(duration);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return formatDate(date);
};

export const formatMatchScore = (score) => {
  if (score == null) return '';
  return `${Math.round(score * 100)}% phù hợp`;
};

export const formatCapacity = (current, max) => {
  if (max === 0) return 'Không giới hạn';
  return `${current}/${max}`;
};

// ─── Scholarship formatters ────────────────────────────────────────────────────

export const formatDeadline = (endDate) => {
  if (!endDate) return 'Không giới hạn';
  const diff = new Date(endDate) - new Date();
  if (diff < 0) return 'Đã hết hạn';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hết hạn hôm nay';
  if (days === 1) return 'Hết hạn ngày mai';
  if (days < 30) return `${days} ngày nữa`;
  return formatDate(endDate);
};

export const formatScholarshipAmount = (amount) => {
  if (amount == null) return 'Không giới hạn';
  return formatPrice(amount);
};

export const formatRecipientCount = (current, max) => {
  if (max === 0) return `${current} người`;
  return `${current}/${max} người nhận`;
};
