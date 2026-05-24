/**
 * ESCO Seed Translations Script
 *
 * Seeds initial translations for popular occupations and skills
 * These are manually curated translations for the most common jobs
 *
 * Usage:
 *   node src/scripts/seedTranslations.js
 */

import 'dotenv/config'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { escoOccupationModel } from '~/models/escoOccupationModel'
import { escoSkillModel } from '~/models/escoSkillModel'
import { escoTranslationOverrideModel } from '~/models/escoTranslationOverrideModel'

// Initial translations for popular occupations (ISCO codes)
// This covers the most common jobs for the 35+ demographic in Vietnam
const INITIAL_OCCUPATION_TRANSLATIONS = [
  // Construction & Manufacturing
  { code: '7111', titleEn: 'House builder', titleVi: 'Thợ xây nhà' },
  { code: '7112', titleEn: 'Bricklayer', titleVi: 'Thợ xây gạch' },
  { code: '7115', titleEn: 'Carpenter', titleVi: 'Thợ mộc' },
  { code: '7121', titleEn: 'Roofers', titleVi: 'Thợ lợp mái' },
  { code: '7122', titleEn: 'Floor layer', titleVi: 'Thợ lát sàn' },
  { code: '7123', titleEn: 'Plasterer', titleVi: 'Thợ trát tường' },
  { code: '7131', titleEn: 'Painter', titleVi: 'Thợ sơn' },
  { code: '7132', titleEn: 'Varnisher', titleVi: 'Thợ sơn bả' },
  { code: '7212', titleEn: 'Welder', titleVi: 'Thợ hàn' },
  { code: '7213', titleEn: 'Sheet-metal worker', titleVi: 'Thợ cắt tôn' },
  { code: '7221', titleEn: 'Blacksmith', titleVi: 'Thợ rèn' },
  { code: '7222', titleEn: 'Toolmaker', titleVi: 'Thợ làm khuôn' },
  { code: '7223', titleEn: 'Machine tool operator', titleVi: 'Thợ vận hành máy' },
  { code: '7224', titleEn: 'Metal grinding machine operator', titleVi: 'Thợ mài kim loại' },
  { code: '7231', titleEn: 'Motor vehicle mechanic', titleVi: 'Thợ sửa ô tô' },
  { code: '7232', titleEn: 'Motorcycle mechanic', titleVi: 'Thợ sửa xe máy' },
  { code: '7233', titleEn: 'Agricultural machinery mechanic', titleVi: 'Thợ sửa máy nông nghiệp' },
  { code: '7311', titleEn: 'Precision-instrument maker', titleVi: 'Thợ làm dụng cụ' },
  { code: '7312', titleEn: 'Musical instrument maker', titleVi: 'Thợ làm nhạc cụ' },
  { code: '7313', titleEn: 'Jewellery maker', titleVi: 'Thợ kim hoàn' },

  // Security & Protective
  { code: '5411', titleEn: 'Firefighter', titleVi: 'Lính cứu hỏa' },
  { code: '5412', titleEn: 'Police officer', titleVi: 'Cảnh sát' },
  { code: '5413', titleEn: 'Fire and rescue officer', titleVi: 'Cán bộ cứu hỏa' },
  { code: '5414', titleEn: 'Security guard', titleVi: 'Bảo vệ' },
  { code: '5419', titleEn: 'Protective services worker', titleVi: 'Nhân viên bảo vệ' },

  // Transportation & Logistics
  { code: '8331', titleEn: 'Bus driver', titleVi: 'Tài xế xe buýt' },
  { code: '8332', titleEn: 'Truck driver', titleVi: 'Tài xế xe tải' },
  { code: '8333', titleEn: 'Taxi driver', titleVi: 'Tài xế taxi' },
  { code: '8334', titleEn: 'Van driver', titleVi: 'Tài xế xe van' },
  { code: '8341', titleEn: 'Harbour crane operator', titleVi: 'Thợ cẩu cảng' },
  { code: '8342', titleEn: 'Earth-moving plant operator', titleVi: 'Thợ vận hành máy xúc' },
  { code: '8343', titleEn: 'Crane operator', titleVi: 'Thợ cẩu' },
  { code: '8344', titleEn: 'Forklift operator', titleVi: 'Thợ lái xe nâng' },

  // Sales & Retail
  { code: '5221', titleEn: 'Shop keeper', titleVi: 'Chủ cửa hàng' },
  { code: '5222', titleEn: 'Shop salesperson', titleVi: 'Nhân viên bán hàng' },
  { code: '5223', titleEn: 'Technical and medical sales professional', titleVi: 'Nhân viên kinh doanh kỹ thuật' },
  { code: '5230', titleEn: 'Cashier', titleVi: 'Thu ngân' },
  { code: '5311', titleEn: 'Child care worker', titleVi: 'Người giữ trẻ' },
  { code: '5321', titleEn: 'Healthcare assistant', titleVi: 'Điều dưỡng' },
  { code: '5322', titleEn: 'Home-based personal care worker', titleVi: 'Người chăm sóc tại nhà' },

  // Food & Hospitality
  { code: '5120', titleEn: 'Cook', titleVi: 'Đầu bếp' },
  { code: '5131', titleEn: 'Waiter', titleVi: 'Phục vụ bàn' },
  { code: '5132', titleEn: 'Bartender', titleVi: 'Pha chế' },
  { code: '5141', titleEn: 'Hairdresser', titleVi: 'Thợ cắt tóc' },
  { code: '5142', titleEn: 'Beautician', titleVi: 'Chuyên viên làm đẹp' },
  { code: '5163', titleEn: 'Funeral worker', titleVi: 'Nhân viên tang lễ' },

  // Agriculture & Farming
  { code: '6111', titleEn: 'Field crop grower', titleVi: 'Nông dân trồng cây' },
  { code: '6112', titleEn: 'Vegetable grower', titleVi: 'Nông dân trồng rau' },
  { code: '6113', titleEn: 'Gardener', titleVi: 'Người làm vườn' },
  { code: '6121', titleEn: 'Livestock farmer', titleVi: 'Nông dân chăn nuôi' },
  { code: '6122', titleEn: 'Poultry farmer', titleVi: 'Nông dân nuôi gia cầm' },
  { code: '6129', titleEn: 'Animal producer', titleVi: 'Người chăn nuôi' },
  { code: '6130', titleEn: 'Mixed crop and livestock farmer', titleVi: 'Nông dân tổng hợp' },
  { code: '6151', titleEn: 'Aquaculture worker', titleVi: 'Công nhân nuôi trồng thủy sản' },
  { code: '6152', titleEn: 'Fisher', titleVi: 'Ngư dân' },
  { code: '6153', titleEn: 'Forestry worker', titleVi: 'Công nhân lâm nghiệp' },

  // Administrative
  { code: '4110', titleEn: 'Office clerk', titleVi: 'Nhân viên văn phòng' },
  { code: '4120', titleEn: 'Secretaries', titleVi: 'Thư ký' },
  { code: '4211', titleEn: 'Bank clerk', titleVi: 'Nhân viên ngân hàng' },
  { code: '4212', titleEn: 'Debt collector', titleVi: 'Người đòi nợ' },
  { code: '4214', titleEn: 'Registration clerk', titleVi: 'Nhân viên tiếp nhận' },

  // Maintenance & Cleaning
  { code: '9111', titleEn: 'Domestic house cleaner', titleVi: 'Người giúp việc nhà' },
  { code: '9112', titleEn: 'Cleaning worker', titleVi: 'Nhân viên vệ sinh' },
  { code: '9121', titleEn: 'Vehicle cleaner', titleVi: 'Người rửa xe' },
  { code: '9129', titleEn: 'Other cleaning workers', titleVi: 'Nhân viên vệ sinh khác' },
  { code: '9321', titleEn: 'Hand packer', titleVi: 'Người đóng gói thủ công' },
  { code: '9329', titleEn: 'Manufacturing labourer', titleVi: 'Công nhân sản xuất' },

  // Handicrafts
  { code: '7318', titleEn: 'Shoe maker', titleVi: 'Thợ làm giày' },
  { code: '7319', titleEn: 'Leather goods maker', titleVi: 'Thợ làm đồ da' },
  { code: '7521', titleEn: 'Woodworking-machine setter', titleVi: 'Thợ chế biến gỗ' },
  { code: '7522', titleEn: 'Cabinet maker', titleVi: 'Thợ làm tủ gỗ' },
  { code: '7523', titleEn: 'Woodworking-machine operator', titleVi: 'Thợ vận hành máy gỗ' },
  { code: '7531', titleEn: 'Tailor', titleVi: 'Thợ may' },
  { code: '7532', titleEn: 'Garment pattern maker', titleVi: 'Thợ cắt may' },
  { code: '7533', titleEn: 'Sewing machine operator', titleVi: 'Thợ vận hành máy may' },
  { code: '7534', titleEn: 'Upholsterer', titleVi: 'Thợ bọc ghế' },
  { code: '7535', titleEn: 'Leather goods maker', titleVi: 'Thợ làm đồ da' },
  { code: '7536', titleEn: 'Shoemaker', titleVi: 'Thợ đóng giày' },

  // Utilities
  { code: '7411', titleEn: 'Electrician', titleVi: 'Thợ điện' },
  { code: '7412', titleEn: 'Electrical mechanic', titleVi: 'Thợ sửa điện' },
  { code: '7421', titleEn: 'Electronics mechanic', titleVi: 'Thợ sửa điện tử' },
  { code: '7422', titleEn: 'ICT technician', titleVi: 'Kỹ thuật viên CNTT' },
  { code: '7511', titleEn: 'Butcher', titleVi: 'Người giết mổ' },
  { code: '7512', titleEn: 'Baker', titleVi: 'Thợ làm bánh' },
  { code: '7513', titleEn: 'Dairy processing worker', titleVi: 'Công nhân chế biến sữa' },
  { code: '7514', titleEn: 'Fruit and vegetable preserver', titleVi: 'Công nhân chế biến rau quả' },
  { code: '7515', titleEn: 'Food and beverage taster', titleVi: 'Người nếm thực phẩm' },
  { code: '7516', titleEn: 'Tobacco preparer', titleVi: 'Công nhân chế biến thuốc lá' },

  // Management
  { code: '1311', titleEn: 'Production manager', titleVi: 'Quản lý sản xuất' },
  { code: '1312', titleEn: 'Agriculture manager', titleVi: 'Quản lý nông nghiệp' },
  { code: '1321', titleEn: 'Warehouse manager', titleVi: 'Quản lý kho hàng' },
  { code: '1323', titleEn: 'Construction manager', titleVi: 'Quản lý xây dựng' },
  { code: '1324', titleEn: 'Supply chain manager', titleVi: 'Quản lý chuỗi cung ứng' },
  { code: '1330', titleEn: 'IT manager', titleVi: 'Quản lý CNTT' },
  { code: '1341', titleEn: 'Child care services manager', titleVi: 'Quản lý dịch vụ giữ trẻ' },
  { code: '1342', titleEn: 'Health services manager', titleVi: 'Quản lý dịch vụ y tế' },
  { code: '1343', titleEn: 'Aged care services manager', titleVi: 'Quản lý dịch vụ chăm sóc người già' },
  { code: '1344', titleEn: 'Social welfare manager', titleVi: 'Quản lý phúc lợi xã hội' },
  { code: '1345', titleEn: 'Education manager', titleVi: 'Quản lý giáo dục' },
  { code: '1346', titleEn: 'Financial institution manager', titleVi: 'Quản lý tài chính' },
  { code: '1349', titleEn: 'Professional services manager', titleVi: 'Quản lý dịch vụ chuyên nghiệp' },

  // Health
  { code: '2211', titleEn: 'Generalist medical practitioner', titleVi: 'Bác sĩ đa khoa' },
  { code: '2212', titleEn: 'Specialist medical practitioner', titleVi: 'Bác sĩ chuyên khoa' },
  { code: '2221', titleEn: 'Nursing professional', titleVi: 'Y tá chuyên nghiệp' },
  { code: '2261', titleEn: 'Dentist', titleVi: 'Nha sĩ' },
  { code: '2262', titleEn: 'Pharmacist', titleVi: 'Dược sĩ' },
  { code: '2263', titleEn: 'Environmental and occupational health professional', titleVi: 'Chuyên gia y tế nghề nghiệp' },
  { code: '2264', titleEn: 'Physiotherapist', titleVi: 'Vật lý trị liệu' },
  { code: '2265', titleEn: 'Dietitian', titleVi: 'Chuyên gia dinh dưỡng' },
  { code: '2266', titleEn: 'Audiologist', titleVi: 'Chuyên gia thính học' },
  { code: '2267', titleEn: 'Optometrist', titleVi: 'Chuyên gia nhãn khoa' },
  { code: '2269', titleEn: 'Health professional', titleVi: 'Chuyên gia y tế' },
  { code: '3251', titleEn: 'Dental assistant', titleVi: 'Trợ lý nha khoa' },
  { code: '3252', titleEn: 'Medical records clerk', titleVi: 'Nhân viên hồ sơ y tế' },
  { code: '3253', titleEn: 'Community health worker', titleVi: 'Công nhân y tế cộng đồng' },
  { code: '3254', titleEn: 'Optometry technician', titleVi: 'Kỹ thuật viên nhãn khoa' },
  { code: '3255', titleEn: 'Medical equipment operator', titleVi: 'Kỹ thuật viên thiết bị y tế' },
  { code: '3256', titleEn: 'Physiotherapy technician', titleVi: 'Kỹ thuật viên vật lý trị liệu' },
  { code: '3257', titleEn: 'Environmental health technician', titleVi: 'Kỹ thuật viên y tế môi trường' },
  { code: '3258', titleEn: 'Dispensing optician', titleVi: 'Kỹ thuật viên đo kính' },
  { code: '3259', titleEn: 'Other health associate professionals', titleVi: 'Nhân viên y tế khác' },

  // Teaching
  { code: '2310', titleEn: 'University lecturer', titleVi: 'Giảng viên đại học' },
  { code: '2320', titleEn: 'Vocational education teacher', titleVi: 'Giáo viên dạy nghề' },
  { code: '2330', titleEn: 'Secondary education teacher', titleVi: 'Giáo viên trung học' },
  { code: '2341', titleEn: 'Primary school teacher', titleVi: 'Giáo viên tiểu học' },
  { code: '2342', titleEn: 'Early childhood educator', titleVi: 'Giáo viên mầm non' },
  { code: '2351', titleEn: 'Education methods specialist', titleVi: 'Chuyên gia phương pháp giáo dục' },
  { code: '2352', titleEn: 'Education adviser', titleVi: 'Tư vấn giáo dục' },
  { code: '2353', titleEn: 'Language teacher', titleVi: 'Giáo viên ngôn ngữ' },
  { code: '2354', titleEn: 'Music teacher', titleVi: 'Giáo viên nhạc' },
  { code: '2355', titleEn: 'Art teacher', titleVi: 'Giáo viên mỹ thuật' },
  { code: '2356', titleEn: 'Information technology trainer', titleVi: 'Giảng viên CNTT' },
  { code: '2359', titleEn: 'Teaching professional', titleVi: 'Giáo viên' },

  // Legal & Social
  { code: '2611', titleEn: 'Lawyer', titleVi: 'Luật sư' },
  { code: '2612', titleEn: 'Judge', titleVi: 'Thẩm phán' },
  { code: '2619', titleEn: 'Legal professional', titleVi: 'Chuyên gia pháp lý' },
  { code: '2631', titleEn: 'Economist', titleVi: 'Kinh tế gia' },
  { code: '2632', titleEn: 'Sociologist', titleVi: 'Nhà xã hội học' },
  { code: '2633', titleEn: 'Philosopher', titleVi: 'Nhà triết học' },
  { code: '2634', titleEn: 'Social professional', titleVi: 'Chuyên gia công tác xã hội' },
  { code: '2635', titleEn: 'Religious professional', titleVi: 'Chuyên gia tôn giáo' },
  { code: '2636', titleEn: 'Psychologist', titleVi: 'Nhà tâm lý học' },
  { code: '2641', titleEn: 'Author', titleVi: 'Nhà văn' },
  { code: '2642', titleEn: 'Editor', titleVi: 'Biên tập viên' },
  { code: '2643', titleEn: 'Journalist', titleVi: 'Phóng viên' },
  { code: '2651', titleEn: 'Sculptor', titleVi: 'Nhà điêu khắc' },
  { code: '2652', titleEn: 'Musician', titleVi: 'Nhạc sĩ' },
  { code: '2653', titleEn: 'Choreographer', titleVi: 'Biên đạo múa' },
  { code: '2654', titleEn: 'Film and video editor', titleVi: 'Biên tập viên phim' },
  { code: '2655', titleEn: 'Actor', titleVi: 'Diễn viên' },
  { code: '2656', titleEn: 'Announcer', titleVi: 'Người dẫn chương trình' },
  { code: '2657', titleEn: 'Photographer', titleVi: 'Nhiếp ảnh gia' },
  { code: '2659', titleEn: 'Creative and performing artist', titleVi: 'Nghệ sĩ sáng tạo' },

  // Engineering
  { code: '3111', titleEn: 'Chemical and physical science technician', titleVi: 'Kỹ thuật viên hóa học' },
  { code: '3112', titleEn: 'Civil engineering technician', titleVi: 'Kỹ thuật viên xây dựng' },
  { code: '3113', titleEn: 'Electrical engineering technician', titleVi: 'Kỹ thuật viên điện' },
  { code: '3114', titleEn: 'Electronics engineering technician', titleVi: 'Kỹ thuật viên điện tử' },
  { code: '3115', titleEn: 'Mechanical engineering technician', titleVi: 'Kỹ thuật viên cơ khí' },
  { code: '3116', titleEn: 'Chemical engineering technician', titleVi: 'Kỹ thuật viên hóa công' },
  { code: '3117', titleEn: 'Mining and metallurgical technician', titleVi: 'Kỹ thuật viên khai thác' },
  { code: '3118', titleEn: 'Draughtsperson', titleVi: 'Kỹ thuật vẽ' },
  { code: '3119', titleEn: 'Physical and engineering science technician', titleVi: 'Kỹ thuật viên khoa học' },

  // Computing
  { code: '2511', titleEn: 'Systems analyst', titleVi: 'Phân tích viên hệ thống' },
  { code: '2512', titleEn: 'Software developer', titleVi: 'Lập trình viên' },
  { code: '2513', titleEn: 'Web developer', titleVi: 'Lập trình viên web' },
  { code: '2514', titleEn: 'Applications programmer', titleVi: 'Lập trình ứng dụng' },
  { code: '2519', titleEn: 'Software and applications developer', titleVi: 'Nhà phát triển phần mềm' },
  { code: '2521', titleEn: 'Database designer and administrator', titleVi: 'Quản trị cơ sở dữ liệu' },
  { code: '2522', titleEn: 'Systems administrator', titleVi: 'Quản trị hệ thống' },
  { code: '2523', titleEn: 'Computer network professional', titleVi: 'Chuyên gia mạng máy tính' },
  { code: '2529', titleEn: 'Database and network professional', titleVi: 'Chuyên gia CNTT' }
]

