# -*- coding: utf-8 -*-
"""
Translation Service - Vietnamese translations for job titles and industries

This service provides Vietnamese translations for commonly used job titles
and industry names to improve readability for workers 35+.
"""

from typing import Dict, List, Any, Optional
import re
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# JOB TITLE TRANSLATIONS: English -> Vietnamese
# =============================================================================

JOB_TITLE_TRANSLATIONS: Dict[str, str] = {
    # ===== Sales & Marketing =====
    "Digital Sales Specialist": "Chuyên viên Bán hàng Số",
    "E-commerce Operations Manager": "Quản lý Vận hành Thương mại Điện tử",
    "Customer Success Manager": "Quản lý Chăm sóc Khách hàng Thành công",
    "Digital Marketing Specialist": "Chuyên viên Marketing Số",
    "Sales Executive": "Nhân viên Kinh doanh",
    "Sales Representative": "Nhân viên Bán hàng",
    "Marketing Coordinator": "Điều phối viên Marketing",
    "Brand Manager": "Quản lý Thương hiệu",
    "Content Marketing Specialist": "Chuyên viên Nội dung Marketing",
    "Social Media Specialist": "Chuyên viên Mạng xã hội",
    "SEO Specialist": "Chuyên viên Tối ưu Tìm kiếm (SEO)",
    "SEM Specialist": "Chuyên viên Quảng cáo Tìm kiếm",
    "CRM Manager": "Quản lý Quản lý Khách hàng (CRM)",
    "Account Manager": "Quản lý Tài khoản Khách hàng",
    "Business Development Manager": "Quản lý Phát triển Kinh doanh",
    "Regional Sales Manager": "Quản lý Kinh doanh Khu vực",
    "Channel Sales Manager": "Quản lý Kinh doanh Kênh phân phối",
    "Key Account Manager": "Quản lý Khách hàng Trọng điểm",
    "Sales Director": "Giám đốc Kinh doanh",
    "Marketing Director": "Giám đốc Marketing",
    "Head of Sales": "Trưởng phòng Kinh doanh",
    "Head of Marketing": "Trưởng phòng Marketing",

    # ===== IT & Technology =====
    "IT Support Specialist": "Chuyên viên Hỗ trợ Tin học",
    "Data Entry Clerk": "Nhân viên Nhập liệu",
    "Web Developer": "Lập trình viên Website",
    "Frontend Developer": "Lập trình viên Giao diện",
    "Backend Developer": "Lập trình viên Hệ thống",
    "Full Stack Developer": "Lập trình viên Full Stack",
    "Software Engineer": "Kỹ sư Phần mềm",
    "System Administrator": "Quản trị Hệ thống",
    "Network Engineer": "Kỹ sư Mạng",
    "Technical Support Engineer": "Kỹ sư Hỗ trợ Kỹ thuật",
    "Help Desk Technician": "Kỹ thuật viên Hỗ trợ",
    "IT Manager": "Quản lý Tin học",
    "IT Director": "Giám đốc Tin học",
    "CTO": "Giám đốc Kỹ thuật",
    "Data Analyst": "Chuyên viên Phân tích Dữ liệu",
    "Business Analyst": "Chuyên viên Phân tích Nghiệp vụ",
    "QA Engineer": "Kỹ sư Kiểm thử Phần mềm",
    "DevOps Engineer": "Kỹ sư DevOps",
    "Cloud Engineer": "Kỹ sư Đám mây",
    "Cybersecurity Analyst": "Chuyên viên An ninh Mạng",
    "Database Administrator": "Quản trị Cơ sở Dữ liệu",
    "Product Manager": "Quản lý Sản phẩm",
    "Project Manager": "Quản lý Dự án",
    "Scrum Master": "Scrum Master",
    "Tech Lead": "Trưởng nhóm Kỹ thuật",

    # ===== Operations & Logistics =====
    "Warehouse Supervisor": "Giám sát Kho bãi",
    "Warehouse Manager": "Quản lý Kho bãi",
    "Logistics Coordinator": "Điều phối viên Vận tải",
    "Logistics Manager": "Quản lý Vận tải - Logistics",
    "Supply Chain Manager": "Quản lý Chuỗi Cung ứng",
    "Inventory Manager": "Quản lý Hàng tồn kho",
    "Procurement Officer": "Nhân viên Mua hàng",
    "Procurement Manager": "Quản lý Mua hàng",
    "Sourcing Manager": "Quản lý Tìm nguồn cung",
    "Operations Manager": "Quản lý Vận hành",
    "Operations Director": "Giám đốc Vận hành",
    "COO": "Giám đốc Vận hành",
    "Production Manager": "Quản lý Sản xuất",
    "Quality Control Manager": "Quản lý Kiểm soát Chất lượng",
    "Quality Assurance Manager": "Quản lý Đảm bảo Chất lượng",
    "Process Improvement Specialist": "Chuyên viên Cải tiến Quy trình",

    # ===== Finance & Accounting =====
    "Accountant": "Kế toán",
    "Senior Accountant": "Kế toán Cao cấp",
    "Chief Accountant": "Kế toán trưởng",
    "Finance Clerk": "Nhân viên Tài chính",
    "Finance Manager": "Quản lý Tài chính",
    "Finance Director": "Giám đốc Tài chính",
    "CFO": "Giám đốc Tài chính",
    "Financial Analyst": "Chuyên viên Phân tích Tài chính",
    "Financial Controller": "Kiểm soát viên Tài chính",
    "Tax Manager": "Quản lý Thuế",
    "Auditor": "Kiểm toán viên",
    "Internal Auditor": "Kiểm toán viên Nội bộ",
    "Budget Analyst": "Chuyên viên Ngân sách",
    "Treasury Manager": "Quản lý Ngân hàng",
    "Credit Analyst": "Chuyên viên Tín dụng",
    "Loan Officer": "Chuyên viên Tín dụng",
    "Investment Analyst": "Chuyên viên Đầu tư",
    "Risk Manager": "Quản lý Rủi ro",

    # ===== HR & Admin =====
    "HR Coordinator": "Nhân viên Nhân sự",
    "HR Specialist": "Chuyên viên Nhân sự",
    "HR Manager": "Quản lý Nhân sự",
    "HR Director": "Giám đốc Nhân sự",
    "Recruitment Specialist": "Chuyên viên Tuyển dụng",
    "Talent Acquisition Manager": "Quản lý Tuyển dụng",
    "Training Manager": "Quản lý Đào tạo",
    "Learning and Development Manager": "Quản lý Phát triển Nhân lực",
    "Compensation and Benefits Manager": "Quản lý Lương thưởng",
    "Office Administrator": "Quản lý Văn phòng",
    "Administrative Manager": "Quản lý Hành chính",
    "Receptionist": "Lễ tân",
    "Secretary": "Thư ký",
    "Executive Assistant": "Trợ lý Điều hành",
    "Personal Assistant": "Trợ lý Cá nhân",
    "Office Manager": "Quản lý Văn phòng",
    "Facilities Manager": "Quản lý Cơ sở vật chất",
    "Procurement Officer": "Nhân viên Mua sắm",

    # ===== Service Industry =====
    "Security Guard": "Bảo vệ",
    "Driver": "Lái xe / Tài xế",
    "Delivery Driver": "Người giao hàng",
    "Delivery Man": "Nhân viên Giao hàng",
    "Housekeeper": "Người giúp việc",
    "Cook": "Đầu bếp",
    "Chef": "Đầu bếp",
    "Sous Chef": "Phó Đầu bếp",
    "Waiter": "Phục vụ",
    "Waiter/Waitress": "Nhân viên Phục vụ",
    "Bartender": "Pha chế Đồ uống",
    "Barista": "Pha cà phê",
    "Cashier": "Thu ngân",
    "Store Clerk": "Nhân viên Bán hàng (Cửa hàng)",
    "Retail Associate": "Nhân viên Bán lẻ",
    "Retail Manager": "Quản lý Cửa hàng",
    "Store Manager": "Quản lý Cửa hàng",
    "Branch Manager": "Quản lý Chi nhánh",
    "Hotel Manager": "Quản lý Khách sạn",
    "Restaurant Manager": "Quản lý Nhà hàng",
    "Tour Guide": "Hướng dẫn viên Du lịch",
    "Travel Consultant": "Tư vấn Du lịch",
    "Event Coordinator": "Điều phối viên Sự kiện",
    "Event Manager": "Quản lý Sự kiện",

    # ===== Management =====
    "Team Leader": "Trưởng nhóm",
    "Supervisor": "Giám sát",
    "Section Manager": "Quản lý Bộ phận",
    "Department Manager": "Quản lý Phòng ban",
    "Project Coordinator": "Điều phối viên Dự án",
    "Program Manager": "Quản lý Chương trình",
    "Director": "Giám đốc",
    "Vice President": "Phó Giám đốc",
    "VP": "Phó Giám đốc",
    "CEO": "Giám đốc Điều hành",
    "COO": "Giám đốc Vận hành",
    "Managing Director": "Tổng Giám đốc",
    "General Manager": "Tổng Quản lý",
    "GM": "Tổng Quản lý",
    "Branch Manager": "Quản lý Chi nhánh",
    "Area Manager": "Quản lý Khu vực",
    "Regional Manager": "Quản lý Vùng",
    "Country Manager": "Quản lý Quốc gia",
    "Head of Department": "Trưởng phòng",

    # ===== Healthcare =====
    "Caregiver": "Người Chăm sóc",
    "Nurse": "Y tá",
    "Medical Assistant": "Trợ lý Y tế",
    "Pharmacist Assistant": "Trợ lý Dược sĩ",
    "Pharmacy Technician": "Kỹ thuật viên Dược",
    "Physical Therapist": "Chuyên gia Vật lý trị liệu",
    "Medical Secretary": "Thư ký Y khoa",
    "Hospital Administrator": "Quản trị Viên Bệnh viện",
    "Health Coordinator": "Điều phối viên Y tế",
    "Medical Representative": "Nhân viên Đại diện Y tế",

    # ===== Education & Training =====
    "Tutor": "Gia sư",
    "Private Tutor": "Gia sư Kèm riêng",
    "Trainer": "Huấn luyện viên",
    "Training Coordinator": "Điều phối viên Đào tạo",
    "Instructor": "Giảng viên / Người hướng dẫn",
    "Teacher": "Giáo viên",
    "Lecturer": "Giảng viên",
    "Professor": "Giáo sư",
    "Academic Advisor": "Cố vấn Học thuật",
    "Education Manager": "Quản lý Giáo dục",
    "Curriculum Developer": "Người phát triển Chương trình",
    "E-learning Specialist": "Chuyên viên Học trực tuyến",

    # ===== Engineering & Technical =====
    "Mechanical Engineer": "Kỹ sư Cơ khí",
    "Electrical Engineer": "Kỹ sư Điện",
    "Civil Engineer": "Kỹ sư Xây dựng",
    "Electronics Engineer": "Kỹ sư Điện tử",
    "Chemical Engineer": "Kỹ sư Hóa",
    "Industrial Engineer": "Kỹ sư Công nghiệp",
    "Project Engineer": "Kỹ sư Dự án",
    "Process Engineer": "Kỹ sư Quy trình",
    "Quality Engineer": "Kỹ sư Chất lượng",
    "Maintenance Engineer": "Kỹ sư Bảo trì",
    "Site Engineer": "Kỹ sư Công trường",
    "Construction Manager": "Quản lý Xây dựng",
    "Architect": "Kiến trúc sư",
    "Draftsman": "Người vẽ kỹ thuật",
    "Surveyor": "Khảo sát viên",
    "Technician": "Kỹ thuật viên",
    "Maintenance Technician": "Kỹ thuật viên Bảo trì",
    "Lab Technician": "Kỹ thuật viên Phòng thí nghiệm",

    # ===== Legal & Compliance =====
    "Legal Counsel": "Tư vấn Pháp lý",
    "Lawyer": "Luật sư",
    "Paralegal": "Trợ lý Pháp lý",
    "Compliance Officer": "Nhân viên Tuân thủ",
    "Compliance Manager": "Quản lý Tuân thủ",
    "Legal Secretary": "Thư ký Pháp lý",
    "Contract Manager": "Quản lý Hợp đồng",
    "Risk Compliance Manager": "Quản lý Rủi ro & Tuân thủ",

    # ===== Other Common Roles =====
    "Consultant": "Tư vấn viên",
    "Business Consultant": "Tư vụ viên Kinh doanh",
    "Management Consultant": "Tư vấn viên Quản lý",
    "Strategy Consultant": "Tư vấn viên Chiến lược",
    "Advisor": "Cố vấn",
    "Senior Advisor": "Cố vấn Cao cấp",
    "Coordinator": "Điều phối viên",
    "Specialist": "Chuyên viên",
    "Senior Specialist": "Chuyên viên Cao cấp",
    "Manager": "Quản lý",
    "Senior Manager": "Quản lý Cao cấp",
    "Executive": "Điều hành cấp cao",
    "Senior Executive": "Điều hành Cao cấp",
    "Associate": "Nhân viên",
    "Senior Associate": "Nhân viên Cao cấp",
    "Assistant": "Trợ lý",
    "Senior Assistant": "Trợ lý Cao cấp",
    "Clerk": "Nhân viên Văn phòng",
    "Senior Clerk": "Nhân viên Văn phòng Cao cấp",
    "Officer": "Nhân viên",
    "Senior Officer": "Nhân viên Cao cấp",
    "General Labor": "Lao động phổ thông",
    "Skilled Worker": "Công nhân kỹ thuật",
    "Freelancer": "Người làm tự do",
    "Contractor": "Nhà thầu",
    "Intern": "Thực tập sinh",
    "Trainee": "Học viên thực tập",
    "Apprentice": "Người học việc",
    "Realtor": "Môi giới Bất động sản",
    "Property Agent": "Đại lý Bất động sản",
    "Insurance Agent": "Đại lý Bảo hiểm",
    "Financial Advisor": "Tư vấn Tài chính",
    "Insurance Advisor": "Tư vấn Bảo hiểm",
    "Broker": "Môi giới",
    "Agent": "Đại lý",
    "Representative": "Đại diện",
}


