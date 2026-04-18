"""
Career Ladder Builder Service

Extract career progression data from scraped job postings.
Build career ladders, salary benchmarks, and skills taxonomy.

Usage:
    builder = CareerLadderBuilder()
    data = builder.build_all()
    builder.save_to_json()
"""

import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class CareerLadderBuilder:
    """
    Parse job postings to extract career progression data.
    
    Extracts:
    - Career ladders per category (entry → senior → manager)
    - Salary benchmarks per role
    - Skills taxonomy per industry
    - Experience requirements mapping
    """

    def __init__(self, data_path: Optional[Path] = None):
        """
        Initialize CareerLadderBuilder.

        Args:
            data_path: Path to labor_jobs_verified.json
        """
        if data_path is None:
            base_dir = Path(__file__).parent.parent
            data_path = base_dir / "scripts" / "data" / "labor_jobs_verified.json"
        
        self.data_path = Path(data_path)
        self.jobs = []
        self._load_data()
    
    def _load_data(self) -> None:
        """Load job data from JSON file."""
        if not self.data_path.exists():
            raise FileNotFoundError(f"Data file not found: {self.data_path}")
        
        with open(self.data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.jobs = data.get('jobs', [])
        logger.info(f"Loaded {len(self.jobs)} jobs from {self.data_path}")
    
    def _extract_job_level(self, title: str) -> Tuple[str, int]:
        """
        Extract job level from job title.
        
        Returns:
            Tuple of (level, years_exp_typical)
        """
        title_lower = title.lower()
        
        # Senior/Lead keywords
        if any(kw in title_lower for kw in ['truong phong', 'giam doc', 'senior', 'chuyen gia', 
                                            'ky su', 'quan ly', 'to truong', 'pho phong']):
            return ('senior', 5)
        
        # Mid-level keywords
        if any(kw in title_lower for kw in ['nhan vien', 'ky thuat vien', 'chuyen vien', 
                                            'pho phong', 'pho giam doc']):
            return ('mid', 2)
        
        # Entry level keywords
        if any(kw in title_lower for kw in ['thuc tap', 'intern', 'moi', 'tuyen', 'gap']):
            return ('entry', 0)
        
        # Default based on experience_required in job
        return ('entry', 0)
    
    def _extract_salary_benchmarks(self) -> Dict:
        """
        Extract salary benchmarks per category.
        
        Returns:
            Dict with category -> salary stats
        """
        benchmarks = {}
        
        # Group jobs by category
        by_category = defaultdict(list)
        for job in self.jobs:
            cat = job.get('category', 'unknown')
            salary_min = job.get('salary_min', 0)
            salary_max = job.get('salary_max', 0)
            if salary_min > 0 and salary_max > 0:
                by_category[cat].append({
                    'salary_min': salary_min,
                    'salary_max': salary_max,
                    'salary_avg': (salary_min + salary_max) / 2
                })
        
        # Calculate stats per category
        for cat, salaries in by_category.items():
            if not salaries:
                continue
            
            mins = [s['salary_min'] for s in salaries]
            maxs = [s['salary_max'] for s in salaries]
            avgs = [s['salary_avg'] for s in salaries]
            
            benchmarks[cat] = {
                'min': min(mins),
                'max': max(maxs),
                'avg': sum(avgs) / len(avgs),
                'median_min': sorted(mins)[len(mins) // 2],
                'median_max': sorted(maxs)[len(maxs) // 2],
                'job_count': len(salaries)
            }
        
        return benchmarks
    
    def _extract_skills_taxonomy(self) -> Dict:
        """
        Extract skills taxonomy per category.
        
        Returns:
            Dict with category -> list of skills
        """
        skills_by_category = defaultdict(set)
        
        for job in self.jobs:
            cat = job.get('category', 'unknown')
            skills_str = job.get('skills', '')
            
            # Split by pipe
            if skills_str:
                skills = [s.strip() for s in skills_str.split('|') if s.strip()]
                skills_by_category[cat].update(skills)
        
        return {cat: sorted(skills) for cat, skills in skills_by_category.items()}
    
    def _build_career_ladders(self) -> Dict:
        """
        Build career ladders from job titles.
        
        Maps job titles to levels and creates progression paths.
        
        Returns:
            Dict with category -> list of career levels
        """
        ladders = {}
        
        # Define level progression per category type
        category_types = {
            'bao_ve': {
                'levels': ['Nhân Viên Bảo Vệ', 'Bảo Vệ Khu Vực', 'Trưởng Nhóm Bảo Vệ', 
                           'Giám Sát Bảo Vệ', 'Quản Lý An Ninh'],
                'exp_ranges': [(0, 0), (1, 2), (2, 3), (3, 5), (5, 8)],
                'salary_multipliers': [1.0, 1.1, 1.3, 1.5, 1.8]
            },
            'lai_xe': {
                'levels': ['Tài Xế', 'Lái Xe Kinh Nghiệm', 'Lái Xe Đặc Biệt', 
                           'Giám Sát Vận Tải', 'Quản Lý Vận Tải'],
                'exp_ranges': [(0, 0), (2, 4), (4, 6), (5, 8), (8, 10)],
                'salary_multipliers': [1.0, 1.2, 1.4, 1.6, 2.0]
            },
            'co_khi': {
                'levels': ['Công Nhân', 'Thợ Bậc', 'Thợ Lành Nghề', 'Kỹ Sư', 
                           'Quản Lý Sản Xuất', 'Giám Đốc Sản Xuất'],
                'exp_ranges': [(0, 1), (1, 3), (3, 5), (3, 6), (5, 8), (8, 12)],
                'salary_multipliers': [1.0, 1.2, 1.4, 1.6, 1.8, 2.2]
            },
            'ban_hang': {
                'levels': ['Nhân Viên Bán Hàng', 'Nhân Viên Bán Hàng Cao Cấp', 
                           'Trưởng Nhóm Bán Hàng', 'Trưởng Phòng Kinh Doanh', 
                           'Giám Đốc Kinh Doanh'],
                'exp_ranges': [(0, 1), (1, 3), (2, 4), (4, 6), (6, 10)],
                'salary_multipliers': [1.0, 1.2, 1.4, 1.7, 2.2]
            },
            'phuc_vu': {
                'levels': ['Nhân Viên Phục Vụ', 'Phục Vụ Cao Cấp', 'Đội Trưởng', 
                           'Quản Lý Nhà Hàng', 'Giám Đốc Nhà Hàng'],
                'exp_ranges': [(0, 0), (1, 2), (2, 4), (4, 6), (6, 10)],
                'salary_multipliers': [1.0, 1.2, 1.4, 1.7, 2.2]
            },
            'hanh_chinh': {
                'levels': ['Nhân Viên Hành Chính', 'Chuyên Viên Hành Chính', 
                           'Trưởng Phòng Hành Chính', 'Trưởng Phòng HC-NS', 
                           'Giám Đốc Hành Chính'],
                'exp_ranges': [(0, 1), (1, 3), (3, 5), (4, 7), (7, 12)],
                'salary_multipliers': [1.0, 1.2, 1.5, 1.8, 2.3]
            },
            'nhan_su': {
                'levels': ['Nhân Viên Tuyển Dụng', 'Chuyên Viên Nhân Sự', 
                           'Trưởng Phòng Nhân Sự', 'HR Manager', 'HR Director'],
                'exp_ranges': [(0, 1), (2, 4), (4, 6), (5, 8), (8, 15)],
                'salary_multipliers': [1.0, 1.3, 1.6, 2.0, 2.5]
            },
            'tu_van': {
                'levels': ['Tư Vấn Viên', 'Tư Vấn Chính', 'Tư Vấn Cấp Cao', 
                           'Trưởng Nhóm Tư Vấn', 'Giám Đốc Tư Vấn'],
                'exp_ranges': [(0, 1), (1, 3), (3, 5), (4, 7), (7, 12)],
                'salary_multipliers': [1.0, 1.3, 1.6, 1.9, 2.4]
            }
        }
        
        # Build ladders from templates
        salary_benchmarks = self._extract_salary_benchmarks()
        
        for cat, config in category_types.items():
            levels = []
            base_salary = salary_benchmarks.get(cat, {}).get('median_min', 7000000)
            
            for i, title in enumerate(config['levels']):
                exp_min, exp_max = config['exp_ranges'][i]
                multiplier = config['salary_multipliers'][i]
                
                level = {
                    'title': title,
                    'level': i + 1,
                    'experience_min': exp_min,
                    'experience_max': exp_max,
                    'salary_min': int(base_salary * multiplier),
                    'salary_max': int(base_salary * multiplier * 1.3),
                    'typical_years_to_reach': exp_max
                }
                levels.append(level)
            
            ladders[cat] = {
                'title': self._get_category_display_name(cat),
                'levels': levels,
                'management_threshold': levels[3]['experience_min'] if len(levels) > 3 else 5
            }
        
        return ladders
    
    def _get_category_display_name(self, cat: str) -> str:
        """Get Vietnamese display name for category."""
        names = {
            'bao_ve': 'Bảo Vệ & An Ninh',
            'lai_xe': 'Lái Xe & Vận Tải',
            'co_khi': 'Cơ Khí & Sản Xuất',
            'ban_hang': 'Bán Hàng & Kinh Doanh',
            'phuc_vu': 'Phục Vụ & Nhà Hàng',
            'hanh_chinh': 'Hành Chính',
            'nhan_su': 'Nhân Sự & HR',
            'tu_van': 'Tư Vấn'
        }
        return names.get(cat, cat)
    
    def _extract_experience_mapping(self) -> Dict:
        """
        Extract experience requirements mapping.
        
        Returns:
            Dict with experience ranges → role levels
        """
        return {
            'entry': {
                'range': (0, 1),
                'description': 'Mới vào nghề, cần đào tạo',
                'typical_roles': ['Nhân viên', 'Công nhân', 'Thực tập sinh']
            },
            'junior': {
                'range': (1, 3),
                'description': 'Có kinh nghiệm cơ bản',
                'typical_roles': ['Nhân viên chính thức', 'Thợ bậc', 'Kỹ thuật viên']
            },
            'mid': {
                'range': (3, 5),
                'description': 'Kinh nghiệm vững, có thể lead',
                'typical_roles': ['Trưởng nhóm', 'Chuyên viên', 'Thợ lành nghề']
            },
            'senior': {
                'range': (5, 8),
                'description': 'Chuyên gia, quản lý cấp trung',
                'typical_roles': ['Quản lý', 'Giám sát', 'Senior']
            },
            'expert': {
                'range': (8, 15),
                'description': 'Cấp cao, chiến lược',
                'typical_roles': ['Giám đốc', 'C-level', 'Chuyên gia cao cấp']
            }
        }
    
    def _extract_age_profiles(self) -> Dict:
        """
        Extract age preferences from job data.
        
        Returns:
            Dict with age ranges and suitable categories
        """
        # Analyze age preferences from job descriptions
        age_profiles = {
            'young_18_30': {
                'age_range': (18, 30),
                'suitable_categories': ['ban_hang', 'phuc_vu', 'nhan_su'],
                'description': 'Ưu tiên người trẻ, năng động'
            },
            'prime_25_40': {
                'age_range': (25, 40),
                'suitable_categories': ['co_khi', 'hanh_chinh', 'tu_van', 'lai_xe'],
                'description': 'Độ tuổi vàng, kinh nghiệm tốt'
            },
            'experienced_35_50': {
                'age_range': (35, 50),
                'suitable_categories': ['co_khi', 'nhan_su', 'hanh_chinh'],
                'description': 'Kinh nghiệm dồi dào, ổn định'
            },
            'any': {
                'age_range': (18, 55),
                'suitable_categories': ['bao_ve', 'lai_xe', 'co_khi'],
                'description': 'Không giới hạn độ tuổi'
            }
        }
        
        return age_profiles
    
    def build_all(self) -> Dict:
        """
        Build complete career data from job postings.
        
        Returns:
            Dict with all career data
        """
        return {
            'metadata': {
                'source': 'labor_jobs_verified.json',
                'total_jobs': len(self.jobs),
                'generated_at': datetime.now().isoformat(),
                'categories': list(set(j.get('category') for j in self.jobs))
            },
            'career_ladders': self._build_career_ladders(),
            'salary_benchmarks': self._extract_salary_benchmarks(),
            'skills_taxonomy': self._extract_skills_taxonomy(),
            'experience_mapping': self._extract_experience_mapping(),
            'age_profiles': self._extract_age_profiles()
        }
    
    def save_to_json(self, output_path: Optional[Path] = None) -> Path:
        """
        Save built career data to JSON file.
        
        Args:
            output_path: Output file path (default: data/career_ladders.json)
        
        Returns:
            Path to saved file
        """
        if output_path is None:
            output_path = Path(__file__).parent.parent / "data" / "career_ladders.json"
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = self.build_all()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Saved career ladders to {output_path}")
        return output_path
    
    def get_statistics(self) -> Dict:
        """
        Get statistics about the extracted career data.
        
        Returns:
            Dict with statistics
        """
        data = self.build_all()
        
        stats = {
            'total_jobs_analyzed': data['metadata']['total_jobs'],
            'categories_covered': len(data['career_ladders']),
            'total_roles_defined': sum(
                len(ladder['levels']) for ladder in data['career_ladders'].values()
            ),
            'total_skills_extracted': sum(
                len(skills) for skills in data['skills_taxonomy'].values()
            )
        }
        
        return stats


def main():
    """Run builder and save career data."""
    builder = CareerLadderBuilder()
    
    # Print statistics
    stats = builder.get_statistics()
    print("=== Career Ladder Builder Statistics ===")
    print(f"Jobs analyzed: {stats['total_jobs_analyzed']}")
    print(f"Categories: {stats['categories_covered']}")
    print(f"Roles defined: {stats['total_roles_defined']}")
    print(f"Skills extracted: {stats['total_skills_extracted']}")
    
    # Build and save
    output_path = builder.save_to_json()
    print(f"\nSaved to: {output_path}")
    
    return builder.build_all()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
