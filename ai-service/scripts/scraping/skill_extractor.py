# -*- coding: utf-8 -*-
"""
Skill Extractor Module - Trích xuất skills từ job titles và descriptions

Module này cung cấp:
- TITLE_SKILL_MAPPINGS: Mapping từ keywords trong title -> skill names
- extract_skills_from_title(): Trích xuất skills từ job title
- infer_category_from_title(): Infer job category từ title
- infer_salary_defaults(): Salary defaults dựa trên category

Author: Restart-35 Platform
Last Updated: 2026-04-15
"""

from typing import List, Dict, Tuple, Optional
import re


# ============================================================
# SKILL KEYWORDS - Mapping từ keywords trong title -> skills
# ============================================================

# Skills được trích xuất từ job titles
TITLE_SKILL_KEYWORDS = {
    # Kế toán - Tài chính
    'ke_toan': {
        'skill': 'Kế toán',
        'keywords': [
            'kế toán', 'thuế', 'tài chính', 'kiểm toán', 'thu ngân',
            'accounting', 'finance', 'hạch toán', 'sổ sách', 'báo cáo tài chính',
            'công nợ', 'kho', 'xuất nhập khẩu', ' logistics',
        ]
    },
    
    # Kinh doanh - Bán hàng
    'kinh_doanh': {
        'skill': 'Kinh doanh',
        'keywords': [
            'kinh doanh', 'bán hàng', 'sales', 'telesales', 'telemarketing',
            'chăm sóc khách hàng', 'cskh', 'customer service', 'tư vấn',
            'marketing', 'quảng cáo', 'content', 'social media', 'facebook',
            'chốt đơn', 'doanh số', 'business', 'sales admin',
        ]
    },
    
    # Hành chính - Nhân sự
    'hanh_chinh': {
        'skill': 'Hành chính',
        'keywords': [
            'hành chính', 'nhân sự', 'admin', 'văn phòng', 'thư ký',
            'hồ sơ', 'giấy tờ', 'administrative', 'hr', 'tuyển dụng',
            'lễ tân', 'receptionist', 'front desk', 'tiếp tân',
        ]
    },
    
    # Lao động phổ thông
    'lao_dong': {
        'skill': 'Lao động phổ thông',
        'keywords': [
            'lao động', 'công nhân', 'phụ việc', 'phụ hồ', 'bốc xếp',
            'gia công', 'đóng gói', 'phân loại', 'kiểm đếm', 'kiểm tra chất lượng',
            ' QC', 'QC', 'quality control', 'giám sát',
        ]
    },
    
    # Bảo vệ - An ninh
    'bao_ve': {
        'skill': 'Bảo vệ',
        'keywords': [
            'bảo vệ', 'an ninh', 'bảo mật', 'security', 'kiểm soát',
            'bảo vệ tài sản', 'giữ gìn trật tự',
        ]
    },
    
    # Lái xe - Tài xế
    'lai_xe': {
        'skill': 'Lái xe',
        'keywords': [
            'lái xe', 'tài xế', 'xe tải', 'xe buýt', 'xe khách', 'xe máy',
            'driver', 'shipper', 'giao hàng', 'vận chuyển', 'delivery',
            'công ten', 'contener', 'container',
        ]
    },
    
    # Xây dựng
    'xay_dung': {
        'skill': 'Xây dựng',
        'keywords': [
            'xây dựng', 'thợ xây', 'công trình', 'kiến trúc', 'architect',
            'kỹ sư xây dựng', 'giám sát công trình', 'supervisor',
            'scaffolding', 'cốp pha', 'cắt kiếng',
        ]
    },
    
    # Cơ khí - Kỹ thuật
    'co_khi': {
        'skill': 'Cơ khí',
        'keywords': [
            'cơ khí', 'máy móc', 'kỹ thuật', 'technician', 'mechanic',
            'thợ hàn', 'hàn', 'thợ máy', 'thợ cắt', 'thợ tiện', 'thợ phay',
            'thợ mộc', 'mộc', 'nhôm kính', 'kính', 'sơn', 'sơn nước',
            ' HVAC', 'điện lạnh', 'lạnh', 'máy lạnh', 'điều hòa',
        ]
    },
    
    # Điện - Điện tử
    'dien': {
        'skill': 'Điện',
        'keywords': [
            'điện', 'điện tử', 'electronic', 'electric', 'linh kiện',
            'sửa chữa', 'lắp ráp', 'PCB', 'circuit',
        ]
    },
    
    # IT - Công nghệ thông tin
    'it': {
        'skill': 'IT',
        'keywords': [
            'it', 'cntt', 'lập trình', 'developer', 'programmer',
            'python', 'java', 'javascript', 'php', 'ruby', 'golang',
            'frontend', 'backend', 'fullstack', 'devops', 'sysadmin',
            'network', 'mạng', 'server', 'database', ' DBA',
            'data', 'analyst', ' tester', 'QA', 'QC',
            'product', 'project manager', 'pm', 'agile', 'scrum',
        ]
    },
    
    # Nấu ăn - Ẩm thực
    'nau_an': {
        'skill': 'Nấu ăn',
        'keywords': [
            'nấu ăn', 'đầu bếp', 'phụ bếp', 'chef', 'cook',
            'bếp', 'bếp trưởng', 'bếp phó', 'sous chef',
        ]
    },
    
    # Phục vụ - Nhà hàng - Khách sạn
    'phuc_vu': {
        'skill': 'Phục vụ',
        'keywords': [
            'phục vụ', 'lễ tân', 'nhà hàng', 'khách sạn', 'hotel',
            'barista', 'pha chế', 'bartender', 'đồ uống', 'cafe',
            ' order', 'phục vụ bàn', 'bồi bàn', 'buồng phòng',
            'housekeeping', 'dọn phòng', 'giặt là',
        ]
    },
    
    # Kho vận - Logistics
    'kho_van': {
        'skill': 'Kho vận',
        'keywords': [
            'kho', 'vận chuyển', 'xuất nhập khẩu', 'logistics',
            'warehouse', 'inventory', 'tồn kho', 'nhập kho', 'xuất kho',
            'forklift', 'xe nâng', 'bốc xếp', 'vận hành',
        ]
    },
    
    # May mặc - Thời trang
    'may_mac': {
        'skill': 'May mặc',
        'keywords': [
            'may mặc', 'thời trang', 'cắt may', 'thợ may', 'garment',
            'dệt', 'nhuộm', 'vải', 'mẫu', 'pattern', 'fashion',
        ]
    },
    
    # Sản xuất - Nhà máy
    'san_xuat': {
        'skill': 'Sản xuất',
        'keywords': [
            'sản xuất', 'nhà máy', 'dây chuyền', 'assembly', 'lắp ráp',
            'production', 'manufacturing', 'gia công', 'factory',
        ]
    },
    
    # Nông nghiệp
    'nong_nghiep': {
        'skill': 'Nông nghiệp',
        'keywords': [
            'nông nghiệp', 'nông dân', 'trồng trọt', 'chăn nuôi',
            'agriculture', 'farm', 'trang trại', 'nuôi trồng',
            'thu hoạch', 'hái', 'phân bón', 'thuốc trừ sâu',
        ]
    },
    
    # Giúp việc - Dọn dẹp
    'giup_viec': {
        'skill': 'Giúp việc',
        'keywords': [
            'giúp việc', 'dọn dẹp', 'lao công', ' cleaning', 'housekeeper',
            'gia đình', 'trông trẻ', 'chăm sóc', 'elderly care', 'hỗ trợ gia đình',
        ]
    },
    
    # Giáo dục - Đào tạo
    'giao_duc': {
        'skill': 'Giáo dục',
        'keywords': [
            'giáo viên', 'giao viên', 'giảng dạy', 'teacher', ' tutor',
            'đào tạo', 'training', 'instructor', 'giáo dục', 'dạy học',
            'trung tâm', 'kỹ năng', 'coaching', 'mentor',
        ]
    },
    
    # Y tế - Sức khỏe
    'y_te': {
        'skill': 'Y tế',
        'keywords': [
            'y tế', 'bệnh viện', 'bác sĩ', 'doctor', 'nurse', 'điều dưỡng',
            'dược', 'pharmacy', 'thuốc', 'y sĩ', 'hộ lý', 'massage',
            'spa', 'làm đẹp', 'thẩm mỹ', 'hair salon', 'nail',
        ]
    },
    
    # Bất động sản
    'bat_dong_san': {
        'skill': 'Bất động sản',
        'keywords': [
            'bất động sản', 'nhà đất', 'môi giới', 'broker', 'agent',
            'căn hộ', 'chung cư', 'đất nền', 'project', 'property',
        ]
    },
    
    # Tài chính - Ngân hàng - Bảo hiểm
    'tai_chinh': {
        'skill': 'Tài chính',
        'keywords': [
            'tài chính', 'ngân hàng', 'banking', 'bảo hiểm', 'insurance',
            'đầu tư', 'investment', 'chứng khoán', 'stock', 'forex',
            'tín dụng', 'credit', 'thẻ', ' bancassurance',
        ]
    },
    
    # Luật - Pháp lý
    'luat': {
        'skill': 'Luật',
        'keywords': [
            'luật', 'pháp lý', 'law', 'legal', 'biên bản', 'hợp đồng',
            'luật sư', 'advocate', 'compliance', 'tuân thủ',
        ]
    },
    
    # Truyền thông - Marketing
    'marketing': {
        'skill': 'Marketing',
        'keywords': [
            'marketing', 'quảng cáo', 'advertising', 'branding', 'brand',
            'content', 'seo', 'google ads', 'facebook ads', 'media',
            'pr', 'quan hệ công chúng', 'truyền thông', 'communication',
            'copywriting', 'design', 'đồ họa', 'graphic',
        ]
    },
    
    # Kinh doanh online
    'kinh_doanh_online': {
        'skill': 'Kinh doanh Online',
        'keywords': [
            'online', 'e-commerce', 'thương mại điện tử', 'shopee', 'lazada',
            'tiktok', 'shop', 'store', 'seller', 'vender',
        ]
    },
    
    # Thẩm định - Định giá
    'thamdinh': {
        'skill': 'Thẩm định',
        'keywords': [
            'thẩm định', 'định giá', 'appraisal', 'valuation', 'valuation',
            'tài sản', 'asset', 'bất động sản',
        ]
    },
}


