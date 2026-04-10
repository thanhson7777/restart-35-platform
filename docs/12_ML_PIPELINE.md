# 12. ML Pipeline chi tiết

> **Cập nhật:** 2026-04-10

## Tổng quan 2 mô hình cần xây dựng

| Mô hình | Mục đích | Thuật toán | Input | Output |
|---------|----------|------------|-------|--------|
| **Risk Predictor** | Dự đoán mức độ rủi ro thất nghiệp | Random Forest / XGBoost | Worker features | `risk_level`: high/medium/low + `risk_score`: 0-1 |
| **Job Recommender** | Gợi ý việc làm phù hợp | Content-Based + Collaborative Filtering | Worker profile | List jobs + scores |

---

## Tổng quan 7 bước xây dựng ML Pipeline

```
Bước 1       Bước 2       Bước 3       Bước 4
Thu thập  →  Làm sạch  →  Feature   →   Train
dữ liệu       dữ liệu    Engineering     Model

Bước 7       Bước 6       Bước 5
Deploy    ←   Đánh giá ←   Tune
Model         Model        Hyperparameters
```

---

## Bước 1: Thu thập dữ liệu (Data Collection)

### 1.1 Tổng quan kiến trúc thu thập dữ liệu

```
┌──────────────────────────────────────────────────────────────────────┐
│                      DATA COLLECTION PIPELINE                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐   │
│   │   MongoDB   │     │ Mock Script │     │     Merge Step      │   │
│   │  (Real Data)│     │ (Generated)  │     │  (Combine + Clean)  │   │
│   └──────┬──────┘     └──────┬───────┘     └──────────┬──────────┘   │
│          │                  │                         │             │
│          ▼                  ▼                         ▼             │
│   workers_mongodb.csv   workers_mock.csv      workers_merged.csv   │
│          │                  │                         │             │
│          └──────────────────┼─────────────────────────┘             │
│                             │                                       │
│                             ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    OUTPUT                                    │   │
│   │  data/processed/workers_merged.csv                           │   │
│   │  ├── id, userId, data_source ('mongodb' | 'mock_script')    │   │
│   │  ├── age, gender, education, experience_years               │   │
│   │  ├── barriers (0/1): health, family, techGap, location      │   │
│   │  ├── skills (normalized lowercase, '|' separated)            │   │
│   │  ├── training_weight (0.25 - 1.0)                             │   │
│   │  └── age_group: 35-44, 45-49, 50-54, 55-59, 60-65            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Script 1: Export MongoDB

**File:** `scripts/ml/1_export_mongodb.py`

**Tính năng:**
- Kết nối MongoDB với error handling
- Query workers đã hoàn thành (`isCompleted: true`)
- Flatten nested structure → flat CSV
- Safe extraction cho `experience_years` (try-except)
- Chuẩn hóa skills: `lower().strip()`, loại bỏ trùng lặp
- Barriers convert: `True/False → 1/0`
- Đánh dấu `data_source = 'mongodb'`

**Cách chạy:**
```bash
cd ai-service
python scripts/ml/1_export_mongodb.py --db restart35 --latest
```

**Output:** `data/raw/workers_mongodb_YYYYMMDD_HHMMSS.csv`

```python
# Key functions:
def safe_extract_experience_years(employment_history):
    """Tính sum(duration) / 12 với try-except"""
    if not employment_history:
        return 0.0
    total_months = 0
    for job in employment_history:
        try:
            duration = job.get('duration', 0)
            if duration is not None:
                total_months += float(duration)
        except (TypeError, ValueError):
            continue
    return total_months / 12.0

def normalize_skills(skills_list):
    """'Bán Hàng', 'bán hàng ' → 'bán hàng'"""
    normalized = []
    seen = set()
    for skill in skills_list:
        cleaned = skill.lower().strip()
        if cleaned and cleaned not in seen:
            normalized.append(cleaned)
            seen.add(cleaned)
    return '|'.join(normalized)

def extract_barriers_as_columns(barriers):
    """Dict → {barrier_health: 1, barrier_family: 0, ...}"""
    result = {}
    barrier_mapping = {
        'health': 'barrier_health',
        'family': 'barrier_family',
        'techGap': 'barrier_techGap',
        'location': 'barrier_location',
        'other': 'barrier_other'
    }
    for db_key, col_name in barrier_mapping.items():
        value = barriers.get(db_key)
        result[col_name] = 1 if isinstance(value, bool) and value else 0
    return result
