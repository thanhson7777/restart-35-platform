"""
Script 3: Merge Data Sources cho ML Pipeline
============================================
Ghép dữ liệu từ nhiều nguồn (MongoDB + Mock) và chuẩn bị cho ML training.

Chức năng:
- Ghép workers từ MongoDB và Mock data
- Thêm cột data_source để đánh dấu nguồn gốc
- Xử lý duplicate
- Tính toán trọng số cho training
- Chuẩn bị final dataset

Ưu điểm:
- Dễ dàng thêm/bớt nguồn dữ liệu
- Đánh dấu rõ ràng nguồn gốc
- Hỗ trợ weighted sampling cho training
- Validation trước khi merge

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime


# ============================================================================
# CONFIGURATION
# ============================================================================

# Default columns cần thiết cho ML
REQUIRED_COLUMNS = [
    'id', 'userId', 'data_source',
    'age', 'gender', 'education', 'marital_status',
    'experience_years', 'employment_status',
    'target_job', 'target_salary', 'target_province', 'preferred_job_type',
    'skills', 'skills_count',
    'barrier_health', 'barrier_family', 'barrier_techGap',
    'barrier_location', 'barrier_other', 'total_barriers'
]

# Columns để xử lý duplicate
DUPLICATE_KEY_COLUMNS = ['userId', 'age', 'target_salary']

# Trọng số cho các nguồn dữ liệu (có thể điều chỉnh)
SOURCE_WEIGHTS = {
    'mongodb': 1.0,       # Dữ liệu thật có trọng số cao nhất
    'mock_script': 0.5    # Dữ liệu mock có trọng số thấp hơn
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def load_csv_safe(filepath, source_name):
    """
    Load CSV file một cách an toàn.

    Args:
        filepath: Đường dẫn file CSV
        source_name: Tên nguồn dữ liệu

    Returns:
        DataFrame hoặc None nếu không tìm thấy
    """
    if not os.path.exists(filepath):
        print(f"⚠️ Không tìm thấy file: {filepath}")
        return None

    try:
        df = pd.read_csv(filepath, encoding='utf-8-sig')

        # Thêm data_source nếu chưa có
        if 'data_source' not in df.columns:
            df['data_source'] = source_name

        print(f"   ✅ Loaded {len(df)} records từ {source_name}")
        return df

    except Exception as e:
        print(f"   ❌ Lỗi khi đọc {filepath}: {e}")
        return None


def validate_columns(df, source_name):
    """
    Validate columns trong DataFrame.

    Args:
        df: DataFrame cần validate
        source_name: Tên nguồn để hiển thị lỗi

    Returns:
        List[String]: Danh sách columns bị thiếu
    """
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]

    if missing_cols:
        print(f"   ⚠️ {source_name} thiếu columns: {missing_cols}")

    return missing_cols


def normalize_columns(df):
    """
    Chuẩn hóa column names và types.

    Args:
        df: DataFrame cần chuẩn hóa

    Returns:
        DataFrame: Đã chuẩn hóa
    """
    # Rename columns nếu cần
    rename_map = {
        'barriers': 'barriers_raw',  # Tránh confusion
        'location': 'province',       # Chuẩn hóa tên
        'current_salary': 'target_salary'  # Rename
    }

    for old_name, new_name in rename_map.items():
        if old_name in df.columns and new_name not in df.columns:
            df = df.rename(columns={old_name: new_name})

    # Đảm bảo các cột barrier có giá trị 0/1
    barrier_cols = ['barrier_health', 'barrier_family', 'barrier_techGap',
                   'barrier_location', 'barrier_other']

    for col in barrier_cols:
        if col in df.columns:
            # Chuyển đổi: True -> 1, False -> 0, string -> int
            df[col] = df[col].apply(lambda x: 1 if x in [True, 'true', 'True', 1, '1'] else 0)

    # Tính lại total_barriers nếu cần
    if 'total_barriers' not in df.columns and all(col in df.columns for col in barrier_cols):
        df['total_barriers'] = df[barrier_cols].sum(axis=1)

    # Chuẩn hóa skills
    if 'skills' in df.columns:
        df['skills'] = df['skills'].fillna('').astype(str).str.lower().str.strip()
        df['skills_count'] = df['skills'].apply(
            lambda x: len([s for s in x.split('|') if s]) if x else 0
        )

    # Đảm bảo numeric columns
    numeric_cols = ['age', 'experience_years', 'target_salary']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    return df


def remove_duplicates(dfs):
    """
    Loại bỏ duplicate records.

    Args:
        dfs: List of DataFrames

    Returns:
        List of DataFrames đã loại bỏ duplicates
    """
    result = []
    seen_ids = set()

    for df in dfs:
        # Loại bỏ records đã thấy
        if 'id' in df.columns:
            df = df[~df['id'].isin(seen_ids)]
            seen_ids.update(df['id'].dropna().tolist())

        # Loại bỏ duplicate dựa trên key columns
        if all(col in df.columns for col in DUPLICATE_KEY_COLUMNS):
            df = df.drop_duplicates(subset=DUPLICATE_KEY_COLUMNS, keep='first')

        result.append(df)

    return result


def calculate_training_weight(row):
    """
    Tính trọng số training cho một record.

    Args:
        row: DataFrame row

    Returns:
        float: Trọng số (0.0 - 1.0)
    """
    # Base weight từ nguồn dữ liệu
    base_weight = SOURCE_WEIGHTS.get(row.get('data_source'), 0.5)

    # Tăng trọng số cho records có nhiều thông tin
    info_score = 0.0

    if pd.notna(row.get('age')):
        info_score += 0.2
    if pd.notna(row.get('experience_years')):
        info_score += 0.2
    if row.get('skills_count', 0) > 0:
        info_score += 0.2
    if row.get('total_barriers', 0) >= 0:
        info_score += 0.2
    if pd.notna(row.get('target_salary')) and row.get('target_salary', 0) > 0:
        info_score += 0.2

    # Trọng số cuối cùng = base_weight * (0.5 + 0.5 * info_score)
    # Đảm bảo: 0.25 <= weight <= 1.0
    final_weight = base_weight * (0.5 + 0.5 * info_score)

    return round(final_weight, 3)


# ============================================================================
# MAIN MERGE FUNCTION
# ============================================================================

def merge_data_sources(
    mongodb_path=None,
    mock_path=None,
    output_path=None,
    min_age=35,
    max_age=70
):
    """
    Ghép dữ liệu từ nhiều nguồn và chuẩn bị cho ML.

    Args:
        mongodb_path: Đường dẫn file workers_mongodb.csv
        mock_path: Đường dẫn file workers_mock.csv
        output_path: Đường dẫn file output
        min_age: Tuổi tối thiểu (default: 35)
        max_age: Tuổi tối đa (default: 70)

    Returns:
        String: Đường dẫn file đã lưu
    """
    if output_path is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(script_dir)
        output_dir = os.path.join(project_dir, 'data', 'processed')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, 'workers_merged.csv')

    print(f"\n{'='*60}")
    print(f"MERGE DATA SOURCES")
    print(f"{'='*60}")
    print(f"Output: {output_path}")
    print(f"Age range: {min_age} - {max_age}")

    # Load data sources
    print(f"\n📂 Loading data sources...")
    dataframes = []

    # 1. MongoDB data
    if mongodb_path:
        df_mongo = load_csv_safe(mongodb_path, 'mongodb')
        if df_mongo is not None:
            dataframes.append(('mongodb', df_mongo))

    # 2. Mock data
    if mock_path:
        df_mock = load_csv_safe(mock_path, 'mock_script')
        if df_mock is not None:
            dataframes.append(('mock', df_mock))

    if not dataframes:
        print("❌ Không có dữ liệu để merge!")
        return None

    print(f"\n📊 Tổng quan data sources:")
    total_before = 0
    for name, df in dataframes:
        print(f"   - {name}: {len(df)} records")
        total_before += len(df)

    # Process each dataframe
    print(f"\n🔧 Processing data...")
    processed_dfs = []

    for name, df in dataframes:
        print(f"\n   Processing {name}...")

        # Validate columns
        missing = validate_columns(df, name)

        # Normalize columns
        df = normalize_columns(df)

        # Filter age range
        if 'age' in df.columns:
            original = len(df)
            df = df[df['age'].notna()]  # Loại bỏ NaN
            df = df[(df['age'] >= min_age) & (df['age'] <= max_age)]
            print(f"      Age filter ({min_age}-{max_age}): {original} -> {len(df)}")

        # Filter valid records
        df = df[df['age'].notna()]  # Age bắt buộc

        print(f"      Final: {len(df)} records")
        processed_dfs.append(df)

    # Remove duplicates
    print(f"\n🔄 Removing duplicates...")
    processed_dfs = remove_duplicates(processed_dfs)

    total_after_dedup = sum(len(df) for df in processed_dfs)
    print(f"   Sau khi loại duplicate: {total_after_dedup} records")

    # Concatenate all dataframes
    print(f"\n🔗 Concatenating dataframes...")
    merged_df = pd.concat(processed_dfs, ignore_index=True)
    print(f"   Tổng sau merge: {len(merged_df)} records")

    # Calculate training weights
    print(f"\n⚖️ Calculating training weights...")
    merged_df['training_weight'] = merged_df.apply(calculate_training_weight, axis=1)

    # Add metadata
    merged_df['merged_at'] = datetime.now().isoformat()
    merged_df['age_group'] = pd.cut(
        merged_df['age'],
        bins=[35, 45, 50, 55, 60, 70],
        labels=['35-44', '45-49', '50-54', '55-59', '60-65']
    )

    # Sort by data_source (MongoDB first, then mock)
    merged_df = merged_df.sort_values('data_source', ascending=False)

    # Final statistics
    print(f"\n📊 FINAL STATISTICS:")
    print(f"   Tổng records: {len(merged_df)}")

    print(f"\n   Records theo nguồn:")
    for source, count in merged_df['data_source'].value_counts().items():
        pct = count / len(merged_df) * 100
        print(f"      {source}: {count} ({pct:.1f}%)")

    print(f"\n   Training weight distribution:")
    print(f"      Mean: {merged_df['training_weight'].mean():.3f}")
    print(f"      Min: {merged_df['training_weight'].min():.3f}")
    print(f"      Max: {merged_df['training_weight'].max():.3f}")

    print(f"\n   Age distribution:")
    for group, count in merged_df['age_group'].value_counts().sort_index().items():
        pct = count / len(merged_df) * 100
        print(f"      {group}: {count} ({pct:.1f}%)")

    print(f"\n   Employment status:")
    for status, count in merged_df['employment_status'].value_counts().items():
        pct = count / len(merged_df) * 100
        print(f"      {status}: {count} ({pct:.1f}%)")

    # Save
    merged_df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\n✅ Đã lưu vào: {output_path}")

    # Show sample
    print(f"\nSample data (5 dòng đầu):")
    display_cols = ['id', 'data_source', 'age', 'gender', 'education',
                    'experience_years', 'barrier_health', 'training_weight']
    available_cols = [c for c in display_cols if c in merged_df.columns]
    print(merged_df[available_cols].head().to_string())

    return output_path


def find_latest_files():
    """
    Tìm các file mới nhất trong data/raw.

    Returns:
        Dict: {'mongodb': path, 'mock': path}
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    raw_dir = os.path.join(project_dir, 'data', 'raw')

    result = {'mongodb': None, 'mock': None}

    if not os.path.exists(raw_dir):
        return result

    # Tìm file MongoDB mới nhất
    mongo_files = [f for f in os.listdir(raw_dir) if 'mongodb' in f and f.endswith('.csv')]
    if mongo_files:
        mongo_files.sort(key=lambda x: os.path.getmtime(os.path.join(raw_dir, x)), reverse=True)
        result['mongodb'] = os.path.join(raw_dir, mongo_files[0])

    # Tìm file Mock mới nhất
    mock_files = [f for f in os.listdir(raw_dir) if 'mock' in f and f.endswith('.csv')]
    if mock_files:
        mock_files.sort(key=lambda x: os.path.getmtime(os.path.join(raw_dir, x)), reverse=True)
        result['mock'] = os.path.join(raw_dir, mock_files[0])

    return result


