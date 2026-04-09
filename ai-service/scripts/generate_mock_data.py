"""
Script để tạo mock data cho AI Service
- jobs.csv: 500 job records
- workers.csv: 1000 worker records
"""

import csv
import random
from pathlib import Path

# Đường dẫn output
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ============================================================
# DỮ LIỆU MẪU CHO VIỆT NAM
# ============================================================

VIETNAM_PROVINCES = [
    "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng",
    "Biên Hòa", "Nha Trang", "Huế", "Buôn Ma Thuột", "Qui Nhơn",
    "Vũng Tàu", "Thanh Hóa", "Vinhy", "Bình Dương", "Đà Lạt",
    "Hải Dương", "Thái Nguyên", "Nam Định", "Vĩnh Phúc", "Bắc Ninh"
]

JOB_TYPES = ["full-time", "part-time", "temporary", "freelance"]

AGE_PREFERENCES = ["any", "<40", "<45", "<50", "<55"]

EDUCATION_LEVELS = [
    "none", "primary", "middle", "high", "vocational", "college", "university"
]

MARITAL_STATUSES = ["single", "married", "divorced", "widowed"]

BARRIERS = ["health", "family", "techGap", "location", "other"]

GENDERS = ["male", "female", "other"]

# ============================================================
# NGÀNH NGHỀ VÀ SKILLS TƯƠNG ỨNG
# ============================================================

JOB_CATEGORIES = {
    "Nhân viên phục vụ": {
        "skills": ["Phục vụ bàn", "Pha chế đồ uống", "Nấu ăn", "Trang trí món ăn", "Vệ sinh an toàn thực phẩm"],
        "salary_range": (4500000, 8000000)
    },
    "Nhân viên bán hàng": {
        "skills": ["Bán hàng", "Thu ngân", "Kế toán", "Nhập liệu", "Chăm sóc khách hàng"],
        "salary_range": (5000000, 9000000)
    },
    "Công nhân sản xuất": {
        "skills": ["May mặc", "Lắp ráp", "Đóng gói", "Vận hành máy móc", "Kiểm tra chất lượng"],
        "salary_range": (5500000, 10000000)
    },
    "Lao động xây dựng": {
        "skills": ["Xây dựng", "Sơn sửa nhà", "Điện nước", "Lắp đặt", "Trộn vữa"],
        "salary_range": (6000000, 12000000)
    },
    "Lái xe": {
        "skills": ["Lái xe", "Giao hàng", "Kho vận", "Bảo dưỡng xe", "Đọc bản đồ"],
        "salary_range": (6000000, 11000000)
    },
    "Nhân viên kho vận": {
        "skills": ["Kho vận", "Giao hàng", "Nhập liệu", "Kiểm kê", "Sắp xếp hàng hóa"],
        "salary_range": (5000000, 9000000)
    },
    "Nông dân / Nông nghiệp": {
        "skills": ["Trồng trọt", "Chăn nuôi", "Chế biến thực phẩm", "Bán hàng nông sản", "Sử dụng máy nông nghiệp"],
        "salary_range": (4000000, 8000000)
    },
    "Giúp việc / Dịch vụ": {
        "skills": ["Giặt ủi", "Dọn dẹp", "Chăm sóc người già", "Giữ trẻ", "Nấu ăn"],
        "salary_range": (4000000, 7500000)
    },
    "Bảo vệ": {
        "skills": ["Bảo vệ", "Giao tiếp", "Chịu áp lực", "Làm việc nhóm", "PCCC"],
        "salary_range": (5000000, 8500000)
    },
    "Thợ lành nghề": {
        "skills": ["Điện nước", "Sơn sửa nhà", "Lắp đặt", "Sửa chữa", "Đọc bản vẽ"],
        "salary_range": (7000000, 15000000)
    },
    "Pha chế": {
        "skills": ["Pha chế đồ uống", "Bartender", "Phục vụ bàn", "Kế toán", "Chăm sóc khách hàng"],
        "salary_range": (5000000, 9000000)
    },
    "Kế toán / Hành chính": {
        "skills": ["Kế toán", "Nhập liệu", "Bán hàng", "Chăm sóc khách hàng", "Quản lý thời gian"],
        "salary_range": (5500000, 10000000)
    }
}

COMPANY_PREFIXES = [
    "Công ty TNHH", "Công ty CP", "Doanh nghiệp tư nhân", "HTX", "Nhà hàng", "Quán ăn",
    "Trung tâm", "Siêu thị", "Cửa hàng", "Xưởng sản xuất", "Trang trại", "Hợp tác xã"
]

COMPANY_NAMES = [
    "Minh Châu", "Phú Thọ", "Hùng Vương", "Bình Minh", "Tân Á", "Việt Tiến",
    "Phúc An", "Hồng Phát", "Nam Phát", "Thanh Bình", "Đông Á", "Vạn Phúc",
    "Hòa Bình", "Phú Hưng", "Trung Sơn", "Hồng Thịnh", "Bắc Việt", "Nam Việt",
    "Đại Phát", "Thịnh Vượng", "Phú Quốc", "Cường Thịnh", "An Khang", "Hoàng Gia"
]