```

---

### 1.3 Script 2: Generate Mock Data

**File:** `scripts/ml/1_generate_mock_data.py`

**Tính năng:**
- Sinh trực tiếp ra CSV phẳng (không cần flatten)
- Phân bố age thực tế: 30% (35-44), 40% (45-54), 30% (55-65)
- Skills từ jobs.csv, đã normalized
- Barriers với xác suất thực tế: health(15%), family(25%), techGap(30%)
- Random seed cho reproducibility
- Đánh dấu `data_source = 'mock_script'`

**Cách chạy:**
```bash
# Sinh 1000 records
python scripts/ml/1_generate_mock_data.py --count 1000 --seed 42

# Sinh 500 records, output tùy chỉnh
python scripts/ml/1_generate_mock_data.py --count 500 --output data/raw/custom_mock.csv
```

**Output:** `data/raw/workers_mock.csv`

```python
# Key distributions:
def generate_age():
    """Phân bố: 30% (35-44), 40% (45-54), 30% (55-65)"""
    rand = random.random()
    if rand < 0.30: return random.randint(35, 44)
    elif rand < 0.70: return random.randint(45, 54)
    else: return random.randint(55, 65)

def generate_experience_years(age):
    """experience = age - 35 + random(-5, +5), clamped"""
    min_exp = max(0, age - 40)
    max_exp = max(0, age - 18)
    if min_exp >= max_exp:
        return max(0, age - 35)
    exp = random.uniform(min_exp, max_exp)
    return round(exp, 1)

def generate_barriers():
    """Xác suất: health(15%), family(25%), techGap(30%), location(20%), other(10%)"""
    return {
        'barrier_health': 1 if random.random() < 0.15 else 0,
        'barrier_family': 1 if random.random() < 0.25 else 0,
        'barrier_techGap': 1 if random.random() < 0.30 else 0,
        'barrier_location': 1 if random.random() < 0.20 else 0,
        'barrier_other': 1 if random.random() < 0.10 else 0
    }
```

---

### 1.4 Script 3: Merge Data Sources

**File:** `scripts/ml/1_merge_data.py`

**Tính năng:**
- Ghép nhiều nguồn dữ liệu
- Đánh dấu `data_source` (mongodb / mock_script)
- Loại bỏ duplicate dựa trên `userId`, `age`, `target_salary`
- Chuẩn hóa columns
- Tính `training_weight` cho weighted sampling
- Filter age range (35-70)

**Cách chạy:**
```bash
# Auto-tìm file mới nhất
python scripts/ml/1_merge_data.py --auto

# Chỉ định file cụ thể
python scripts/ml/1_merge_data.py \
  --mongodb data/raw/workers_mongodb.csv \
  --mock data/raw/workers_mock.csv \
  --output data/processed/workers_merged.csv

# Với age range tùy chỉnh
python scripts/ml/1_merge_data.py --auto --min-age 35 --max-age 65
```

**Output:** `data/processed/workers_merged.csv`

```python
# Training weight calculation:
SOURCE_WEIGHTS = {
    'mongodb': 1.0,       # Dữ liệu thật có trọng số cao
    'mock_script': 0.5     # Dữ liệu mock có trọng số thấp
}

def calculate_training_weight(row):
    """Weight = base_weight * (0.5 + 0.5 * info_score)"""
    base_weight = SOURCE_WEIGHTS.get(row.get('data_source'), 0.5)
    info_score = 0.0
    if pd.notna(row.get('age')): info_score += 0.2
    if pd.notna(row.get('experience_years')): info_score += 0.2
    if row.get('skills_count', 0) > 0: info_score += 0.2
    if row.get('total_barriers', 0) >= 0: info_score += 0.2
    if row.get('target_salary', 0) > 0: info_score += 0.2
    return round(base_weight * (0.5 + 0.5 * info_score), 3)
```

---

### 1.5 Cấu trúc thư mục sau Bước 1

```
ai-service/
├── data/
│   ├── raw/
│   │   ├── workers_mongodb_20260410_120000.csv    ← MongoDB export
│   │   └── workers_mock.csv                       ← Mock data
│   └── processed/
│       └── workers_merged.csv                     ← Merged output
├── scripts/ml/
│   ├── 1_export_mongodb.py       ← Export MongoDB
│   ├── 1_generate_mock_data.py    ← Generate mock
│   └── 1_merge_data.py             ← Merge sources
```

---

### 1.6 Lệnh chạy đầy đủ

```bash
cd ai-service

