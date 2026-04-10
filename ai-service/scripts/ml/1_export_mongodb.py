"""
Script 1: Export dữ liệu từ MongoDB cho ML Pipeline
====================================================
Export worker_profiles từ MongoDB và chuyển đổi sang định dạng CSV phẳng (flatten).

Chức năng:
- Kết nối MongoDB
- Query workers đã hoàn thành hồ sơ (isCompleted: true)
- Flatten nested fields
- Chuẩn hóa dữ liệu (skills lowercase, barriers 0/1)
- Lưu vào CSV

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import pandas as pd
import numpy as np
from pymongo import MongoClient
from datetime import datetime
import os
import sys

# Thêm parent directory vào path để import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_mongodb_connection():
    """
    Kết nối đến MongoDB.

    Returns:
        MongoClient: Kết nối MongoDB

    Raises:
        EnvironmentError: Khi thiếu MONGODB_URI
    """
    mongodb_uri = os.getenv('MONGODB_URI')

    if not mongodb_uri:
        raise EnvironmentError(
            "Thiếu MONGODB_URI trong .env file. "
            "Vui lòng thêm: MONGODB_URI=mongodb+srv://..."
        )

    client = MongoClient(mongodb_uri)
    # Test connection
    client.admin.command('ping')
    print(f"Đã kết nối MongoDB thành công")

    return client


def safe_extract_experience_years(employment_history):
    """
    Tính tổng số năm kinh nghiệm từ employmentHistory một cách an toàn.

    Args:
        employment_history: List[{duration: Number}] hoặc None/empty

    Returns:
        float: Tổng số năm kinh nghiệm (sum of months / 12)
    """
    if not employment_history or not isinstance(employment_history, list):
        return 0.0

    total_months = 0
    for job in employment_history:
        try:
            if job and isinstance(job, dict):
                duration = job.get('duration')
                if duration is not None:
                    # Ép kiểu sang float để đảm bảo tính toán đúng
                    total_months += float(duration)
        except (TypeError, ValueError):
            # Bỏ qua các giá trị không hợp lệ
            continue

    return total_months / 12.0


def normalize_skills(skills_list):
    """
    Chuẩn hóa danh sách skills: lowercase, strip, loại bỏ trùng lặp.

    Args:
        skills_list: List[String] hoặc None/empty

    Returns:
        String: Chuỗi skills nối bằng '|', ví dụ: "bán hàng|lái xe|nấu ăn"
    """
    if not skills_list or not isinstance(skills_list, list):
        return ''

    normalized = []
    seen = set()

    for skill in skills_list:
        if skill and isinstance(skill, str):
            # Lowercase và strip
            cleaned = skill.lower().strip()
            if cleaned and cleaned not in seen:
                normalized.append(cleaned)
                seen.add(cleaned)

    return '|'.join(normalized)


def extract_barriers_as_columns(barriers):
    """
    Trích xuất barriers thành các cột riêng với giá trị 0/1.

    Args:
        barriers: Dict{barrier_type: Boolean} hoặc None

    Returns:
        Dict: {
            'barrier_health': 0/1,
            'barrier_family': 0/1,
            'barrier_techGap': 0/1,
            'barrier_location': 0/1,
            'barrier_other': 0/1
        }
    """
    default_barriers = {
        'barrier_health': 0,
        'barrier_family': 0,
        'barrier_techGap': 0,
        'barrier_location': 0,
        'barrier_other': 0
    }

    if not barriers or not isinstance(barriers, dict):
        return default_barriers

    result = {}

    # Map các barrier types
    barrier_mapping = {
        'health': 'barrier_health',
        'family': 'barrier_family',
        'techGap': 'barrier_techGap',
        'location': 'barrier_location',
        'other': 'barrier_other'
    }

    for db_key, column_name in barrier_mapping.items():
        value = barriers.get(db_key)
        # Chuyển đổi: True -> 1, False -> 0, None/missing -> 0
        if isinstance(value, bool):
            result[column_name] = 1 if value else 0
        else:
            result[column_name] = 0

    return result


def determine_employment_status(employment_history, default='unemployed'):
    """
    Xác định employment_status dựa trên employmentHistory.

    Args:
        employment_history: List[Dict] hoặc None
        default: Giá trị mặc định nếu không xác định được

    Returns:
        String: 'employed' | 'unemployed' | 'retired' | 'self-employed'
    """
    if not employment_history or len(employment_history) == 0:
        return default

    # Nếu có kinh nghiệm -> employed
    return 'employed'


def flatten_worker_profile(profile):
    """
    Chuyển đổi worker profile từ nested structure sang flat dictionary.

    Args:
        profile: MongoDB document (dict)

    Returns:
        Dict: Flattened worker data
    """
    result = {
        'id': str(profile.get('_id', '')),
        'userId': str(profile.get('userId', '')),
        'data_source': 'mongodb',  # Đánh dấu nguồn gốc
        'exported_at': datetime.now().isoformat()
    }

    # === Basic Info ===
    basic_info = profile.get('basicInfo', {})
    if basic_info and isinstance(basic_info, dict):
        result['age'] = basic_info.get('age', None)
        result['gender'] = basic_info.get('gender', None)
        result['province'] = basic_info.get('province', None)
        result['education'] = basic_info.get('education', None)
        result['marital_status'] = basic_info.get('maritalStatus', None)
        result['phone'] = basic_info.get('phone', None)
    else:
        result['age'] = None
        result['gender'] = None
        result['province'] = None
        result['education'] = None
        result['marital_status'] = None
        result['phone'] = None

    # === Employment History -> Experience Years ===
    employment_history = profile.get('employmentHistory', [])
    result['experience_years'] = safe_extract_experience_years(employment_history)
    result['employment_status'] = determine_employment_status(employment_history)

    # === Aspirations ===
    aspirations = profile.get('aspirations', {})
    if aspirations and isinstance(aspirations, dict):
        result['target_job'] = aspirations.get('targetJob', None)
        result['target_salary'] = aspirations.get('targetSalary', None)
        result['target_province'] = aspirations.get('targetProvince', None)
        result['preferred_job_type'] = aspirations.get('preferredJobType', None)

        # Chuẩn hóa skills
        skills = aspirations.get('skills', [])
        result['skills'] = normalize_skills(skills)
        result['skills_count'] = len([s for s in skills if s]) if skills else 0
    else:
        result['target_job'] = None
        result['target_salary'] = None
        result['target_province'] = None
        result['preferred_job_type'] = None
        result['skills'] = ''
        result['skills_count'] = 0

    # === Barriers (tách thành các cột riêng) ===
    barriers = profile.get('barriers', {})
    barrier_cols = extract_barriers_as_columns(barriers)
    result.update(barrier_cols)

    # Tổng số barriers
    result['total_barriers'] = sum([
        barrier_cols['barrier_health'],
        barrier_cols['barrier_family'],
        barrier_cols['barrier_techGap'],
        barrier_cols['barrier_location'],
        barrier_cols['barrier_other']
    ])

    # === Profile Status ===
    result['current_step'] = profile.get('currentStep', None)
    result['is_completed'] = profile.get('isCompleted', False)

    # === Timestamps ===
    result['created_at'] = profile.get('createdAt', None)
    result['updated_at'] = profile.get('updatedAt', None)

    return result


def export_mongodb_to_csv(output_path=None, db_name='restart35'):
    """
    Export tất cả worker_profiles từ MongoDB sang CSV.

    Args:
        output_path: Đường dẫn file output (mặc định: data/raw/workers_mongodb.csv)
        db_name: Tên database

    Returns:
        String: Đường dẫn file đã lưu
    """
    if output_path is None:
        # Tạo đường dẫn mặc định
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(script_dir)
        output_dir = os.path.join(project_dir, 'data', 'raw')
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = os.path.join(output_dir, f'workers_mongodb_{timestamp}.csv')

    print(f"\n{'='*60}")
    print(f"EXPORT MONGODB DATA")
    print(f"{'='*60}")
    print(f"Database: {db_name}")
    print(f"Collection: worker_profiles")
    print(f"Output: {output_path}")

    # Kết nối MongoDB
    client = get_mongodb_connection()
    db = client[db_name]

    # Query: Chỉ lấy profiles đã hoàn thành và chưa xóa
    query = {
        'isCompleted': True,
        '_destroy': False
    }

    print(f"\nQuery: {query}")
    profiles = list(db.worker_profiles.find(query))

    print(f"Tìm thấy {len(profiles)} worker profiles đã hoàn thành")

    if len(profiles) == 0:
        print("Cảnh báo: Không có dữ liệu để export!")
        print("   Kiểm tra lại:")
        print("   1. MongoDB có dữ liệu worker_profiles không?")
        print("   2. Có worker nào có isCompleted: true không?")
        print("   3. Database name có đúng không?")
        return None

    # Flatten each profile
    print(f"\nĐang flatten {len(profiles)} profiles...")
    flattened_data = []
    errors = 0

    for i, profile in enumerate(profiles):
        try:
            flat = flatten_worker_profile(profile)
            flattened_data.append(flat)

            if (i + 1) % 100 == 0:
                print(f"  Đã xử lý {i + 1}/{len(profiles)} profiles...")

        except Exception as e:
            errors += 1
            print(f"  Lỗi ở profile {i}: {e}")
            continue

    print(f"\nFlatten hoàn tất:")
    print(f"  Thành công: {len(flattened_data)} profiles")
    print(f"  Lỗi: {errors} profiles")

    # Chuyển sang DataFrame
    df = pd.DataFrame(flattened_data)

    # Kiểm tra và lọc age range (35-70)
    if 'age' in df.columns:
        original_count = len(df)
        df = df[df['age'].notna()]  # Loại bỏ NaN
        df = df[(df['age'] >= 35) & (df['age'] <= 70)]  # Filter age range
        filtered_count = len(df)
        print(f"\nFilter age (35-70): {original_count} -> {filtered_count} profiles")

    # Lưu CSV
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\nĐã lưu vào: {output_path}")
    print(f"   Tổng cột: {len(df.columns)}")
    print(f"   Tổng dòng: {len(df)}")

    # Hiển thị sample
    print(f"\nSample data (5 dòng đầu):")
    print(df.head().to_string())

    # Đóng kết nối
    client.close()
    print(f"\nĐã đóng kết nối MongoDB")

    return output_path


def main():
    """Entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Export MongoDB worker profiles to CSV')
    parser.add_argument('--db', type=str, default='restart35',
                        help='Database name (default: restart35)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output CSV path')
    parser.add_argument('--latest', action='store_true',
                        help='Ghi đè data/raw/workers_mongodb.csv (không thêm timestamp)')

    args = parser.parse_args()

    output_path = args.output

    if args.latest:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(script_dir)
        output_dir = os.path.join(project_dir, 'data', 'raw')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, 'workers_mongodb.csv')

    try:
        result = export_mongodb_to_csv(output_path, args.db)

        if result:
            print(f"\n{'='*60}")
            print(f"THÀNH CÔNG!")
            print(f"{'='*60}")
            print(f"File: {result}")
        else:
            print(f"\nKhông có dữ liệu để export")

    except Exception as e:
        print(f"\nLỗi: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
