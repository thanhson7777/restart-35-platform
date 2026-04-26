"""
Worker Quality Enhancer - Nâng cao chất lượng dữ liệu worker
Run: python -m scripts.data.cleaning.worker_quality_enhancer
"""
import pandas as pd
import re
from typing import Dict, List, Tuple
from pathlib import Path
from datetime import datetime


class WorkerQualityEnhancer:
    """Cải thiện chất lượng dữ liệu worker"""
    
    # Location mapping đầy đủ
    LOCATION_NORMALIZATION = {
        # TP.HCM variants
        'tp. hồ chí minh': 'Hồ Chí Minh',
        'tp hcm': 'Hồ Chí Minh', 
        'hcm': 'Hồ Chí Minh',
        'ho chi minh': 'Hồ Chí Minh',
        'hochiminh': 'Hồ Chí Minh',
        'tphcm': 'Hồ Chí Minh',
        # Đà Nẵng variants
        'da nang': 'Đà Nẵng',
        'đà nẵng': 'Đà Nẵng',
        # Các tỉnh/thành khác
        'vinhy': 'Vinh',
        'vĩnh yên': 'Vĩnh Phúc',
        'vinh': 'Vinh',
        'bien hoa': 'Biên Hòa',
        'bienhoa': 'Biên Hòa',
        'vung tau': 'Vũng Tàu',
        'vũng tàu': 'Vũng Tàu',
        'nha trang': 'Nha Trang',
        'nhatrang': 'Nha Trang',
        'qui nhon': 'Quy Nhơn',
        'quy nhơn': 'Quy Nhơn',
        'qui nơn': 'Quy Nhơn',
        'qui nhơn': 'Quy Nhơn',
        'hai phong': 'Hải Phòng',
        'hải phòng': 'Hải Phòng',
        'hai duong': 'Hải Dương',
        'hải dương': 'Hải Dương',
        'thanh hoa': 'Thanh Hóa',
        'thanh hóa': 'Thanh Hóa',
        'nam dinh': 'Nam Định',
        'nam định': 'Nam Định',
        'can tho': 'Cần Thơ',
        'cần thơ': 'Cần Thơ',
        'cantho': 'Cần Thơ',
        'da lat': 'Đà Lạt',
        'đà lạt': 'Đà Lạt',
        'dalat': 'Đà Lạt',
        'buon ma thuot': 'Buôn Ma Thuột',
        'buôn ma thuột': 'Buôn Ma Thuột',
        'buonmathuot': 'Buôn Ma Thuột',
        'tp.hcm': 'Hồ Chí Minh',
        'tphcm': 'Hồ Chí Minh',
    }
    
    # Region mapping
    REGION_MAPPING = {
        # North
        'Hà Nội': 'north', 
        'Hải Dương': 'north', 
        'Hải Phòng': 'north',
        'Bắc Ninh': 'north', 
        'Vĩnh Phúc': 'north', 
        'Thái Nguyên': 'north',
        'Nam Định': 'north', 
        'Thanh Hóa': 'north', 
        'Ninh Bình': 'north',
        'Vinh': 'north',
        'Hưng Yên': 'north', 
        'Hà Nam': 'north', 
        'Quảng Ninh': 'north',
        # Central
        'Đà Nẵng': 'central', 
        'Huế': 'central', 
        'Quảng Nam': 'central',
        'Quảng Ngãi': 'central', 
        'Bình Định': 'central',
        'Quy Nhơn': 'central',
        'Qui Nhơn': 'central',  # Alt spelling with dấu
        'Nha Trang': 'central',  # Khánh Hòa
        'Phú Yên': 'central',
        # Central Highlands
        'Đà Lạt': 'central_highlands',
        'Buôn Ma Thuột': 'central_highlands',
        'Gia Lai': 'central_highlands',
        'Đắk Lắk': 'central_highlands',
        # South East
        'Hồ Chí Minh': 'south_east', 
        'Biên Hòa': 'south_east',
        'Bình Dương': 'south_east', 
        'Vũng Tàu': 'south_east',
        'Đồng Nai': 'south_east',
        'Tây Ninh': 'south_east',
        'Bà Rịa': 'south_east',
        # Mekong
        'Cần Thơ': 'mekong', 
        'An Giang': 'mekong', 
        'Đồng Tháp': 'mekong',
        'Tiền Giang': 'mekong',
        'Vĩnh Long': 'mekong',
        'Bến Tre': 'mekong',
        'Kiên Giang': 'mekong',
        'Sóc Trăng': 'mekong',
        'Bạc Liêu': 'mekong',
        'Cà Mau': 'mekong',
        'Trà Vinh': 'mekong',
        'Hậu Giang': 'mekong',
    }
    
    # Education standardization
    EDUCATION_FIXES = {
        'none': 'primary',
        'none ': 'primary',
        'middle': 'upper_secondary',
        'high': 'upper_secondary',
        'high_school': 'upper_secondary',
        'vocational': 'college',
        'trung cap': 'college',
        'cao dang': 'college',
        'trung cấp': 'college',
        'cao đẳng': 'college',
    }
    
    # Job title to skills mapping
    JOB_TO_SKILLS = {
        'nhân viên kho vận': ['kho bãi', 'xuất nhập khẩu', 'quản lý hàng hóa', 'sắp xếp', 'kiểm kê'],
        'kế toán / hành chính': ['kế toán', 'hành chính', 'văn phòng', 'excel', 'word'],
        'công nhân sản xuất': ['sản xuất', 'lắp ráp', 'vận hành máy', 'kiểm tra chất lượng'],
        'nhân viên bán hàng': ['bán hàng', 'tư vấn', 'chăm sóc khách hàng', 'quản lý tồn kho'],
        'nông dân / nông nghiệp': ['nông nghiệp', 'trồng trọt', 'chăn nuôi', 'thu hoạch'],
        'lái xe': ['lái xe', 'bằng lái', 'vận chuyển', 'định vị', 'bảo trì xe'],
        'giúp việc / dịch vụ': ['dọn dẹp', 'giặt là', 'nấu ăn', 'chăm sóc', 'phục vụ'],
        'nhân viên phục vụ': ['phục vụ', 'chào hỏi', 'order', 'dọn bàn', 'barista'],
        'bảo vệ': ['bảo vệ', 'an ninh', 'tuần tra', 'kiểm tra', 'báo cáo'],
        'thợ lành nghề': ['thợ', 'tay nghề', 'sửa chữa', 'gia công', 'chế tạo'],
        'pha chế': ['pha chế', 'barista', 'đồ uống', 'trang trí', 'vệ sinh'],
        'lao động xây dựng': ['xây dựng', 'công trình', 'xây tô', 'lát gạch', 'sơn'],
        'nấu ăn': ['nấu ăn', 'ẩm thực', 'chế biến', 'trang trí món ăn', 'vệ sinh'],
    }
    
    def __init__(self):
        self.stats = {
            'total': 0,
            'location_fixed': 0,
            'region_mapped': 0,
            'education_fixed': 0,
            'salary_anomalies': 0,
            'age_anomalies': 0,
            'skills_enriched': 0,
            'quality_a': 0,
            'quality_b': 0,
            'quality_c': 0,
            'quality_d': 0,
        }
    
    def enhance(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """Main enhancement pipeline"""
        print("=" * 60)
        print("WORKER QUALITY ENHANCER")
        print("=" * 60)
        print(f"\nInput: {len(df)} records")
        
        self.stats['total'] = len(df)
        df = df.copy()
        
        # 1. Normalize location
        print("\n[1/6] Normalizing locations...")
        df = self._normalize_locations(df)
        
        # 2. Map regions
        print("[2/6] Mapping regions...")
        df = self._map_regions(df)
        
        # 3. Fix education levels
        print("[3/6] Fixing education levels...")
        df = self._fix_education(df)
        
        # 4. Validate and fix age
        print("[4/6] Validating ages...")
        df = self._validate_ages(df)
        
        # 5. Analyze salary patterns
        print("[5/6] Analyzing salary patterns...")
        df = self._analyze_salary(df)
        
        # 6. Enrich skills from job titles
        print("[6/6] Enriching skills from job titles...")
        df = self._enrich_skills(df)
        
        # 7. Add quality flags
        df = self._add_quality_flags(df)
        
        print("\n" + "=" * 60)
        print("ENHANCEMENT COMPLETE")
        print("=" * 60)
        
        return df, self.stats
    
    def _normalize_locations(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize location names"""
        def normalize_loc(loc):
            if pd.isna(loc):
                return None
            loc_lower = str(loc).lower().strip()
            
            # Check direct match
            for pattern, normalized in self.LOCATION_NORMALIZATION.items():
                if pattern == loc_lower or pattern in loc_lower:
                    self.stats['location_fixed'] += 1
                    return normalized
            
            # Title case for proper locations
            return str(loc).strip()
        
        df['location_normalized'] = df['location'].apply(normalize_loc)
        return df
    
    def _map_regions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map locations to regions"""
        def get_region(loc):
            if pd.isna(loc):
                return 'unknown'
            loc_str = str(loc).lower()
            for city, region in self.REGION_MAPPING.items():
                if city.lower() in loc_str or loc_str in city.lower():
                    self.stats['region_mapped'] += 1
                    return region
            return 'unknown'
        
        df['region'] = df['location_normalized'].apply(get_region)
        return df
    
    def _fix_education(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize education levels"""
        def fix_edu(edu):
            if pd.isna(edu):
                return 'any'
            edu_lower = str(edu).lower().strip()
            
            if edu_lower in self.EDUCATION_FIXES:
                self.stats['education_fixed'] += 1
                return self.EDUCATION_FIXES[edu_lower]
            return edu_lower
        
        df['education'] = df['education'].apply(fix_edu)
        return df
    
    def _validate_ages(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate and flag age anomalies"""
        def validate_age(age):
            try:
                age = int(float(age))
                if age < 18 or age > 75:
                    self.stats['age_anomalies'] += 1
                    return None
                return age
            except:
                self.stats['age_anomalies'] += 1
                return None
        
        df['age'] = df['age'].apply(validate_age)
        return df
    
    def _analyze_salary(self, df: pd.DataFrame) -> pd.DataFrame:
        """Analyze salary patterns and flag anomalies"""
        df['salary_anomaly'] = False
        
        # Unemployed with high salary (> 10M)
        mask1 = (df['employment_status'] == 'unemployed') & (df['current_salary'] > 10_000_000)
        df.loc[mask1, 'salary_anomaly'] = True
        self.stats['salary_anomalies'] += mask1.sum()
        
        # Self-employed with 0 salary
        mask2 = (df['employment_status'] == 'self-employed') & (df['current_salary'] == 0)
        df.loc[mask2, 'salary_anomaly'] = True
        self.stats['salary_anomalies'] += mask2.sum()
        
        # Flag retired with 0 (might be pension, keep but flag)
        df['salary_zero_retired'] = (df['employment_status'] == 'retired') & (df['current_salary'] == 0)
        
        return df
    
    def _enrich_skills(self, df: pd.DataFrame) -> pd.DataFrame:
        """Enrich skills based on target_job"""
        def extract_skills(row):
            current_skills = str(row.get('skills', '')).lower()
            target_job = str(row.get('target_job', '')).lower()
            
            # Skip if already has good skills
            if 'salary_range' not in current_skills and 'skills' in current_skills:
                if len(current_skills.split('|')) > 2:
                    return row.get('skills', '')
            
            # Extract skills from job title
            new_skills = []
            for job_pattern, skills_list in self.JOB_TO_SKILLS.items():
                if job_pattern in target_job:
                    new_skills.extend(skills_list[:3])  # Take top 3 skills
                    break
            
            if new_skills:
                self.stats['skills_enriched'] += 1
                # Combine with existing
                all_skills = list(set(new_skills))
                return '|'.join(sorted(all_skills)) + '|salary_range'
            
            return row.get('skills', '')
        
        df['skills'] = df.apply(extract_skills, axis=1)
        return df
    
    def _add_quality_flags(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add overall quality flags"""
        def quality_score(row):
            score = 100
            # Deduct for missing normalized location
            if pd.isna(row.get('location_normalized')) or row.get('location_normalized') == 'unknown':
                score -= 20
            # Deduct for missing region
            if row.get('region') == 'unknown':
                score -= 15
            # Deduct for age issues
            if pd.isna(row.get('age')):
                score -= 30
            # Deduct for salary anomaly
            if row.get('salary_anomaly'):
                score -= 25
            # Deduct for poor education
            if row.get('education') == 'none':
                score -= 10
            return max(0, score)
        
        df['quality_score'] = df.apply(quality_score, axis=1)
        df['quality_grade'] = df['quality_score'].apply(
            lambda x: 'A' if x >= 90 else 'B' if x >= 70 else 'C' if x >= 50 else 'D'
        )
        
        # Update quality stats
        self.stats['quality_a'] = (df['quality_grade'] == 'A').sum()
        self.stats['quality_b'] = (df['quality_grade'] == 'B').sum()
        self.stats['quality_c'] = (df['quality_grade'] == 'C').sum()
        self.stats['quality_d'] = (df['quality_grade'] == 'D').sum()
        
        return df


def run_enhancement():
    """Run enhancement pipeline"""
    import sys
    # Fix Unicode output on Windows
    sys.stdout.reconfigure(encoding='utf-8')
    
    # Paths
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent.parent / 'data'
    input_path = data_dir / 'workers.csv'
    output_path = data_dir / 'workers_enhanced.csv'
    
    print(f"\nInput path: {input_path}")
    print(f"Output path: {output_path}")
    
    # Load data
    print("\nLoading data...")
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} records")
    
    # Run enhancement
    enhancer = WorkerQualityEnhancer()
    df_enhanced, stats = enhancer.enhance(df)
    
    # Save enhanced data
    print(f"\nSaving enhanced data to {output_path}...")
    df_enhanced.to_csv(output_path, index=False)
    
    # Generate report
    report = f"""
================================================================
              WORKER DATA QUALITY ENHANCEMENT REPORT          
================================================================

OVERVIEW
---------------------------------------------------------------
  Total records processed: {stats['total']:,}

FIXES APPLIED
---------------------------------------------------------------
  Locations normalized:     {stats['location_fixed']:>5} ({100*stats['location_fixed']/max(1,stats['total']):.1f}%)
  Regions mapped:           {stats['region_mapped']:>5} ({100*stats['region_mapped']/max(1,stats['total']):.1f}%)
  Education fixed:          {stats['education_fixed']:>5} ({100*stats['education_fixed']/max(1,stats['total']):.1f}%)
  Ages validated:           {stats['total'] - stats['age_anomalies']:>5} valid, {stats['age_anomalies']} invalid
  Salary anomalies found:   {stats['salary_anomalies']:>5}
  Skills enriched:          {stats['skills_enriched']:>5}

QUALITY DISTRIBUTION
---------------------------------------------------------------
  Grade A (90-100):         {stats['quality_a']:>5} ({100*stats['quality_a']/max(1,stats['total']):.1f}%)
  Grade B (70-89):          {stats['quality_b']:>5} ({100*stats['quality_b']/max(1,stats['total']):.1f}%)
  Grade C (50-69):          {stats['quality_c']:>5} ({100*stats['quality_c']/max(1,stats['total']):.1f}%)
  Grade D (0-49):           {stats['quality_d']:>5} ({100*stats['quality_d']/max(1,stats['total']):.1f}%)

OUTPUT
---------------------------------------------------------------
  File: {output_path.name}
  Records saved: {len(df_enhanced):,}
  Average quality score: {df_enhanced['quality_score'].mean():.1f}/100

  Enhancement completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    print(report)
    
    # Show sample of improvements
    print("\nSAMPLE IMPROVEMENTS:")
    print("-" * 60)
    sample_cols = ['id', 'location', 'location_normalized', 'region', 'education', 'quality_grade']
    available_cols = [c for c in sample_cols if c in df_enhanced.columns]
    print(df_enhanced[available_cols].head(10).to_string(index=False))
    
    # Show region distribution
    print("\nREGION DISTRIBUTION:")
    print("-" * 60)
    if 'region' in df_enhanced.columns:
        region_counts = df_enhanced['region'].value_counts()
        for region, count in region_counts.items():
            print(f"  {region:20} : {count:>5} ({100*count/len(df_enhanced):.1f}%)")
    
    return df_enhanced, stats


if __name__ == '__main__':
    df_result, stats_result = run_enhancement()