# Bước 1a: Export từ MongoDB
python scripts/ml/1_export_mongodb.py --db restart35 --latest

# Bước 1b: Generate mock data (1000 records)
python scripts/ml/1_generate_mock_data.py --count 1000 --seed 42

# Bước 1c: Merge tất cả sources
python scripts/ml/1_merge_data.py --auto

# Hoặc chạy 1 lệnh duy nhất:
python -c "
from scripts.ml import 1_generate_mock_data as m, 1_merge_data as merge
m.generate_mock_data(1000)
merge.merge_data_sources(mongodb_path='data/raw/workers_mongodb.csv',
                        mock_path='data/raw/workers_mock.csv')
"
```

---

### 1.7 Lưu ý quan trọng

| Vấn đề | Giải pháp |
|--------|-----------|
| `duration` bị null | Try-except, return 0 |
| Skills không chuẩn | `lower().strip()`, loại trùng |
| Barriers là string | Convert `True/False → 1/0` |
| Duplicate records | Remove dựa trên `userId` |
| Nguồn dữ liệu khác nhau | Thêm `data_source` column |
| Trọng số training | Tính `training_weight` |
```

---

## Bước 2: Làm sạch dữ liệu

**File:** `scripts/ml/2_clean_data.py`

### 2.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA CLEANING PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   INPUT: workers_merged.csv (30 columns)                                │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  1. Handle Missing Values                                    │       │
│   │     age → fillna(45), experience → fillna(0)               │       │
│   │     skills → fillna(''), barriers → fillna(0)              │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  2. Remove Outliers                                          │       │
│   │     age: clip(35, 70), experience: clip(0, 50)              │       │
│   │     salary: clip(1M, 100M)                                   │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  3. Standardize Text                                         │       │
│   │     skills: lowercase + strip + sort + dedup                 │       │
│   │     gender: Nam→male, Nữ→female                             │       │
│   │     education: lowercase                                    │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  4. Create Derived Features                                   │       │
│   │     total_barriers, skills_count, age_group                  │       │
│   │     education_level, is_married, is_male/female             │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  5. Remove Duplicates                                        │       │
│   │     by userId, keep first                                    │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   OUTPUT: workers_clean.csv (40+ columns)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Các class và hàm chính

```python
# scripts/ml/2_clean_data.py

class DataCleaner:
    """Class xử lý làm sạch dữ liệu worker."""
    
    def load_data(self):
        """Đọc dữ liệu từ CSV."""
        
    def handle_missing_values(self):
        """Fill missing values theo type của column."""
        
    def remove_outliers(self):
        """Loại bỏ outliers (age, experience, salary)."""
        
    def standardize_text(self):
        """Chuẩn hóa text (skills, gender, education)."""
        
    def create_derived_features(self):
        """Tạo derived features mới."""
        
    def remove_duplicates(self):
        """Loại bỏ bản ghi trùng theo userId."""
        
    def validate_output(self):
        """Validate dữ liệu sau clean."""
        
    def clean(self):
        """Chạy full cleaning pipeline."""

# Hàm tiện ích
def clean_workers_data(input_path=None, output_path=None):
    """Clean workers data từ merged file."""
```

### 2.3 Constants và Config

```python
# RANGES cho outlier detection
AGE_MIN = 35
AGE_MAX = 70
EXPERIENCE_MIN = 0
EXPERIENCE_MAX = 50
SALARY_MIN = 1_000_000
SALARY_MAX = 100_000_000

# Giá trị fillna mặc định
FILLNA_DEFAULTS = {
    'age': 45,
    'experience_years': 0,
    'target_salary': 5_000_000,
    'marital_status': 'single',
    'employment_status': 'unemployed',
    'gender': 'other',
}

# Education mapping (ordinal)
EDUCATION_MAP = {
    'none': 0, 'primary': 1, 'middle': 2, 'high': 3,
    'vocational': 4, 'college': 5, 'university': 6
}

# Age group mapping
AGE_GROUP_MAP = {
    (35, 44): '35-44',
    (45, 49): '45-49',
    (50, 54): '50-54',
    (55, 59): '55-59',
    (60, 70): '60-70',
}
```

### 2.4 Cách chạy

