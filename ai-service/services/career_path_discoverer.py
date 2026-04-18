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
            return paths
        
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
        
        # Sort by score
        paths.sort(key=lambda x: x.score, reverse=True)
        return paths[:5]  # Top 5
    
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
            'IT': 'nhan_su',
            'TECH': 'nhan_su',
            'CÔNG NGHỆ': 'nhan_su',
            'CÔNG NGHE': 'nhan_su',
            'MANUFACTURING': 'co_khi',
            'SẢN XUẤT': 'co_khi',
            'SAN XUAT': 'co_khi',
            'CƠ KHÍ': 'co_khi',
            'CO KHI': 'co_khi',
            'BUSINESS': 'tu_van',
            'KINH DOANH': 'ban_hang',
            'FINANCE': 'tu_van',
            'TAI CHINH': 'tu_van',
            'EDUCATION': 'nhan_su',
            'GIÁO DỤC': 'nhan_su',
            'GIAO DUC': 'nhan_su',
            'HEALTHCARE': 'hanh_chinh',
            'Y TẾ': 'hanh_chinh',
            'Y TE': 'hanh_chinh',
            'RETAIL': 'ban_hang',
            'SERVICE': 'phuc_vu',
            'DỊCH VỤ': 'phuc_vu',
            'DICH VU': 'phuc_vu',
            'CONSTRUCTION': 'co_khi',
            'XÂY DỰNG': 'co_khi',
            'XAY DUNG': 'co_khi',
            'TRANSPORT': 'lai_xe',
            'VẬN TẢI': 'lai_xe',
            'VAN TAI': 'lai_xe',
        }
        
        # Try direct match first (case insensitive)
        industry_upper = industry.upper()
        if industry_upper in direct_mappings:
            return self.career_data['career_ladders'].get(direct_mappings[industry_upper])
        
        # Map unknown industries to similar ones (partial match)
        mappings = {
            'tech': 'nhan_su',
            'business': 'tu_van',
            'finance': 'tu_van',
            'education': 'nhan_su',
            'healthcare': 'hanh_chinh',
            'retail': 'ban_hang',
            'service': 'phuc_vu',
            'manufacturing': 'co_khi',
            'construction': 'co_khi',
            'transport': 'lai_xe',
            'admin': 'hanh_chinh',
            'hr': 'nhan_su',
            'sales': 'ban_hang',
            'marketing': 'tu_van',
        }
        
        industry_lower = industry.lower()
        for key, value in mappings.items():
            if key in industry_lower or industry_lower in key:
                return self.career_data['career_ladders'].get(value)
        
        return None
    
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
            return paths
        
        urgency = age_info.get('urgency', 'low')
        urgency_levels = self.age_data['urgency_levels']
        
        # Get transition paths for age bracket
        transition_paths = age_info.get('transition_paths', [])
        
        for tp in transition_paths:
            # Calculate scores
            industry_match = (
                tp.get('from_industry') == 'any' or
                profile.primary_industry.lower() == tp.get('from_industry', '').lower()
            )
            
            if not industry_match:
                continue
            
            # Calculate skill transfer score
            skills_score = self._calculate_skills_transfer_score(
                profile.all_skills,
                tp.get('requirements', [])
            )
            
            # Age fit score (higher for 35-40 range)
            age_fit = 1.0 if urgency in ['high', 'critical'] else 0.7
            
            # Salary score
            salary_range = tp.get('salary_impact', '0%')
            # Simple parsing for salary impact
            salary_score = 0.5  # Neutral
            
            # Final score
            final_score = (
                skills_score * self.WEIGHTS['skills_transfer'] +
                age_fit * self.WEIGHTS['age_fit'] +
                salary_score * self.WEIGHTS['salary_match']
            )
            
            # Build reasoning
            reasoning = [
                f"Tuổi {profile.age} - {urgency_levels.get(urgency, {}).get('description', '')}",
                f"Hướng chuyển đổi: {tp.get('description', '')}"
            ]
            
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
            
            path = CareerPath(
                path_type='age_transition',
                title=tp.get('description', tp.get('to_role_type', '')),
                description=f"Chuyển đổi hướng đi sự nghiệp cho người {profile.age} tuổi",
                urgency=urgency,
                score=final_score,
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
        return paths[:5]  # Top 5
    
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
        
        return paths[:3]  # Top 3
    
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