# ============================================================
# CATEGORY INFERENCE
# ============================================================

# Map skills -> categories (phù hợp với jobs.csv category field)
SKILL_TO_CATEGORY = {
    'ke_toan': 'accounting',
    'kinh_doanh': 'sales',
    'hanh_chinh': 'other',
    'lao_dong': 'production',
    'bao_ve': 'security',
    'lai_xe': 'driver',
    'xay_dung': 'construction',
    'co_khi': 'skilled',
    'dien': 'skilled',
    'it': 'other',
    'nau_an': 'service',
    'phuc_vu': 'service',
    'kho_van': 'warehouse',
    'may_mac': 'production',
    'san_xuat': 'production',
    'nong_nghiep': 'agriculture',
    'giup_viec': 'domestic',
    'giao_duc': 'other',
    'y_te': 'service',
    'bat_dong_san': 'sales',
    'tai_chinh': 'other',
    'luat': 'other',
    'marketing': 'sales',
    'kinh_doanh_online': 'sales',
    'thamdinh': 'other',
}


# ============================================================
# SALARY DEFAULTS BY CATEGORY
# ============================================================

# Salary defaults theo category (VND/month)
CATEGORY_SALARY_DEFAULTS = {
    'labor': (6000000, 10000000),      # Lao động phổ thông
    'production': (8000000, 12000000),  # Sản xuất - công nhân
    'sales': (8000000, 15000000),        # Kinh doanh - bán hàng
    'accounting': (10000000, 18000000), # Kế toán
    'it': (15000000, 30000000),         # IT
    'skilled': (12000000, 20000000),   # Kỹ thuật - thợ lành nghề
    'service': (6000000, 12000000),     # Dịch vụ - phục vụ
    'driver': (10000000, 18000000),     # Lái xe
    'warehouse': (8000000, 14000000),   # Kho vận
    'construction': (10000000, 18000000), # Xây dựng
    'security': (6000000, 10000000),    # Bảo vệ
    'domestic': (5000000, 8000000),      # Giúp việc
    'agriculture': (5000000, 9000000),  # Nông nghiệp
    'other': (8000000, 15000000),       # Mặc định
}