```bash
cd ai-service

# Chạy với file test mặc định
python scripts/ml/2_clean_data.py

# Chỉ định file input
python scripts/ml/2_clean_data.py --input data/processed/workers_merged.csv

# Chỉ định file output
python scripts/ml/2_clean_data.py --output data/processed/my_clean_data.csv

# Chạy silent (không in log)
python scripts/ml/2_clean_data.py --quiet
```

### 2.5 Test Bước 2

```bash
cd ai-service
python scripts/ml/test_step2.py
```

**Kết quả mong đợi:**
```
============================================================
  TEST SUITE: Bước 2 - Làm sạch dữ liệu
============================================================

Total Tests: 6
Passed: 6
Failed: 0

✅ TẤT CẢ TESTS ĐÃ PASSED
```

### 2.6 Validation Rules

| Check | Rule | Action if Fail |
|-------|------|----------------|
| Age range | 35 ≤ age ≤ 70 | Remove row |
| Experience range | 0 ≤ exp ≤ 50 | Remove row |
| Salary range | 1M ≤ salary ≤ 100M | Remove row |
| Barriers | ∈ {0, 1} | Convert |
| No duplicate userId | unique(userId) == len(df) | Remove dup |
| Missing values | Critical cols not null | Fill default |

### 2.7 Output Columns (thêm mới)

```python
# Derived features được tạo:
- total_barriers: int      # Sum of 5 barrier columns
- skills_count: int        # len(skills.split('|'))
- age_group: str          # '35-44', '45-49', etc.
- has_barriers: int        # 0 or 1
- experience_age_ratio: float  # exp / (age - 35)
- education_level: int      # 0-6 ordinal
- is_male: int             # Gender encoding
- is_female: int           # Gender encoding
- is_married: int          # Marital status encoding
- cleaned_at: str          # ISO timestamp
```

---

## Bước 3: Feature Engineering

**File:** `scripts/ml/3_feature_engineering.py`

### 3.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  FEATURE ENGINEERING PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   INPUT: workers_clean.csv (100 rows × 37 columns)                     │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  1. Interaction Features (6 new)                              │       │
│   │     age_exp_product, barrier_weighted, skill_density         │       │
│   │     salary_per_exp, age_squared, exp_ratio                   │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  2. Region Features (6)                                      │       │
│   │     north, north_central, central_highlands                  │       │
│   │     south_east, mekong, unknown                              │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  3. TF-IDF: Skills (200 features)                           │       │
│   │     TfidfVectorizer(max_features=200, ngram_range=(1,2))     │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  4. TF-IDF: Target Job (50 features)                        │       │
│   │     TfidfVectorizer(max_features=50)                        │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  5. One-Hot Encoding (19 features)                          │       │
│   │     employment, job_type, marital_status, region             │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  6. Label Creation                                          │       │
│   │     risk_level: low/medium/high                             │       │
│   └─────────────────────────────────────────────────────────────┘       │
│          ↓                                                               │
│   OUTPUT:                                                               │
│   ├── X_train.csv (100 × 281 features)                                │
│   ├── y_train.csv (100 labels)                                         │
│   └── artifacts/ (vectorizers, encoders)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Class chính

```python
class FeatureEngineer:
    """Class xử lý Feature Engineering cho ML."""
    
    def load_data(self):
        """Đọc dữ liệu đã clean."""
        
    def create_interaction_features(self):
        """Tạo 6 interaction features."""
        
    def create_region_features(self):
        """Map 54 tỉnh → 6 regions."""
        
    def process_skills_tfidf(self):
        """TF-IDF vectorization cho skills."""
        
    def process_target_job_tfidf(self):
        """TF-IDF vectorization cho target_job."""
        
    def encode_categorical(self):
        """One-hot encode categorical variables."""
        
    def create_labels(self):
        """Tạo labels risk_level từ composite score."""
        
    def combine_all_features(self):
        """Combine tất cả features thành matrix."""
        
    def engineer(self):
        """Run full pipeline."""
        
    def save(self, output_dir):
        """Lưu X, y và artifacts."""
```

### 3.3 Risk Score Calculation

```python
# Risk scoring rules (composite score):
# Score càng cao → Risk càng cao

Score = Age_Score + Barrier_Score + Experience_Score + Employment_Score

# Age contribution:
#   >= 60: +3
#   55-59: +2
#   50-54: +1

# Barrier contribution (weighted):
#   health: ×2.0
#   family: ×1.5
#   techGap: ×1.0
#   location: ×0.5
#   other: ×0.5

# Experience contribution:
#   0 years: +3
#   < 3 years: +2
#   < 5 years: +1

# Employment contribution:
#   unemployed: +2
#   retired: +1
#   self-employed: +0.5
#   employed: +0

# Label mapping:
#   score <= 3: low
#   3 < score <= 6: medium
#   score > 6: high
```

