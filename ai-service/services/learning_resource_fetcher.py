"""
Learning Resource Fetcher Service

Matches skill gaps to hardcoded learning resources.
NO external API calls - all resources pre-loaded.

Usage:
    fetcher = LearningResourceFetcher()
    resources = fetcher.match_for_transitions(transitions)
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class LearningResourceFetcher:
    """
    Matches skill gaps to hardcoded learning resources.
    No external API calls.
    """
    
    # Skill aliases for fuzzy matching
    SKILL_ALIASES = {
        "presentation": ["thuyet_trinh", "public_speaking", "speaking"],
        "coaching": ["coach", "mentoring", "mentor"],
        "curriculum_design": ["thiet_ke_chuong_trinh", "instructional_design", "giao_trinh"],
        "lean_six_sigma": ["lean", "six_sigma", "process_improvement", "cai_tien_quy_trinh"],
        "iso_standards": ["iso", "quality", "chat_luong"],
        "consulting": ["tu_van", "consultant"],
        "business_strategy": ["chien_luoc", "strategy", "strategic"],
        "financial_analysis": ["tai_chinh", "finance", "phan_tich_tai_chinh"],
        "digital_marketing": ["marketing", "seo", "social_media"],
        "project_management": ["quan_ly_du_an", "project", "agile", "scrum"],
        "safety_management": ["an_toan", "safety"],
        "hr_management": ["nhan_su", "hr", "tuyen_dung"],
        "compliance": ["compliance", "phap_ly", "quy_dinh"],
        "negotiation": ["dau_nhe", "negotiate"],
        "leadership": ["lanh_dao", "quan_ly", "leadership"]
    }
    
    def __init__(self):
        self.resources = self._load_resources()
        self._match_cache: Dict[str, List[Dict]] = {}
    
    def _load_resources(self) -> Dict:
        """Load learning resources from JSON."""
        data_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "data", "learning_resources.json"
        )
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load resources: {e}")
            return {"skill_resources": {}}
    
    def _is_similar(self, skill1: str, skill2: str, threshold: float = 0.6) -> bool:
        """Check if two skills are similar using fuzzy matching."""
        # Direct match (case insensitive)
        if skill1.lower() == skill2.lower():
            return True
        
        # Check aliases
        skill1_lower = skill1.lower()
        skill2_lower = skill2.lower()
        
        for key, aliases in self.SKILL_ALIASES.items():
            if skill1_lower in aliases or skill1_lower == key:
                if skill2_lower in aliases or skill2_lower == key:
                    return True
        
        # Fuzzy match
        ratio = SequenceMatcher(None, skill1_lower, skill2_lower).ratio()
        return ratio >= threshold
    
    def _normalize_skill(self, skill: str) -> str:
        """Normalize skill name to match resource keys."""
        skill_lower = skill.lower().strip()
        
        # Check aliases
        for key, aliases in self.SKILL_ALIASES.items():
            if skill_lower in aliases or skill_lower == key:
                return key
        
        # Direct match with resources
        skill_resources = self.resources.get("skill_resources", {})
        for resource_key in skill_resources.keys():
            if self._is_similar(skill_lower, resource_key, 0.7):
                return resource_key
        
        return skill_lower
    
    def match_resources(self, skill_gaps: List[str]) -> List[Dict]:
        """
        Match skill gaps to available resources.
        Returns courses sorted by: free first, then by rating.
        """
        matched = []
        seen = set()  # Avoid duplicates
        
        # Get skill_resources from JSON
        skill_resources = self.resources.get("skill_resources", {})
        
        for skill in skill_gaps:
            # Check cache
            cache_key = skill.lower().strip()
            if cache_key in self._match_cache:
                for course in self._match_cache[cache_key]:
                    if isinstance(course, dict) and course.get("title") not in seen:
                        matched.append(course)
                        seen.add(course.get("title"))
                continue
            
            # Normalize skill
            normalized = self._normalize_skill(skill)
            
            # Find matching resources
            # Structure: skill_resources -> skill_key -> courses array
            courses = []
            
            # Check exact match
            if normalized in skill_resources:
                skill_data = skill_resources[normalized]
                if isinstance(skill_data, dict):
                    courses = skill_data.get("courses", [])
                elif isinstance(skill_data, list):
                    courses = skill_data
            
            # Also try fuzzy matching
            if not courses:
                for key, skill_data in skill_resources.items():
                    if self._is_similar(skill, key, 0.6):
                        if isinstance(skill_data, dict):
                            courses.extend(skill_data.get("courses", []))
                        elif isinstance(skill_data, list):
                            courses.extend(skill_data)
            
            # Cache the results
            self._match_cache[cache_key] = courses
            
            # Add to results
            for course in courses:
                if isinstance(course, dict) and course.get("title") not in seen:
                    matched.append(course)
                    seen.add(course.get("title"))
        
        # Sort: free first, then by rating
        return self._sort_resources(matched)
    
    def _sort_resources(self, resources: List[Dict]) -> List[Dict]:
        """Sort resources by: free first, then rating."""
        def sort_key(r):
            # Free courses first (is_free=True -> 0, is_free=False -> 1)
            free_sort = 0 if r.get("is_free", False) else 1
            # Then by rating (higher is better)
            rating = r.get("rating", 0)
            return (free_sort, -rating)
        
        return sorted(resources, key=sort_key)
    
    def match_for_transitions(
        self, 
        transitions: List[Dict],
        max_per_skill: int = 3
    ) -> Dict[str, List[Dict]]:
        """
        Match learning resources for all transitions.
        
        Returns:
            Dict mapping skill -> list of courses
        """
        all_skill_gaps = set()
        
        # Collect all skill gaps from transitions
        for trans in transitions:
            for skill in trans.get("skill_gaps", []):
                all_skill_gaps.add(skill)
        
        # Match resources for each skill
        results = {}
        for skill in all_skill_gaps:
            resources = self.match_resources([skill])
            if resources:
                results[skill] = resources[:max_per_skill]
        
        return results
    
    def get_resources_by_timeline(
        self, 
        skill_gaps: List[str], 
        timeline_months: int,
        hours_per_week: int = 4
    ) -> List[Dict]:
        """
        Get resources that fit within timeline.
        
        Args:
            skill_gaps: List of skills to learn
            timeline_months: Available time in months
            hours_per_week: Available hours per week (default: 4)
        
        Returns:
            List of courses that can be completed in time
        """
        # Calculate total available hours
        total_hours = timeline_months * 4 * hours_per_week
        
        # Get all matching resources
        all_resources = self.match_resources(skill_gaps)
        
        # Filter by duration
        feasible = []
        for resource in all_resources:
            duration = resource.get("duration_hours", 999)
            if duration <= total_hours:
                feasible.append(resource)
        
        return feasible
    
    def get_quick_learning_skills(self) -> List[str]:
        """Get skills that can be learned quickly (1-2 weeks)."""
        return self.resources.get("quick_learning_skills", {}).get("skills", [])
    
    def get_medium_learning_skills(self) -> List[str]:
        """Get skills that take medium time (1-3 months)."""
        return self.resources.get("medium_learning_skills", {}).get("skills", [])
    
    def get_long_learning_skills(self) -> List[str]:
        """Get skills that take long time (3-6+ months)."""
        return self.resources.get("long_learning_skills", {}).get("skills", [])
    
    def recommend_learning_path(
        self, 
        skill_gaps: List[str],
        timeline_months: int
    ) -> List[Dict]:
        """
        Recommend a learning path based on skill gaps and timeline.
        
        Prioritizes:
        1. Quick learning skills first
        2. Skills with free resources
        3. Skills with high-rated courses
        """
        quick_skills = set(self.get_quick_learning_skills())
        medium_skills = set(self.get_medium_learning_skills())
        
        # Categorize skills by learning time
        quick_to_learn = []
        medium_to_learn = []
        long_to_learn = []
        
        for skill in skill_gaps:
            normalized = self._normalize_skill(skill)
            if normalized in quick_skills:
                quick_to_learn.append(skill)
            elif normalized in medium_skills:
                medium_to_learn.append(skill)
            else:
                long_to_learn.append(skill)
        
        # Build learning path
        path = []
        
        # Quick skills first (if timeline allows)
        if timeline_months >= 1:
            for skill in quick_to_learn[:3]:
                resources = self.match_resources([skill])[:2]
                if resources:
                    path.append({
                        "skill": skill,
                        "phase": "Quick Win (1-2 weeks)",
                        "courses": resources,
                        "time_estimate": "1-2 weeks"
                    })
        
        # Medium skills next (if timeline allows)
        if timeline_months >= 3:
            for skill in medium_to_learn[:2]:
                resources = self.match_resources([skill])[:2]
                if resources:
                    path.append({
                        "skill": skill,
                        "phase": "Foundation (1-3 months)",
                        "courses": resources,
                        "time_estimate": "1-3 months"
                    })
        
        # Long skills last (if timeline allows)
        if timeline_months >= 6:
            for skill in long_to_learn[:1]:
                resources = self.match_resources([skill])[:2]
                if resources:
                    path.append({
                        "skill": skill,
                        "phase": "Expert (3-6 months)",
                        "courses": resources,
                        "time_estimate": "3-6 months"
                    })
        
        return path


def get_fetcher() -> LearningResourceFetcher:
    """Get singleton instance."""
    if not hasattr(get_fetcher, '_instance'):
        get_fetcher._instance = LearningResourceFetcher()
    return get_fetcher._instance


def main():
    """Test the fetcher."""
    print("=" * 60)
    print("Testing Learning Resource Fetcher")
    print("=" * 60)
    
    fetcher = LearningResourceFetcher()
    
    # Test skill gaps
    skill_gaps = [
        "Presentation",
        "Coaching",
        "Lean Six Sigma",
        "ISO Standards"
    ]
    
    print(f"\nSkill gaps: {skill_gaps}")
    
    # Match resources
    print("\n--- Matching Resources ---")
    resources = fetcher.match_resources(skill_gaps)
    
    print(f"Found {len(resources)} resources")
    
    for i, r in enumerate(resources[:10], 1):
        free_str = "FREE" if r.get("is_free") else f"{r.get('price_vnd', 'N/A')} VND"
        print(f"\n{i}. {r['title']}")
        print(f"   Platform: {r['platform']}")
        print(f"   Duration: {r['duration_hours']} hours")
        print(f"   Price: {free_str}")
        print(f"   Rating: {r.get('rating', 'N/A')}")
    
    # Test learning path
    print("\n--- Recommended Learning Path (6 months) ---")
    path = fetcher.recommend_learning_path(skill_gaps, timeline_months=6)
    
    for phase in path:
        print(f"\n{phase['phase']}: {phase['skill']}")
        for course in phase['courses']:
            print(f"   - {course['title']} ({course['platform']}, {course['duration_hours']}h)")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
