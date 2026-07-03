import pandas as pd
import json
import re
from collections import Counter
from pathlib import Path
import ast
import os
import sys

# Thêm thư mục gốc vào path để import được các module khác nếu cần
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def clean_job_title(title):
    """Làm sạch tiêu đề để gom cụm dễ dàng hơn"""
    if pd.isna(title):
        return ""
    
    title = str(title).lower().strip()
    # Xóa các từ chỉ địa điểm thường gặp
    locations = ["tại tphcm", "tp hcm", "hcm", "hà nội", "đà nẵng", "bình dương", "đồng nai", "quận 1", "quận 2", "q1", "q2", "q."]
    for loc in locations:
        title = title.replace(loc, "")
    
    # Xóa số lượng tuyển, ví dụ "tuyển 10", "(lương 10tr)"
    title = re.sub(r'tuyển\s+\d+', '', title)
    title = re.sub(r'\(.*?\)', '', title)
    title = re.sub(r'\[.*?\]', '', title)
    
    # Xóa các ký tự đặc biệt
    title = re.sub(r'[^\w\s]', ' ', title)
    
    # Rút gọn khoảng trắng
    title = ' '.join(title.split())
    
    # Mapping một số từ khóa phổ biến về chung một cụm
    if "bảo vệ" in title: return "bảo vệ"
    if "bán hàng" in title or "sales" in title or "nhân viên kinh doanh" in title: return "nhân viên bán hàng"
    if "tài xế" in title or "lái xe" in title: return "tài xế lái xe"
    if "phục vụ" in title or "chạy bàn" in title: return "nhân viên phục vụ"
    if "pha chế" in title or "barista" in title: return "nhân viên pha chế"
    if "kế toán" in title: return "kế toán"
    if "công nhân" in title or "lao động phổ thông" in title or "lđpt" in title: return "lao động phổ thông"
    if "giao hàng" in title or "shipper" in title: return "nhân viên giao hàng"
    if "tạp vụ" in title or "giúp việc" in title: return "tạp vụ / giúp việc"
    if "lễ tân" in title: return "lễ tân"
    if "chăm sóc khách hàng" in title or "cskh" in title or "telesale" in title: return "chăm sóc khách hàng"
    if "kho" in title or "thủ kho" in title: return "nhân viên kho"
    if "thợ" in title: return "thợ kỹ thuật / thủ công"
    
    return title

def extract_skills(skills_str):
    """Trích xuất list kỹ năng từ chuỗi"""
    if pd.isna(skills_str):
        return []
    
    if isinstance(skills_str, list):
        return skills_str
        
    try:
        # Xử lý trường hợp là string dạng "[...]"
        if skills_str.startswith('['):
            skills = ast.literal_eval(skills_str)
            return [str(s).lower().strip() for s in skills if s]
    except:
        pass
        
    # Xử lý chuỗi thông thường phân tách bằng pipe
    return [s.lower().strip() for s in str(skills_str).split('|') if s.strip()]

def build_taxonomy(csv_path="data/jobs.csv", output_path="data/local_taxonomy.json"):
    print(f"🔄 Đang đọc dữ liệu từ {csv_path}...")
    
    # Lấy đường dẫn tuyệt đối
    base_dir = Path(__file__).parent.parent.parent
    csv_file = base_dir / csv_path
    out_file = base_dir / output_path
    
    if not csv_file.exists():
        print(f"❌ Không tìm thấy file: {csv_file}")
        return
        
    df = pd.read_csv(csv_file)
    print(f"✅ Đã tải {len(df)} công việc.")
    
    # Làm sạch tiêu đề (Tạo cụm nghề nghiệp)
    df['occupation'] = df['title'].apply(clean_job_title)
    
    # Trích xuất kỹ năng
    df['parsed_skills'] = df['skills'].apply(extract_skills)
    
    # Lọc bỏ các công việc không có occupation rõ ràng
    df = df[df['occupation'].str.len() > 3]
    
    print("🔄 Đang thống kê kỹ năng cho từng nhóm nghề...")
    
    taxonomy = {}
    
    # Nhóm theo occupation
    for occ, group in df.groupby('occupation'):
        if len(group) < 5:  # Chỉ lấy những nghề có ít nhất 5 tin tuyển dụng
            continue
            
        all_skills = []
        for skills in group['parsed_skills']:
            all_skills.extend(skills)
            
        if not all_skills:
            continue
            
        # Đếm tần suất
        skill_counts = Counter(all_skills)
        # Lọc bỏ các kỹ năng quá ngắn hoặc vô nghĩa
        valid_skills = [(skill, count) for skill, count in skill_counts.most_common(30) if len(skill) > 2]
        
        # Lấy top 20 kỹ năng phổ biến nhất
        top_skills = [skill for skill, count in valid_skills[:20]]
        
        if top_skills:
            taxonomy[occ] = {
                "title": occ.capitalize(),
                "sample_count": len(group),
                "skills": top_skills
            }
    
    # Sắp xếp theo số lượng sample giảm dần
    sorted_taxonomy = {k: v for k, v in sorted(taxonomy.items(), key=lambda item: item[1]['sample_count'], reverse=True)}
    
    print(f"✅ Đã trích xuất thành công {len(sorted_taxonomy)} cụm nghề nghiệp.")
    
    # In thử top 5
    print("\n--- TOP 5 NGÀNH NGHỀ PHỔ BIẾN NHẤT ---")
    for i, (occ, data) in enumerate(list(sorted_taxonomy.items())[:5]):
        print(f"{i+1}. {data['title']} (từ {data['sample_count']} tin tuyển dụng)")
        print(f"   Kỹ năng: {', '.join(data['skills'][:7])}...")
        
    # Lưu ra file JSON
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_taxonomy, f, ensure_ascii=False, indent=2)
        
    print(f"\n💾 Đã lưu kết quả tại: {out_file}")
    return sorted_taxonomy

if __name__ == "__main__":
    build_taxonomy()