# ============================================================
# LOCATION SALARY MULTIPLIERS
# ============================================================

LOCATION_SALARY_MULTIPLIERS = {
    'Hồ Chí Minh': 1.20,   # +20%
    'Hà Nội': 1.15,         # +15%
    'Bình Dương': 1.05,     # +5%
    'Đồng Nai': 1.00,       # Baseline
    'Bà Rịa Vũng Tàu': 1.10, # +10%
    'Hải Phòng': 0.95,      # -5%
    'Cần Thơ': 0.90,        # -10%
    'Đà Nẵng': 1.05,        # +5%
}


# ============================================================
# EXPERIENCE DEFAULTS BY CATEGORY
# ============================================================

CATEGORY_EXPERIENCE_DEFAULTS = {
    'labor': 0,
    'production': 0,
    'sales': 0,
    'accounting': 1,
    'it': 1,
    'skilled': 1,
    'service': 0,
    'driver': 1,
    'warehouse': 0,
    'construction': 1,
    'security': 0,
    'domestic': 0,
    'agriculture': 0,
    'other': 0,
}


# ============================================================
# EXTRACTION FUNCTIONS
# ============================================================

def extract_skills_from_title(title: str) -> Tuple[List[str], str]:
    """
    Trích xuất skills từ job title.
    
    Args:
        title: Job title string
        
    Returns:
        Tuple of (list of extracted skills, primary category)
    """
    if not title:
        return [], 'other'
    
    title_lower = title.lower()
    found_skills = []
    found_categories = []
    
    # Check each skill keyword group
    for skill_key, data in TITLE_SKILL_KEYWORDS.items():
        for keyword in data['keywords']:
            if keyword in title_lower:
                skill_name = data['skill']
                if skill_name not in found_skills:
                    found_skills.append(skill_name)
                    # Track category
                    category = SKILL_TO_CATEGORY.get(skill_key, 'other')
                    if category not in found_categories:
                        found_categories.append(category)
                break  # Only count once per skill group
    
    # Determine primary category (most relevant)
    primary_category = 'other'
    if found_categories:
        # Priority: accounting > it > skilled > sales > other
        priority_order = ['accounting', 'it', 'skilled', 'sales', 'service', 'driver', 'warehouse', 'construction', 'production', 'security', 'other']
        for cat in priority_order:
            if cat in found_categories:
                primary_category = cat
                break
    
    return found_skills, primary_category


