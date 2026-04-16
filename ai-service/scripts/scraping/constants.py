# -*- coding: utf-8 -*-
"""
Constants cho Scraping Module

Module này chứa các constants dùng chung:
- Vietnamese provinces/cities
- Job types
- Education levels
- Job categories
- Skill mappings
- Location aliases

Author: Restart-35 Platform
Last Updated: 2026-04-13
"""

# 63 Tỉnh/Thành phố Việt Nam (theo chuẩn)
VIETNAMESE_PROVINCES = [
    'Hà Nội',
    'Hồ Chí Minh',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    'An Giang',
    'Bà Rịa Vũng Tàu',
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
    'Cao Bằng',
    'Đắk Lắk',
    'Đắk Nông',
    'Điện Biên',
    'Đồng Nai',
    'Đồng Tháp',
    'Gia Lai',
    'Hà Giang',
    'Hà Nam',
    'Hà Tĩnh',
    'Hải Dương',
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
    'Trà Vinh',
    'Tuyên Quang',
    'Vĩnh Long',
    'Vĩnh Phúc',
    'Yên Bái',
]

# Các quận/huyện phổ biến (để mapping)
DISTRICT_ALIASES = {
    'Hồ Chí Minh': ['HCM', 'HCMC', 'TPHCM', 'Saigon', 'Sài Gòn', 'TP.HCM'],
    'Hà Nội': ['Hanoi', 'HN'],
    'Đà Nẵng': ['Da Nang', 'ĐN'],
    'Hải Phòng': ['Hai Phong', 'HP'],
    'Cần Thơ': ['Can Tho', 'CT'],
}

# Job Types
JOB_TYPES = [
    'full-time',
    'part-time',
    'temporary',
    'freelance',
]

# Education Levels (ordered by level)
EDUCATION_LEVELS = [
    'none',
    'primary',
    'middle',
    'high',
    'vocational',
    'college',
    'university',
]

EDUCATION_LABELS = {
    'none': 'Không yêu cầu',
    'primary': 'Tiểu học',
    'middle': 'Trung học cơ sở',
    'high': 'Trung học phổ thông',
    'vocational': 'Trung cấp nghề',
    'college': 'Cao đẳng',
    'university': 'Đại học',
}

# Job Categories (phù hợp với mock data generator)
TARGET_JOBS = {
    'driver': ['lái xe', 'lai xe', 'tài xế', 'driver', 'shipper', 'giao hàng', 'xe buýt', 'xe khách'],
    'warehouse': ['kho vận', 'warehouse', 'nhân viên kho', 'xuất nhập khẩu', 'logistics', 'vận chuyển'],
    'skilled': ['thợ', 'kỹ thuật', 'cơ khí', 'điện', ' technician', 'thợ hàn', 'thợ cắt', 'thợ may'],
    'accounting': ['kế toán', 'accounting', 'tài chính', 'finance', 'thu ngân', 'kiểm toán'],
    'construction': ['xây dựng', 'construction', 'công nhân xây', 'thợ xây', 'kỹ sư xây dựng'],
    'service': ['phục vụ', 'service', 'lễ tân', 'receptionist', 'barista', 'đầu bếp', 'order'],
    'agriculture': ['nông nghiệp', 'agriculture', 'nông dân', 'trồng trọt', 'chăn nuôi'],
    'domestic': ['giúp việc', 'housekeeping', 'dọn dẹp', 'lao công', ' cleaning', 'gia đình'],
    'security': ['bảo vệ', 'security', 'an ninh', 'bảo vệ tài sản'],
    'sales': ['bán hàng', 'sales', 'kinh doanh', 'telesale', 'chăm sóc khách hàng'],
    'production': ['sản xuất', 'production', 'công nhân', 'factory', 'may mặc', 'dệt'],
    'bartender': ['pha chế', 'barista', 'bartender', 'đồ uống', 'bar'],
    'other': [],  # Default category
}

