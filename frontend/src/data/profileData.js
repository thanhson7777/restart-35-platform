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

// 8 Industries cho Career Transition (35+)
export const INDUSTRY_OPTIONS = [
  { value: 'bao_ve', label: 'Bảo Vệ & An Ninh' },
  { value: 'lai_xe', label: 'Lái Xe & Vận Tải' },
  { value: 'co_khi', label: 'Cơ Khí & Sản Xuất' },
  { value: 'ban_hang', label: 'Bán Hàng & Kinh Doanh' },
  { value: 'phuc_vu', label: 'Phục Vụ & Nhà Hàng' },
  { value: 'hanh_chinh', label: 'Hành Chính' },
  { value: 'nhan_su', label: 'Nhân Sự & HR' },
  { value: 'tu_van', label: 'Tư Vấn' }
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
  { value: '01', label: 'Hà Nội' },
  { value: '79', label: 'Hồ Chí Minh' },
  { value: '48', label: 'Đà Nẵng' },
  { value: '02', label: 'Hải Phòng' },
  { value: '04', label: 'Cần Thơ' },
  { value: '08', label: 'Hà Giang' },
  { value: '14', label: 'Cao Bằng' },
  { value: '15', label: 'Bắc Kạn' },
  { value: '17', label: 'Tuyên Quang' },
  { value: '19', label: 'Lào Cai' },
  { value: '20', label: 'Điện Biên' },
  { value: '21', label: 'Lai Châu' },
  { value: '22', label: 'Sơn La' },
  { value: '24', label: 'Yên Bái' },
  { value: '25', label: 'Hòa Bình' },
  { value: '26', label: 'Thái Nguyên' },
  { value: '27', label: 'Lạng Sơn' },
  { value: '29', label: 'Quảng Ninh' },
  { value: '30', label: 'Bắc Ninh' },
  { value: '31', label: 'Hải Dương' },
  { value: '33', label: 'Hưng Yên' },
  { value: '34', label: 'Thái Bình' },
  { value: '35', label: 'Nam Định' },
  { value: '36', label: 'Ninh Bình' },
  { value: '37', label: 'Thanh Hóa' },
  { value: '38', label: 'Nghệ An' },
  { value: '40', label: 'Hà Tĩnh' },
  { value: '42', label: 'Quảng Bình' },
  { value: '44', label: 'Quảng Trị' },
  { value: '45', label: 'Thừa Thiên Huế' },
  { value: '46', label: 'Quảng Nam' },
  { value: '49', label: 'Quảng Ngãi' },
  { value: '51', label: 'Bình Định' },
  { value: '52', label: 'Phú Yên' },
  { value: '54', label: 'Khánh Hòa' },
  { value: '56', label: 'Ninh Thuận' },
  { value: '58', label: 'Bình Thuận' },
  { value: '60', label: 'Kon Tum' },
  { value: '62', label: 'Gia Lai' },
  { value: '64', label: 'Đắk Lắk' },
  { value: '65', label: 'Đắk Nông' },
  { value: '68', label: 'Lâm Đồng' },
  { value: '70', label: 'Bình Phước' },
  { value: '72', label: 'Tây Ninh' },
  { value: '74', label: 'Bình Dương' },
  { value: '75', label: 'Đồng Nai' },
  { value: '77', label: 'Bà Rịa - Vũng Tàu' },
  { value: '80', label: 'Long An' },
  { value: '82', label: 'Tiền Giang' },
  { value: '83', label: 'Bến Tre' },
  { value: '84', label: 'Trà Vinh' },
  { value: '86', label: 'Vĩnh Long' },
  { value: '87', label: 'Đồng Tháp' },
  { value: '89', label: 'An Giang' },
  { value: '91', label: 'Kiên Giang' },
  { value: '92', label: 'Cần Thơ' },
  { value: '93', label: 'Hậu Giang' },
  { value: '94', label: 'Sóc Trăng' },
  { value: '95', label: 'Bạc Liêu' },
  { value: '96', label: 'Cà Mau' }
]

