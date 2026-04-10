"""
Test Script: Validate Bước 1 - Thu thập dữ liệu
=================================================
Kiểm tra xem các scripts thu thập dữ liệu hoạt động đúng hay không.

Cách sử dụng:
    python scripts/ml/test_step1.py

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import os
import sys
import pandas as pd
import subprocess
from datetime import datetime


# ============================================================================
# CONFIGURATION
# ============================================================================

# ANSI colors cho terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")


def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")


def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")


def print_warning(text):
    print(f"{Colors.YELLOW}⚠️ {text}{Colors.END}")


def print_info(text):
    print(f"{Colors.BLUE}ℹ️ {text}{Colors.END}")


# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_imports():
    """Test 1: Kiểm tra các thư viện cần thiết"""
    print_header("TEST 1: Import Libraries")

    required_modules = [
        ('pandas', 'pd'),
        ('numpy', 'np'),
    ]
    
    optional_modules = [
        ('pymongo', 'MongoClient'),
    ]

    all_passed = True

    # Required modules (must pass)
    print(f"{Colors.BOLD}Required:{Colors.END}")
    for module, alias in required_modules:
        try:
            __import__(module)
            print_success(f"Import '{module}' thành công")
        except ImportError as e:
            print_error(f"Import '{module}' thất bại: {e}")
            all_passed = False

    # Optional modules (warning only)
    print(f"\n{Colors.BOLD}Optional:{Colors.END}")
    for module, alias in optional_modules:
        try:
            __import__(module)
            print_success(f"Import '{module}' thành công")
        except ImportError as e:
            print_warning(f"Import '{module}' thất bại (optional): {e}")
            print_info(f"  → Cài đặt nếu cần: pip install {module}")

    return all_passed


def test_directories():
    """Test 2: Kiểm tra cấu trúc thư mục"""
    print_header("TEST 2: Directory Structure")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    ai_service_dir = project_dir

    expected_dirs = [
        os.path.join(ai_service_dir, 'data', 'raw'),
        os.path.join(ai_service_dir, 'data', 'processed'),
        os.path.join(script_dir)
    ]

    expected_files = [
        os.path.join(script_dir, '1_export_mongodb.py'),
        os.path.join(script_dir, '1_generate_mock_data.py'),
        os.path.join(script_dir, '1_merge_data.py')
    ]

    all_passed = True

    # Check directories
    print(f"{Colors.BOLD}Directories:{Colors.END}")
    for dir_path in expected_dirs:
        if os.path.exists(dir_path):
            print_success(f"Tồn tại: {dir_path}")
        else:
            print_error(f"Thiếu: {dir_path}")
            # Tự tạo
            os.makedirs(dir_path, exist_ok=True)
            print_info(f"Đã tạo: {dir_path}")
            all_passed = False

    # Check files
    print(f"\n{Colors.BOLD}Script Files:{Colors.END}")
    for file_path in expected_files:
        if os.path.exists(file_path):
            print_success(f"Tồn tại: {os.path.basename(file_path)}")
        else:
            print_error(f"Thiếu: {os.path.basename(file_path)}")
            all_passed = False

    return all_passed


def test_mock_data_generation():
    """Test 3: Generate và validate mock data"""
    print_header("TEST 3: Generate Mock Data")

    script_dir = os.path.dirname(os.path.abspath(__file__))

    try:
        # Import mock generator (dùng importlib vì tên file bắt đầu bằng số)
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "mock_generator",
            os.path.join(script_dir, "1_generate_mock_data.py")
        )
        mock_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mock_module)
        generate_mock_data = mock_module.generate_mock_data

        # Generate 100 records để test nhanh
        output_path = generate_mock_data(
            num_records=100,
            output_path=os.path.join(script_dir, '..', 'data', 'raw', 'workers_mock_test.csv'),
            seed=42
        )

        print_success(f"Mock data generated: {output_path}")

        # Validate output
        df = pd.read_csv(output_path)

        # Check columns
        required_cols = [
            'id', 'data_source', 'age', 'gender', 'education',
            'experience_years', 'barrier_health', 'barrier_family',
            'barrier_techGap', 'barrier_location', 'barrier_other',
            'skills', 'training_weight'
        ]

        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print_error(f"Thiếu columns: {missing_cols}")
            return False

        print_success(f"Tất cả {len(required_cols)} columns đều có")

        # Check data types & values
        checks = []

        # Age range (35-70)
        age_valid = (df['age'] >= 35).all() and (df['age'] <= 70).all()
        checks.append(('Age range (35-70)', age_valid))

        # Experience years (0-50)
        exp_valid = (df['experience_years'] >= 0).all() & (df['experience_years'] <= 50).all()
        checks.append(('Experience (0-50)', exp_valid))

        # Barriers are 0 or 1
        barrier_cols = ['barrier_health', 'barrier_family', 'barrier_techGap',
                        'barrier_location', 'barrier_other']
        barriers_valid = all(df[col].isin([0, 1]).all() for col in barrier_cols)
        checks.append(('Barriers are 0/1', barriers_valid))

        # Skills are lowercase
        skills_lower = df['skills'].str.lower().fillna('').eq(df['skills'].fillna('')).all()
        checks.append(('Skills lowercase', skills_lower))

        # Data source is mock_script
        source_valid = (df['data_source'] == 'mock_script').all()
        checks.append(('Data source = mock_script', source_valid))

        # Print results
        print(f"\n{Colors.BOLD}Validation Results:{Colors.END}")
        all_passed = True
        for check_name, result in checks:
            if result:
                print_success(check_name)
            else:
                print_error(check_name)
                all_passed = False

        # Print sample
        print(f"\n{Colors.BOLD}Sample Data:{Colors.END}")
        print(df[['id', 'age', 'gender', 'education', 'experience_years', 'skills']].head(3).to_string())

        return all_passed

    except Exception as e:
        print_error(f"Lỗi khi generate mock data: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_merge_functionality():
    """Test 4: Test merge functionality"""
    print_header("TEST 4: Merge Data Sources")

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Check if mock test file exists
    mock_file = os.path.join(script_dir, '..', 'data', 'raw', 'workers_mock_test.csv')

    if not os.path.exists(mock_file):
        print_warning(f"Không tìm thấy {mock_file}, bỏ qua test merge")
        return None  # Skip test

    try:
        # Import merge script (dùng importlib vì tên file bắt đầu bằng số)
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "merge_data",
            os.path.join(script_dir, "1_merge_data.py")
        )
        merge_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(merge_module)
        merge_data_sources = merge_module.merge_data_sources

        # Merge with mock data only
        output_path = merge_data_sources(
            mock_path=mock_file,
            mongodb_path=None,
            output_path=os.path.join(script_dir, '..', 'data', 'processed', 'workers_merged_test.csv'),
            min_age=35,
            max_age=70
        )

        if output_path and os.path.exists(output_path):
            print_success(f"Merged data saved: {output_path}")

            # Validate merged data
            df = pd.read_csv(output_path)

            # Check training_weight column
            if 'training_weight' in df.columns:
                print_success("Column 'training_weight' tồn tại")
                print_info(f"Weight range: {df['training_weight'].min():.3f} - {df['training_weight'].max():.3f}")
            else:
                print_error("Column 'training_weight' thiếu")
                return False

            # Check data_source column
            if 'data_source' in df.columns:
                print_success("Column 'data_source' tồn tại")
                print_info(f"Sources: {df['data_source'].unique().tolist()}")
            else:
                print_error("Column 'data_source' thiếu")
                return False

            # Check for duplicates
            dup_count = df.duplicated(subset=['id']).sum()
            if dup_count == 0:
                print_success("Không có duplicate records")
            else:
                print_warning(f"Có {dup_count} duplicate records")

            print(f"\n{Colors.BOLD}Merged Data Sample:{Colors.END}")
            print(df[['id', 'data_source', 'age', 'training_weight']].head(3).to_string())

            return True
        else:
            print_error("Merge thất bại")
            return False

    except Exception as e:
        print_error(f"Lỗi khi merge data: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_mongodb_connection():
    """Test 5: Test MongoDB connection (optional)"""
    print_header("TEST 5: MongoDB Connection (Optional)")

    mongodb_uri = os.getenv('MONGODB_URI')

    if not mongodb_uri:
        print_warning("MONGODB_URI không được set, bỏ qua test MongoDB")
        print_info("Để test MongoDB, thêm vào .env: MONGODB_URI=mongodb+srv://...")
        return None

    try:
        from pymongo import MongoClient

        print_info(f"Đang kết nối MongoDB...")
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')

        print_success("Kết nối MongoDB thành công!")

        # Check database
        db_names = client.list_database_names()
        print_info(f"Databases: {db_names}")

        return True

    except Exception as e:
        print_warning(f"Không thể kết nối MongoDB: {e}")
        print_info("Bước này là optional, có thể bỏ qua nếu chưa có MongoDB")
        return None


def print_summary(results):
    """In tổng kết"""
    print_header("SUMMARY")

    total = len(results)
    passed = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is False)
    skipped = sum(1 for r in results if r is None)

    print(f"{Colors.BOLD}Total Tests:{Colors.END} {total}")
    print(f"{Colors.GREEN}Passed:{Colors.END} {passed}")
    print(f"{Colors.RED}Failed:{Colors.END} {failed}")
    print(f"{Colors.YELLOW}Skipped:{Colors.END} {skipped}")

    if failed == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 BƯỚC 1 ĐÃ HOÀN THÀNH ĐÚNG!{Colors.END}")
        print(f"\nTiếp theo: Chạy Bước 2 - Làm sạch dữ liệu")
        return True
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ CÓ LỖI TRONG BƯỚC 1{Colors.END}")
        print(f"\nVui lòng kiểm tra và sửa lỗi trước khi tiếp tục.")
        return False


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{'='*60}")
    print(f"  TEST SUITE: Bước 1 - Thu thập dữ liệu")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}{Colors.END}")

    results = []

    # Run tests
    results.append(test_imports())
    results.append(test_directories())
    results.append(test_mock_data_generation())
    results.append(test_merge_functionality())
    results.append(test_mongodb_connection())

    # Summary
    success = print_summary(results)

    # Exit code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