# Skill mappings (để standardize skills)
SKILL_MAPPINGS = {
    # IT skills
    'Ms Word': 'Microsoft Word',
    'MS Word': 'Microsoft Word',
    'MS Excel': 'Microsoft Excel',
    'Ms Excel': 'Microsoft Excel',
    'Excel': 'Microsoft Excel',
    'Word': 'Microsoft Word',
    'PPT': 'PowerPoint',
    'Power Point': 'PowerPoint',
    
    # Language skills
    'English': 'Tiếng Anh',
    'ENG': 'Tiếng Anh',
    'Japanese': 'Tiếng Nhật',
    'JP': 'Tiếng Nhật',
    'Korean': 'Tiếng Hàn',
    'Chinese': 'Tiếng Trung',
    
    # Soft skills
    'Teamwork': 'Làm việc nhóm',
    'Team Work': 'Làm việc nhóm',
    'Communication': 'Giao tiếp',
    'Leadership': 'Lãnh đạo',
    
    # Job-specific skills
    'Driving License': 'Bằng lái xe',
    'Forklift': 'Xe nâng',
    'Forklift License': 'Bằng lái xe nâng',
    'Cashier': 'Thu ngân',
    'POS': 'Sử dụng POS',
}

# Location aliases (để normalize location names)
LOCATION_ALIASES = {
    'Hồ Chí Minh': ['hcm', 'hcmc', 'tphcm', 'saigon', 'sài gòn', 'tp.hcm', 'ho chi minh city'],
    'Hà Nội': ['hanoi', 'hn', 'ha noi'],
    'Đà Nẵng': ['da nang', 'đn', 'danang'],
    'Hải Phòng': ['hai phong', 'hp'],
    'Cần Thơ': ['can tho', 'ct'],
    'Bình Dương': ['binh duong', 'bđ'],
    'Đồng Nai': ['dong nai', 'đn'],
    'Bà Rịa Vũng Tàu': ['vung tau', 'vt', 'ba ria', 'vũng tàu'],
    'Vĩnh Phúc': ['vinh phuc', 'vp'],
    'Thanh Hóa': ['thanh hoa', 'th'],
    'Nghệ An': ['nghe an', 'na'],
    'Hải Dương': ['hai duong', 'hd'],
    'Quảng Ninh': ['quang ninh', 'qn'],
    'Hưng Yên': ['hung yen', 'hy'],
    'Bắc Ninh': ['bac ninh', 'bn'],
    'Nam Định': ['nam dinh', 'nd'],
    'Thái Bình': ['thai binh', 'tb'],
    'Ninh Bình': ['ninh binh', 'nb'],
    'Thừa Thiên Huế': ['hue', 'huế'],
    'Quảng Nam': ['quang nam', 'qn'],
    'Quảng Ngãi': ['quang ngai', 'qng'],
    'Bình Định': ['binh dinh', 'bd'],
    'Khánh Hòa': ['khanh hoa', 'kh', 'nha trang'],
    'Lâm Đồng': ['lam dong', 'ld', 'đà lạt'],
    'Bình Thuận': ['binh thuan', 'bt'],
    'Lạng Sơn': ['lang son', 'ls'],
    'Lào Cai': ['lao cai', 'lc'],
    'Yên Bái': ['yen bai', 'yb'],
    'Phú Thọ': ['phu tho', 'pt'],
    'Sơn La': ['son la', 'sl'],
    'Điện Biên': ['dien bien', 'db'],
    'Lai Châu': ['lai chau', 'lc'],
    'Hà Giang': ['ha giang', 'hg'],
    'Cao Bằng': ['cao bang', 'cb'],
    'Bắc Kạn': ['bac kan', 'bk'],
    'Tuyên Quang': ['tuyen quang', 'tq'],
    'Hà Nam': ['ha nam', 'hnam'],
    'Hòa Bình': ['hoa binh', 'hb'],
    'Hà Tĩnh': ['ha tinh', 'ht'],
    'Quảng Bình': ['quang binh', 'qb'],
    'Quảng Trị': ['quang tri', 'qt'],
    'Thái Nguyên': ['thai nguyen', 'tn'],
    'Bắc Giang': ['bac giang', 'bg'],
    'Hậu Giang': ['hau giang', 'hg'],
    'Trà Vinh': ['tra vinh', 'tv'],
    'Bến Tre': ['ben tre', 'bt'],
    'Vĩnh Long': ['vinh long', 'vl'],
    'Đồng Tháp': ['dong thap', 'dt'],
    'An Giang': ['an giang', 'ag'],
    'Tiền Giang': ['tien giang', 'tgiang'],
    'Kiên Giang': ['kien giang', 'kg'],
    'Bạc Liêu': ['bac lieu', 'bl'],
    'Cà Mau': ['ca mau', 'cm'],
    'Sóc Trăng': ['soc trang', 'st'],
    'Bạc Liêu': ['bac lieu', 'bl'],
    'Cà Mau': ['ca mau', 'cm'],
}