### 3.4 Region Mapping

```python
REGION_MAP = {
    'north': ['Hà Nội', 'Hải Phòng', 'Hải Dương', 'Hà Nam', ...],
    'north_central': ['Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', ...],
    'central_highlands': ['Đà Nẵng', 'Quảng Nam', 'Đắk Lắk', ...],
    'south_east': ['HCM', 'Bình Dương', 'Đồng Nai', ...],
    'mekong': ['Cần Thơ', 'An Giang', 'Kiên Giang', ...],
    'unknown': [...]  # Không map được
}
```

### 3.5 Cách chạy

```bash
cd ai-service

# Chạy với file test mặc định
python scripts/ml/3_feature_engineering.py

# Chỉ định file input
python scripts/ml/3_feature_engineering.py --input data/processed/workers_clean.csv

# Chỉ định output directory
python scripts/ml/3_feature_engineering.py --output data/processed/

# Chạy silent
python scripts/ml/3_feature_engineering.py --quiet
```

### 3.6 Test Bước 3

```bash
cd ai-service
python scripts/ml/test_step3.py
```

**Kết quả test:**
```
✅ Interaction Features: 6 features
✅ TF-IDF Skills: 200 features
✅ TF-IDF Jobs: 34 features
✅ Categorical Encoding: 19 features
✅ Label Creation: low (64%), medium (30%), high (6%)

Total: 281 features
```

### 3.7 Output Files

```
data/processed/
├── X_train.csv                    ← Feature matrix (100 × 281)
├── y_train.csv                    ← Labels (100 rows)
└── artifacts/
    ├── feature_artifacts.pkl      ← Vectorizers, encoders
    ├── feature_names.json         ← List of feature names
    └── metadata.json               ← Pipeline metadata
```

### 3.8 Feature Breakdown

| Type | Count | Example |
|------|-------|---------|
| Numerical | 23 | age, experience, salary, barriers |
| One-Hot | 19 | employment, job_type, marital, region |
| TF-IDF Skills | 200 | skill_lái_xe, skill_bán_hàng |
| TF-IDF Jobs | 34 | job_bảo_vệ, job_kỹ_thuật |
| **Total** | **281** | |

---

## Bước 4: Train Model

### Risk Predictor (Random Forest)

```python
# scripts/ml/4_train_risk_model.py
import pandas as pd
import pickle
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, f1_score

def train_risk_model():
    X = pd.read_csv('data/processed/X_train.csv')
    y = pd.read_csv('data/processed/y_train.csv')['risk_level']

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # Train Random Forest
    model = RandomForestClassifier(
        n_estimators=200, max_depth=15,
        min_samples_split=5, min_samples_leaf=2,
        class_weight='balanced', random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"F1 (macro): {f1_score(y_test, y_pred, average='macro'):.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Cross-validation
    cv_scores = cross_val_score(model, X, y_encoded, cv=5, scoring='f1_macro')
    print(f"CV F1: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

    # Save
    os.makedirs('models', exist_ok=True)
    with open('models/risk_predictor.pkl', 'wb') as f:
        pickle.dump({
            'model': model,
            'label_encoder': le,
            'feature_names': X.columns.tolist(),
            'cv_f1': float(cv_scores.mean())
        }, f)
    print("Saved to models/risk_predictor.pkl")
```

### Job Recommender (Content-Based + Collaborative)

