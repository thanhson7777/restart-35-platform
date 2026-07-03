import os
import sys
import json
from pathlib import Path

def generate_informal_skills():
    """Tạo bộ kỹ năng chuyển đổi cho các nghề phi chính thức (Hardcoded dictionary)"""
    informal_taxonomy = {
        "bán hàng rong": {
            "title": "Bán hàng rong",
            "skills": ["giao tiếp", "tính toán", "thuyết phục khách hàng", "sức khỏe tốt", "chịu áp lực", "quản lý tiền lẻ", "bán hàng"]
        },
        "xe ôm truyền thống": {
            "title": "Xe ôm truyền thống",
            "skills": ["lái xe máy", "thuộc đường", "giao tiếp", "sức khỏe tốt", "quản lý thời gian", "bảo dưỡng xe cơ bản"]
        },
        "giúp việc nhà": {
            "title": "Giúp việc nhà",
            "skills": ["dọn dẹp vệ sinh", "nấu ăn", "chăm sóc trẻ em", "chăm sóc người già", "cẩn thận", "quản lý thời gian", "sắp xếp đồ đạc"]
        },
        "thợ mộc truyền thống": {
            "title": "Thợ mộc truyền thống",
            "skills": ["chế tác gỗ", "sử dụng dụng cụ cầm tay", "đọc bản vẽ cơ bản", "đo lường", "cẩn thận", "sức khỏe tốt"]
        },
        "thợ may gia công": {
            "title": "Thợ may gia công",
            "skills": ["sử dụng máy may", "cắt may", "khâu vá", "kiểm tra chất lượng", "cẩn thận", "làm việc nhóm", "chịu áp lực"]
        },
        "bốc vác": {
            "title": "Bốc vác",
            "skills": ["sức khỏe tốt", "khuân vác", "sắp xếp hàng hóa", "làm việc nhóm", "chịu áp lực", "tuân thủ an toàn lao động"]
        },
        "bán vé số": {
            "title": "Bán vé số",
            "skills": ["giao tiếp", "tính toán", "thuyết phục khách hàng", "sức khỏe tốt", "chịu khó", "kiên nhẫn"]
        },
        "thợ hồ": {
            "title": "Thợ hồ / Phụ hồ",
            "skills": ["xây dựng", "trộn hồ", "khuân vác", "sức khỏe tốt", "sử dụng dụng cụ xây dựng", "làm việc nhóm", "tuân thủ an toàn"]
        },
        "thu mua phế liệu": {
            "title": "Thu mua phế liệu",
            "skills": ["phân loại rác", "định giá cơ bản", "thương lượng", "lái xe", "sức khỏe tốt", "tính toán"]
        },
        "thợ cắt tóc vỉa hè": {
            "title": "Thợ cắt tóc vỉa hè",
            "skills": ["cắt tóc", "giao tiếp", "làm đẹp", "sử dụng kéo", "chăm sóc khách hàng"]
        },
        "nông dân": {
            "title": "Nông dân",
            "skills": ["trồng trọt", "chăn nuôi", "sử dụng máy nông nghiệp", "sức khỏe tốt", "quản lý mùa vụ", "kiên nhẫn"]
        }
    }
    
    print(f"✅ Đã tạo bộ từ điển cho {len(informal_taxonomy)} nghề phi chính thức!")
        
    # --- MERGE WITH LOCAL TAXONOMY ---
    base_dir = Path(__file__).parent.parent.parent
    local_tax_file = base_dir / "data" / "local_taxonomy.json"
    vietnam_tax_file = base_dir / "data" / "vietnam_taxonomy.json"
    
    vietnam_taxonomy = {}
    
    # Load local taxonomy if exists
    if local_tax_file.exists():
        with open(local_tax_file, 'r', encoding='utf-8') as f:
            local_taxonomy = json.load(f)
            vietnam_taxonomy.update(local_taxonomy)
            print(f"📥 Đã gộp {len(local_taxonomy)} nghề từ Local Taxonomy (Jobs cào được).")
            
    # Hợp nhất với informal taxonomy
    vietnam_taxonomy.update(informal_taxonomy)
    
    # Lưu ra file cuối cùng
    with open(vietnam_tax_file, 'w', encoding='utf-8') as f:
        json.dump(vietnam_taxonomy, f, ensure_ascii=False, indent=2)
        
    print(f"💾 Đã lưu bộ từ điển tổng hợp (Vietnam Taxonomy) với {len(vietnam_taxonomy)} ngành nghề tại: {vietnam_tax_file}")

if __name__ == "__main__":
    generate_informal_skills()
