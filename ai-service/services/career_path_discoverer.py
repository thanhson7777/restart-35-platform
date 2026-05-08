"""
Career Path Discoverer Service

Rule-based career path discovery engine.
Finds career progression paths based on user profile (experience, age, skills).

Usage:
    discoverer = CareerPathDiscoverer()
    paths = discoverer.discover_career_paths(user_profile)
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class WorkExperience:
    """User's work experience."""
    industry: str
    role: str
    years: float
    skills: List[str] = field(default_factory=list)


@dataclass
class UserProfile:
    """User profile for career path discovery."""
    age: int
    experiences: List[WorkExperience]
    target_salary: Optional[int] = None
    work_preference: Optional[str] = None  # 'remote', 'hybrid', 'onsite'
    
    @property
    def total_years_experience(self) -> float:
        return sum(exp.years for exp in self.experiences)
    
    @property
    def primary_industry(self) -> str:
        if not self.experiences:
            return 'unknown'
        return max(self.experiences, key=lambda x: x.years).industry
    
    @property
    def primary_role(self) -> str:
        if not self.experiences:
            return 'unknown'
        return max(self.experiences, key=lambda x: x.years).role
    
    @property
    def all_skills(self) -> List[str]:
        skills = set()
        for exp in self.experiences:
            skills.update(exp.skills)
        return list(skills)


@dataclass
class CareerPath:
    """A potential career path recommendation."""
    path_type: str  # 'management', 'age_transition', 'skill_upgrade'
    title: str
    description: str
    urgency: str  # 'low', 'medium', 'high', 'critical'
    score: float = 0.0
    salary_min: int = 0
    salary_max: int = 0
    timeline_months: int = 0
    requirements: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)
    pros: List[str] = field(default_factory=list)
    cons: List[str] = field(default_factory=list)
    reasoning: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            'path_type': self.path_type,
            'title': self.title,
            'description': self.description,
            'urgency': self.urgency,
            'score': round(self.score, 2),
            'salary_range': {
                'min': self.salary_min,
                'max': self.salary_max,
                'display': f"{self.salary_min//1000000}-{self.salary_max//1000000}M"
            },
            'timeline_months': self.timeline_months,
            'requirements': self.requirements,
            'missing_skills': self.missing_skills,
            'pros': self.pros,
            'cons': self.cons,
            'reasoning': self.reasoning
        }


