"""
Career Transition Discoverer Service

Discovers career transitions for workers 35+ across ALL 8 industries in Vietnam.
Supports:
- Management track (within same industry)
- Cross-industry transitions
- Skill-based transitions
- Universal transitions (trainer, consultant, coach)

Usage:
    discoverer = CareerTransitionDiscoverer()
    transitions = discoverer.discover_all(profile)
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TransitionPath:
    """Represents a career transition path."""
    type: str                          # transition type (e.g., "trainer", "consultant")
    title: str                         # job title
    description: str                    # description
    target_industry: str               # target industry key
    match_score: float                 # 0.0 - 1.0
    salary_range: Dict[str, int]      # {"min": int, "max": int}
    timeline_months: int              # estimated months to transition
    skill_gaps: List[str]             # skills that need to be learned
    pros: List[str]                   # advantages
    cons: List[str]                   # disadvantages
    requirements: List[str] = field(default_factory=list)
    difficulty: str = "medium"         # easy, medium, hard
    source_industry: str = ""          # where the user is coming from
    urgency: str = "medium"           # low, medium, high, critical
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class UserProfile:
    """User profile for career transition analysis."""
    age: int
    current_role: str
    current_industry: str
    experience_years: int
    skills: List[str]
    target_salary: Optional[int] = None
    barriers: List[str] = field(default_factory=list)
    
    # Multi-industry work history
    work_history: List[Dict[str, Any]] = field(default_factory=list)
    # [{'industry': 'may_mac', 'role': 'Tho may', 'years': 5, 'skills': ['thiet ke', 'may mac']}]
    
    # Personalization fields
    personality_traits: List[str] = field(default_factory=list)
    interests: List[str] = field(default_factory=list)
    values: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @property
    def combined_skills(self) -> List[str]:
        """Tong hop skills tu work_history va skills hien tai."""
        all_skills = set(self.skills)
        for job in self.work_history:
            all_skills.update(job.get('skills', []))
        return list(all_skills)
    
    @property
    def industries_in_history(self) -> List[str]:
        """Lay danh sach industries tu work_history."""
        industries = set()
        for job in self.work_history:
            if job.get('industry'):
                industries.add(job['industry'])
        return list(industries)


class CareerTransitionDiscoverer:
    """
    Discovers career transitions for all 8 industries.
    
    Industries covered:
    - bao_ve (Bao Ve & An Ninh)
    - lai_xe (Lai Xe & Van Tai)
    - co_khi (Co Khi & San Xuat)
    - ban_hang (Ban Hang & Kinh Doanh)
    - phuc_vu (Phuc Vu & Nha Hang)
    - hanh_chinh (Hanh Chinh)
    - nhan_su (Nhan Su & HR)
    - tu_van (Tu Van)
    
    Transition types:
    - management_track: Within-industry promotions
    - cross_industry: Industry switches
    - universal: Trainer, Consultant, Coach
    - multi_industry: Jobs requiring MULTIPLE industry experience (NEW)
    """
    
    # All supported industries
    INDUSTRIES = [
        "bao_ve", "lai_xe", "co_khi", "ban_hang",
        "phuc_vu", "hanh_chinh", "nhan_su", "tu_van"
    ]
    
    # Universal transition types (apply to any industry)
    UNIVERSAL_TYPES = ["trainer", "consultant", "coach", "entrepreneur", "freelancer"]
    
    # Map barriers với job characteristics không tương thích
    # Score penalty: Giảm match score khi job không phù hợp với barrier
    BARRIER_INCOMPATIBLE_JOBS = {
        "health": {
            "negative_keywords": [
                "nang", "lao dong nang", "standing", "night shift", "ca dem",
                "vat", "khu vuon", "ngoai troi", "muon", "heavy lifting",
                "stand", "on feet", "physical", "the duc"
            ],
            "score_penalty": 0.4  # Giảm 40% match score
        },
        "family": {
            "negative_keywords": [
                "ca dem", "dem", "weekend", "cuoi tuan", "overtime",
                "出差", "business trip", "ot", "late", "muon"
            ],
            "score_penalty": 0.3  # Giảm 30% match score
        },
        "techGap": {
            "negative_keywords": [
                "digital", "tech", "AI", "coding", "programming",
                "software", "computer", "máy tính", "công nghệ cao",
                "technical", "IT", "developer"
            ],
            "score_penalty": 0.35  # Giảm 35% match score
        },
        "location": {
            "negative_keywords": [
                "khac", "distant", "remote", "relocate", "đi xa",
                "tỉnh khác", "ngoại thành", "đi công tác"
            ],
            "score_penalty": 0.25  # Giảm 25% match score
        }
    }
    
    def __init__(self):
        self.transitions_data = self._load_transitions_data()
        self.skill_matrix = self._load_skill_matrix()
        self.career_ladders = self._load_career_ladders()
        
        # Initialize semantic skill matcher (lazy loaded)
        self._semantic_matcher = None
    
    @property
    def semantic_matcher(self):
        """Lazy load semantic matcher."""
        if self._semantic_matcher is None:
            try:
                from services.skill_matcher import SemanticSkillMatcher
                self._semantic_matcher = SemanticSkillMatcher()
            except Exception as e:
                logger.warning(f"Could not load semantic matcher: {e}")
                self._semantic_matcher = None
        return self._semantic_matcher
    
    def _load_transitions_data(self) -> Dict:
        """Load career transitions data from JSON."""
        data_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "data", "career_transitions.json"
        )
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load transitions data: {e}")
            return {"transition_paths_by_industry": {}, "cross_industry_transitions": {}}
    
    def _load_skill_matrix(self) -> Dict:
        """Load skill transfer matrix from JSON."""
        data_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "data", "skill_transfer_matrix.json"
        )
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load skill matrix: {e}")
            return {"skill_categories": {}, "industry_skill_matches": {}}
    
    def _load_career_ladders(self) -> Dict:
        """Load career ladders data from JSON."""
        data_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "data", "career_ladders.json"
        )
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load career ladders: {e}")
            return {"career_ladders": {}}
    
    def discover_all(self, profile: UserProfile) -> Dict[str, List[TransitionPath]]:
        """
        Discover all possible career transitions for the user.
        
        Returns categorized transitions by type:
        - management_track: Within-industry promotions
        - cross_industry: Transitions to different industries
        - universal: Trainer, Consultant, Coach (any industry)
        - multi_industry: Jobs requiring MULTIPLE industry experience (NEW)
        """
        results = {
            "management_track": [],
            "cross_industry": [],
            "universal": [],
            "multi_industry": [],  # NEW: Multi-industry transitions
            "all": []
        }
        
        # Calculate urgency based on age
        urgency = self._get_urgency(profile.age)
        
        # 1. Within-industry management track
        if profile.current_industry in self.INDUSTRIES:
            management = self._discover_management_track(profile, urgency)
            results["management_track"] = management
        
        # 2. Cross-industry transitions
        cross_industry = self._discover_cross_industry(profile, urgency)
        results["cross_industry"] = cross_industry
        
        # 3. Universal transitions (trainer, consultant, coach)
        universal = self._discover_universal_transitions(profile, urgency)
        results["universal"] = universal
        
        # 4. Multi-industry transitions (NEW)
        if len(profile.work_history) >= 2 or len(profile.industries_in_history) >= 2:
            multi_industry = self._discover_multi_industry_paths(profile, urgency)
            results["multi_industry"] = multi_industry
        
        # 5. Combine all for easy access
        results["all"] = (
            results["management_track"] + 
            results["cross_industry"] + 
            results["universal"] +
            results["multi_industry"]
        )
        
        # Sort by match score
        results["all"].sort(key=lambda x: x.match_score, reverse=True)
        
        return results
    
    def _get_urgency(self, age: int) -> str:
        """Determine urgency level based on age."""
        if age < 30:
            return "low"
        elif age < 35:
            return "medium"
        elif age < 40:
            return "high"
        else:
            return "critical"
    
    def _discover_management_track(
        self, 
        profile: UserProfile, 
        urgency: str
    ) -> List[TransitionPath]:
        """
        Discover management track within the same industry.
        """
        paths = []
        industry = profile.current_industry
        
        if industry not in self.transitions_data.get("transition_paths_by_industry", {}):
            return paths
        
        industry_data = self.transitions_data["transition_paths_by_industry"][industry]
        
        # Check career ladder for advancement opportunities
        ladder = self.career_ladders.get("career_ladders", {}).get(industry, {})
        levels = ladder.get("levels", [])
        
        # Find current level based on experience
        current_level = self._find_current_level(profile.experience_years, levels)
        
        # Generate management track paths from career ladder
        for level in levels:
            if level["level"] > current_level:
                # Calculate match score
                exp_match = min(1.0, profile.experience_years / level.get("experience_min", 1))
                skill_match = self._calculate_skill_match(
                    profile.skills, 
                    industry_data.get("35_plus_transitions", [])
                )
                match_score = (exp_match * 0.4 + skill_match * 0.6)
                
                paths.append(TransitionPath(
                    type="management_track",
                    title=level["title"],
                    description=f"Thang tien trong nghanh {industry}",
                    target_industry=industry,
                    match_score=match_score,
                    salary_range={
                        "min": level.get("salary_min", 0),
                        "max": level.get("salary_max", 0)
                    },
                    timeline_months=level.get("typical_years_to_reach", 2) * 12,
                    skill_gaps=[],
                    pros=["Thang tien tu nhien", "Dung kinh nghiem"],
                    cons=["Co the cham"],
                    requirements=[],
                    difficulty="medium",
                    source_industry=industry,
                    urgency=urgency
                ))
        
        return paths[:5]  # Return top 5
    
    def _discover_cross_industry(
        self, 
        profile: UserProfile, 
        urgency: str
    ) -> List[TransitionPath]:
        """
        Discover cross-industry transitions.
        """
        paths = []
        source_industry = profile.current_industry
        
        # Get transitions for source industry
        if source_industry in self.transitions_data.get("transition_paths_by_industry", {}):
            industry_data = self.transitions_data["transition_paths_by_industry"][source_industry]
            transitions = industry_data.get("35_plus_transitions", [])
            
            for trans in transitions:
                # Skip universal transitions
                if trans.get("universally_applicable", False):
                    continue
                
                # Calculate match score
                match_score = self._calculate_transition_match(profile, trans)
                
                paths.append(TransitionPath(
                    type=trans["type"],
                    title=trans["title"],
                    description=trans.get("description", ""),
                    target_industry=trans.get("target_industry", source_industry),
                    match_score=match_score,
                    salary_range={
                        "min": trans.get("salary_range", [0, 0])[0] if isinstance(trans.get("salary_range"), list) else 0,
                        "max": trans.get("salary_range", [0, 0])[1] if isinstance(trans.get("salary_range"), list) else 0
                    },
                    timeline_months=self._parse_timeline(trans.get("timeline_months", [3, 6])),
                    skill_gaps=trans.get("skill_gaps", []),
                    pros=trans.get("pros", []),
                    cons=trans.get("cons", []),
                    requirements=trans.get("requirements", []),
                    difficulty=trans.get("difficulty", "medium"),
                    source_industry=source_industry,
                    urgency=urgency
                ))
        
        # Also check cross-industry transitions from any industry
        cross_industry_data = self.transitions_data.get("cross_industry_transitions", {})
        urgency_factors = cross_industry_data.get("urgency_factors", {})
        
        return paths[:10]  # Return top 10
    
    def _discover_universal_transitions(
        self, 
        profile: UserProfile, 
        urgency: str
    ) -> List[TransitionPath]:
        """
        Discover universal transitions that apply to any industry.
        Trainer, Consultant, Coach, Entrepreneur, Freelancer.
        """
        paths = []
        
        cross_industry = self.transitions_data.get("cross_industry_transitions", {})
        universal_paths = cross_industry.get("paths", [])
        
        for trans in universal_paths:
            if not trans.get("universally_applicable", False):
                continue
            
            # Check if user meets basic requirements
            if not self._meets_requirements(profile, trans):
                continue
            
            # Calculate match score
            match_score = self._calculate_universal_match(profile, trans)
            
            # Adjust for age urgency
            if urgency == "critical":
                match_score *= 1.2  # Boost for critical transitions
            elif urgency == "high":
                match_score *= 1.1
            
            paths.append(TransitionPath(
                type=trans["type"],
                title=trans["title"],
                description=trans.get("description", ""),
                target_industry="universal",
                match_score=min(1.0, match_score),
                salary_range={
                    "min": trans.get("salary_range", [0, 0])[0] if isinstance(trans.get("salary_range"), list) else 0,
                    "max": trans.get("salary_range", [0, 0])[1] if isinstance(trans.get("salary_range"), list) else 0
                },
                timeline_months=self._parse_timeline(trans.get("timeline_months", [3, 6])),
                skill_gaps=trans.get("skill_gaps", []),
                pros=trans.get("pros", []),
                cons=trans.get("cons", []),
                requirements=trans.get("requirements", []),
                difficulty=trans.get("difficulty", "medium"),
                source_industry=profile.current_industry,
                urgency=urgency
            ))
        
        # Sort by match score and return
        paths.sort(key=lambda x: x.match_score, reverse=True)
        return paths[:5]  # Return top 5 universal transitions
    
    def _load_multi_industry_paths(self) -> List[Dict]:
        """Load multi-industry career paths from JSON."""
        data_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "data", "multi_industry_paths.json"
        )
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("paths_requiring_multiple_industries", [])
        except Exception as e:
            logger.error(f"Failed to load multi-industry paths: {e}")
            return []
    
    def _matches_multi_industry(self, profile: UserProfile, path: Dict) -> bool:
        """
        Kiem tra xem profile co du kinh nghiem ket hop can thiet khong.
        Returns True neu profile co it nhat 1 trong cac combinations.
        """
        required_combos = path.get('required_experience_combinations', [])
        if not required_combos:
            return False
        
        profile_industries = set(profile.industries_in_history)
        if profile.current_industry:
            profile_industries.add(profile.current_industry)
        
        for combo in required_combos:
            required_set = set(combo)
            # Check neu profile co tat ca industries trong combination
            if required_set.issubset(profile_industries):
                return True
        
        return False
    
    def _discover_multi_industry_paths(
        self, 
        profile: UserProfile, 
        urgency: str
    ) -> List[TransitionPath]:
        """
        Gợi ý nghề cần kinh nghiệm ĐA NGÀNH.
        
        Ví dụ: 
        - 5 năm may mặc + 7 năm phục vụ → Quản lý nhà hàng
        - 3 năm nấu ăn + 5 năm phục vụ → Content creator ẩm thực
        
        Đây là những nghề mà người chỉ có 1 ngành KHÔNG THỂ làm được.
        """
        paths = []
        
        # Load multi-industry paths
        multi_industry_data = self._load_multi_industry_paths()
        
        if not multi_industry_data:
            logger.warning("No multi-industry paths loaded")
            return paths
        
        for path_data in multi_industry_data:
            # Check neu profile phu hop voi cac industries can thiet
            if not self._matches_multi_industry(profile, path_data):
                continue
            
            # Tinh match score
            match_score = self._calculate_multi_industry_match(profile, path_data)
            
            # Tao transition path
            paths.append(TransitionPath(
                type="multi_industry",
                title=path_data.get("title", "Nghề đa ngành"),
                description=path_data.get("description", ""),
                target_industry="multi",
                match_score=match_score,
                salary_range={
                    "min": path_data.get("salary_range", [0, 0])[0] if isinstance(path_data.get("salary_range"), list) else 0,
                    "max": path_data.get("salary_range", [0, 0])[1] if isinstance(path_data.get("salary_range"), list) else 0
                },
                timeline_months=self._parse_timeline(path_data.get("timeline_months", [3, 6])),
                skill_gaps=path_data.get("skill_gaps", []),
                pros=path_data.get("pros", []),
                cons=path_data.get("cons", []),
                requirements=path_data.get("requirements", []),
                difficulty=path_data.get("difficulty", "medium"),
                source_industry="multi",
                urgency=urgency
            ))
        
        # Sort by match score and return top 5
        paths.sort(key=lambda x: x.match_score, reverse=True)
        return paths[:5]
    
    def _calculate_multi_industry_match(
        self, 
        profile: UserProfile, 
        path: Dict
    ) -> float:
        """
        Tinh match score cho multi-industry transition.
        Diem cao hon neu:
        - Co nhieu nam kinh nghiem trong cac industries can thiet
        - Co combined skills tu nhieu nghe
        - Tuoi phu hop voi viec doi moi
        """
        score = 0.6  # Base score - VIET TAM 60%
        
        required_combos = path.get('required_experience_combinations', [])
        if not required_combos:
            return score
        
        # Tim combination tot nhat trong profile
        profile_industries_set = set(profile.industries_in_history)
        if profile.current_industry:
            profile_industries_set.add(profile.current_industry)
        
        best_match_years = 0
        for combo in required_combos:
            required_set = set(combo)
            if required_set.issubset(profile_industries_set):
                # Tinh tong so nam kinh nghiem trong cac industries can thiet
                total_years = 0
                for job in profile.work_history:
                    if job.get('industry') in combo:
                        total_years += job.get('years', 0)
                
                # Them current industry neu co
                if profile.current_industry in combo:
                    total_years += profile.experience_years
                
                best_match_years = max(best_match_years, total_years)
        
        # Tang diem neu co nhieu nam kinh nghiem (0-0.2)
        if best_match_years >= 15:
            score += 0.2
        elif best_match_years >= 10:
            score += 0.15
        elif best_match_years >= 7:
            score += 0.1
        elif best_match_years >= 5:
            score += 0.05
        
        # Tang diem neu co combined skills tu nhieu nghe (0-0.1)
        combined_skills = profile.combined_skills
        if len(combined_skills) >= 10:
            score += 0.1
        elif len(combined_skills) >= 7:
            score += 0.05
        
        # Giam diem neu tuoi tre hon 35+ (do dai hoc hon de chuyen doi)
        if profile.age < 35:
            score -= 0.05
        
        # Tang diem neu co tinh cach phu hop voi nghe quan ly/doc lap
        if profile.personality_traits:
            if 'extroverted' in profile.personality_traits or 'leadership' in profile.personality_traits:
                score += 0.05
        
        # APPLY BARRIER PENALTY
        barrier_penalty = self._calculate_barrier_penalty(path, profile.barriers)
        score *= barrier_penalty
        
        return min(1.0, max(0.0, score))
    
    def _calculate_barrier_penalty(
        self, 
        transition: Dict, 
        barriers: List[str]
    ) -> float:
        """
        Tính penalty score dựa trên barriers.
        
        Ví dụ:
        - User có health barrier + job yêu cầu đi lại nhiều → penalty 0.6
        - User có family barrier + job ca dem → penalty 0.7
        
        Returns:
            float: multiplier từ 0.1 đến 1.0
            - 1.0 = Không có penalty
            - 0.6 = Giảm 40% match score
        """
        if not barriers:
            return 1.0
        
        # Tạo combined text từ title, description, pros, cons
        title_lower = transition.get('title', '').lower()
        desc_lower = transition.get('description', '').lower()
        pros_lower = ' '.join(transition.get('pros', [])).lower()
        cons_lower = ' '.join(transition.get('cons', [])).lower()
        combined_text = f"{title_lower} {desc_lower} {pros_lower} {cons_lower}"
        
        total_penalty = 0.0
        
        for barrier in barriers:
            if barrier in self.BARRIER_INCOMPATIBLE_JOBS:
                config = self.BARRIER_INCOMPATIBLE_JOBS[barrier]
                
                # Kiểm tra từng keyword không tương thích
                for keyword in config["negative_keywords"]:
                    if keyword.lower() in combined_text:
                        # Lấy penalty cao nhất (không cộng dồn)
                        total_penalty = max(total_penalty, config["score_penalty"])
                        break
        
        # Penalty tối thiểu là 0.1 (không hoàn toàn loại trừ)
        return max(0.1, 1.0 - total_penalty)
    
    def _find_current_level(self, experience_years: int, levels: List[Dict]) -> int:
        """Find current career level based on experience."""
        current_level = 0
        for level in levels:
            if experience_years >= level.get("experience_min", 0):
                current_level = level["level"]
        return current_level
    
    def _calculate_skill_match(
        self, 
        user_skills: List[str], 
        transitions: List[Dict]
    ) -> float:
        """
        Calculate skill match percentage.
        
        Uses hybrid approach:
        1. Exact match (keyword matching)
        2. Semantic similarity (if available)
        3. Category-based matching (fallback)
        """
        if not user_skills or not transitions:
            return 0.5
        
        # Collect all required skills
        required_skills = []
        for trans in transitions:
            for skill in trans.get("skill_gaps", []):
                required_skills.append(skill)
        
        if not required_skills:
            return 0.5
        
        # Method 1: Exact match
        user_skill_set = set(s.lower() for s in user_skills)
        required_skill_set = set(s.lower() for s in required_skills)
        exact_matches = user_skill_set & required_skill_set
        exact_score = len(exact_matches) / len(required_skill_set) if required_skill_set else 0.0
        
        # Method 2: Semantic matching (if available)
        semantic_score = 0.0
        if self.semantic_matcher:
            semantic_score = self.semantic_matcher.get_skill_similarity(
                user_skills, required_skills
            )
        
        # Method 3: Category-based matching
        category_score = 0.0
        if self.semantic_matcher:
            category_score = self.semantic_matcher._calculate_category_match(
                user_skills, required_skills
            )
        else:
            # Simple category fallback
            category_score = exact_score
        
        # Combine scores
        if semantic_score > 0:
            # Use semantic when available
            final_score = exact_score * 0.3 + semantic_score * 0.5 + category_score * 0.2
        else:
            # Fallback to exact + category
            final_score = exact_score * 0.5 + category_score * 0.5
        
        return min(1.0, max(0.0, final_score))
    
    def _calculate_transition_match(
        self, 
        profile: UserProfile, 
        transition: Dict
    ) -> float:
        """Calculate match score for a specific transition."""
        score = 0.5  # Base score
        
        # Experience match (0-0.3)
        required_exp = transition.get("requirements", [])
        if any("5+ nam" in r for r in required_exp):
            if profile.experience_years >= 5:
                score += 0.3
            elif profile.experience_years >= 3:
                score += 0.15
        elif any("8+ nam" in r for r in required_exp):
            if profile.experience_years >= 8:
                score += 0.3
            elif profile.experience_years >= 5:
                score += 0.15
        
        # Salary match (0-0.2)
        if profile.target_salary:
            salary_range = transition.get("salary_range", [0, 0])
            if isinstance(salary_range, list) and len(salary_range) == 2:
                min_sal, max_sal = salary_range
                if min_sal <= profile.target_salary <= max_sal:
                    score += 0.2
                elif profile.target_salary < min_sal:
                    score += 0.1  # Can accept lower
        
        # Skill match (0-0.3) - SUA: Dung combined_skills thay vi profile.skills
        skill_gaps = transition.get("skill_gaps", [])
        if skill_gaps:
            # Dung combined_skills de tinh diem matching tot hon
            all_skills = profile.combined_skills  # Da bao gom skills tu work_history
            skill_match = self._calculate_skill_match(all_skills, [transition])
            score += skill_match * 0.3
        
        # APPLY BARRIER PENALTY
        barrier_penalty = self._calculate_barrier_penalty(transition, profile.barriers)
        score *= barrier_penalty
        
        return min(1.0, max(0.0, score))
    
    def _calculate_universal_match(
        self, 
        profile: UserProfile, 
        transition: Dict
    ) -> float:
        """Calculate match score for universal transitions."""
        score = 0.4  # Base score
        
        # Experience is highly valued for universal transitions
        if profile.experience_years >= 10:
            score += 0.3
        elif profile.experience_years >= 7:
            score += 0.2
        elif profile.experience_years >= 5:
            score += 0.1
        
        # Communication skills are key for trainer/consultant/coach
        if any(s.lower() in ["giao tiep", "communication", "presentation"] 
               for s in profile.skills):
            score += 0.15
        
        # Difficulty adjustment
        difficulty = transition.get("difficulty", "medium")
        if difficulty == "easy":
            score += 0.1
        elif difficulty == "hard":
            score -= 0.1
        
        # APPLY BARRIER PENALTY
        barrier_penalty = self._calculate_barrier_penalty(transition, profile.barriers)
        score *= barrier_penalty
        
        return min(1.0, max(0.0, score))
    
    def _meets_requirements(self, profile: UserProfile, transition: Dict) -> bool:
        """Check if user meets basic requirements for transition."""
        requirements = transition.get("requirements", [])
        
        for req in requirements:
            # Check experience requirement
            if "10+ nam" in req and profile.experience_years < 10:
                return False
            if "8+ nam" in req and profile.experience_years < 8:
                return False
            if "5+ nam" in req and profile.experience_years < 5:
                return False
            if "3+ nam" in req and profile.experience_years < 3:
                return False
        
        return True
    
    def _parse_timeline(self, timeline) -> int:
        """Parse timeline to months."""
        if isinstance(timeline, int):
            return timeline
        elif isinstance(timeline, list):
            if len(timeline) == 2:
                return (timeline[0] + timeline[1]) // 2  # Average
            return timeline[0] if timeline else 6
        return 6  # Default 6 months
    
    def get_urgency_advice(self, age: int) -> Dict[str, str]:
        """Get urgency-based advice for the user."""
        urgency = self._get_urgency(age)
        
        advice = {
            "low": {
                "urgency": "Thap",
                "message": "Ban con nhieu thoi gian - hay tap trung phat trien ky nang hien tai va xay dung network.",
                "action": "Explore and prepare"
            },
            "medium": {
                "urgency": "Trung binh",
                "message": "Da den luc bat dau khám pha cac huong di moi. Hay danh gia lai muc tieu nghe nghiep.",
                "action": "Explore options"
            },
            "high": {
                "urgency": "Cao",
                "message": "DAY LA GIAI DOAN VANG! Ban can hanh dong som de chuyen doi su nghiep.",
                "action": "Act now - Golden period"
            },
            "critical": {
                "urgency": "Khan cap",
                "message": "Day la giai doan chuyen doi cuoi cung. Hay hanh dong ngay de toi uu hoa co hoi.",
                "action": "Urgent transition needed"
            }
        }
        
        return advice.get(urgency, advice["medium"])


def get_discoverer() -> CareerTransitionDiscoverer:
    """Get singleton instance of CareerTransitionDiscoverer."""
    if not hasattr(get_discoverer, '_instance'):
        get_discoverer._instance = CareerTransitionDiscoverer()
    return get_discoverer._instance


def main():
    """Test the discoverer."""
    print("=" * 60)
    print("Testing Career Transition Discoverer")
    print("=" * 60)
    
    discoverer = CareerTransitionDiscoverer()
    
    # Test profile: 38 year old, IT/Tu Van, 10 years experience
    profile = UserProfile(
        age=38,
        current_role="Truong Phong Kinh Doanh",
        current_industry="ban_hang",
        experience_years=10,
        skills=["Sales", "Team Management", "Customer Relations", "Excel", "PowerPoint"],
        target_salary=30000000
    )
    
    print(f"\nUser Profile:")
    print(f"  Age: {profile.age}")
    print(f"  Industry: {profile.current_industry}")
    print(f"  Experience: {profile.experience_years} years")
    print(f"  Skills: {', '.join(profile.skills)}")
    
    # Get urgency advice
    advice = discoverer.get_urgency_advice(profile.age)
    print(f"\nUrgency: {advice['urgency']}")
    print(f"  Message: {advice['message']}")
    
    # Discover transitions
    print("\nDiscovering transitions...")
    transitions = discoverer.discover_all(profile)
    
    print(f"\n--- Results ---")
    print(f"Management Track: {len(transitions['management_track'])} paths")
    print(f"Cross Industry: {len(transitions['cross_industry'])} paths")
    print(f"Universal: {len(transitions['universal'])} paths")
    print(f"Total: {len(transitions['all'])} paths")
    
    # Show top 5
    print(f"\n--- Top 5 Recommended Transitions ---")
    for i, path in enumerate(transitions["all"][:5], 1):
        print(f"\n{i}. {path.title}")
        print(f"   Type: {path.type}")
        print(f"   Match: {path.match_score*100:.0f}%")
        print(f"   Salary: {path.salary_range['min']/1e6:.0f}-{path.salary_range['max']/1e6:.0f}M VND")
        print(f"   Timeline: {path.timeline_months} months")
        print(f"   Skill gaps: {', '.join(path.skill_gaps[:3])}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