export const DISTRICTS_BY_PROVINCE = {
  '01': [
    { value: '001', label: 'Ba Đình' }, { value: '002', label: 'Hoàn Kiếm' },
    { value: '003', label: 'Tây Hồ' }, { value: '004', label: 'Long Biên' },
    { value: '005', label: 'Cầu Giấy' }, { value: '006', label: 'Đống Đa' },
    { value: '007', label: 'Hai Bà Trưng' }, { value: '008', label: 'Thanh Xuân' },
    { value: '009', label: 'Hoàng Mai' }, { value: '010', label: 'Nam Từ Liêm' },
    { value: '011', label: 'Bắc Từ Liêm' }, { value: '016', label: 'Hà Đông' },
    { value: '017', label: 'Thanh Trì' }, { value: '018', label: 'Gia Lâm' },
    { value: '019', label: 'Đông Anh' }, { value: '020', label: 'Sóc Sơn' },
    { value: '021', label: 'Mê Linh' }, { value: '250', label: 'Phú Xuyên' },
    { value: '251', label: 'Thường Tín' }, { value: '252', label: 'Mỹ Đức' },
    { value: '253', label: 'Phúc Thọ' }, { value: '254', label: 'Đan Phượng' },
    { value: '255', label: 'Hoài Đức' }, { value: '256', label: 'Quốc Oai' },
    { value: '257', label: 'Thạch Thất' }, { value: '258', label: 'Chương Mỹ' },
    { value: '259', label: 'Thanh Oai' }, { value: '260', label: 'Khoái Châu' },
    { value: '261', label: 'Ứng Hòa' }, { value: '262', label: 'Bắc Hồng' },
    { value: '263', label: 'Đông Hà' }, { value: '268', label: 'Sơn Tây' }
  ],
  '79': [
    { value: '760', label: 'Quận 1' }, { value: '761', label: 'Quận 12' },
    { value: '762', label: 'Thủ Đức' }, { value: '763', label: 'Quận 3' },
    { value: '764', label: 'Quận 10' }, { value: '765', label: 'Quận 11' },
    { value: '766', label: 'Phú Nhuận' }, { value: '767', label: 'Gò Vấp' },
    { value: '768', label: 'Bình Thạnh' }, { value: '769', label: 'Tân Bình' },
    { value: '770', label: 'Tân Phú' }, { value: '771', label: 'Bình Tân' },
    { value: '772', label: 'Hóc Môn' }, { value: '773', label: 'Bình Chánh' },
    { value: '774', label: 'Nhà Bè' }, { value: '775', label: 'Củ Chi' },
    { value: '783', label: 'Cần Giờ' }
  ],
  '48': [
    { value: '490', label: 'Hải Châu' }, { value: '491', label: 'Thanh Khê' },
    { value: '492', label: 'Sơn Trà' }, { value: '493', label: 'Ngũ Hành Sơn' },
    { value: '494', label: 'Liên Chiểu' }, { value: '495', label: 'Cẩm Lệ' },
    { value: '496', label: 'Hòa Vang' }, { value: '497', label: 'Hoàng Sa' }
  ],
  '02': [
    { value: '040', label: 'Hồng Bàng' }, { value: '045', label: 'Ngô Quyền' },
    { value: '046', label: 'Lê Chân' }, { value: '047', label: 'Hải An' },
    { value: '048', label: 'Kiến An' }, { value: '049', label: 'Đồ Sơn' },
    { value: '050', label: 'Huyện An Dương' }, { value: '051', label: 'Huyện An Lão' },
    { value: '052', label: 'Huyện Kiến Thụy' }, { value: '053', label: 'Huyện Tiên Lãng' },
    { value: '054', label: 'Huyện Vĩnh Bảo' }, { value: '055', label: 'Huyện Cát Hải' },
    { value: '057', label: 'Huyện Bạch Long Vĩ' }
  ],
  '08': [
    { value: '080', label: 'Thành phố Hà Giang' }, { value: '081', label: 'Huyện Đồng Văn' },
    { value: '082', label: 'Huyện Mèo Vạc' }, { value: '083', label: 'Huyện Yên Minh' },
    { value: '084', label: 'Huyện Quản Bạ' }, { value: '085', label: 'Huyện Vị Xuyên' },
    { value: '086', label: 'Huyện Bắc Mê' }, { value: '087', label: 'Huyện Hoàng Su Phì' },
    { value: '088', label: 'Huyện Xín Mần' }, { value: '089', label: 'Huyện Bắc Quang' }
  ],
  '14': [
    { value: '140', label: 'Thành phố Cao Bằng' }, { value: '141', label: 'Huyện Bảo Lạc' },
    { value: '142', label: 'Huyện Hà Quảng' }, { value: '143', label: 'Huyện Trùng Khánh' },
    { value: '144', label: 'Huyện Hạ Lang' }, { value: '145', label: 'Huyện Quảng Uyên' },
    { value: '146', label: 'Huyện Thạch An' }, { value: '147', label: 'Huyện Hòa An' },
    { value: '148', label: 'Huyện Nguyên Bình' }
  ],
  '15': [
    { value: '150', label: 'Thành phố Bắc Kạn' }, { value: '151', label: 'Huyện Pác Nặm' },
    { value: '152', label: 'Huyện Ba Bể' }, { value: '153', label: 'Huyện Ngân Sơn' },
    { value: '154', label: 'Huyện Bạch Thông' }, { value: '155', label: 'Huyện Chợ Đồn' },
    { value: '156', label: 'Huyện Chợ Mới' }, { value: '157', label: 'Huyện Na Rì' }
  ],
  '17': [
    { value: '170', label: 'Thành phố Tuyên Quang' }, { value: '171', label: 'Huyện Lâm Bình' },
    { value: '172', label: 'Huyện Na Hang' }, { value: '173', label: 'Huyện Chiêm Hóa' },
    { value: '174', label: 'Huyện Hàm Yên' }, { value: '175', label: 'Huyện Yên Sơn' },
    { value: '176', label: 'Huyện Sơn Dương' }
  ],
  '19': [
    { value: '190', label: 'Thành phố Lào Cai' }, { value: '191', label: 'Huyện Bát Xát' },
    { value: '192', label: 'Huyện Mường Khương' }, { value: '193', label: 'Huyện Si Ma Cai' },
    { value: '194', label: 'Huyện Bắc Hà' }, { value: '195', label: 'Huyện Văn Bàn' },
    { value: '196', label: 'Huyện Sa Pa' }
  ],
  '20': [
    { value: '200', label: 'Thành phố Điện Biên Phủ' }, { value: '201', label: 'Thị xã Mường Lay' },
    { value: '202', label: 'Huyện Điện Biên' }, { value: '203', label: 'Huyện Tuần Giáo' },
    { value: '204', label: 'Huyện Mường Chà' }, { value: '205', label: 'Huyện Tủa Chùa' },
    { value: '206', label: 'Huyện Nậm Pồ' }, { value: '207', label: 'Huyện Mường Nhé' }
  ],
  '21': [
    { value: '210', label: 'Thành phố Lai Châu' }, { value: '211', label: 'Huyện Tam Đường' },
    { value: '212', label: 'Huyện Mường Tè' }, { value: '213', label: 'Huyện Sìn Hồ' },
    { value: '214', label: 'Huyện Phong Thổ' }, { value: '215', label: 'Huyện Than Uyên' },
    { value: '216', label: 'Huyện Tân Uyên' }, { value: '217', label: 'Huyện Nậm Nhìn' }
  ],
  '22': [
    { value: '220', label: 'Thành phố Sơn La' }, { value: '221', label: 'Huyện Quỳnh Nhai' },
    { value: '222', label: 'Huyện Thuận Châu' }, { value: '223', label: 'Huyện Mường La' },
    { value: '224', label: 'Huyện Bắc Yên' }, { value: '225', label: 'Huyện Phù Yên' },
    { value: '226', label: 'Huyện Mộc Châu' }, { value: '227', label: 'Huyện Yên Châu' },
    { value: '228', label: 'Huyện Mai Sơn' }, { value: '229', label: 'Huyện Sông Mã' },
    { value: '230', label: 'Huyện Sốp Cộp' }, { value: '231', label: 'Huyện Vân Hồ' }
  ],
  '24': [
    { value: '240', label: 'Thành phố Yên Bái' }, { value: '241', label: 'Thị xã Nghĩa Lộ' },
    { value: '242', label: 'Huyện Lục Yên' }, { value: '243', label: 'Huyện Văn Chấn' },
    { value: '244', label: 'Huyện Trạm Tấu' }, { value: '245', label: 'Huyện Mù Cang Chải' },
    { value: '246', label: 'Huyện Xín Mần' }, { value: '247', label: 'Huyện Bắc Mê' },
    { value: '248', label: 'Huyện Trấn Yên' }
  ],
  '25': [
    { value: '250', label: 'Thành phố Hòa Bình' }, { value: '251', label: 'Huyện Đà Bắc' },
    { value: '252', label: 'Huyện Kỳ Sơn' }, { value: '253', label: 'Huyện Lương Sơn' },
    { value: '254', label: 'Huyện Kim Bôi' }, { value: '255', label: 'Huyện Cao Phong' },
    { value: '256', label: 'Huyện Tân Lạc' }, { value: '257', label: 'Huyện Mai Châu' },
    { value: '258', label: 'Huyện Lạc Thủy' }, { value: '259', label: 'Huyện Yên Thủy' },
    { value: '260', label: 'Huyện Lạc Sơn' }
  ],
  '26': [
    { value: '260', label: 'Thành phố Thái Nguyên' }, { value: '261', label: 'Thành phố Sông Công' },
    { value: '262', label: 'Thành phố Thái Nguyên' }, { value: '263', label: 'Huyện Đại Từ' },
    { value: '264', label: 'Huyện Phổ Yên' }, { value: '265', label: 'Huyện Phú Bình' },
    { value: '266', label: 'Huyện Định Hóa' }, { value: '267', label: 'Huyện Võ Nhai' },
    { value: '268', label: 'Huyện Đông Hỷ' }, { value: '269', label: 'Huyện Pḥú Lương' }
  ],
  '27': [
    { value: '270', label: 'Thành phố Lạng Sơn' }, { value: '271', label: 'Huyện Tràng Định' },
    { value: '272', label: 'Huyện Bình Gia' }, { value: '273', label: 'Huyện Văn Lãng' },
    { value: '274', label: 'Huyện Cao Lộc' }, { value: '275', label: 'Huyện Lộc Bình' },
    { value: '276', label: 'Huyện Chi Lăng' }, { value: '277', label: 'Huyện Hữu Lũng' },
    { value: '278', label: 'Huyện Ứng Hòa' }
  ],
  '29': [
    { value: '290', label: 'Thành phố Hạ Long' }, { value: '291', label: 'Thành phố Cẩm Phả' },
    { value: '292', label: 'Thành phố Uông Bí' }, { value: '293', label: 'Thành phố Móng Cái' },
    { value: '294', label: 'Thị xã Quảng Yên' }, { value: '295', label: 'Huyện Đông Triều' },
    { value: '296', label: 'Huyện Tiên Yên' }, { value: '297', label: 'Huyện Ba Chẽ' },
    { value: '298', label: 'Huyện Bình Liêu' }, { value: '299', label: 'Huyện Hải Hà' },
    { value: '300', label: 'Huyện Vân Đồn' }, { value: '301', label: 'Huyện Cô Tô' }
  ],
  '30': [
    { value: '303', label: 'Thành phố Bắc Ninh' }, { value: '304', label: 'Huyện Yên Phong' },
    { value: '305', label: 'Huyện Quế Võ' }, { value: '306', label: 'Huyện Tiên Du' },
    { value: '307', label: 'Thị xã Từ Sơn' }, { value: '308', label: 'Huyện Thuận Thành' },
    { value: '309', label: 'Huyện Gia Bình' }, { value: '310', label: 'Huyện Lương Tài' }
  ],
  '31': [
    { value: '311', label: 'Thành phố Hải Dương' }, { value: '312', label: 'Thị xã Chí Linh' },
    { value: '313', label: 'Huyện Nam Sách' }, { value: '314', label: 'Huyện Kinh Môn' },
    { value: '315', label: 'Huyện Kim Thành' }, { value: '316', label: 'Huyện Thanh Miện' },
    { value: '317', label: 'Huyện Ninh Giang' }, { value: '318', label: 'Huyện Gia Lộc' },
    { value: '319', label: 'Huyện Tứ Kỳ' }, { value: '320', label: 'Huyện Cẩm Giàng' }
  ],
  '33': [
    { value: '332', label: 'Thành phố Hưng Yên' }, { value: '333', label: 'Huyện Văn Giang' },
    { value: '334', label: 'Huyện Yên Mỹ' }, { value: '335', label: 'Huyện Mỹ Hào' },
    { value: '336', label: 'Huyện Văn Lâm' }, { value: '337', label: 'Huyện Ân Thi' },
    { value: '338', label: 'Huyện Kim Động' }, { value: '339', label: 'Huyện Phù Cừ' },
    { value: '340', label: 'Thị xã Trần Cao Vân' }
  ],
  '34': [
    { value: '343', label: 'Thành phố Thái Bình' }, { value: '344', label: 'Huyện Quỳnh Phụ' },
    { value: '345', label: 'Huyện Hưng Hà' }, { value: '346', label: 'Huyện Đông Hưng' },
    { value: '347', label: 'Huyện Vũ Thư' }, { value: '348', label: 'Huyện Kiến Xương' },
    { value: '349', label: 'Huyện Tiền Hải' }, { value: '350', label: 'Huyện Thới Hải' }
  ],
  '35': [
    { value: '353', label: 'Thành phố Nam Định' }, { value: '354', label: 'Huyện Mỹ Lộc' },
    { value: '355', label: 'Huyện Vụ Bản' }, { value: '356', label: 'Huyện Ý Yên' },
    { value: '357', label: 'Huyện Nghĩa Hưng' }, { value: '358', label: 'Huyện Nam Trực' },
    { value: '359', label: 'Huyện Trực Ninh' }, { value: '360', label: 'Huyện Xuân Trường' },
    { value: '361', label: 'Huyện Giao Thủy' }, { value: '362', label: 'Huyện Hải Hậu' }
  ],
  '36': [
    { value: '363', label: 'Thành phố Ninh Bình' }, { value: '364', label: 'Thành phố Tam Điệp' },
    { value: '365', label: 'Huyện Hoa Lư' }, { value: '366', label: 'Huyện Yên Khánh' },
    { value: '367', label: 'Huyện Yên Mỹ' }, { value: '368', label: 'Huyện Kim Sơn' },
    { value: '369', label: 'Huyện Nho Quan' }
  ],
  '37': [
    { value: '370', label: 'Thành phố Thanh Hóa' }, { value: '371', label: 'Thị xã Bỉm Sơn' },
    { value: '372', label: 'Thị xã Sầm Sơn' }, { value: '373', label: 'Huyện Mường Lát' },
    { value: '374', label: 'Huyện Quan Hóa' }, { value: '375', label: 'Huyện Quan Sơn' },
    { value: '376', label: 'Huyện Như Xuân' }, { value: '377', label: 'Huyện Như Thanh' },
    { value: '378', label: 'Huyện Cẩm Thủy' }, { value: '379', label: 'Huyện Thạch Thành' },
    { value: '380', label: 'Huyện Hà Trung' }, { value: '381', label: 'Huyện Vĩnh Lộc' },
    { value: '382', label: 'Huyện Yên Định' }, { value: '383', label: 'Huyện Thọ Xuân' },
    { value: '384', label: 'Huyện Triệu Sơn' }, { value: '385', label: 'Huyện Thiệu Hóa' },
    { value: '386', label: 'Huyện Hoằng Hóa' }, { value: '387', label: 'Huyện Hậu Lộc' },
    { value: '388', label: 'Huyện Nga Sơn' }, { value: '389', label: 'Huyện Như Xuân' },
    { value: '390', label: 'Huyện Hà Trung' }
  ],
  '38': [
    { value: '389', label: 'Thành phố Vinh' }, { value: '390', label: 'Thị xã Cửa Lò' },
    { value: '391', label: 'Huyện Quế Phong' }, { value: '392', label: 'Huyện Quỳ Châu' },
    { value: '393', label: 'Huyện Kỳ Sơn' }, { value: '394', label: 'Huyện Tương Dương' },
    { value: '395', label: 'Huyện Nghĩa Đàn' }, { value: '396', label: 'Huyện Quỳ Hợp' },
    { value: '397', label: 'Huyện Quỳ Lâm' }, { value: '398', label: 'Huyện Anh Sơn' },
    { value: '399', label: 'Huyện Diễn Châu' }, { value: '400', label: 'Huyện Yên Thành' },
    { value: '401', label: 'Huyện Đô Lương' }, { value: '402', label: 'Huyện Thuộc Sơn' },
    { value: '403', label: 'Huyện Nam Đàn' }, { value: '404', label: 'Huyện Hưng Nguyên' },
    { value: '405', label: 'Thị xã Thái Hòa' }
  ],
  '40': [
    { value: '409', label: 'Thành phố Hà Tĩnh' }, { value: '410', label: 'Thị xã Hồng Lĩnh' },
    { value: '411', label: 'Huyện Hương Sơn' }, { value: '412', label: 'Huyện Đức Thọ' },
    { value: '413', label: 'Huyện Vũ Quang' }, { value: '414', label: 'Huyện Nghi Xuân' },
    { value: '415', label: 'Huyện Can Lộc' }, { value: '416', label: 'Huyện Hương Khê' },
    { value: '417', label: 'Huyện Thạch Hà' }, { value: '418', label: 'Huyện Cẩm Xuyên' },
    { value: '419', label: 'Huyện Kỳ Anh' }
  ],
  '42': [
    { value: '423', label: 'Thành phố Đồng Hới' }, { value: '424', label: 'Huyện Minh Hóa' },
    { value: '425', label: 'Huyện Tuyên Hóa' }, { value: '426', label: 'Huyện Quảng Trạch' },
    { value: '427', label: 'Huyện Bố Trạch' }, { value: '428', label: 'Huyện Quảng Ninh' },
    { value: '429', label: 'Huyện Lệ Thuỷ' }
  ],
  '44': [
    { value: '437', label: 'Thành phố Đông Hà' }, { value: '438', label: 'Thị xã Quảng Trị' },
    { value: '439', label: 'Huyện Vĩnh Linh' }, { value: '440', label: 'Huyện Hướng Hóa' },
    { value: '441', label: 'Huyện Gio Linh' }, { value: '442', label: 'Huyện Cam Lộ' },
    { value: '443', label: 'Huyện Triệu Phong' }, { value: '444', label: 'Huyện Hải Lăng' }
  ],
  '45': [
    { value: '449', label: 'Thành phố Huế' }, { value: '450', label: 'Huyện Phong Điền' },
    { value: '451', label: 'Huyện Quảng Điền' }, { value: '452', label: 'Huyện Phú Vang' },
    { value: '453', label: 'Huyện Hương Thủy' }, { value: '454', label: 'Huyện Hương Trà' },
    { value: '455', label: 'Thị xã Hương Phong' }
  ],
  '46': [
    { value: '460', label: 'Thành phố Tam Kỳ' }, { value: '461', label: 'Thành phố Hội An' },
    { value: '462', label: 'Huyện Tây Giang' }, { value: '463', label: 'Huyện Đông Giang' },
    { value: '464', label: 'Huyện Nam Giang' }, { value: '465', label: 'Huyện Phước Sơn' },
    { value: '466', label: 'Huyện Hiệp Đức' }, { value: '467', label: 'Huyện Thăng Bình' },
    { value: '468', label: 'Huyện Tiên Phước' }, { value: '469', label: 'Huyện Bắc Trà My' },
    { value: '470', label: 'Huyện Nam Trà My' }, { value: '471', label: 'Huyện Phú Ninh' },
    { value: '472', label: 'Huyện Nông Sơn' }
  ],
  '49': [
    { value: '479', label: 'Thành phố Quảng Ngãi' }, { value: '480', label: 'Huyện Lý Sơn' },
    { value: '481', label: 'Huyện Tư Nghĩa' }, { value: '482', label: 'Huyện Sơn Tịnh' },
    { value: '483', label: 'Huyện Sơn Hà' }, { value: '484', label: 'Huyện Minh Long' },
    { value: '485', label: 'Huyện Nghĩa Hành' }, { value: '486', label: 'Huyện Mộ Đức' },
    { value: '487', label: 'Huyện Đức Phổ' }, { value: '488', label: 'Huyện Ba Tơ' },
    { value: '489', label: 'Huyện Trà Bồng' }
  ],
  '51': [
    { value: '495', label: 'Thành phố Quy Nhơn' }, { value: '496', label: 'Huyện An Lão' },
    { value: '497', label: 'Huyện Hoài Nhơn' }, { value: '498', label: 'Huyện Hoài Ân' },
    { value: '499', label: 'Huyện Phù Mỹ' }, { value: '500', label: 'Huyện Vĩnh Thạnh' },
    { value: '501', label: 'Huyện Tây Sơn' }, { value: '502', label: 'Huyện Phù Cát' },
    { value: '503', label: 'Thị xã An Nhơn' }, { value: '504', label: 'Huyện Tuy Phước' }
  ],
  '52': [
    { value: '509', label: 'Thành phố Tuy Hòa' }, { value: '510', label: 'Thị xã Sông Cầu' },
    { value: '511', label: 'Huyện Đồng Xuân' }, { value: '512', label: 'Huyện Tuy An' },
    { value: '513', label: 'Huyện Sơn Hòa' }, { value: '514', label: 'Huyện Sông Hinh' },
    { value: '515', label: 'Huyện Tây Hòa' }, { value: '516', label: 'Huyện Phú Hòa' }
  ],
  '54': [
    { value: '521', label: 'Thành phố Nha Trang' }, { value: '522', label: 'Thành phố Cam Ranh' },
    { value: '523', label: 'Huyện Ninh Hòa' }, { value: '524', label: 'Huyện Vạn Ninh' },
    { value: '525', label: 'Huyện Diên Khánh' }, { value: '526', label: 'Huyện Khánh Vĩnh' },
    { value: '527', label: 'Huyện Khánh Sơn' }, { value: '528', label: 'Huyện Trường Sa' },
    { value: '529', label: 'Thị xã Ninh Hòa' }
  ],
  '56': [
    { value: '535', label: 'Thành phố Phan Rang-Tháp Chàm' }, { value: '536', label: 'Huyện Ninh Sơn' },
    { value: '537', label: 'Huyện Ninh Hải' }, { value: '538', label: 'Huyện Ninh Phước' },
    { value: '539', label: 'Huyện Bác Ái' }, { value: '540', label: 'Huyện Thuận Bắc' },
    { value: '541', label: 'Huyện Thuận Nam' }
  ],
  '58': [
    { value: '547', label: 'Thành phố Phan Thiết' }, { value: '548', label: 'Thị xã La Gi' },
    { value: '549', label: 'Huyện Tuy Phong' }, { value: '550', label: 'Huyện Bắc Bình' },
    { value: '551', label: 'Huyện Hàm Thuận Bắc' }, { value: '552', label: 'Huyện Hàm Thuận Nam' },
    { value: '553', label: 'Huyện Hàm Tân' }, { value: '554', label: 'Huyện Đức Linh' },
    { value: '555', label: 'Huyện Tánh Linh' }
  ],
  '60': [
    { value: '560', label: 'Thành phố Kon Tum' }, { value: '561', label: 'Huyện Đắk Glei' },
    { value: '562', label: 'Huyện Ngọc Hồi' }, { value: '563', label: 'Huyện Đắk Tô' },
    { value: '564', label: 'Huyện Kon Plông' }, { value: '565', label: 'Huyện Kon Rẫy' },
    { value: '566', label: 'Huyện Đắk Hà' }, { value: '567', label: 'Huyện Ia H\'drai' },
    { value: '568', label: 'Huyện Tu Mơ Rông' }
  ],
  '62': [
    { value: '571', label: 'Thành phố Pleiku' }, { value: '572', label: 'Thị xã An Khê' },
    { value: '573', label: 'Thị xã Ayun Pa' }, { value: '574', label: 'Huyện KBang' },
    { value: '575', label: 'Huyện Đắk Pơ' }, { value: '576', label: 'Huyện Mang Yang' },
    { value: '577', label: 'Huyện Kong Chro' }, { value: '578', label: 'Huyện Đắk Song' },
    { value: '579', label: 'Huyện Đắk GLong' }, { value: '580', label: 'Huyện Chư Păh' },
    { value: '581', label: 'Huyện la Grai' }, { value: '582', label: 'Huyện Kông Chro' },
    { value: '583', label: 'Huyện Phú Thiện' }, { value: '584', label: 'Huyện Chư Đăng Hới' }
  ],
  '64': [
    { value: '587', label: 'Thành phố Buôn Ma Thuột' }, { value: '588', label: 'Thị xã Buôn Hồ' },
    { value: '589', label: 'Huyện Ea H\'leo' }, { value: '590', label: 'Huyện Ea Súp' },
    { value: '591', label: 'Huyện Cư M\'gar' }, { value: '592', label: 'Huyện Krông Pắc' },
    { value: '593', label: 'Huyện Ea Kar' }, { value: '594', label: 'Huyện M\'Đrắk' },
    { value: '595', label: 'Huyện Krông Bông' }, { value: '596', label: 'Huyện Lắk' },
    { value: '597', label: 'Huyện Krông Ana' }, { value: '598', label: 'Huyện Cư Kuin' }
  ],
  '65': [
    { value: '600', label: 'Thị xã Gia Nghĩa' }, { value: '601', label: 'Huyện Đắk Mil' },
    { value: '602', label: 'Huyện Cư Jút' }, { value: '603', label: 'Huyện Đắk Song' },
    { value: '604', label: 'Huyện Đắk R\'lấp' }, { value: '605', label: 'Huyện Đắk Glong' },
    { value: '606', label: 'Huyện Tuy Đức' }
  ],
  '68': [
    { value: '608', label: 'Thành phố Đà Lạt' }, { value: '609', label: 'Thành phố Bảo Lộc' },
    { value: '610', label: 'Huyện Đam Rông' }, { value: '611', label: 'Huyện Lạc Dương' },
    { value: '612', label: 'Huyện Lâm Hà' }, { value: '613', label: 'Huyện Đơn Dương' },
    { value: '614', label: 'Huyện Đức Trọng' }, { value: '615', label: 'Huyện Di Linh' },
    { value: '616', label: 'Huyện Bảo Lâm' }, { value: '617', label: 'Huyện Đạ Huoai' },
    { value: '618', label: 'Huyện Đạ Tẻh' }, { value: '619', label: 'Huyện Cát Tiên' }
  ],
  '70': [
    { value: '621', label: 'Thị xã Đồng Xoài' }, { value: '622', label: 'Thị xã Phước Long' },
    { value: '623', label: 'Thị xã Bình Long' }, { value: '624', label: 'Huyện Bù Gia Mập' },
    { value: '625', label: 'Huyện Lộc Ninh' }, { value: '626', label: 'Huyện Bù Đốp' },
    { value: '627', label: 'Huyện Hớn Quản' }, { value: '628', label: 'Huyện Đồng Phú' },
    { value: '629', label: 'Huyện Bù Đăng' }, { value: '630', label: 'Huyện Chơn Thành' },
    { value: '631', label: 'Huyện Hớn Quản' }
  ],
  '72': [
    { value: '634', label: 'Thị xã Tây Ninh' }, { value: '635', label: 'Huyện Tân Biên' },
    { value: '636', label: 'Huyện Tân Châu' }, { value: '637', label: 'Huyện Dương Minh Châu' },
    { value: '638', label: 'Huyện Châu Thành' }, { value: '639', label: 'Huyện Bến Cầu' },
    { value: '640', label: 'Huyện Gò Dầu' }, { value: '641', label: 'Huyện Trảng Bàng' }
  ],
  '74': [
    { value: '644', label: 'Thành phố Thủ Dầu Một' }, { value: '645', label: 'Huyện Bàu Bàng' },
    { value: '646', label: 'Huyện Dầu Tiếng' }, { value: '647', label: 'Huyện Phú Giáo' },
    { value: '648', label: 'Thị xã Bến Cát' }, { value: '649', label: 'Thị xã Tân Uyên' },
    { value: '650', label: 'Thị xã Dĩ An' }, { value: '651', label: 'Thị xã Thuận An' }
  ],
  '75': [
    { value: '652', label: 'Thành phố Biên Hòa' }, { value: '653', label: 'Thành phố Long Khánh' },
    { value: '654', label: 'Huyện Tân Phú' }, { value: '655', label: 'Huyện Vĩnh Cửu' },
    { value: '656', label: 'Huyện Định Quán' }, { value: '657', label: 'Huyện Trảng Bom' },
    { value: '658', label: 'Huyện Thống Nhất' }, { value: '659', label: 'Huyện Cẩm Mỹ' },
    { value: '660', label: 'Huyện Long Thành' }, { value: '661', label: 'Huyện Xuân Lộc' },
    { value: '662', label: 'Huyện Nhơn Trạch' }
  ],
  '77': [
    { value: '664', label: 'Thành phố Vũng Tàu' }, { value: '665', label: 'Thị xã Bà Rịa' },
    { value: '666', label: 'Huyện Châu Đức' }, { value: '667', label: 'Huyện Xuyên Mộc' },
    { value: '668', label: 'Huyện Côn Đảo' }, { value: '669', label: 'Huyện Đất Đỏ' },
    { value: '670', label: 'Huyện Long Điền' }
  ],
  '80': [
    { value: '675', label: 'Thành phố Tân An' }, { value: '676', label: 'Thị xã Kiến Tường' },
    { value: '677', label: 'Huyện Tân Hưng' }, { value: '678', label: 'Huyện Vĩnh Hưng' },
    { value: '679', label: 'Huyện Mộc Hóa' }, { value: '680', label: 'Huyện Tân Thạnh' },
    { value: '681', label: 'Huyện Thạnh Hóa' }, { value: '682', label: 'Huyện Đức Huệ' },
    { value: '683', label: 'Huyện Đức Hòa' }, { value: '684', label: 'Huyện Bến Lức' },
    { value: '685', label: 'Huyện Thủ Thừa' }, { value: '686', label: 'Huyện Tân Trụ' },
    { value: '687', label: 'Huyện Cần Đước' }, { value: '688', label: 'Huyện Cần Giuộc' },
    { value: '689', label: 'Huyện Châu Thành' }
  ],
  '82': [
    { value: '692', label: 'Thành phố Mỹ Tho' }, { value: '693', label: 'Thị xã Gò Công' },
    { value: '694', label: 'Thị xã Cai Lậy' }, { value: '695', label: 'Huyện Tân Phước' },
    { value: '696', label: 'Huyện Gò Công Tây' }, { value: '697', label: 'Huyện Gò Công Đông' },
    { value: '698', label: 'Huyện Cái Bè' }, { value: '699', label: 'Huyện Châu Thành' },
    { value: '700', label: 'Huyện Chợ Gạo' }, { value: '701', label: 'Huyện Tân Phú Đông' }
  ],
  '83': [
    { value: '704', label: 'Thành phố Bến Tre' }, { value: '705', label: 'Huyện Chợ Lách' },
    { value: '706', label: 'Huyện Mỏ Cày Nam' }, { value: '707', label: 'Huyện Mỏ Cày Bắc' },
    { value: '708', label: 'Huyện Giồng Trôm' }, { value: '709', label: 'Huyện Bình Đại' },
    { value: '710', label: 'Huyện Ba Tri' }, { value: '711', label: 'Huyện Thạnh Phú' }
  ],
  '84': [
    { value: '715', label: 'Thành phố Trà Vinh' }, { value: '716', label: 'Huyện Càng Long' },
    { value: '717', label: 'Huyện Cầu Kè' }, { value: '718', label: 'Huyện Tiểu Cần' },
    { value: '719', label: 'Huyện Cầu Ngang' }, { value: '720', label: 'Huyện Trà Cú' },
    { value: '721', label: 'Huyện Duyên Hải' }
  ],
  '86': [
    { value: '725', label: 'Thành phố Vĩnh Long' }, { value: '726', label: 'Huyện Long Hồ' },
    { value: '727', label: 'Huyện Mang Thít' }, { value: '728', label: 'Huyện Vũng Liêm' },
    { value: '729', label: 'Huyện Tam Bình' }, { value: '730', label: 'Huyện Bình Tân' },
    { value: '731', label: 'Huyện Trà Ôn' }
  ],
  '87': [
    { value: '734', label: 'Thành phố Cao Lãnh' }, { value: '735', label: 'Thành phố Sa Đéc' },
    { value: '736', label: 'Thị xã Hồng Ngự' }, { value: '737', label: 'Huyện Tân Hồng' },
    { value: '738', label: 'Huyện Hồng Ngự' }, { value: '739', label: 'Huyện Tam Nông' },
    { value: '740', label: 'Huyện Tháp Mười' }, { value: '741', label: 'Huyện Lấp Vò' },
    { value: '742', label: 'Huyện Lai Vung' }, { value: '743', label: 'Huyện Châu Thành' }
  ],
  '89': [
    { value: '747', label: 'Thành phố Châu Đốc' }, { value: '748', label: 'Thành phố Long Xuyên' },
    { value: '749', label: 'Huyện An Phú' }, { value: '750', label: 'Huyện Tân Châu' },
    { value: '751', label: 'Huyện Phú Tân' }, { value: '752', label: 'Huyện Châu Phú' },
    { value: '753', label: 'Huyện Tịnh Biên' }, { value: '754', label: 'Huyện Tri Tôn' },
    { value: '755', label: 'Huyện Thoại Sơn' }
  ],
  '91': [
    { value: '758', label: 'Thành phố Rạch Giá' }, { value: '759', label: 'Thành phố Hà Tiên' },
    { value: '760', label: 'Huyện Kiên Lương' }, { value: '761', label: 'Huyện Hòn Đất' },
    { value: '762', label: 'Huyện Tân Hiệp' }, { value: '763', label: 'Huyện Châu Thành' },
    { value: '764', label: 'Huyện Giồng Riềng' }, { value: '765', label: 'Huyện Gò Quao' },
    { value: '766', label: 'Huyện An Biên' }, { value: '767', label: 'Huyện An Minh' },
    { value: '768', label: 'Huyện Vĩnh Thuận' }, { value: '769', label: 'Huyện Kiên Hải' },
    { value: '770', label: 'Huyện U Minh Thượng' }, { value: '771', label: 'Huyện Giang Thành' }
  ],
  '92': [
    { value: '773', label: 'Quận Ninh Kiều' }, { value: '774', label: 'Quận Ô Môn' },
    { value: '775', label: 'Quận Bình Thuỷ' }, { value: '776', label: 'Quận Cái Răng' },
    { value: '777', label: 'Quận Thốt Nốt' }, { value: '778', label: 'Huyện Vĩnh Thạnh' },
    { value: '779', label: 'Huyện Cờ Đỏ' }, { value: '780', label: 'Huyện Phong Điền' },
    { value: '781', label: 'Huyện Thới Lai' }
  ],
  '93': [
    { value: '783', label: 'Thành phố Vị Thanh' }, { value: '784', label: 'Thị xã Ngã Bảy' },
    { value: '785', label: 'Huyện Châu Thành' }, { value: '786', label: 'Huyện Châu Thành A' },
    { value: '787', label: 'Huyện Phụng Hiệp' }, { value: '788', label: 'Huyện Vị Thuỷ' },
    { value: '789', label: 'Huyện Long Mỹ' }, { value: '790', label: 'Huyện Long Mỹ' }
  ],
  '94': [
    { value: '793', label: 'Thành phố Sóc Trăng' }, { value: '794', label: 'Huyện Châu Thành' },
    { value: '795', label: 'Huyện Kế Sách' }, { value: '796', label: 'Huyện Mỹ Tú' },
    { value: '797', label: 'Huyện Cù Lao Dung' }, { value: '798', label: 'Huyện Long Phú' },
    { value: '799', label: 'Huyện Mỹ Xuyên' }, { value: '800', label: 'Thị xã Vĩnh Châu' },
    { value: '801', label: 'Huyện Trần Đề' }
  ],
  '95': [
    { value: '804', label: 'Thành phố Bạc Liêu' }, { value: '805', label: 'Huyện Hồng Dân' },
    { value: '806', label: 'Huyện Phước Long' }, { value: '807', label: 'Huyện Vĩnh Lợi' },
    { value: '808', label: 'Huyện Đông Hải' }, { value: '809', label: 'Huyện Hoà Bình' }
  ],
  '96': [
    { value: '812', label: 'Thành phố Cà Mau' }, { value: '813', label: 'Huyện U Minh' },
    { value: '814', label: 'Huyện Thới Bình' }, { value: '815', label: 'Huyện Trần Văn Thời' },
    { value: '816', label: 'Huyện Cái Nước' }, { value: '817', label: 'Huyện Đầm Dơi' },
    { value: '818', label: 'Huyện Năm Căn' }, { value: '819', label: 'Huyện Ngọc Hiển' }
  ]
}

export const getDistricts = (provinceCode) => {
  return DISTRICTS_BY_PROVINCE[provinceCode] || []
}

// Step labels (BasicInfo removed - now in registration)
export const STEP_LABELS = [
  'Kinh nghiệm làm việc',
  'Rào cản & Thách thức',
  'Nguyện vọng'
]

export const STEP_DESCRIPTIONS = [
  'Các công việc đã làm trước đây',
  'Những khó khăn bạn đang gặp phải',
  'Công việc và môi trường bạn mong muốn'
]