class CareerPathDiscoverer:
    """
    Rule-based career path discovery engine.
    
    Analyzes user profile and suggests:
    1. Management Track: Next steps for career progression
    2. Age Transition: Alternative paths based on age
    3. Skill Upgrade: Missing skills to acquire
    """
    
    # Scoring weights
    WEIGHTS = {
        'experience_match': 0.40,
        'age_fit': 0.30,
        'skills_transfer': 0.20,
        'salary_match': 0.10
    }
    
    def __init__(self, data_path: Optional[Path] = None):
        """
        Initialize CareerPathDiscoverer.
        
        Args:
            data_path: Path to data folder (default: ai-service/data/)
        """
        if data_path is None:
            data_path = Path(__file__).parent.parent / "data"
        
        self.data_path = Path(data_path)
        self._load_data()
    
    def _load_data(self) -> None:
        """Load career ladder and transition data."""
        # Load career ladders
        career_ladders_path = self.data_path / "career_ladders.json"
        with open(career_ladders_path, 'r', encoding='utf-8') as f:
            self.career_data = json.load(f)
        
        # Load age transitions
        age_transitions_path = self.data_path / "age_transitions.json"
        with open(age_transitions_path, 'r', encoding='utf-8') as f:
            self.age_data = json.load(f)
        
        logger.info("Loaded career data: {} categories, {} age brackets".format(
            len(self.career_data['career_ladders']),
            len(self.age_data['age_brackets'])
        ))
    
    def _get_age_bracket(self, age: int) -> str:
        """Get age bracket key from age."""
        if age < 25:
            return '20_25'
        elif age < 30:
            return '25_30'
        elif age < 35:
            return '30_35'
        elif age < 40:
            return '35_40'
        elif age < 50:
            return '40_50'
        else:
            return '50_plus'
    
    def _get_experience_level(self, years: float) -> str:
        """Get experience level from years."""
        if years < 1:
            return 'entry'
        elif years < 3:
            return 'junior'
        elif years < 5:
            return 'mid'
        elif years < 8:
            return 'senior'
        else:
            return 'expert'
    
    def _calculate_experience_score(self, user_years: float, required_years: int) -> float:
        """Calculate experience match score."""
        if required_years == 0:
            return 1.0
        
        ratio = user_years / required_years
        
        if ratio >= 1.5:
            return 1.0  # Overqualified
        elif ratio >= 1.0:
            return 0.9  # Just right
        elif ratio >= 0.7:
            return 0.7  # Slightly under
        elif ratio >= 0.5:
            return 0.4  # Under
        else:
            return 0.2  # Way under
    
    def _calculate_age_score(self, age: int, typical_age_range: tuple) -> float:
        """Calculate age fit score."""
        min_age, max_age = typical_age_range
        
        if min_age <= age <= max_age:
            return 1.0
        elif age < min_age:
            return max(0.2, 1.0 - (min_age - age) * 0.1)
        else:
            # Age above max - still viable if experienced
            return max(0.3, 1.0 - (age - max_age) * 0.1)
    
    def _calculate_skills_transfer_score(self, user_skills: List[str], 
                                          required_skills: List[str]) -> float:
        """Calculate skills transferability score."""
        if not required_skills:
            return 1.0
        
        user_skills_lower = set(s.lower() for s in user_skills)
        required_lower = set(s.lower() for s in required_skills)
        
        overlap = user_skills_lower & required_lower
        return len(overlap) / len(required_lower)
    
    def _calculate_salary_score(self, target: int, job_min: int, job_max: int) -> float:
        """Calculate salary match score."""
        if target is None or target == 0:
            return 0.5  # Neutral
        
        if job_min <= target <= job_max:
            return 1.0
        
        if target < job_min:
            # User expects less than offered - good for them
            return min(1.0, target / job_min + 0.5)
        else:
            # User expects more than max
            return max(0.2, 1.0 - (target - job_max) / job_max)
    
    def discover_management_track(self, profile: UserProfile) -> List[CareerPath]:
        """
        Discover management/progression track within user's industry.

        Args:
            profile: User profile

        Returns:
            List of career path recommendations
        """
        paths = []
        primary_industry = profile.primary_industry

        # Get career ladder for user's industry
        ladder = self.career_data['career_ladders'].get(primary_industry)
        if not ladder:
            # Try to find similar industry
            ladder = self._find_similar_ladder(primary_industry)

        if not ladder:
            # No ladder found - return default management paths
            logger.info(f"No career ladder found for industry '{primary_industry}', returning default management paths")
            return self._get_default_management_paths(profile)

        user_exp_level = self._get_experience_level(profile.total_years_experience)
        current_level_idx = self._find_current_level(ladder, profile)

        # Find next levels (progression)
        for i, level in enumerate(ladder['levels']):
            if i <= current_level_idx:
                continue

            # Skip more than 2 levels ahead
            if i > current_level_idx + 2:
                break

            # Calculate scores
            exp_score = self._calculate_experience_score(
                profile.total_years_experience,
                level['experience_min']
            )

            # Estimate salary score
            salary_score = self._calculate_salary_score(
                profile.target_salary,
                level['salary_min'],
                level['salary_max']
            )

            skills_score = self._calculate_skills_transfer_score(
                profile.all_skills,
                []  # No specific skills required for this demo
            )

            # Calculate final score
            final_score = (
                exp_score * self.WEIGHTS['experience_match'] +
                skills_score * self.WEIGHTS['skills_transfer'] +
                salary_score * self.WEIGHTS['salary_match']
            )

            # Build reasoning
            reasoning = []
            if exp_score >= 0.9:
                reasoning.append(f"Bạn có {profile.total_years_experience:.1f} năm kinh nghiệm, phù hợp với yêu cầu {level['experience_min']}+ năm")
            else:
                reasoning.append(f"Cần thêm {level['experience_min'] - profile.total_years_experience:.1f} năm kinh nghiệm để đạt vai trò này")

            if 'management_threshold' in ladder and i >= ladder['management_threshold']:
                reasoning.append("Đây là vị trí quản lý - bạn có cơ hội thăng tiến")

            path = CareerPath(
                path_type='management',
                title=level['title'],
                description=f"Thăng tiến trong ngành {ladder['title']}",
                urgency=self._get_urgency_for_level(profile.age, i),
                score=final_score,
                salary_min=level['salary_min'],
                salary_max=level['salary_max'],
                timeline_months=level.get('typical_years_to_reach', 2) * 12,
                requirements=self._get_level_requirements(level),
                reasoning=reasoning
            )
            paths.append(path)

        # If no paths found through ladder, get defaults
        if not paths:
            return self._get_default_management_paths(profile)

        # Sort by score
        paths.sort(key=lambda x: x.score, reverse=True)
        return paths[:5]  # Top 5

    def _get_default_management_paths(self, profile: UserProfile) -> List[CareerPath]:
        """Get default management paths when no specific career ladder found."""
        paths = []

        # Universal management paths
        management_paths = [
            {
                'title': 'Trưởng nhóm',
                'description': 'Phát triển kỹ năng lãnh đạo và quản lý đội nhóm nhỏ',
                'urgency': 'medium',
                'score': 0.7,
                'salary_min': 12000000,
                'salary_max': 18000000,
                'timeline': 6,
                'requirements': ['Kỹ năng lãnh đạo', 'Giao tiếp', 'Tổ chức'],
                'missing_skills': ['Leadership', 'Team Management'],
                'pros': ['Cơ hội thăng tiến', 'Phát triển kỹ năng mềm'],
                'cons': ['Trách nhiệm cao hơn', 'Cần thời gian thích nghi']
            },
            {
                'title': 'Quản lý cấp trung',
                'description': 'Quản lý bộ phận hoặc phòng ban với nhiều nhân viên',
                'urgency': 'high' if profile.age >= 40 else 'medium',
                'score': 0.65,
                'salary_min': 18000000,
                'salary_max': 35000000,
                'timeline': 12,
                'requirements': ['Quản lý nhóm', 'Báo cáo', 'Ra quyết định'],
                'missing_skills': ['Strategic Planning', 'Budget Management'],
                'pros': ['Thu nhập cao', 'Vị thế vững chắc'],
                'cons': ['Áp lực lớn', 'Trách nhiệm nặng nề']
            },
            {
                'title': 'Quản lý dự án',
                'description': 'Điều phối và quản lý các dự án từ đầu đến cuối',
                'urgency': 'medium',
                'score': 0.68,
                'salary_min': 20000000,
                'salary_max': 40000000,
                'timeline': 8,
                'requirements': ['Quản lý dự án', 'Giao tiếp', 'Tổ chức'],
                'missing_skills': ['Project Management', 'Agile/Scrum'],
                'pros': ['Nhu cầu cao', 'Kỹ năng chuyển đổi được'],
                'cons': ['Deadline áp lực', 'Cần chứng chỉ PMP']
            }
        ]

        for mp in management_paths:
            # Adjust score based on experience
            exp_bonus = 0.1 if profile.total_years_experience >= 10 else 0
            final_score = min(1.0, mp['score'] + exp_bonus)

            path = CareerPath(
                path_type='management',
                title=mp['title'],
                description=mp['description'],
                urgency=mp['urgency'],
                score=final_score,
                salary_min=mp['salary_min'],
                salary_max=mp['salary_max'],
                timeline_months=mp['timeline'],
                requirements=mp['requirements'],
                missing_skills=mp['missing_skills'],
                pros=mp['pros'],
                cons=mp['cons'],
                reasoning=[
                    f"Phù hợp với người có {profile.total_years_experience:.1f} năm kinh nghiệm",
                    "Có thể áp dụng trong hầu hết các ngành nghề"
                ]
            )
            paths.append(path)

        paths.sort(key=lambda x: x.score, reverse=True)
        return paths[:3]
    
    def _find_current_level(self, ladder: Dict, profile: UserProfile) -> int:
        """Find user's current level in career ladder."""
        user_years = profile.total_years_experience
        
        for i, level in enumerate(ladder['levels']):
            if level['experience_max'] <= user_years:
                continue
            return max(0, i - 1)
        
        return len(ladder['levels']) - 1
    
    def _find_similar_ladder(self, industry: str) -> Optional[Dict]:
        """Find similar career ladder for unknown industry."""
        # Direct mapping for common industry names
        direct_mappings = {
            # IT / Technology
            'IT': 'tu_van',
            'TECH': 'tu_van',
            'TECHNOLOGY': 'tu_van',
            'CÔNG NGHỆ': 'tu_van',
            'CÔNG NGHE': 'tu_van',
            'SOFTWARE': 'tu_van',
            'WEB': 'tu_van',
            'DEV': 'tu_van',
            'DEVELOPER': 'tu_van',
            'PROGRAMMING': 'tu_van',
            'IT INDUSTRY': 'tu_van',
            # Manufacturing
            'MANUFACTURING': 'co_khi',
            'SẢN XUẤT': 'co_khi',
            'SAN XUAT': 'co_khi',
            'CƠ KHÍ': 'co_khi',
            'CO KHI': 'co_khi',
            'PRODUCTION': 'co_khi',
            'FACTORY': 'co_khi',
            'DỆT MAY': 'co_khi',
            'DET MAY': 'co_khi',
            'TEXTILE': 'co_khi',
            'GARMENT': 'co_khi',
            'MAY MAC': 'co_khi',
            # Business / Sales
            'BUSINESS': 'ban_hang',
            'KINH DOANH': 'ban_hang',
            'SALES': 'ban_hang',
            'SALE': 'ban_hang',
            'BAN HANG': 'ban_hang',
            'RETAIL': 'ban_hang',
            'MARKETING': 'ban_hang',
            # Finance / Consulting
            'FINANCE': 'tu_van',
            'TAI CHINH': 'tu_van',
            'FINANCIAL': 'tu_van',
            'BANKING': 'tu_van',
            'BANK': 'tu_van',
            'INSURANCE': 'tu_van',
            'CONSULTING': 'tu_van',
            'CONSULTANT': 'tu_van',
            # Education
            'EDUCATION': 'nhan_su',
            'GIÁO DỤC': 'nhan_su',
            'GIAO DUC': 'nhan_su',
            'TRAINING': 'nhan_su',
            'SCHOOL': 'nhan_su',
            'UNIVERSITY': 'nhan_su',
            'COLLEGE': 'nhan_su',
            # Healthcare
            'HEALTHCARE': 'hanh_chinh',
            'Y TẾ': 'hanh_chinh',
            'Y TE': 'hanh_chinh',
            'HOSPITAL': 'hanh_chinh',
            'CLINIC': 'hanh_chinh',
            'MEDICAL': 'hanh_chinh',
            'PHARMACY': 'hanh_chinh',
            'HEALTH': 'hanh_chinh',
            # Service
            'SERVICE': 'phuc_vu',
            'DỊCH VỤ': 'phuc_vu',
            'DICH VU': 'phuc_vu',
            'RESTAURANT': 'phuc_vu',
            'NHÀ HÀNG': 'phuc_vu',
            'NHA HANG': 'phuc_vu',
            'HOTEL': 'phuc_vu',
            'KHÁCH SẠN': 'phuc_vu',
            'KHACH SAN': 'phuc_vu',
            'SPA': 'phuc_vu',
            'SALON': 'phuc_vu',
            'CAFE': 'phuc_vu',
            'COFFEE': 'phuc_vu',
            # Construction
            'CONSTRUCTION': 'co_khi',
            'XÂY DỰNG': 'co_khi',
            'XAY DUNG': 'co_khi',
            'BUILDING': 'co_khi',
            'ARCHITECTURE': 'co_khi',
            'KIẾN TRÚC': 'co_khi',
            'KIEN TRUC': 'co_khi',
            # Transport
            'TRANSPORT': 'lai_xe',
            'VẬN TẢI': 'lai_xe',
            'VAN TAI': 'lai_xe',
            'LOGISTICS': 'lai_xe',
            'SHIPPING': 'lai_xe',
            'DELIVERY': 'lai_xe',
            # Admin / HR
            'ADMIN': 'hanh_chinh',
            'ADMINISTRATIVE': 'hanh_chinh',
            'OFFICE': 'hanh_chinh',
            'HR': 'nhan_su',
            'NHÂN SỰ': 'nhan_su',
            'NHAN SU': 'nhan_su',
            'HUMAN RESOURCES': 'nhan_su',
            'PERSONNEL': 'nhan_su',
            # Security
            'SECURITY': 'bao_ve',
            'BẢO VỆ': 'bao_ve',
            'BAO VE': 'bao_ve',
            'SAFETY': 'bao_ve',
            'AN NINH': 'bao_ve',
        }

        # Try direct match first (case insensitive)
        industry_upper = industry.upper().strip()
        if industry_upper in direct_mappings:
            mapped = direct_mappings[industry_upper]
            logger.info(f"Industry '{industry}' mapped to '{mapped}'")
            return self.career_data['career_ladders'].get(mapped)

        # Map unknown industries to similar ones (partial match)
        mappings = {
            'tech': 'tu_van',
            'software': 'tu_van',
            'web': 'tu_van',
            'it': 'tu_van',
            'computer': 'tu_van',
            'business': 'ban_hang',
            'sale': 'ban_hang',
            'finance': 'tu_van',
            'account': 'tu_van',
            'education': 'nhan_su',
            'teach': 'nhan_su',
            'healthcare': 'hanh_chinh',
            'health': 'hanh_chinh',
            'medical': 'hanh_chinh',
            'retail': 'ban_hang',
            'shop': 'ban_hang',
            'store': 'ban_hang',
            'service': 'phuc_vu',
            'restaurant': 'phuc_vu',
            'hotel': 'phuc_vu',
            'manufacturing': 'co_khi',
            'factory': 'co_khi',
            'production': 'co_khi',
            'mechanic': 'co_khi',
            'construct': 'co_khi',
            'build': 'co_khi',
            'transport': 'lai_xe',
            'logistic': 'lai_xe',
            'driver': 'lai_xe',
            'admin': 'hanh_chinh',
            'office': 'hanh_chinh',
            'hr': 'nhan_su',
            'human': 'nhan_su',
            'personnel': 'nhan_su',
            'security': 'bao_ve',
            'protect': 'bao_ve',
            'safety': 'bao_ve',
        }

        industry_lower = industry.lower().strip()
        for key, value in mappings.items():
            if key in industry_lower or industry_lower in key:
                logger.info(f"Industry '{industry}' partial matched to '{value}' via key '{key}'")
                return self.career_data['career_ladders'].get(value)

        # Ultimate fallback: return 'tu_van' (most common/versatile career ladder)
        logger.warning(f"Industry '{industry}' not found in any mapping, defaulting to 'tu_van'")
        return self.career_data['career_ladders'].get('tu_van')
    
    def _get_level_requirements(self, level: Dict) -> List[str]:
        """Get typical requirements for a career level."""
        requirements = []
        
        if level['level'] >= 3:
            requirements.append("Kỹ năng lãnh đạo")
        
        if level['level'] >= 4:
            requirements.append("Quản lý nhóm")
            requirements.append("Báo cáo và presentation")
        
        if level['level'] >= 5:
            requirements.append("Chiến lược kinh doanh")
            requirements.append("Quản lý tài chính")
        
        return requirements
    
    def _get_urgency_for_level(self, age: int, level_idx: int) -> str:
        """Determine urgency based on age and level."""
        if age >= 40:
            return 'high'
        elif age >= 35:
            return 'medium'
        else:
            return 'low'
    
    def discover_age_transition(self, profile: UserProfile) -> List[CareerPath]:
        """
        Discover career transitions based on age.

        Args:
            profile: User profile

        Returns:
            List of career path recommendations
        """
        paths = []
        age_bracket_key = self._get_age_bracket(profile.age)
        age_info = self.age_data['age_brackets'].get(age_bracket_key, {})

        if not age_info:
            logger.warning(f"No age bracket info for age {profile.age}, returning empty paths")
            return paths

        urgency = age_info.get('urgency', 'low')
        urgency_levels = self.age_data['urgency_levels']

        # Get transition paths for age bracket
        transition_paths = age_info.get('transition_paths', [])

        if not transition_paths:
            logger.info(f"No transition paths defined for age bracket {age_bracket_key}")
            # Return generic transitions based on age
            return self._get_generic_transitions(profile, urgency)

        for tp in transition_paths:
            # Calculate industry match with more flexibility
            from_industry = tp.get('from_industry', '')
            industry_match_score = 1.0  # Default: full match

            if from_industry == 'any':
                # 'any' always matches - these are universal transitions
                industry_match_score = 1.0
                logger.debug(f"Path '{tp.get('description', 'unknown')}' matches any industry")
            elif not from_industry:
                # No from_industry specified - treat as universal
                industry_match_score = 0.8
            else:
                # Check for exact or partial match
                profile_industry = profile.primary_industry.lower()
                from_industry_lower = from_industry.lower()

                if profile_industry == from_industry_lower:
                    industry_match_score = 1.0
                elif from_industry_lower in profile_industry or profile_industry in from_industry_lower:
                    industry_match_score = 0.8  # Partial match
                else:
                    # No match - but still include with penalty
                    industry_match_score = 0.3

            # Skip only if very poor match (less than 0.3)
            if industry_match_score < 0.3:
                logger.debug(f"Skipping path '{tp.get('description', 'unknown')}' due to poor industry match ({industry_match_score})")
                continue

            # Calculate skills score
            skills_score = self._calculate_skills_transfer_score(
                profile.all_skills,
                tp.get('requirements', [])
            )

            # Age fit score (higher for 35-40 range)
            age_fit = 1.0 if urgency in ['high', 'critical'] else 0.8 if urgency == 'medium' else 0.6

            # Salary score
            salary_score = 0.5  # Neutral

            # Final score - apply industry match as multiplier
            final_score = (
                skills_score * self.WEIGHTS['skills_transfer'] * industry_match_score +
                age_fit * self.WEIGHTS['age_fit'] +
                salary_score * self.WEIGHTS['salary_match']
            )

            # Apply industry match penalty to final score
            final_score = final_score * (0.5 + industry_match_score * 0.5)

            # Clamp score
            final_score = max(0.1, min(1.0, final_score))

            # Build reasoning
            reasoning = [
                f"Tuổi {profile.age} - {urgency_levels.get(urgency, {}).get('description', '')}",
                f"Hướng chuyển đổi: {tp.get('description', '')}"
            ]

            if industry_match_score >= 0.8:
                reasoning.append("Phù hợp với ngành hiện tại của bạn")
            elif industry_match_score >= 0.5:
                reasoning.append("Có thể áp dụng từ kinh nghiệm hiện tại")

            if tp.get('pros'):
                reasoning.append("Ưu điểm: " + ", ".join(tp['pros'][:2]))

            if tp.get('cons'):
                reasoning.append("Lưu ý: " + ", ".join(tp['cons'][:2]))

            # Parse timeline
            timeline = tp.get('timeline_months', '6')
            if isinstance(timeline, str):
                months = int(timeline.split('-')[0]) if '-' in timeline else int(timeline.replace('+', ''))
            else:
                months = timeline

            # Parse salary range
            salary_impact = tp.get('salary_impact', '0%')
            salary_min, salary_max = self._parse_salary_impact(salary_impact, profile.target_salary)

            path = CareerPath(
                path_type='age_transition',
                title=tp.get('description', tp.get('to_role_type', '')),
                description=f"Chuyển đổi hướng đi sự nghiệp cho người {profile.age} tuổi",
                urgency=urgency,
                score=final_score,
                salary_min=salary_min,
                salary_max=salary_max,
                timeline_months=months,
                requirements=tp.get('requirements', []),
                missing_skills=self._identify_missing_skills(profile, tp),
                pros=tp.get('pros', []),
                cons=tp.get('cons', []),
                reasoning=reasoning
            )
            paths.append(path)

        # Sort by score
        paths.sort(key=lambda x: x.score, reverse=True)

        # If still no paths, return generic transitions
        if not paths:
            logger.info("No specific age transitions found, returning generic transitions")
            return self._get_generic_transitions(profile, urgency)

        return paths[:5]  # Top 5

    def _parse_salary_impact(self, salary_impact: str, target_salary: int) -> tuple:
        """Parse salary impact string and return min/max values."""
        try:
            if not salary_impact or salary_impact == '0%':
                return (10000000, 20000000)  # Default range

            # Parse "+20-40%" or "-10%"
            import re
            match = re.search(r'([+-])(\d+)-?(\d+)?%', salary_impact)
            if match:
                sign = 1 if match.group(1) == '+' else -1
                min_pct = int(match.group(2)) / 100
                max_pct = int(match.group(3)) if match.group(3) else min_pct * 100
                max_pct = max_pct / 100

                if target_salary and target_salary > 0:
                    base = target_salary
                else:
                    base = 15000000  # Default base salary

                min_salary = int(base * (1 + sign * min_pct))
                max_salary = int(base * (1 + sign * max_pct))
                return (min_salary, max_salary)
        except Exception:
            pass

        return (10000000, 25000000)  # Default range

    def _get_generic_transitions(self, profile: UserProfile, urgency: str) -> List[CareerPath]:
        """Get generic career transitions when no specific paths found."""
        paths = []

        # Universal transitions that work for most industries
        generic_transitions = [
            {
                'title': 'Quản lý cấp trung',
                'description': 'Phát triển từ nhân viên kinh nghiệm lên vị trí quản lý',
                'timeline': 12,
                'salary_min': 15000000,
                'salary_max': 30000000,
                'requirements': ['Kỹ năng lãnh đạo', 'Quản lý nhóm', 'Báo cáo'],
                'missing_skills': ['Leadership', 'Team Management'],
                'pros': ['Ổn định', 'Thu nhập tốt', 'Thăng tiến'],
                'cons': ['Áp lực cao', 'Trách nhiệm lớn']
            },
            {
                'title': 'Chuyên gia tư vấn',
                'description': 'Chuyển đổi kinh nghiệm thành dịch vụ tư vấn',
                'timeline': 6,
                'salary_min': 20000000,
                'salary_max': 50000000,
                'requirements': ['Kỹ năng giao tiếp', 'Kiến thức chuyên môn', 'Xây dựng thương hiệu'],
                'missing_skills': ['Consulting', 'Personal Branding'],
                'pros': ['Linh hoạt', 'Thu nhập cao', 'Tự do'],
                'cons': ['Cần xây dựng network', 'Thu nhập không ổn định ban đầu']
            },
            {
                'title': 'Đào tạo nội bộ',
                'description': 'Trở thành chuyên gia đào tạo trong doanh nghiệp',
                'timeline': 3,
                'salary_min': 12000000,
                'salary_max': 25000000,
                'requirements': ['Kỹ năng thuyết trình', 'Soạn bài giảng', 'Giao tiếp'],
                'missing_skills': ['Training Design', 'Public Speaking'],
                'pros': ['Giờ giấc ổn định', 'Có thể dạy online', 'Mang lại ý nghĩa'],
                'cons': ['Thu nhập có giới hạn', 'Cần kỹ năng sư phạm']
            },
            {
                'title': 'Quản lý dự án',
                'description': 'Điều phối và quản lý các dự án kinh doanh',
                'timeline': 6,
                'salary_min': 18000000,
                'salary_max': 40000000,
                'requirements': ['Quản lý dự án', 'Giao tiếp', 'Tổ chức'],
                'missing_skills': ['Project Management', 'Agile/Scrum'],
                'pros': ['Nhu cầu cao', 'Kỹ năng chuyển đổi được', 'Thu nhập tốt'],
                'cons': ['Deadline áp lực', 'Cần chứng chỉ PMP']
            }
        ]

        for gt in generic_transitions:
            path = CareerPath(
                path_type='age_transition',
                title=gt['title'],
                description=gt['description'],
                urgency=urgency,
                score=0.6 + (0.2 if profile.total_years_experience >= 10 else 0),
                salary_min=gt['salary_min'],
                salary_max=gt['salary_max'],
                timeline_months=gt['timeline'],
                requirements=gt['requirements'],
                missing_skills=gt['missing_skills'],
                pros=gt['pros'],
                cons=gt['cons'],
                reasoning=[
                    f"Phù hợp với người {profile.age} tuổi có {profile.total_years_experience:.1f} năm kinh nghiệm",
                    "Có thể áp dụng kinh nghiệm từ nhiều ngành khác nhau"
                ]
            )
            paths.append(path)

        paths.sort(key=lambda x: x.score, reverse=True)
        return paths[:5]
    
    def _identify_missing_skills(self, profile: UserProfile, transition: Dict) -> List[str]:
        """Identify missing skills needed for transition."""
        required = set(s.lower() for s in transition.get('requirements', []))
        user_skills = set(s.lower() for s in profile.all_skills)
        
        missing = []
        for req in required:
            if 'leadership' in req or 'manager' in req:
                missing.append("Kỹ năng lãnh đạo")
            if 'presentation' in req or 'communication' in req:
                missing.append("Kỹ năng thuyết trình")
            if 'certification' in req or 'degree' in req:
                missing.append("Chứng chỉ/Bằng cấp")
        
        return list(set(missing))
    
    def discover_skill_upgrades(self, profile: UserProfile) -> List[CareerPath]:
        """
        Discover skill upgrade paths.

        Args:
            profile: User profile

        Returns:
            List of skill upgrade recommendations
        """
        paths = []
        common_skills = self.age_data.get('common_transition_skills', {})

        # Get current level
        primary_industry = profile.primary_industry
        ladder = self.career_data['career_ladders'].get(primary_industry)

        # Try to find similar ladder if not found
        if not ladder:
            ladder = self._find_similar_ladder(primary_industry)

        if ladder:
            current_idx = self._find_current_level(ladder, profile)

            # Find skills needed for next level
            if current_idx < len(ladder['levels']) - 1:
                next_level = ladder['levels'][current_idx + 1]
                level_reqs = self._get_level_requirements(next_level)

                for req in level_reqs:
                    skill_info = common_skills.get(req.lower().replace(' ', '_'), {})

                    if skill_info:
                        path = CareerPath(
                            path_type='skill_upgrade',
                            title=f"Nâng cấp: {req}",
                            description=skill_info.get('description', ''),
                            urgency='medium',
                            score=0.7,  # Medium priority
                            timeline_months=skill_info.get('learning_time_months', 3) * 30,
                            requirements=skill_info.get('resources', []),
                            reasoning=[
                                f"Cần thiết để thăng tiến lên {next_level['title']}",
                                f"Thời gian học: ~{skill_info.get('learning_time_months', 3)} tháng"
                            ]
                        )
                        paths.append(path)

        # If no specific skill upgrades found, return generic ones
        if not paths:
            paths = self._get_generic_skill_upgrades(profile)

        return paths[:3]  # Top 3

    def _get_generic_skill_upgrades(self, profile: UserProfile) -> List[CareerPath]:
        """Get generic skill upgrade paths when no specific ladder found."""
        paths = []

        generic_skills = [
            {
                'title': 'Kỹ năng lãnh đạo',
                'description': 'Phát triển khả năng lãnh đạo và quản lý nhóm',
                'timeline': 90,  # 3 months
                'requirements': ['Khóa học leadership', 'Thực hành quản lý'],
                'missing_skills': ['Leadership', 'Team Management'],
                'pros': ['Cần thiết để thăng tiến', 'Áp dụng rộng rãi']
            },
            {
                'title': 'Kỹ năng giao tiếp',
                'description': 'Cải thiện kỹ năng giao tiếp và thuyết trình',
                'timeline': 60,  # 2 months
                'requirements': ['Khóa học giao tiếp', 'Practice'],
                'missing_skills': ['Communication', 'Presentation'],
                'pros': ['Cải thiện mọi khía cạnh công việc', 'Dễ học']
            },
            {
                'title': 'Quản lý dự án cơ bản',
                'description': 'Nắm vững các nguyên tắc quản lý dự án',
                'timeline': 120,  # 4 months
                'requirements': ['Khóa học PM', 'Chứng chỉ PMP (optional)'],
                'missing_skills': ['Project Management', 'Agile'],
                'pros': ['Nhu cầu cao', 'Kỹ năng chuyển đổi được']
            }
        ]

        for skill in generic_skills:
            path = CareerPath(
                path_type='skill_upgrade',
                title=skill['title'],
                description=skill['description'],
                urgency='medium',
                score=0.65,
                timeline_months=skill['timeline'],
                requirements=skill['requirements'],
                reasoning=[
                    "Kỹ năng cần thiết cho sự thăng tiến",
                    f"Phù hợp với người có {profile.total_years_experience:.1f} năm kinh nghiệm"
                ]
            )
            paths.append(path)

        return paths[:3]
    
    def discover_career_paths(self, profile: UserProfile) -> Dict[str, List[CareerPath]]:
        """
        Discover all career paths for user profile.
        
        Args:
            profile: User profile
        
        Returns:
            Dict with path types -> list of CareerPath
        """
        return {
            'management_track': self.discover_management_track(profile),
            'age_transition': self.discover_age_transition(profile),
            'skill_upgrades': self.discover_skill_upgrades(profile)
        }
    
    def to_response(self, paths: Dict[str, List[CareerPath]]) -> Dict:
        """
        Convert paths to API response format.
        
        Args:
            paths: Dict from discover_career_paths
        
        Returns:
            Response dict ready for API
        """
        return {
            'success': True,
            'data': {
                'user_profile': {
                    'age': paths.get('_age', 0),
                    'total_experience_years': paths.get('_total_years', 0),
                    'primary_industry': paths.get('_industry', 'unknown')
                },
                'management_track': [p.to_dict() for p in paths.get('management_track', [])],
                'age_transition': [p.to_dict() for p in paths.get('age_transition', [])],
                'skill_upgrades': [p.to_dict() for p in paths.get('skill_upgrades', [])],
                'generated_at': datetime.now().isoformat()
            }
        }


