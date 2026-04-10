"""
Script 2: Generate Mock Data cho ML Pipeline
=============================================
Sinh dữ liệu mock chất lượng cao cho việc train ML model.

Chức năng:
- Sinh worker profiles với phân bố thực tế
- Chuẩn hóa tất cả dữ liệu (lowercase, strip)
- Barries với giá trị 0/1
- Skills đã normalized
- Đánh dấu data_source = 'mock_script'

Ưu điểm:
- Sinh trực tiếp ra CSV phẳng (không cần flatten)
- Đã chuẩn hóa dữ liệu sẵn
- Phân bố age, salary, experience theo thực tế
- Tương thích với ML pipeline

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import pandas as pd
import numpy as np
import random
from datetime import datetime
import os
import sys


# ============================================================================
# CONSTANTS & LOOKUP TABLES
# ============================================================================

# Các tỉnh/thành phố Việt Nam (theo jobs.csv)
PROVINCES = [
    'Hải Phòng', 'Nam Định', 'Thái Bình', 'Nghệ An', 'Hà Tĩnh',
    'Quảng Nam', 'Lâm Đồng', 'Đắk Lắk', 'Bình Dương', 'TP. Hồ Chí Minh',
    'Hà Nội', 'Đà Nẵng', 'Vũng Tàu', 'Bắc Ninh', 'Thanh Hóa',
    'Huế', 'Biên Hòa', 'Vinh', 'Nha Trang', 'Qui Nhơn',
    'Cần Thơ', 'Buôn Ma Thuột', 'Thái Nguyên', 'Hải Dương', 'Hà Nam',
    'Nam Định', 'Vĩnh Phúc', 'Đà Lạt'
]

# Trình độ học vấn (theo thứ tự tăng dần)
EDUCATION_LEVELS = [
    'none', 'primary', 'middle', 'high', 'vocational', 'college', 'university'
]

# Giới tính
GENDERS = ['male', 'female', 'other']
GENDER_WEIGHTS = [0.45, 0.45, 0.10]  # Nam/Nữ phổ biến hơn other

# Tình trạng hôn nhân
MARITAL_STATUS = ['single', 'married', 'divorced', 'widowed']
MARITAL_WEIGHTS = [0.25, 0.55, 0.15, 0.05]

# Employment status
EMPLOYMENT_STATUS = ['employed', 'unemployed', 'retired', 'self-employed']
EMPLOYMENT_WEIGHTS = [0.40, 0.30, 0.20, 0.10]

# Job types
JOB_TYPES = ['full-time', 'part-time', 'temporary', 'freelance']
JOB_TYPE_WEIGHTS = [0.50, 0.20, 0.15, 0.15]

# Barrier types
BARRIER_TYPES = ['health', 'family', 'techGap', 'location', 'other']

# Jobs có trong jobs.csv (target jobs)
TARGET_JOBS = [
    'Lái xe', 'Nhân viên kho vận', 'Thợ lành nghề', 'Kế toán / Hành chính',
    'Lao động xây dựng', 'Nhân viên phục vụ', 'Nông dân / Nông nghiệp',
    'Giúp việc / Dịh vụ', 'Bảo vệ', 'Nhân viên bán hàng', 'Công nhân sản xuất',
    'Pha chế'
]

# Skills phổ biến (theo jobs.csv)
ALL_SKILLS = [
    'bán hàng', 'chăm sóc khách hàng', 'kế toán', 'nhập liệu', 'thu ngân',
    'lái xe', 'đọc bản đồ', 'bảo dưỡng xe', 'giao hàng', 'kho vận', 'kiểm kê',
    'lắp đặt', 'điện nước', 'sơn sửa nhà', 'xây dựng', 'trộn vữa',
    'phục vụ bàn', 'nấu ăn', 'trang trí món ăn', 'vệ sinh an toàn thực phẩm',
    'chăn nuôi', 'trồng trọt', 'chế biến thực phẩm', 'sử dụng máy nông nghiệp',
    'chăm sóc người già', 'giặt ủi', 'bảo vệ', 'pccc', 'giao tiếp',
    'vận hành máy móc', 'đóng gói', 'lắp ráp', 'kiểm tra chất lượng', 'may mặc',
    'pha chế', 'bartender', 'pha chế đồ uống', 'đọc bản vẽ', 'sửa chữa',
    'làm việc nhóm', 'quản lý thời gian', 'bán hàng nông sản'
]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def set_seed(seed=42):
    """Set random seed for reproducibility"""
    random.seed(seed)
    np.random.seed(seed)


def weighted_choice(choices, weights):
    """Chọn ngẫu nhiên có trọng số"""
    return random.choices(choices, weights=weights, k=1)[0]


def normalize_text(text):
    """
    Chuẩn hóa text: lowercase, strip, loại bỏ khoảng trắng thừa.

    Args:
        text: String input

    Returns:
        String: Đã chuẩn hóa
    """
    if not text or not isinstance(text, str):
        return ''
    return text.lower().strip()


def generate_skills(min_count=1, max_count=4):
    """
    Sinh danh sách skills ngẫu nhiên.

    Args:
        min_count: Số skills tối thiểu
        max_count: Số skills tối đa

    Returns:
        String: Skills nối bằng '|', ví dụ: "bán hàng|lái xe|nấu ăn"
    """
    num_skills = random.randint(min_count, max_count)
    skills = random.sample(ALL_SKILLS, num_skills)

    # Chuẩn hóa từng skill
    normalized = [normalize_text(s) for s in skills]

    return '|'.join(normalized)


def generate_barriers():
    """
    Sinh barriers ngẫu nhiên với xác suất thực tế.

    Tỷ lệ có barrier:
    - health: ~15% (vì độ tuổi 35-65)
    - family: ~25% (chăm sóc gia đình)
    - techGap: ~30% (rào cản công nghệ)
    - location: ~20% (vị trí địa lý)
    - other: ~10%

    Returns:
        Dict: {'health': 0/1, 'family': 0/1, ...}
    """
    return {
        'barrier_health': 1 if random.random() < 0.15 else 0,
        'barrier_family': 1 if random.random() < 0.25 else 0,
        'barrier_techGap': 1 if random.random() < 0.30 else 0,
        'barrier_location': 1 if random.random() < 0.20 else 0,
        'barrier_other': 1 if random.random() < 0.10 else 0
    }


def generate_age():
    """
    Sinh tuổi với phân bố:
    - 35-45: 30% (trẻ nhất trong nhóm)
    - 45-55: 40% (trung niên)
    - 55-65: 30% (cao tuổi, nhiều rủi ro hơn)

    Returns:
        int: Tuổi (35-65)
    """
    rand = random.random()
    if rand < 0.30:
        return random.randint(35, 44)
    elif rand < 0.70:
        return random.randint(45, 54)
    else:
        return random.randint(55, 65)


def generate_experience_years(age):
    """
    Sinh số năm kinh nghiệm dựa trên tuổi.

    Quy tắc:
    - Kinh nghiệm = age - 35 + random(-5, +5)
    - Minimum: 0
    - Maximum: age - 18 (đi làm từ năm 18)

    Args:
        age: Tuổi

    Returns:
        float: Số năm kinh nghiệm
    """
    min_exp = max(0, age - 40)  # Ít nhất age - 40 năm
    max_exp = max(0, age - 18)  # Đi làm sớm nhất năm 18

    if min_exp >= max_exp:
        return max(0, age - 35)

    exp = random.uniform(min_exp, max_exp)
    return round(exp, 1)


def generate_salary(experience_years, education):
    """
    Sinh mức lương kỳ vọng dựa trên kinh nghiệm và trình độ.

    Công thức:
    - Base: 3,000,000 VND
    - + 500,000 VND cho mỗi năm kinh nghiệm
    - + Education multiplier

    Args:
        experience_years: Số năm kinh nghiệm
        education: Trình độ học vấn

    Returns:
        int: Mức lương kỳ vọng (VND)
    """
    # Education multiplier
    edu_multiplier = {
        'none': 0.8,
        'primary': 0.85,
        'middle': 0.9,
        'high': 1.0,
        'vocational': 1.1,
        'college': 1.2,
        'university': 1.3
    }

    multiplier = edu_multiplier.get(education, 1.0)

    # Base salary + experience bonus
    base = 3_000_000
    exp_bonus = experience_years * 500_000

    # Random factor (0.8 - 1.2)
    random_factor = random.uniform(0.8, 1.2)

    salary = int((base + exp_bonus) * multiplier * random_factor)

    # Giới hạn: 0 - 100 triệu
    return max(0, min(100_000_000, salary))


def generate_single_worker(index):
    """
    Sinh một worker profile hoàn chỉnh.

    Args:
        index: Số thứ tự worker

    Returns:
        Dict: Worker data đã chuẩn hóa
    """
    # Basic info
    age = generate_age()
    gender = weighted_choice(GENDERS, GENDER_WEIGHTS)
    education = random.choice(EDUCATION_LEVELS)
    marital_status = weighted_choice(MARITAL_STATUS, MARITAL_WEIGHTS)
    province = random.choice(PROVINCES)

    # Experience
    experience_years = generate_experience_years(age)
    employment_status = weighted_choice(EMPLOYMENT_STATUS, EMPLOYMENT_WEIGHTS)

    # Aspirations
    target_job = random.choice(TARGET_JOBS)
    target_province = random.choice(PROVINCES)
    preferred_job_type = weighted_choice(JOB_TYPES, JOB_TYPE_WEIGHTS)
    target_salary = generate_salary(experience_years, education)
    skills = generate_skills(min_count=1, max_count=4)

    # Barriers
    barriers = generate_barriers()
    total_barriers = sum(barriers.values())

    return {
        'id': f'mock_{index:04d}',
        'userId': f'mock_user_{index:04d}',
        'data_source': 'mock_script',  # Đánh dấu nguồn gốc
        'exported_at': datetime.now().isoformat(),

        # Basic Info
        'age': age,
        'gender': gender,
        'province': province,
        'education': education,
        'marital_status': marital_status,

        # Experience
        'experience_years': experience_years,
        'employment_status': employment_status,

        # Aspirations
        'target_job': target_job,
        'target_salary': target_salary,
        'target_province': target_province,
        'preferred_job_type': preferred_job_type,
        'skills': skills,
        'skills_count': len(skills.split('|')) if skills else 0,

        # Barriers (0/1)
        **barriers,
        'total_barriers': total_barriers,

        # Status (mặc định cho mock)
        'current_step': 4,
        'is_completed': True,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }


# ============================================================================
# MAIN GENERATOR
# ============================================================================

def generate_mock_data(num_records=1000, output_path=None, seed=42):
    """
    Sinh dữ liệu mock cho ML pipeline.

    Args:
        num_records: Số lượng records cần sinh
        output_path: Đường dẫn file output
        seed: Random seed cho reproducibility

    Returns:
        String: Đường dẫn file đã lưu
    """
    set_seed(seed)

    if output_path is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(script_dir)
        output_dir = os.path.join(project_dir, 'data', 'raw')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, 'workers_mock.csv')

    print(f"\n{'='*60}")
    print(f"GENERATE MOCK DATA")
    print(f"{'='*60}")
    print(f"Số records: {num_records}")
    print(f"Output: {output_path}")
    print(f"Seed: {seed}")

    # Generate data
    print(f"\nĐang sinh {num_records} worker profiles...")
    workers = []

    for i in range(num_records):
        worker = generate_single_worker(i + 1)
        workers.append(worker)

        if (i + 1) % 200 == 0:
            print(f"  Đã sinh {i + 1}/{num_records} records...")

    # Convert to DataFrame
    df = pd.DataFrame(workers)

    # Thêm training_weight cho mock data (weight thấp vì là synthetic data)
    df['training_weight'] = 0.5

    # Statistics
    print(f"\n📊 Statistics:")
    print(f"   Tổng records: {len(df)}")
    print(f"   Tuổi trung bình: {df['age'].mean():.1f}")
    print(f"   Kinh nghiệm TB: {df['experience_years'].mean():.1f} năm")
    print(f"   Lương TB: {df['target_salary'].mean():,.0f} VND")
    print(f"   Workers có barrier: {(df['total_barriers'] > 0).sum()} ({(df['total_barriers'] > 0).mean()*100:.1f}%)")

    # Employment distribution
    print(f"\n   Employment Status:")
    for status, count in df['employment_status'].value_counts().items():
        print(f"      {status}: {count} ({count/len(df)*100:.1f}%)")

    # Education distribution
    print(f"\n   Education:")
    for edu, count in df['education'].value_counts().items():
        print(f"      {edu}: {count} ({count/len(df)*100:.1f}%)")

    # Save
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\n✅ Đã lưu vào: {output_path}")

    # Show sample
    print(f"\nSample data (3 dòng đầu):")
    print(df[['id', 'age', 'gender', 'education', 'experience_years',
              'barrier_health', 'barrier_family', 'skills']].head(3).to_string())

    return output_path


def main():
    """Entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Generate mock worker data for ML')
    parser.add_argument('--count', type=int, default=1000,
                        help='Số lượng records (default: 1000)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output CSV path')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed (default: 42)')

    args = parser.parse_args()

    result = generate_mock_data(
        num_records=args.count,
        output_path=args.output,
        seed=args.seed
    )

    print(f"\n{'='*60}")
    print(f"THÀNH CÔNG!")
    print(f"{'='*60}")
    print(f"File: {result}")


if __name__ == '__main__':
    main()