// Initial skill translations
const INITIAL_SKILL_TRANSLATIONS = [
  // Essential skills
  { titleEn: 'operate welding equipment', titleVi: 'Vận hành thiết bị hàn' },
  { titleEn: 'read blueprints', titleVi: 'Đọc bản vẽ kỹ thuật' },
  { titleEn: 'use power tools', titleVi: 'Sử dụng dụng cụ điện' },
  { titleEn: 'welding skills', titleVi: 'Kỹ năng hàn' },
  { titleEn: 'metalworking', titleVi: 'Gia công kim loại' },
  { titleEn: 'quality control', titleVi: 'Kiểm soát chất lượng' },
  { titleEn: 'follow safety procedures', titleVi: 'Tuân thủ quy trình an toàn' },
  { titleEn: 'maintain equipment', titleVi: 'Bảo dưỡng thiết bị' },
  { titleEn: 'problem solving', titleVi: 'Giải quyết vấn đề' },
  { titleEn: 'communication', titleVi: 'Giao tiếp' },
  { titleEn: 'teamwork', titleVi: 'Làm việc nhóm' },
  { titleEn: 'time management', titleVi: 'Quản lý thời gian' },
  { titleEn: 'customer service', titleVi: 'Phục vụ khách hàng' },
  { titleEn: 'cash handling', titleVi: 'Xử lý tiền mặt' },
  { titleEn: 'sales techniques', titleVi: 'Kỹ thuật bán hàng' },
  { titleEn: 'inventory management', titleVi: 'Quản lý hàng tồn kho' },
  { titleEn: 'driving licence', titleVi: 'Bằng lái xe' },
  { titleEn: 'vehicle maintenance', titleVi: 'Bảo dưỡng phương tiện' },
  { titleEn: 'map reading', titleVi: 'Đọc bản đồ' },
  { titleEn: 'heavy vehicle operation', titleVi: 'Vận hành xe nặng' },
  { titleEn: 'food safety', titleVi: 'An toàn thực phẩm' },
  { titleEn: 'food preparation', titleVi: 'Chuẩn bị thực phẩm' },
  { titleEn: 'cooking skills', titleVi: 'Kỹ năng nấu ăn' },
  { titleEn: 'kitchen management', titleVi: 'Quản lý bếp' },
  { titleEn: 'menu planning', titleVi: 'Lập thực đơn' },
  { titleEn: 'cash register operation', titleVi: 'Vận hành máy tính tiền' },
  { titleEn: 'computer literacy', titleVi: 'Sử dụng máy tính' },
  { titleEn: 'administrative tasks', titleVi: 'Công việc hành chính' },
  { titleEn: 'filing and records', titleVi: 'Lưu trữ hồ sơ' },
  { titleEn: 'basic accounting', titleVi: 'Kế toán cơ bản' },
  { titleEn: 'gardening', titleVi: 'Làm vườn' },
  { titleEn: 'plant care', titleVi: 'Chăm sóc cây trồng' },
  { titleEn: 'irrigation', titleVi: 'Tưới tiêu' },
  { titleEn: 'pest control', titleVi: 'Kiểm soát sâu bệnh' },
  { titleEn: 'livestock management', titleVi: 'Quản lý chăn nuôi' },
  { titleEn: 'feeding schedules', titleVi: 'Lịch cho ăn' },
  { titleEn: 'animal health', titleVi: 'Sức khỏe động vật' },
  { titleEn: 'cleaning procedures', titleVi: 'Quy trình vệ sinh' },
  { titleEn: 'sanitation', titleVi: 'Vệ sinh' },
  { titleEn: 'laundry operations', titleVi: 'Giặt ủi' },
  { titleEn: 'stain removal', titleVi: 'Tẩy vết bẩn' },
  { titleEn: 'security monitoring', titleVi: 'Giám sát an ninh' },
  { titleEn: 'patrol procedures', titleVi: 'Tuần tra' },
  { titleEn: 'emergency response', titleVi: 'Ứng phó khẩn cấp' },
  { titleEn: 'first aid', titleVi: 'Sơ cấp cứu' },
  { titleEn: 'conflict resolution', titleVi: 'Giải quyết xung đột' },
  { titleEn: 'documentation', titleVi: 'Lập tài liệu' },
  { titleEn: 'report writing', titleVi: 'Viết báo cáo' },
  { titleEn: 'basic math', titleVi: 'Toán cơ bản' },
  { titleEn: 'measurement', titleVi: 'Đo lường' }
]

