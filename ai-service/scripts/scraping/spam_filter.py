# -*- coding: utf-8 -*-
"""
Spam Filter - Bộ lọc lừa đảo tuyển dụng 3 cấp độ
Dành riêng cho lứa tuổi 35+, bảo vệ khỏi các bẫy "việc nhẹ lương cao"
"""

import re
import logging
from typing import Dict, Any, Tuple
import sys
from pathlib import Path

# Add parent directory to path to import gemini client
sys.path.append(str(Path(__file__).parent.parent.parent))
from config.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

class SpamFilter:
    def __init__(self):
        self.gemini_client = GeminiClient()
        
        # Cấp 1: Các từ khóa đen (Blacklist)
        self.blacklist_patterns = [
            r"việc nhẹ lương cao",
            r"chỉ cần ngồi bấm điện thoại",
            r"app kiếm tiền",
            r"xem video kiếm tiền",
            r"click quảng cáo",
            r"không cần bỏ vốn",
            r"thu nhập thụ động",
            r"làm giàu nhanh",
            r"hoa hồng khủng",
            r"cam kết thu nhập",
            r"không cọc",
            r"không phí",
            r"ib zalo",
            r"inbox zalo",
            r"đăng ký nhận tiền"
        ]
        
        # Biên dịch regex sẵn để tối ưu tốc độ
        self.compiled_blacklist = [re.compile(pattern, re.IGNORECASE) for pattern in self.blacklist_patterns]

    def check_spam(self, job_data: Dict[str, Any]) -> Tuple[bool, str, str]:
        """
        Kiểm tra tin tuyển dụng có phải lừa đảo không.
        Returns:
            (is_spam: bool, reason: str, tier_caught: str)
        """
        title = str(job_data.get('title', '')).lower()
        desc = str(job_data.get('description', '')).lower()
        content = f"{title} {desc}"
        
        # ---------------------------------------------------------
        # TIER 1: KEYWORD BLACKLIST (Quy tắc từ khóa cứng)
        # ---------------------------------------------------------
        for pattern in self.compiled_blacklist:
            if pattern.search(content):
                match = pattern.search(content).group()
                return True, f"Chứa từ khóa lừa đảo đa cấp/mạng: '{match}'", "Tier1_Keyword"
                
        # ---------------------------------------------------------
        # TIER 2: LOGIC ANOMALIES (Bất thường về logic)
        # ---------------------------------------------------------
        salary_min = job_data.get('salary_min', 0)
        salary_max = job_data.get('salary_max', 0)
        
        # Cảnh báo 1: Lương quá cao cho lao động phổ thông mà không yêu cầu kinh nghiệm
        # Lao động phổ thông thường khó vượt quá 15-20 triệu
        job_type = str(job_data.get('type', '')).lower()
        exp_req = job_data.get('experience_required', 0)
        
        if any(keyword in title for keyword in ['tạp vụ', 'lao động phổ thông', 'lđpt', 'giúp việc']):
            if salary_min > 20_000_000 or salary_max > 25_000_000:
                return True, "Mức lương ảo (>20 triệu) cho công việc phổ thông", "Tier2_Logic"
                
        # Cảnh báo 2: Khoảng lương ảo (Ví dụ 10 triệu - 50 triệu)
        if salary_min > 0 and salary_max > 0 and (salary_max / salary_min > 4):
            # Chỉ check nếu min > 5tr
            if salary_min >= 5_000_000:
                return True, "Biên độ lương quá lớn, dấu hiệu chim mồi (mồi nhử)", "Tier2_Logic"
                
        # Cảnh báo 3: Thiếu thông tin công ty rõ ràng + đòi liên hệ cá nhân
        company = str(job_data.get('company', '')).lower()
        if not company or len(company) < 5 or any(k in company for k in ['chị ', 'anh ', 'cô ', 'chú ']):
            if 'zalo' in content or re.search(r'\d{10}', content):
                return True, "Tên công ty mập mờ và yêu cầu liên hệ Zalo cá nhân", "Tier2_Logic"

        # ---------------------------------------------------------
        # TIER 3: AI ANALYSIS (Chỉ chạy cho những ca đáng ngờ nhẹ)
        # ---------------------------------------------------------
        # Chúng ta dùng Regex đếm Emoji hoặc icon bất thường (🚀🔥💰)
        emoji_count = len(re.findall(r'[🚀🔥💰💸💎💵💳]', content))
        if emoji_count >= 3:
            # Gửi qua Gemini nếu có Gemini
            if self.gemini_client.available:
                prompt = f"""
Bạn là chuyên gia an toàn thông tin nhân sự. 
Hãy chấm điểm mức độ lừa đảo của tin tuyển dụng sau từ 1-10 (10 là chắc chắn lừa đảo).
Các đặc điểm lừa đảo: đa cấp, lùa gà, dụ nạp tiền, việc nhẹ lương cao ảo.
Nếu điểm >= 7, coi là lừa đảo.

Tin tuyển dụng:
Tiêu đề: {title}
Công ty: {company}
Mô tả: {desc}

Trả về JSON chính xác:
{{
  "is_spam": true/false,
  "reason": "lý do ngắn gọn nếu là spam"
}}
"""
                try:
                    result = self.gemini_client.generate_json(prompt)
                    if result and result.get('is_spam', False):
                        reason = result.get('reason', 'AI đánh giá là lừa đảo')
                        return True, reason, "Tier3_AI"
                except Exception as e:
                    logger.error(f"Lỗi khi check spam qua AI: {e}")
            else:
                # Nếu không có AI, bắt tay luôn
                return True, f"Lạm dụng biểu tượng cảm xúc (emoji={emoji_count}), dấu hiệu tin rác", "Tier3_Fallback"
                
        return False, "An toàn", "Safe"