# Age preference thresholds
AGE_PREFERENCES = ['<35', '<40', '<45', '<50', '<55', 'any']

# Salary ranges (for validation)
SALARY_RANGES = {
    'min': 1_000_000,      # 1 triệu/tháng
    'max': 200_000_000,    # 200 triệu/tháng
}

# Experience range (years)
EXPERIENCE_RANGE = {
    'min': 0,
    'max': 30,
}

# Common salary keywords
SALARY_KEYWORDS = {
    'triệu': 1_000_000,
    'tr': 1_000_000,
    'm': 1_000_000,
    'k': 1_000,
}

# Website sources
SOURCES = {
    'vietnamworks': {
        'name': 'VietnamWorks',
        'url': 'https://vietnamworks.com',
        'base_url': 'https://www.vietnamworks.com',
    },
    'vietnamworks_algolia': {
        'name': 'VietnamWorks (Algolia)',
        'url': 'https://vietnamworks.com',
        'base_url': 'https://www.vietnamworks.com',
        'description': 'VietnamWorks scraped via Algolia Search API (fastest method)',
    },
    'careerbuilder': {
        'name': 'CareerBuilder',
        'url': 'https://careerbuilder.vn',
        'base_url': 'https://careerbuilder.vn',
    },
    'topcv': {
        'name': 'TopCV',
        'url': 'https://topcv.vn',
        'base_url': 'https://topcv.vn',
    },
}

# Default values
DEFAULTS = {
    'location': 'Hồ Chí Minh',
    'job_type': 'full-time',
    'education': 'high',
    'age_preference': 'any',
    'experience': 0,
    'salary_min': 5_000_000,    # 5 triệu
    'salary_max': 15_000_000,   # 15 triệu
}

# Output CSV columns
OUTPUT_COLUMNS = [
    'id',
    'title',
    'company',
    'skills',
    'location',
    'salary_min',
    'salary_max',
    'type',
    'age_preference',
    'experience_required',
    'education_required',
    'description',
    'category',
    'source',
    'job_url',
    'scraped_at',
]