def main():
    """Entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Merge data sources for ML pipeline')
    parser.add_argument('--mongodb', type=str, default=None,
                        help='Path to workers_mongodb.csv')
    parser.add_argument('--mock', type=str, default=None,
                        help='Path to workers_mock.csv')
    parser.add_argument('--output', type=str, default=None,
                        help='Output CSV path')
    parser.add_argument('--min-age', type=int, default=35,
                        help='Minimum age (default: 35)')
    parser.add_argument('--max-age', type=int, default=70,
                        help='Maximum age (default: 70)')
    parser.add_argument('--auto', action='store_true',
                        help='Tự động tìm file mới nhất trong data/raw')

    args = parser.parse_args()

    # Auto-find latest files
    if args.auto:
        latest = find_latest_files()
        print("Auto-detected files:")
        print(f"   MongoDB: {latest['mongodb']}")
        print(f"   Mock: {latest['mock']}")

        if not args.mongodb:
            args.mongodb = latest['mongodb']
        if not args.mock:
            args.mock = latest['mock']

    try:
        result = merge_data_sources(
            mongodb_path=args.mongodb,
            mock_path=args.mock,
            output_path=args.output,
            min_age=args.min_age,
            max_age=args.max_age
        )

        if result:
            print(f"\n{'='*60}")
            print(f"THÀNH CÔNG!")
            print(f"{'='*60}")
            print(f"File: {result}")
        else:
            print(f"\n❌ Không có dữ liệu để merge")

    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
