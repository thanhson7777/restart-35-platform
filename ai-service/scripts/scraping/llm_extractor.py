import json
import logging
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent dir to path to import config
sys.path.append(str(Path(__file__).parent.parent.parent))

from config.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

class LLMExtractor:
    """
    Sử dụng LLM (Google Gemini Pro/Flash) để bóc tách thông tin từ mô tả công việc.
    Đặc biệt hữu ích cho:
    - age_preference (tuổi tác)
    - labor_intensity (cường độ lao động)
    - family_barrier, health_barrier (rào cản)
    """

    def __init__(self):
        self.client = GeminiClient()

    def extract_job_info(self, description: str) -> Dict[str, Any]:
        """
        Phân tích description và trả về các thông tin ngầm định.
        
        Args:
            description: Nội dung mô tả công việc
            
        Returns:
            Dict chứa các fields đã bóc tách.
        """
        if not self.client or not description or len(description.strip()) < 50:
            return {}

        prompt = f"""
Bạn là một chuyên gia phân tích dữ liệu tuyển dụng.
Nhiệm vụ của bạn là đọc mô tả công việc dưới đây và trích xuất các thông tin sau thành định dạng JSON.

Thông tin cần trích xuất:
1. age_preference: Giới hạn độ tuổi. Nếu có đề cập, hãy trả về dạng string như "<35", "<40", "<45", "<50", "<55". Nếu không đề cập hoặc ghi "không giới hạn", trả về "any".
2. labor_intensity: Cường độ lao động. Phân loại thành "nhẹ" (ngồi máy lạnh, văn phòng), "trung_binh" (đi lại vừa phải, bán hàng), hoặc "nặng" (bốc vác, phụ hồ, đứng liên tục ngoài trời).
3. suitable_for_family_barrier: boolean. Trả về false nếu công việc yêu cầu làm ca đêm, đi công tác xa thường xuyên, tăng ca liên tục. Trả về true nếu làm giờ hành chính hoặc linh hoạt.
4. suitable_for_health_issues: boolean. Trả về false nếu công việc đòi hỏi sức khoẻ tốt, khuân vác nặng, đứng lâu. Trả về true nếu công việc nhẹ nhàng.

Mô tả công việc:
"{description[:1500]}"

Trả về DUY NHẤT một JSON object với 4 keys trên. Không kèm bất kỳ giải thích nào khác.
"""
        
        try:
            # GeminiClient already has parsing logic for generate_json
            result = self.client.generate_json(prompt)
            if result:
                return result
            return {}
        except Exception as e:
            logger.error(f"[LLMExtractor] Error extracting job info with Gemini: {e}")
            return {}

# Singleton instance
llm_extractor = LLMExtractor()