def extract_skills_from_text(text: str, include_title: bool = True) -> Tuple[List[str], str]:
    """
    Trích xuất skills từ text (title + description).
    
    Args:
        text: Combined text from title and description
        include_title: Whether to include title in extraction
        
    Returns:
        Tuple of (list of extracted skills, primary category)
    """
    if not text:
        return [], 'other'
    
    text_lower = text.lower()
    found_skills = []
    found_categories = []
    
    for skill_key, data in TITLE_SKILL_KEYWORDS.items():
        for keyword in data['keywords']:
            if keyword in text_lower:
                skill_name = data['skill']
                if skill_name not in found_skills:
                    found_skills.append(skill_name)
                    category = SKILL_TO_CATEGORY.get(skill_key, 'other')
                    if category not in found_categories:
                        found_categories.append(category)
                break
    
    # Determine primary category
    primary_category = 'other'
    if found_categories:
        priority_order = ['accounting', 'it', 'skilled', 'sales', 'service', 'driver', 'warehouse', 'construction', 'production', 'security', 'other']
        for cat in priority_order:
            if cat in found_categories:
                primary_category = cat
                break
    
    return found_skills, primary_category


def infer_salary_from_category(
    category: str,
    location: Optional[str] = None
) -> Tuple[int, int]:
    """
    Infer salary range từ category và location.
    
    Args:
        category: Job category
        location: Job location
        
    Returns:
        Tuple of (salary_min, salary_max) in VND
    """
    # Get base salary for category
    salary_min, salary_max = CATEGORY_SALARY_DEFAULTS.get(
        category, CATEGORY_SALARY_DEFAULTS['other']
    )
    
    # Apply location multiplier
    if location:
        multiplier = LOCATION_SALARY_MULTIPLIERS.get(location, 1.0)
        salary_min = int(salary_min * multiplier)
        salary_max = int(salary_max * multiplier)
    
    return salary_min, salary_max


def infer_experience_from_category(category: str) -> int:
    """
    Infer default experience requirement từ category.
    
    Args:
        category: Job category
        
    Returns:
        Years of experience required
    """
    return CATEGORY_EXPERIENCE_DEFAULTS.get(category, 0)


def clean_extracted_skills(skills: List[str]) -> str:
    """
    Chuyển list of skills thành pipe-separated string.
    
    Args:
        skills: List of skill names
        
    Returns:
        Pipe-separated string
    """
    # Remove duplicates while preserving order
    seen = set()
    unique_skills = []
    for skill in skills:
        skill_lower = skill.lower()
        if skill_lower not in seen:
            seen.add(skill_lower)
            unique_skills.append(skill)
    
    return '|'.join(unique_skills)


