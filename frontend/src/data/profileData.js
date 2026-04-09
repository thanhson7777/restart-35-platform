// Static data cho Worker Profile Form

export const EDUCATION_OPTIONS = [
  { value: 'none', label: 'Không bằng cấp' },
  { value: 'primary', label: 'Tiểu học' },
  { value: 'middle', label: 'THCS' },
  { value: 'high', label: 'THPT' },
  { value: 'vocational', label: 'Học nghề / Trung cấp' },
  { value: 'college', label: 'Cao đẳng' },
  { value: 'university', label: 'Đại học' }
]

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' }
]

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Độc thân' },
  { value: 'married', label: 'Đã lập gia đình' },
  { value: 'divorced', label: 'Ly hôn' },
  { value: 'widowed', label: 'Góa' }
]

export const JOB_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Toàn thời gian' },
  { value: 'part-time', label: 'Bán thời gian' },
  { value: 'temporary', label: 'Thời vụ / Khoán việc' },
  { value: 'freelance', label: 'Làm tự do' }
]

export const BARRIER_OPTIONS = [
  {
    value: 'health',
    label: 'Sức khỏe',
    description: 'Ví dụ: Đau lưng, mỏi mắt, hạn chế vận động...'
  },
  {
    value: 'family',
    label: 'Chăm sóc gia đình',
    description: 'Ví dụ: Nuôi con nhỏ, chăm người già...'
  },
  {
    value: 'techGap',
    label: 'Hạn chế công nghệ',
    description: 'Ví dụ: Không sử dụng được máy tính, điện thoại thông minh...'
  },
  {
    value: 'location',
    label: 'Vị trí địa lý',
    description: 'Ví dụ: Không thể đi làm xa nhà...'
  },
  {
    value: 'other',
    label: 'Khác',
    description: 'Các rào cản khác mà bạn đang gặp phải'
  }
]

export const SKILLS_OPTIONS = [
  // Nấu ăn & Phục vụ
  'Nấu ăn',
  'Phục vụ bàn',
  'Pha chế đồ uống',
  'Bartender',

  // Bán lẻ & Kinh doanh
  'Bán hàng',
  'Thu ngân',
  'Kế toán',
  'Nhập liệu',

  // Xây dựng
  'Xây dựng',
  'Sơn sửa nhà',
  'Điện nước',
  'Lắp đặt',

  // Nông nghiệp
  'Trồng trọt',
  'Chăn nuôi',
  'Chế biến thực phẩm',
  'Bán hàng nông sản',

  // Vận chuyển
  'Lái xe',
  'Giao hàng',
  'Kho vận',

  // Dịch vụ
  'Giữ trẻ',
  'Chăm sóc người già',
  'Giặt ủi',
  'Dọn dẹp',

  // Công nghiệp
  'May mặc',
  'Lắp ráp',
  'Đóng gói',
  'Vận hành máy móc',

  // Kỹ năng mềm
  'Giao tiếp',
  'Chịu áp lực',
  'Làm việc nhóm',
  'Quản lý thời gian'
]

export const VIETNAM_PROVINCES = [
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bạc Liêu',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cần Thơ',
  'Cao Bằng',
  'Đà Nẵng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Dương',
  'Hải Phòng',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'TP. Hồ Chí Minh',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái'
]

// Step labels
export const STEP_LABELS = [
  'Thông tin cơ bản',
  'Kinh nghiệm làm việc',
  'Rào cản & Thách thức',
  'Nguyện vọng'
]

export const STEP_DESCRIPTIONS = [
  'Tuổi, giới tính, địa chỉ, trình độ học vấn',
  'Các công việc đã làm trước đây',
  'Những khó khăn bạn đang gặp phải',
  'Công việc và môi trường bạn mong muốn'
]
