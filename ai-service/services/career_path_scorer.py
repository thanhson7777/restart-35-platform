# -*- coding: utf-8 -*-
"""
Career Path Scorer Service
=========================
Chấm điểm và rank các career paths dựa trên:
- Match score gốc từ CareerPathDiscoverer
- Priority level từ PriorityEngine
- Skills gap analysis
- Barrier compatibility

Usage:
    scorer = CareerPathScorer()
    result = scorer.score_paths(
        paths=paths,
        priority=priority,
        user_profile=profile
    )
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
import logging

from services.career_path_discoverer import CareerPathDiscoverer, UserProfile, CareerPath

logger = logging.getLogger(__name__)


class CareerPathScorer:
    """
    Chấm điểm và rank career paths.

    Scoring factors:
    1. Match score gốc (từ CareerPathDiscoverer)
    2. Priority boost (URGENT → paths ngắn hạn được ưu tiên)
    3. Skills gap penalty (missing skills = penalty)
    4. Barrier compatibility (paths phù hợp với barriers)
    """

    # Barrier compatibility weights
    BARRIER_WEIGHTS = {
        'health': {
            'management': 0.8,    # Ít vận động - phù hợp
            'consulting': 0.9,
            'teaching': 0.9,
            'technical_leadership': 0.7,
            'age_transition': 0.6,
            'skill_upgrade': 0.7
        },
        'family': {
            'management': 0.7,
            'consulting': 0.8,
            'teaching': 0.9,       # Giờ giấc linh hoạt
            'technical_leadership': 0.6,
            'age_transition': 0.7,
            'skill_upgrade': 0.8
        },
        'techGap': {
            'management': 0.9,       # Ít cần tech skills
            'consulting': 0.8,
            'teaching': 0.8,
            'technical_leadership': 0.4,  # Cần nhiều tech
            'age_transition': 0.5,
            'skill_upgrade': 0.4
        },
        'location': {
            'management': 0.7,
            'consulting': 0.8,
            'teaching': 0.9,       # Có thể online
            'technical_leadership': 0.7,
            'age_transition': 0.7,
            'skill_upgrade': 0.8
        },
        'language': {
            'management': 0.6,
            'consulting': 0.5,     # Cần giao tiếp nhiều
            'teaching': 0.6,
            'technical_leadership': 0.7,
            'age_transition': 0.6,
            'skill_upgrade': 0.8
        }
    }

    # Timeline weights cho từng priority level
    PRIORITY_TIMELINE_BOOST = {
        'urgent': {
            'max_months': 3,
            'boost_factor': 1.3
        },
        'high': {
            'max_months': 6,
            'boost_factor': 1.2
        },
        'medium': {
            'max_months': 12,
            'boost_factor': 1.1
        },
        'low': {
            'max_months': 24,
            'boost_factor': 1.0
        }
    }

    # Skills gap penalty per missing skill
    SKILL_GAP_PENALTY = 0.03

    def __init__(self):
        """Khởi tạo CareerPathScorer."""
        logger.info("CareerPathScorer initialized")

    def score_paths(
        self,
        paths: Dict[str, List[CareerPath]],
        priority: Dict[str, Any],
        user_profile: UserProfile
    ) -> Dict[str, Any]:
        """
        Chấm điểm và rank career paths.

        Args:
            paths: Dict từ CareerPathDiscoverer.discover_career_paths()
                {
                    'management_track': [...],
                    'age_transition': [...],
                    'skill_upgrades': [...]
                }
            priority: Dict từ PriorityEngine.calculate_priority()
            user_profile: UserProfile object

        Returns:
            Dict chứa primary path, alternatives, và skill plan
        """
        priority_level = priority.get('level', 'medium')

        # Collect all paths với metadata
        all_scored_paths = []

        for path_type, path_list in paths.items():
            for path in path_list:
                scored = self._score_single_path(
                    path=path,
                    path_type=path_type,
                    priority_level=priority_level,
                    user_profile=user_profile
                )
                all_scored_paths.append(scored)

        # Sort by final score
        all_scored_paths.sort(key=lambda x: x['final_score'], reverse=True)

        # Get top paths
        primary = all_scored_paths[0] if all_scored_paths else None
        alternatives = all_scored_paths[1:4] if len(all_scored_paths) > 1 else []

        # Generate skill plan cho primary path
        skill_plan = self._generate_skill_plan(primary, user_profile) if primary else None

        result = {
            'primary': primary,
            'alternatives': alternatives,
            'skill_plan': skill_plan,
            'total_paths_found': len(all_scored_paths)
        }

        logger.info(
            f"Career paths scored: primary={primary['title'] if primary else 'None'}, "
            f"alternatives={len(alternatives)}"
        )

        return result

    def _score_single_path(
        self,
        path: CareerPath,
        path_type: str,
        priority_level: str,
        user_profile: UserProfile
    ) -> Dict[str, Any]:
        """
        Chấm điểm một career path duy nhất.

        Args:
            path: CareerPath object
            path_type: Loại path ('management_track', 'age_transition', 'skill_upgrades')
            priority_level: Priority level ('urgent', 'high', 'medium', 'low')
            user_profile: UserProfile object

        Returns:
            Dict với tất cả thông tin path và final_score
        """
        # 1. Base score từ CareerPathDiscoverer
        base_score = path.score

        # 2. Priority boost cho short-term paths
        priority_boost = self._calculate_priority_boost(
            timeline_months=path.timeline_months,
            priority_level=priority_level
        )

        # 3. Skills gap penalty
        skill_gap_penalty = len(path.missing_skills) * self.SKILL_GAP_PENALTY

        # 4. Barrier compatibility score
        barrier_compatibility = self._calculate_barrier_compatibility(
            path_type=path_type,
            path_title=path.title.lower(),
            user_profile=user_profile
        )

        # 5. Experience match bonus
        experience_bonus = self._calculate_experience_bonus(
            path=path,
            user_profile=user_profile
        )

        # 6. Tính final score
        # final = base * (1 + boost) * barrier_compatibility + experience_bonus - penalty
        boost_multiplier = 1.0 + priority_boost

        final_score = (
            base_score
            * boost_multiplier
            * (0.5 + barrier_compatibility * 0.5)
            + experience_bonus
            - skill_gap_penalty
        )

        # Clamp to 0-1
        final_score = max(0.0, min(1.0, final_score))

        # Build result dict
        result = path.to_dict()
        result.update({
            'path_category': path_type,
            'final_score': round(final_score, 3),
            'scoring_breakdown': {
                'base_score': round(base_score, 3),
                'priority_boost': round(priority_boost, 3),
                'barrier_compatibility': round(barrier_compatibility, 3),
                'experience_bonus': round(experience_bonus, 3),
                'skill_gap_penalty': round(skill_gap_penalty, 3)
            },
            'immediate_action': self._generate_immediate_action(path, barrier_compatibility),
            'barrier_notes': self._generate_barrier_notes(path, path_type, barrier_compatibility)
        })

        return result

    def _calculate_priority_boost(
        self,
        timeline_months: int,
        priority_level: str
    ) -> float:
        """
        Tính priority boost cho short-term paths.

        URGENT users nên được gợi ý paths ngắn hạn trước.
        """
        config = self.PRIORITY_TIMELINE_BOOST.get(priority_level, {})

        if not config:
            return 0.0

        max_months = config.get('max_months', 12)
        boost_factor = config.get('boost_factor', 1.0)

        if timeline_months <= max_months:
            # Linear boost: càng ngắn càng được nhiều boost
            boost = (boost_factor - 1.0) * (1 - timeline_months / max_months)
            return boost
        else:
            return 0.0

    def _calculate_barrier_compatibility(
        self,
        path_type: str,
        path_title: str,
        user_profile: UserProfile
    ) -> float:
        """
        Tính barrier compatibility score.

        Một số paths phù hợp hơn với một số barriers.
        VD: Teaching tốt cho người có barrier_family (giờ giấc linh hoạt)
        """
        # Extract barriers từ profile
        barriers = getattr(user_profile, 'barriers', {})
        if not barriers:
            return 0.7  # Default nếu không có barrier info

        # Get barrier weights cho path type
        type_weights = {
            'management_track': 'management',
            'age_transition': 'age_transition',
            'skill_upgrades': 'skill_upgrade'
        }

        mapped_type = type_weights.get(path_type, 'management')

        # Tính compatibility score
        total_weight = 0.0
        total_possible = 0.0

        for barrier_name, has_barrier in barriers.items():
            if has_barrier:
                weight = self.BARRIER_WEIGHTS.get(barrier_name, {}).get(mapped_type, 0.5)
                total_weight += weight
                total_possible += 1.0

        if total_possible == 0:
            return 0.7

        # Return average compatibility
        return total_weight / total_possible

    def _calculate_experience_bonus(
        self,
        path: CareerPath,
        user_profile: UserProfile
    ) -> float:
        """
        Tính experience bonus.

        Nếu user có kinh nghiệm phù hợp với path, cho bonus.
        """
        total_years = user_profile.total_years_experience

        # Bonus cho người có nhiều kinh nghiệm
        if total_years >= 15:
            return 0.05  # Senior bonus
        elif total_years >= 10:
            return 0.03
        elif total_years >= 5:
            return 0.02
        else:
            return 0.0

    def _generate_immediate_action(
        self,
        path: CareerPath,
        barrier_compatibility: float
    ) -> str:
        """
        Generate immediate action recommendation.
        """
        if barrier_compatibility >= 0.8:
            if path.path_type == 'management':
                return "Bắt đầu tìm kiếm các vị trí quản lý cấp trung trong ngành hiện tại"
            elif path.path_type == 'age_transition':
                return "Liên hệ các trung tâm đào tạo nghề để tìm hiểu khóa học chuyển đổi"
            elif path.path_type == 'skill_upgrade':
                return "Đăng ký khóa học online để nâng cao kỹ năng"
            else:
                return "Bắt đầu xây dựng kế hoạch hành động chi tiết"
        elif barrier_compatibility >= 0.6:
            return "Cân nhắc path này nhưng cần chuẩn bị thêm về rào cản hiện tại"
        else:
            return "Path này có thể khó đạt được với các rào cản hiện tại - cân nhắc phương án khác"

    def _generate_barrier_notes(
        self,
        path: CareerPath,
        path_type: str,
        barrier_compatibility: float
    ) -> List[str]:
        """Generate notes về barrier compatibility."""
        notes = []

        if barrier_compatibility >= 0.8:
            notes.append("Path này PHÙ HỢP với các rào cản hiện tại của bạn")
        elif barrier_compatibility >= 0.6:
            notes.append("Path này KHÁ PHÙ HỢP - cần chuẩn bị thêm")
        else:
            notes.append("Path này ÍT PHÙ HỢP với rào cản hiện tại - cân nhắc phương án khác")

        # Specific notes
        if path_type == 'management_track' and barrier_compatibility < 0.7:
            notes.append("Vai trò quản lý có thể đòi hỏi nhiều thời gian và năng lượng hơn")

        return notes

    def _generate_skill_plan(
        self,
        primary_path: Dict[str, Any],
        user_profile: UserProfile
    ) -> Dict[str, Any]:
        """
        Generate skill development plan cho primary path.

        Plan chia theo timeline:
        - month_1_3: Immediate skills
        - month_4_6: Intermediate skills
        - month_7_12: Advanced skills
        """
        if not primary_path:
            return None

        missing_skills = primary_path.get('missing_skills', [])

        # Categorize skills theo độ khó/thời gian
        month_1_3 = []
        month_4_6 = []
        month_7_12 = []

        for skill in missing_skills:
            skill_lower = skill.lower()

            # Quick wins (1-3 tháng)
            if any(kw in skill_lower for kw in ['excel', 'word', 'powerpoint', 'giao tiếp', 'communication']):
                month_1_3.append({
                    'skill': skill,
                    'priority': 'high',
                    'learning_time_months': 1,
                    'resource': self._get_skill_resource(skill)
                })
            # Medium skills (4-6 tháng)
            elif any(kw in skill_lower for kw in ['quản lý', 'management', 'leadership', 'hr', 'tuyển dụng']):
                month_4_6.append({
                    'skill': skill,
                    'priority': 'high',
                    'learning_time_months': 4,
                    'resource': self._get_skill_resource(skill)
                })
            # Advanced skills (7-12 tháng)
            elif any(kw in skill_lower for kw in ['tài chính', 'finance', 'strategy', 'kiến trúc']):
                month_7_12.append({
                    'skill': skill,
                    'priority': 'medium',
                    'learning_time_months': 8,
                    'resource': self._get_skill_resource(skill)
                })
            else:
                # Default: 3-6 tháng
                month_4_6.append({
                    'skill': skill,
                    'priority': 'medium',
                    'learning_time_months': 3,
                    'resource': self._get_skill_resource(skill)
                })

        plan = {}

        if month_1_3:
            plan['month_1_3'] = {
                'focus': 'Xây dựng nền tảng và quick wins',
                'skills_to_add': month_1_3,
                'action': f"Bắt đầu học {len(month_1_3)} kỹ năng cơ bản ngay trong tháng này"
            }

        if month_4_6:
            plan['month_4_6'] = {
                'focus': 'Phát triển kỹ năng chuyên môn',
                'skills_to_add': month_4_6,
                'action': f"Tiếp tục với {len(month_4_6)} kỹ năng chuyên sâu hơn"
            }

        if month_7_12:
            plan['month_7_12'] = {
                'focus': 'Hoàn thiện và chuẩn bị chuyển đổi',
                'skills_to_add': month_7_12,
                'action': f"Hoàn thiện {len(month_7_12)} kỹ năng nâng cao cuối cùng"
            }

        return plan if plan else None

    def _get_skill_resource(self, skill: str) -> str:
        """Get recommended resource cho skill."""
        skill_lower = skill.lower()

        if 'excel' in skill_lower:
            return "Khóa học Excel nâng cao trên YouTube hoặc Udemy"
        elif 'giao tiếp' in skill_lower or 'communication' in skill_lower:
            return "Khóa học giao tiếp, tham gia các buổi networking"
        elif 'quản lý' in skill_lower or 'management' in skill_lower:
            return "Khóa học quản lý tại trung tâm đào tạo hoặc online"
        elif 'leadership' in skill_lower:
            return "Tham gia các dự án nhỏ để rèn luyện leadership"
        elif 'tài chính' in skill_lower or 'finance' in skill_lower:
            return "Tự học hoặc khóa học tài chính cơ bản online"
        else:
            return f"Tìm kiếm khóa học/chứng chỉ liên quan đến {skill}"


def main():
    """Test CareerPathScorer với sample data."""
    from services.career_path_discoverer import CareerPathDiscoverer, UserProfile, WorkExperience
    from services.priority_engine import PriorityEngine

    discoverer = CareerPathDiscoverer()
    scorer = CareerPathScorer()
    priority_engine = PriorityEngine()

    # Test case 1: IT Senior Developer
    print("=== Test: IT Senior Developer 38 tuổi ===")
    profile1 = UserProfile(
        age=38,
        experiences=[
            WorkExperience(industry='IT', role='Senior Developer', years=10,
                          skills=['Python', 'Java', 'SQL', 'Leadership'])
        ],
        target_salary=40000000
    )
    profile1.barriers = {'health': 0, 'family': 1, 'techGap': 0, 'location': 0, 'language': 0}

    paths1 = discoverer.discover_career_paths(profile1)
    priority1 = priority_engine.calculate_priority(
        risk_score=0.55,
        barriers=profile1.barriers,
        employment_status='employed',
        months_unemployed=0
    )

    result1 = scorer.score_paths(paths1, priority1, profile1)

    print(f"Primary: {result1['primary']['title'] if result1['primary'] else 'None'}")
    print(f"  Final Score: {result1['primary']['final_score'] if result1['primary'] else 'N/A'}")
    print(f"  Timeline: {result1['primary']['timeline_months'] if result1['primary'] else 'N/A'} tháng")
    print(f"  Missing Skills: {result1['primary']['missing_skills'] if result1['primary'] else []}")

    if result1['skill_plan']:
        print(f"  Skill Plan: {list(result1['skill_plan'].keys())}")

    print()

    # Test case 2: Thợ may 42 tuổi với barriers
    print("=== Test: Thợ may 42 tuổi, thất nghiệp ===")
    profile2 = UserProfile(
        age=42,
        experiences=[
            WorkExperience(industry='Dệt May', role='Thợ may bậc 6', years=10,
                          skills=['Thiết kế rập', 'May công nghiệp', 'QC']),
            WorkExperience(industry='Dệt May', role='QC', years=5,
                          skills=['Kiểm tra chất lượng', 'Báo cáo'])
        ],
        target_salary=15000000
    )
    profile2.barriers = {'health': 1, 'family': 1, 'techGap': 1, 'location': 0, 'language': 0}

    paths2 = discoverer.discover_career_paths(profile2)
    priority2 = priority_engine.calculate_priority(
        risk_score=0.65,
        barriers=profile2.barriers,
        employment_status='unemployed',
        months_unemployed=3
    )

    result2 = scorer.score_paths(paths2, priority2, profile2)

    print(f"Primary: {result2['primary']['title'] if result2['primary'] else 'None'}")
    print(f"  Final Score: {result2['primary']['final_score'] if result2['primary'] else 'N/A'}")
    print(f"  Timeline: {result2['primary']['timeline_months'] if result2['primary'] else 'N/A'} tháng")
    print(f"  Barrier Notes: {result2['primary']['barrier_notes'] if result2['primary'] else []}")

    if result2['alternatives']:
        print(f"\n  Alternatives:")
        for alt in result2['alternatives']:
            print(f"    - {alt['title']}: {alt['final_score']:.2f}")


if __name__ == '__main__':
    main()