def extract_salary_from_text(text: str) -> Tuple[int, int]:
    """
    Trích xuất salary từ text (description).
    
    Args:
        text: Text containing salary information
        
    Returns:
        Tuple of (salary_min, salary_max) in VND, or (0, 0) if not found
    """
    if not text:
        return 0, 0
    
    text_lower = text.lower()
    
    # Skip if "thương lượng" or "liên hệ"
    skip_words = ['thoa thuan', 'thương lượng', 'negotiable', 'lien he', 'liên hệ']
    if any(w in text_lower for w in skip_words):
        return 0, 0
    
    salary_values = []
    
    # Pattern: "đến X triệu" or "X-Y triệu"
    pattern_range = re.findall(r'(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)', text_lower)
    for min_val, max_val in pattern_range:
        try:
            min_int = int(float(min_val.replace(',', '.')) * 1_000_000)
            max_int = int(float(max_val.replace(',', '.')) * 1_000_000)
            salary_values.extend([min_int, max_int])
        except ValueError:
            pass
    
    # Pattern: "đến X triệu"
    pattern_to = re.findall(r'đến\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|/tháng)?', text_lower)
    for val in pattern_to:
        try:
            salary_values.append(int(float(val.replace(',', '.')) * 1_000_000))
        except ValueError:
            pass
    
    # Pattern: standalone number followed by triệu
    pattern_single = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\b', text_lower)
    for val in pattern_single:
        try:
            salary_values.append(int(float(val.replace(',', '.')) * 1_000_000))
        except ValueError:
            pass
    
    if not salary_values:
        return 0, 0
    
    salary_values = sorted(set(salary_values))
    
    if len(salary_values) >= 2:
        return salary_values[0], salary_values[-1]
    elif len(salary_values) == 1:
        val = salary_values[0]
        return val, val
    
    return 0, 0


# ============================================================
# MAIN PROCESSING FUNCTION
# ============================================================

def enrich_job_data(
    title: str,
    description: str = '',
    existing_skills: str = '',
    existing_category: str = '',
    existing_salary_min: int = 0,
    existing_salary_max: int = 0,
    existing_location: str = '',
) -> Dict:
    """
    Enrich job data bằng cách trích xuất skills và infer missing fields.
    
    Args:
        title: Job title
        description: Job description
        existing_skills: Existing skills string
        existing_category: Existing category
        existing_salary_min: Existing salary min
        existing_salary_max: Existing salary max
        existing_location: Job location
        
    Returns:
        Dict với các fields đã được enrich
    """
    result = {
        'title': title,
        'skills': existing_skills,
        'category': existing_category,
        'salary_min': existing_salary_min,
        'salary_max': existing_salary_max,
        'skills_source': 'original',
    }
    
    # 1. Extract skills from title
    title_skills, title_category = extract_skills_from_title(title)
    
    # 2. Extract skills from description if available
    desc_skills = []
    desc_category = 'other'
    if description:
        desc_skills, desc_category = extract_skills_from_text(description)
    
    # 3. Combine skills
    if existing_skills:
        # Keep original skills, add inferred ones if missing
        existing_list = [s.strip() for s in existing_skills.split('|') if s.strip()]
        combined_skills = existing_list.copy()
        for skill in title_skills + desc_skills:
            if skill.lower() not in [s.lower() for s in combined_skills]:
                combined_skills.append(skill)
        result['skills'] = clean_extracted_skills(combined_skills)
        result['skills_source'] = 'mixed'
    elif title_skills or desc_skills:
        # Use inferred skills
        all_skills = list(dict.fromkeys(title_skills + desc_skills))  # Preserve order, remove dupes
        result['skills'] = clean_extracted_skills(all_skills)
        result['skills_source'] = 'inferred'
    
    # 4. Determine category
    if existing_category and existing_category != 'other':
        result['category'] = existing_category
    elif title_category != 'other':
        result['category'] = title_category
    elif desc_category != 'other':
        result['category'] = desc_category
    
    # 5. Infer salary if missing
    if existing_salary_min == 0 and existing_salary_max == 0:
        # Try to extract from description
        if description:
            extracted_min, extracted_max = extract_salary_from_text(description)
            if extracted_min > 0:
                result['salary_min'] = extracted_min
                result['salary_max'] = extracted_max
                result['salary_source'] = 'extracted'
            else:
                # Infer from category
                inferred_min, inferred_max = infer_salary_from_category(
                    result['category'], existing_location
                )
                result['salary_min'] = inferred_min
                result['salary_max'] = inferred_max
                result['salary_source'] = 'inferred'
        else:
            # Infer from category
            inferred_min, inferred_max = infer_salary_from_category(
                result['category'], existing_location
            )
            result['salary_min'] = inferred_min
            result['salary_max'] = inferred_max
            result['salary_source'] = 'inferred'
    else:
        result['salary_source'] = 'original'
    
    return result
