/**
 * Province mapping utility — normalizes between 2-digit codes and display labels.
 * Format lưu trữ nội bộ luôn là 2-digit string (e.g. "79", "01").
 * Admin / user input có thể là label, alias, hoặc code — đều được normalize.
 */

// ─── Code → Label ────────────────────────────────────────────────────────────
const CODE_TO_LABEL = {
  '01': 'Hà Nội',
  '04': 'Cao Bằng',
  '08': 'Tuyên Quang',
  '11': 'Điện Biên',
  '12': 'Lai Châu',
  '14': 'Sơn La',
  '15': 'Lào Cai',
  '19': 'Thái Nguyên',
  '20': 'Lạng Sơn',
  '22': 'Quảng Ninh',
  '24': 'Bắc Ninh',
  '25': 'Phú Thọ',
  '31': 'Hải Phòng',
  '33': 'Hưng Yên',
  '37': 'Ninh Bình',
  '38': 'Thanh Hóa',
  '40': 'Nghệ An',
  '42': 'Hà Tĩnh',
  '44': 'Quảng Trị',
  '46': 'Huế',
  '48': 'Đà Nẵng',
  '51': 'Quảng Ngãi',
  '52': 'Gia Lai',
  '56': 'Khánh Hòa',
  '66': 'Đắk Lắk',
  '68': 'Lâm Đồng',
  '75': 'Đồng Nai',
  '79': 'Hồ Chí Minh',
  '80': 'Tây Ninh',
  '82': 'Đồng Tháp',
  '86': 'Vĩnh Long',
  '91': 'An Giang',
  '92': 'Cần Thơ',
  '96': 'Cà Mau',
}

// ─── Label / Alias → Code ────────────────────────────────────────────────────
// Keys: local name, English name, and common aliases (case-insensitive matching)
const LABEL_TO_CODE = {
  // Hà Nội
  'Hà Nội': '01',
  'Ha Noi': '01',
  'hanoi': '01',
  'hn': '01',
  // Cao Bằng
  'Cao Bằng': '04',
  'Cao Bang': '04',
  'caobang': '04',
  // Tuyên Quang
  'Tuyên Quang': '08',
  'Tuyen Quang': '08',
  'tuyenquang': '08',
  // Điện Biên
  'Điện Biên': '11',
  'Dien Bien': '11',
  'dienbien': '11',
  // Lai Châu
  'Lai Châu': '12',
  'Lai Chau': '12',
  'laichau': '12',
  // Sơn La
  'Sơn La': '14',
  'Son La': '14',
  'sonla': '14',
  // Lào Cai
  'Lào Cai': '15',
  'Lao Cai': '15',
  'laocai': '15',
  // Thái Nguyên
  'Thái Nguyên': '19',
  'Thai Nguyen': '19',
  'thainguyen': '19',
  // Lạng Sơn
  'Lạng Sơn': '20',
  'Lang Son': '20',
  'langson': '20',
  // Quảng Ninh
  'Quảng Ninh': '22',
  'Quang Ninh': '22',
  'quangninh': '22',
  // Bắc Ninh
  'Bắc Ninh': '24',
  'Bac Ninh': '24',
  'bacninh': '24',
  // Phú Thọ
  'Phú Thọ': '25',
  'Phu Tho': '25',
  'phutho': '25',
  // Hải Phòng
  'Hải Phòng': '31',
  'Hai Phong': '31',
  'haiphong': '31',
  'hp': '31',
  // Hưng Yên
  'Hưng Yên': '33',
  'Hung Yen': '33',
  'hungyen': '33',
  // Ninh Bình
  'Ninh Bình': '37',
  'Ninh Binh': '37',
  'ninhbinh': '37',
  // Thanh Hóa
  'Thanh Hóa': '38',
  'Thanh Hoa': '38',
  'thanhhoa': '38',
  // Nghệ An
  'Nghệ An': '40',
  'Nghe An': '40',
  'nghean': '40',
  // Hà Tĩnh
  'Hà Tĩnh': '42',
  'Ha Tinh': '42',
  'hatinh': '42',
  // Quảng Trị
  'Quảng Trị': '44',
  'Quang Tri': '44',
  'quangtri': '44',
  // Huế
  'Huế': '46',
  'Hue': '46',
  'hue': '46',
  // Đà Nẵng
  'Đà Nẵng': '48',
  'Da Nang': '48',
  'danang': '48',
  'dn': '48',
  // Quảng Ngãi
  'Quảng Ngãi': '51',
  'Quang Ngai': '51',
  'quangngai': '51',
  // Gia Lai
  'Gia Lai': '52',
  'Gia Lai': '52',
  'gialai': '52',
  // Khánh Hòa
  'Khánh Hòa': '56',
  'Khanh Hoa': '56',
  'khanhhoa': '56',
  // Đắk Lắk
  'Đắk Lắk': '66',
  'Dak Lak': '66',
  'daklak': '66',
  // Lâm Đồng
  'Lâm Đồng': '68',
  'Lam Dong': '68',
  'lamdong': '68',
  // Đồng Nai
  'Đồng Nai': '75',
  'Dong Nai': '75',
  'dongnai': '75',
  // Hồ Chí Minh
  'Hồ Chí Minh': '79',
  'Ho Chi Minh': '79',
  'HCM': '79',
  'TP.HCM': '79',
  'TP HCM': '79',
  'hcm': '79',
  'tphcm': '79',
  // Tây Ninh
  'Tây Ninh': '80',
  'Tay Ninh': '80',
  'tayninh': '80',
  // Đồng Tháp
  'Đồng Tháp': '82',
  'Dong Thap': '82',
  'dongthap': '82',
  // Vĩnh Long
  'Vĩnh Long': '86',
  'Vinh Long': '86',
  'vinhlong': '86',
  // An Giang
  'An Giang': '91',
  'An Giang': '91',
  'angiang': '91',
  // Cần Thơ
  'Cần Thơ': '92',
  'Can Tho': '92',
  'cantho': '92',
  // Cà Mau
  'Cà Mau': '96',
  'Ca Mau': '96',
  'camau': '96',
}

/**
 * Normalize a province value (code, label, or alias) to a 2-digit code.
 * Returns the code if already a valid code, the mapped code if it's a label/alias,
 * or the original string if not recognized (fallback — helps with partial/typo data).
 */
const normalize = (value) => {
  if (!value) return null

  const trimmed = String(value).trim()

  // Already a valid 2-digit code
  if (CODE_TO_LABEL[trimmed]) {
    return trimmed
  }

  // Try label/alias lookup (case-insensitive)
  const lower = trimmed.toLowerCase()
  const mapped = LABEL_TO_CODE[lower]
  if (mapped) {
    return mapped
  }

  // Fallback: return as-is (handles partial/misspelled data gracefully)
  return trimmed
}

/**
 * Convert a 2-digit code to its display label.
 * Returns the code itself if not found.
 */
const getLabel = (code) => {
  return CODE_TO_LABEL[code] || code
}

/**
 * Convert a label/alias to its 2-digit code.
 * Returns null if not found.
 */
const getCode = (label) => {
  if (!label) return null
  return LABEL_TO_CODE[String(label).toLowerCase().trim()] || null
}

/**
 * Normalize an array of provinces (e.g. eligibilityCriteria.provinces).
 * Returns an array of 2-digit codes.
 */
const normalizeList = (provinces) => {
  if (!Array.isArray(provinces)) return []
  return provinces.map(normalize).filter(Boolean)
}

export {
  CODE_TO_LABEL,
  LABEL_TO_CODE,
  normalize,
  getLabel,
  getCode,
  normalizeList,
}