def main():
    """Test the discoverer with sample data."""
    discoverer = CareerPathDiscoverer()
    
    # Sample user profile
    profile = UserProfile(
        age=38,
        experiences=[
            WorkExperience(industry='IT', role='Senior Developer', years=10, 
                          skills=['Python', 'Java', 'SQL', 'Leadership'])
        ],
        target_salary=40000000
    )
    
    print("=== Testing Career Path Discoverer ===")
    print(f"User: {profile.age} years old, {profile.total_years_experience} years experience in IT")
    print()
    
    paths = discoverer.discover_career_paths(profile)
    
    print("--- Management Track ---")
    for p in paths['management_track']:
        title_ascii = p.title.encode('ascii', 'replace').decode('ascii')
        print(f"  [M] {title_ascii}: score={p.score:.2f} urgency={p.urgency}")
    
    print()
    print("--- Age Transition ---")
    for p in paths['age_transition']:
        title_ascii = p.title.encode('ascii', 'replace').decode('ascii')
        print(f"  [T] {title_ascii}: score={p.score:.2f} urgency={p.urgency}")
    
    print()
    print("--- Skill Upgrades ---")
    for p in paths['skill_upgrades']:
        title_ascii = p.title.encode('ascii', 'replace').decode('ascii')
        print(f"  [S] {title_ascii}: score={p.score:.2f}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