# =============================================================================
# INDUSTRY TRANSLATIONS: English -> Vietnamese
# =============================================================================

INDUSTRY_TRANSLATIONS: Dict[str, str] = {
    # Technology & IT
    "technology": "Công nghệ / Tin học",
    "it": "Công nghệ Thông tin",
    "software": "Phần mềm",
    "hardware": "Phần cứng",
    "telecommunications": "Viễn thông",
    "internet": "Internet / Trực tuyến",
    "e-commerce": "Thương mại Điện tử",
    "digital": "Số hóa / Công nghệ số",

    # Retail & Commerce
    "retail": "Bán lẻ / Siêu thị",
    "wholesale": "Bán sỉ",
    "trade": "Kinh doanh / Thương mại",
    "distribution": "Phân phối",
    "import_export": "Xuất nhập khẩu",
    "trading": "Thương mại",

    # Finance & Banking
    "finance": "Tài chính",
    "banking": "Ngân hàng",
    "insurance": "Bảo hiểm",
    "investment": "Đầu tư",
    "securities": "Chứng khoán",
    "accounting": "Kế toán / Kiểm toán",
    "fintech": "Công nghệ Tài chính",

    # Manufacturing & Industry
    "manufacturing": "Sản xuất / Công nghiệp",
    "industrial": "Công nghiệp",
    "production": "Sản xuất",
    "assembly": "Lắp ráp",
    "textile": "Dệt may",
    "garment": "May mặc",
    "fashion": "Thời trang",
    "footwear": "Giày da",
    "food_processing": "Chế biến Thực phẩm",
    "beverage": "Đồ uống",
    "agriculture": "Nông nghiệp",
    "farming": "Nông trại",
    "aquaculture": "Nuôi trồng Thủy sản",
    "forestry": "Lâm nghiệp",
    "rubber": "Cao su",
    "chemical": "Hóa chất",
    "pharmaceutical": "Dược phẩm",
    "plastic": "Nhựa",
    "metal": "Kim loại",
    "steel": "Thép",
    "automotive": "Ô tô",
    "automobile": "Ô tô",
    "electronics": "Điện tử",
    "electrical": "Điện",

    # Construction & Real Estate
    "construction": "Xây dựng",
    "real_estate": "Bất động sản",
    "property": "Bất động sản",
    "architecture": "Kiến trúc",
    "interior_design": "Thiết kế Nội thất",
    "engineering": "Kỹ thuật",

    # Logistics & Transportation
    "logistics": "Vận tải / Logistics",
    "transportation": "Giao thông Vận tải",
    "shipping": "Vận chuyển / Đóng tàu",
    "freight": "Vận tải Hàng hóa",
    "warehousing": "Kho bãi",
    "supply_chain": "Chuỗi Cung ứng",

    # Education & Training
    "education": "Giáo dục / Đào tạo",
    "training": "Đào tạo",
    "e_learning": "Học trực tuyến",
    "edtech": "Công nghệ Giáo dục",
    "coaching": "Huấn luyện",

    # Healthcare
    "healthcare": "Y tế / Chăm sóc Sức khỏe",
    "medical": "Y tế",
    "pharmaceutical": "Dược phẩm",
    "hospital": "Bệnh viện",
    "clinic": "Phòng khám",
    "nursing": "Điều dưỡng",
    "beauty": "Làm đẹp / Spa",
    "wellness": "Sức khỏe / Thể hình",

    # Hospitality & Tourism
    "hospitality": "Khách sạn / Du lịch",
    "hotel": "Khách sạn",
    "tourism": "Du lịch",
    "travel": "Du lịch / Lữ hành",
    "restaurant": "Nhà hàng",
    "food_service": "Dịch vụ Ăn uống",
    "catering": "Nấu ăn / Tiệc",
    "entertainment": "Giải trí",
    "leisure": "Giải trí / Nghỉ dưỡng",
    "recreation": "Giải trí",

    # Media & Marketing
    "marketing": "Marketing / Quảng cáo",
    "advertising": "Quảng cáo",
    "media": "Truyền thông",
    "publishing": "Xuất bản",
    "broadcasting": "Phát sóng",
    "pr": "Quan hệ Công chúng (PR)",
    "creative": "Sáng tạo / Thiết kế",

    # Business Services
    "consulting": "Tư vấn",
    "professional_services": "Dịch vụ Chuyên nghiệp",
    "outsourcing": "Outsourcing / Thuê ngoài",
    "bpo": "Dịch vụ Quy trình",
    "recruitment": "Tuyển dụng",
    "hr_services": "Dịch vụ Nhân sự",
    "legal_services": "Dịch vụ Pháp lý",
    "security_services": "Dịch vụ Bảo vệ",
    "cleaning_services": "Dịch vụ Vệ sinh",
    "facility_management": "Quản lý Cơ sở vật chất",

    # Government & Non-profit
    "government": "Nhà nước / Công",
    "public_sector": "Nhà nước",
    "non_profit": "Phi lợi nhuận",
    "ngo": "Tổ chức Phi chính phủ",
    "social_services": "Dịch vụ Xã hội",
    "education_government": "Giáo dục Nhà nước",

    # Energy & Environment
    "energy": "Năng lượng",
    "oil_gas": "Dầu khí",
    "petroleum": "Dầu mỏ",
    "renewable_energy": "Năng lượng Tái tạo",
    "environmental": "Môi trường",
    "waste_management": "Quản lý Chất thải",
    "water": "Cấp nước / Thủy lợi",
    "mining": "Khai khoáng",
    "geology": "Địa chất",

    # Other
    "real_estate_development": "Phát triển Bất động sản",
    "property_management": "Quản lý Bất động sản",
    "automotive_services": "Dịch vụ Ô tô",
    "repair_maintenance": "Sửa chữa / Bảo trì",
    "beauty_services": "Dịch vụ Làm đẹp",
    "personal_services": "Dịch vụ Cá nhân",
    "laundry": "Giặt ủi",
    "dry_cleaning": "Giặt khô",
    "retail_services": "Dịch vụ Bán lẻ",
    "franchise": "Nhượng quyền Thương mại",
    "import": "Nhập khẩu",
    "export": "Xuất khẩu",
    "trading_company": "Công ty Thương mại",
    "agency": "Đại lý",
    "service": "Dịch vụ",
    "other": "Khác",
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, remove extra spaces)."""
    if not text:
        return ""
    return text.lower().strip()


def _fuzzy_match(query: str, dictionary: Dict[str, str], threshold: float = 0.7) -> Optional[str]:
    """
    Try to find a fuzzy match for the query in the dictionary.

    Args:
        query: Text to match
        dictionary: Translation dictionary
        threshold: Match threshold (0-1)

    Returns:
        Vietnamese translation if found, None otherwise
    """
    if not query:
        return None

    query_lower = _normalize_text(query)

    # 1. Exact match (case-insensitive)
    for key, value in dictionary.items():
        if _normalize_text(key) == query_lower:
            return value

    # 2. Partial match - query contains key or key contains query
    for key, value in dictionary.items():
        key_lower = _normalize_text(key)
        if key_lower in query_lower or query_lower in key_lower:
            return value

    # 3. Word overlap match
    query_words = set(query_lower.split())
    for key, value in dictionary.items():
        key_words = set(_normalize_text(key).split())
        overlap = len(query_words & key_words)
        if overlap >= 1 and len(key_words) <= 4:
            # High confidence if single word matches
            if len(key_words) == 1 and overlap == 1:
                return value

    return None


def translate_job_title(title: str) -> str:
    """
    Translate a job title from English to Vietnamese.

    Args:
        title: English job title

    Returns:
        Vietnamese translation, or original if not found
    """
    if not title:
        return title

    # Direct lookup
    if title in JOB_TITLE_TRANSLATIONS:
        return JOB_TITLE_TRANSLATIONS[title]

    # Try fuzzy match
    translation = _fuzzy_match(title, JOB_TITLE_TRANSLATIONS)
    if translation:
        logger.debug(f"Translated '{title}' -> '{translation}' (fuzzy)")
        return translation

    # Return original if not found
    logger.debug(f"No translation found for: {title}")
    return title


def translate_industry(industry: str) -> str:
    """
    Translate an industry name from English to Vietnamese.

    Args:
        industry: English industry name

    Returns:
        Vietnamese translation, or original if not found
    """
    if not industry:
        return industry

    # Direct lookup
    if industry in INDUSTRY_TRANSLATIONS:
        return INDUSTRY_TRANSLATIONS[industry]

    # Try fuzzy match
    translation = _fuzzy_match(industry, INDUSTRY_TRANSLATIONS)
    if translation:
        logger.debug(f"Translated industry '{industry}' -> '{translation}' (fuzzy)")
        return translation

    return industry


def translate_list(items: List[str], translation_func) -> List[str]:
    """
    Translate a list of items using the given translation function.

    Args:
        items: List of strings to translate
        translation_func: Function to use for translation

    Returns:
        List of translated strings
    """
    return [translation_func(item) for item in items]


def translate_job_recommendations(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Translate all job titles and industries in a job recommendation response.

    This function recursively processes the recommendation data structure
    and translates any job titles or industry names found.

    Args:
        data: Response data from LLM containing best_fits, income_boost, progression

    Returns:
        Data with translated job titles and industries
    """
    if not data:
        return data

    result = data.copy()

    # List of keys that contain job recommendations
    recommendation_keys = ["best_fits", "income_boost", "progression"]

    for key in recommendation_keys:
        if key in result and isinstance(result[key], list):
            result[key] = [
                _translate_recommendation_item(item) for item in result[key]
            ]

    return result