# Skill patterns for extraction from job descriptions
# Organized by category for better matching
SKILL_PATTERNS = {
    # Programming Languages
    'programming_languages': [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C#', 'C++', 'C',
        'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'PHP', 'Scala', 'R',
        'Objective-C', 'Dart', 'Lua', 'Perl', 'Haskell', 'Erlang', 'Elixir',
    ],
    # Frameworks & Libraries
    'frameworks': [
        'React', 'ReactJS', 'React.js', 'Angular', 'Vue', 'VueJS', 'Vue.js',
        'Next.js', 'NextJS', 'Nuxt', 'NestJS', 'Express', 'FastAPI', 'Django',
        'Flask', 'Spring', 'Spring Boot', 'NodeJS', 'Node.js', 'Rails', 'Ruby on Rails',
        'Laravel', 'CodeIgniter', 'CakePHP', 'Symfony', 'Flutter', 'React Native',
        'Svelte', 'Gatsby', 'Remix',
    ],
    # Databases
    'databases': [
        'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Oracle', 'SQL Server', 'SQLite', 'MariaDB', 'DynamoDB', 'Cassandra',
        'CouchDB', 'Firebase', 'Supabase', 'Neo4j', 'InfluxDB', 'TimescaleDB',
    ],
    # Cloud & DevOps
    'cloud_devops': [
        'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'K8s',
        'Terraform', 'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions',
        'CircleCI', 'Travis CI', 'Prometheus', 'Grafana', 'ELK', 'ELK Stack',
        'Linux', 'Unix', 'Bash', 'Shell Scripting', 'Nginx', 'Apache',
    ],
    # Big Data & ML
    'bigdata_ml': [
        'Spark', 'Hadoop', 'Kafka', 'Flink', 'Airflow', 'ETL',
        'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
        'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
        'Tableau', 'Power BI', 'Looker', 'Qlik',
    ],
    # Tools & Software
    'tools': [
        'Git', 'JIRA', 'Confluence', 'Slack', 'Figma', 'Sketch', 'Adobe XD',
        'Postman', 'Insomnia', 'Swagger', 'OpenAPI',
    ],
    # Soft Skills
    'soft_skills': [
        'Teamwork', 'Leadership', 'Communication', 'Problem Solving',
        'Critical Thinking', 'Time Management', 'Agile', 'Scrum',
    ],
    # Languages
    'languages': [
        'English', 'Japanese', 'Korean', 'Chinese', 'Tiếng Anh', 'Tiếng Nhật',
    ],
    # Office & Business
    'office_business': [
        'Microsoft Office', 'MS Word', 'MS Excel', 'Excel', 'Word', 'PowerPoint',
        'Google Docs', 'Google Sheets', 'SAP', 'ERP', 'CRM',
    ],
}

# Flatten all skill patterns for regex matching
ALL_SKILL_PATTERNS = []
for category, skills in SKILL_PATTERNS.items():
    ALL_SKILL_PATTERNS.extend(skills)

# Words to exclude from skill extraction (UI text, locations, etc.)
SKILL_EXCLUDE_WORDS = {
    # UI elements - common patterns
    'xem chi tiết', 'chi tiết', 'quyền lợi', 'yêu cầu', 'mô tả',
    'việc làm', 'tại', 'cong viec', 'tim viec', 'dang ky', 'dang nhap',
    # Locations (already in location field)
    'hà nội', 'hồ chí minh', 'đà nẵng', 'hải phòng', 'cần thơ',
    'bình dương', 'đồng nai', 'vũng tàu', 'bà rịa', 'hcm', 'hn',
    # Experience/education patterns
    'kinh nghiệm', 'năm', 'trở lên', 'cao đẳng', 'đại học', 'trung học',
    'tốt nghiệp', 'chuyên viên', 'nhân viên',
    # Company related
    'công ty', 'cong ty', 'tnhh', 'cổ phần', 'ltd', 'corp', 'jsc',
    # Job type
    'toàn thời gian', 'bán thời gian', 'full-time', 'part-time',
    'nghỉ thứ', 'thứ 7', 'chủ nhật',
    # Numbers and dates
    'năm', 'tháng', 'ngày', 'tuần',
    # Other non-skill words
    'phường', 'quận', 'xã', 'thị trấn', 'tỉnh', 'thành phố',
    # Generic job-related terms
    'việc làm it', 'công nghệ thông tin', 'it project management',
    'product owner', 'product manager', 'product management',
    'game design', 'game development', 'hoạt hình', 'nghệ thuật',
    'tiếng nhật', 'jlpt', 'tiếng anh', 'tiếng hàn',
    # Skills that are not actual skills
    'thuyết trình', 'tìm kiếm khách hàng', 'xây dựng mối quan hệ',
    'kỹ năng giao tiếp', 'kỹ năng bán hàng', 'kỹ năng đàm phán',
    'kỹ năng làm việc', 'kỹ năng văn phòng', 'phát triển phần mềm',
    'tư vấn kỹ thuật', 'làm việc nhóm', 'phân tích nghiệp vụ',
    'quay phim', 'dựng phim', 'app store optimization',
    'performance marketing', 'data analysis', 'user acquisition',
    'phần mềm', 'game developer', 'ứng dụng', 'giải pháp',
    # More UI text
    'phản hồi', 'mong nhận', 'góp ý', 'cải thiện',
}