async function seedOccupationTranslations() {
  console.log('Seeding occupation translations...')

  let updated = 0
  let notFound = 0

  for (const trans of INITIAL_OCCUPATION_TRANSLATIONS) {
    try {
      const existing = await escoOccupationModel.search(trans.titleEn, { lang: 'en', limit: 1 })

      // Find matching by code or title
      const occupation = existing.results.find(o =>
        o.code === trans.code ||
        o.titleEn.toLowerCase() === trans.titleEn.toLowerCase()
      )

      if (occupation) {
        await escoOccupationModel.updateTranslation(occupation.uri, {
          titleVi: trans.titleVi,
          translationStatus: 'manual'
        })
        updated++
      } else {
        notFound++
      }
    } catch (error) {
      console.error(`Error updating ${trans.titleEn}:`, error.message)
    }
  }

  console.log(`Updated: ${updated}, Not found: ${notFound}`)
}

async function seedSkillTranslations() {
  console.log('\nSeeding skill translations...')

  let updated = 0

  for (const trans of INITIAL_SKILL_TRANSLATIONS) {
    try {
      const existing = await escoSkillModel.search(trans.titleEn, { lang: 'en', limit: 1 })

      if (existing.results.length > 0) {
        for (const skill of existing.results) {
          if (skill.titleEn.toLowerCase() === trans.titleEn.toLowerCase()) {
            await escoSkillModel.updateTranslation(skill.escoUri, {
              titleVi: trans.titleVi,
              translationStatus: 'manual'
            })
            updated++
          }
        }
      }
    } catch (error) {
      console.error(`Error updating ${trans.titleEn}:`, error.message)
    }
  }

  console.log(`Updated skills: ${updated}`)
}

async function seedOverrides() {
  console.log('\nSeeding translation overrides...')

  for (const trans of INITIAL_SKILL_TRANSLATIONS) {
    try {
      await escoTranslationOverrideModel.upsertByUriAndField({
        escoUri: `manual:${trans.titleEn}`,
        field: 'skill',
        language: 'vi',
        originalText: trans.titleEn,
        overrideText: trans.titleVi,
        source: 'manual',
        isApproved: true
      })
    } catch (error) {
      // Ignore duplicates
    }
  }

  console.log('Overrides seeded.')
}

async function main() {
  console.log('='.repeat(50))
  console.log('ESCO Translation Seed Script')
  console.log('='.repeat(50))

  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB\n')

    await seedOccupationTranslations()
    await seedSkillTranslations()
    await seedOverrides()

    console.log('\n' + '='.repeat(50))
    console.log('Seeding complete!')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('Disconnected from MongoDB')
  }
}

main()