def _translate_recommendation_item(item: Any) -> Any:
    """
    Translate a single recommendation item.

    Handles both dict and string items.
    """
    if isinstance(item, str):
        # If it's a string, try to translate as job title
        return translate_job_title(item)

    if isinstance(item, dict):
        translated = item.copy()

        # Translate job_title if present
        if "job_title" in translated:
            translated["job_title"] = translate_job_title(translated["job_title"])

        # Translate from/to for career transitions
        if "from" in translated:
            translated["from"] = translate_job_title(translated["from"])
        if "to" in translated:
            translated["to"] = translate_job_title(translated["to"])

        # Translate industry if present
        if "industry" in translated:
            translated["industry"] = translate_industry(translated["industry"])
        if "target_industry" in translated:
            translated["target_industry"] = translate_industry(translated["target_industry"])

        # Translate learning_path items if present
        if "learning_path" in translated and isinstance(translated["learning_path"], list):
            translated["learning_path"] = [
                translate_learning_resource(item) for item in translated["learning_path"]
            ]

        # Translate recommendations list
        if "recommendations" in translated and isinstance(translated["recommendations"], list):
            translated["recommendations"] = [
                translate_job_title(rec) if isinstance(rec, str) else rec
                for rec in translated["recommendations"]
            ]

        # Translate skills if present
        if "required_skills" in translated and isinstance(translated["required_skills"], list):
            pass  # Skills are usually not translated

        return translated

    return item