# ============================================================
# TẠO JOBS.CSV (500 records)
# ============================================================

def generate_jobs_csv(num_jobs=500):
    """Tạo file jobs.csv với num_jobs records"""
    filepath = DATA_DIR / "jobs.csv"

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Header
        writer.writerow([
            'id', 'title', 'company', 'skills', 'location',
            'salary_min', 'salary_max', 'type', 'age_preference',
            'experience_required', 'education_required', 'description'
        ])

        for i in range(1, num_jobs + 1):
            job_id = f"job_{i:04d}"

            # Chọn ngẫu nhiên ngành nghề
            title = random.choice(list(JOB_CATEGORIES.keys()))
            category = JOB_CATEGORIES[title]

            # Company
            prefix = random.choice(COMPANY_PREFIXES)
            name = random.choice(COMPANY_NAMES)
            company = f"{prefix} {name}"

            # Skills (chọn 2-4 skills từ danh sách)
            num_skills = random.randint(2, 4)
            skills = random.sample(category["skills"], min(num_skills, len(category["skills"])))
            skills_str = "|".join(skills)

            # Location
            location = random.choice(VIETNAM_PROVINCES)

            # Salary
            salary_min, salary_max = category["salary_range"]
            salary_min += random.randint(-500000, 500000)
            salary_max += random.randint(-500000, 1000000)
            if salary_min > salary_max:
                salary_min, salary_max = salary_max, salary_min

            # Job type
            job_type = random.choice(JOB_TYPES)

            # Age preference
            age_pref = random.choice(AGE_PREFERENCES)

            # Experience required
            exp_required = random.randint(0, 10)

            # Education required
            edu_required = random.choice(EDUCATION_LEVELS)

            # Description
            desc_templates = [
                f"Tuyển dụng {title} cho {company} tại {location}.",
                f"{company} cần tuyển {title}. Môi trường làm việc chuyên nghiệp.",
                f"{title} - {company}. Địa điểm làm việc: {location}.",
                f"Cần tuyển gấp {title} cho {company}."
            ]
            description = random.choice(desc_templates)

            writer.writerow([
                job_id, title, company, skills_str, location,
                salary_min, salary_max, job_type, age_pref,
                exp_required, edu_required, description
            ])

    print(f"✅ Đã tạo {num_jobs} jobs tại: {filepath}")
    return filepath


# ============================================================
# TẠO WORKERS.CSV (1000 records)
# ============================================================

def generate_workers_csv(num_workers=1000):
    """Tạo file workers.csv với num_workers records"""
    filepath = DATA_DIR / "workers.csv"

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Header
        writer.writerow([
            'id', 'age', 'gender', 'education', 'marital_status',
            'skills', 'experience_years', 'location', 'target_job',
            'barriers', 'employment_status', 'current_salary'
        ])

        for i in range(1, num_workers + 1):
            worker_id = f"worker_{i:04d}"

            # Age: 35-65
            age = random.randint(35, 65)

            # Gender
            gender = random.choice(GENDERS)

            # Education
            education = random.choice(EDUCATION_LEVELS)

            # Marital status
            marital_status = random.choice(MARITAL_STATUSES)

            # Skills - chọn 1-5 skills ngẫu nhiên từ tất cả skills
            all_skills = []
            for skills_list in JOB_CATEGORIES.values():
                all_skills.extend(skills_list)
            all_skills = list(set(all_skills))  # Remove duplicates

            num_skills = random.randint(1, 5)
            skills = random.sample(all_skills, min(num_skills, len(all_skills)))
            skills_str = "|".join(skills)

            # Experience years: 0-30 (liên quan đến tuổi)
            experience = min(30, age - 25 + random.randint(-5, 5))
            experience = max(0, experience)

            # Location
            location = random.choice(VIETNAM_PROVINCES)

            # Target job - chọn từ danh sách titles
            target_job = random.choice(list(JOB_CATEGORIES.keys()))

            # Barriers - chọn 0-3 barriers
            num_barriers = random.randint(0, 3)
            barriers = random.sample(BARRIERS, min(num_barriers, len(BARRIERS)))
            barriers_str = "|".join(barriers) if barriers else ""

            # Employment status
            employment_statuses = ["employed", "unemployed", "self-employed", "retired"]
            employment_status = random.choice(employment_statuses)

            # Current salary (có thể là 0 nếu unemployed)
            if employment_status == "unemployed":
                current_salary = 0
            else:
                current_salary = random.randint(3000000, 15000000)

            writer.writerow([
                worker_id, age, gender, education, marital_status,
                skills_str, experience, location, target_job,
                barriers_str, employment_status, current_salary
            ])

    print(f"✅ Đã tạo {num_workers} workers tại: {filepath}")
    return filepath


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=" * 50)
    print("AI Service - Mock Data Generator")
    print("=" * 50)

    jobs_file = generate_jobs_csv(500)
    workers_file = generate_workers_csv(1000)

    print("\n🎉 Hoàn thành! Các file đã được tạo:")
    print(f"  - {jobs_file}")
    print(f"  - {workers_file}")
