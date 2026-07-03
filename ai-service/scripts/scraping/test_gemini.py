import sys
import json
import logging
from pathlib import Path

# Add ai-service to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from config.gemini_client import GeminiClient

logging.basicConfig(level=logging.INFO)

def test_gemini():
    print("Khởi tạo Gemini Client...")
    client = GeminiClient()
    
    if not client.available:
        print("❌ LỖI: Gemini Client không sẵn sàng. Hãy kiểm tra lại GEMINI_API_KEY trong file .env")
        return
        
    print("✅ Gemini Client khởi tạo thành công!")
    print("Đang test gọi API...")
    
    test_prompt = """
Bạn là AI phân tích dữ liệu tuyển dụng.
Trích xuất JSON từ mô tả công việc sau:
"Cần tuyển nam bảo vệ dưới 50 tuổi. Công việc nhàn hạ, ngồi trực bốt, thi thoảng đi tuần. Làm ca ngày không trực đêm."

Yêu cầu trả về JSON gồm:
1. age_preference: (ví dụ: "<50")
2. labor_intensity: ("nhẹ", "trung_binh", "nặng")
3. suitable_for_family_barrier: (true/false)
"""
    
    result = client.generate_json(test_prompt)
    if result:
        print("\n✅ KẾT QUẢ TỪ GEMINI (JSON):")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("\n❌ LỖI: Không nhận được kết quả JSON hợp lệ từ Gemini.")

if __name__ == "__main__":
    test_gemini()