```python
# scripts/ml/4_train_recommender.py
import pandas as pd
import numpy as np
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse.linalg import svds

def train_recommender():
    jobs_df = pd.read_csv('ai-service/data/jobs.csv')
    jobs_df['combined_text'] = (
        jobs_df['title'] + ' ' +
        jobs_df['skills'].fillna('').str.replace('|', ' ') + ' ' +
        jobs_df['location'].fillna('')
    )

    # TF-IDF
    tfidf = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
    job_vectors = tfidf.fit_transform(jobs_df['combined_text'])

    # SVD cho Collaborative (nếu có interactions)
    collab_enabled = False
    collab_predictions = None

    try:
        interactions_df = pd.read_csv('data/processed/interactions.csv')
        if len(interactions_df) > 0:
            user_item = interactions_df.pivot_table(
                index='userId', columns='jobId', values='rating', fill_value=0
            )
            U, sigma, Vt = svds(user_item.values.astype(float), k=min(20, min(user_item.shape)-1))
            collab_predictions = pd.DataFrame(
                np.dot(np.dot(U, np.diag(sigma)), Vt),
                index=user_item.index, columns=user_item.columns
            )
            collab_enabled = True
    except FileNotFoundError:
        pass

    os.makedirs('models', exist_ok=True)
    with open('models/job_recommender.pkl', 'wb') as f:
        pickle.dump({
            'tfidf': tfidf,
            'job_vectors': job_vectors,
            'job_data': jobs_df[['id', 'title', 'company', 'skills', 'location',
                                  'salary_min', 'salary_max', 'type']].to_dict('records'),
            'collab_predictions': collab_predictions,
            'collab_enabled': collab_enabled,
            'alpha': 0.7
        }, f)
    print("Saved to models/job_recommender.pkl")
```

---

## Bước 5-6: Tune & Evaluate

```python
# scripts/ml/5_hyperparameter_tuning.py
from sklearn.model_selection import RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier
from scipy.stats import randint

param_dist = {
    'n_estimators': [50, 100, 200, 300, 500],
    'max_depth': [5, 10, 15, 20, None],
    'min_samples_split': [2, 5, 10],
    'class_weight': ['balanced', 'balanced_subsample']
}

rf = RandomForestClassifier(random_state=42, n_jobs=-1)
search = RandomizedSearchCV(rf, param_dist, n_iter=30, cv=5,
                            scoring='f1_macro', random_state=42, n_jobs=-1)
search.fit(X, y_encoded)
print(f"Best CV F1: {search.best_score_:.4f}")
```

```python
# scripts/ml/6_evaluate_models.py
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=le.classes_, yticklabels=le.classes_)
plt.title('Risk Prediction - Confusion Matrix')
plt.savefig('models/evaluation/confusion_matrix.png', dpi=150)
```

---

## Bước 7: Deploy Model

```python
# ai-service/services/ml_models.py
import pickle
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

class RiskPredictorML:
    def __init__(self, model_path="models/risk_predictor.pkl"):
        self.path = Path(__file__).parent.parent / model_path
        self._load()

    def _load(self):
        with open(self.path, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.le = data['label_encoder']
            self.features = data['feature_names']

    def predict(self, features: dict) -> dict:
        vec = np.array([[features.get(f, 0) for f in self.features]])
        pred = self.model.predict(vec)[0]
        prob = self.model.predict_proba(vec)[0]
        level = self.le.inverse_transform([pred])[0]
        score_map = {'low': 0.2, 'medium': 0.5, 'high': 0.8}
        return {
            'risk_level': level,
            'risk_score': score_map.get(level, 0.5),
            'probability': dict(zip(self.le.classes_, prob.tolist())),
            'confidence': float(max(prob))
        }
```

---

## Cấu trúc thư mục ML Pipeline (Updated)

```
ai-service/
├── scripts/ml/
│   ├── 1_export_mongodb.py        ← Export MongoDB
│   ├── 1_generate_mock_data.py   ← Generate mock
│   ├── 1_merge_data.py            ← Merge sources
│   ├── 2_clean_data.py            ← ✅ MỚI: Clean data
│   ├── test_step1.py              ← Test Bước 1
│   ├── test_step2.py              ← ✅ MỚI: Test Bước 2
│   ├── test_step3.py              ← ✅ MỚI: Test Bước 3
│   ├── 3_feature_engineering.py   ← ✅ MỚI: Feature Engineering
│   ├── 4_train_risk_model.py      ← (sắp xây)
│   ├── 4_train_recommender.py     ← (sắp xây)
│   ├── 5_hyperparameter_tuning.py ← (sắp xây)
│   └── 6_evaluate_models.py       ← (sắp xây)
├── data/
│   ├── raw/
│   │   └── workers_mock.csv       ← Mock data (1000 records)
│   └── processed/
│       ├── workers_merged.csv     ← Merged output
│       ├── workers_clean.csv     ← ✅ MỚI: Clean output
│       ├── X_train.csv          ← ✅ MỚI: Features (281)
│       ├── y_train.csv          ← ✅ MỚI: Labels
│       └── artifacts/            ← ✅ MỚI: Vectorizers, encoders
└── models/                        ← (sắp xây)
    └── evaluation/
```