def translate_learning_resource(resource: str) -> str:
    """
    Translate a learning resource/course name.

    Learning resources often have mixed English/Vietnamese names,
    so this function tries to make them more readable.
    """
    if not resource:
        return resource

    # Common patterns for learning resources
    # These are typically course names that should be kept mostly in English

    # Return as-is if it looks like a proper noun or acronym
    if resource.isupper() or len(resource) <= 3:
        return resource

    return resource


# =============================================================================
# BATCH TRANSLATION
# =============================================================================

def translate_text_field(value: str, field_type: str = "job_title") -> str:
    """
    Translate a text field based on its type.

    Args:
        value: Text to translate
        field_type: Type of field ("job_title", "industry", or "other")

    Returns:
        Translated text
    """
    if field_type == "job_title":
        return translate_job_title(value)
    elif field_type == "industry":
        return translate_industry(value)
    else:
        return value


# =============================================================================
# SUMMARY STATISTICS
# =============================================================================

def get_translation_stats() -> Dict[str, int]:
    """
    Get statistics about available translations.

    Returns:
        Dictionary with counts of job titles and industries
    """
    return {
        "job_titles": len(JOB_TITLE_TRANSLATIONS),
        "industries": len(INDUSTRY_TRANSLATIONS),
        "total": len(JOB_TITLE_TRANSLATIONS) + len(INDUSTRY_TRANSLATIONS)
    }
