# -*- coding: utf-8 -*-
"""
Learning Path Generator - Chuỗi khóa học nhiều bước cho skill gaps
=================================================================
Nhận danh sách khóa học đã ranked từ CourseRecommendationEngine,
xếp thành chuỗi nhiều bước theo priority của skill gaps.

Strategy:
  1. Essential skills → bước đầu tiên
  2. Important skills → bước tiếp theo
  3. Nice-to-have → bước cuối
  4. Ghép khóa cùng chủ đề (bundle) nếu có
  5. Bỏ qua khóa chỉ cover skill đã có
"""

import logging
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)


class LearningPathGenerator:
    """
    Tạo learning path nhiều bước từ danh sách khóa học đã ranked.

    Args:
        skill_gaps: [{skill_name, priority}] — skill gaps cần bù
        ranked_courses: [{course_id, title, score, covered_skills, ...}] — đã sorted
        job_title: str — job mục tiêu

    Returns:
        {
            steps: [{step, course, skills_covered, skills_remaining, reason}],
            total_steps: int,
            total_weeks: int,
            job_title: str,
            skills_covered_count: int,
            skills_total: int,
            coverage_percent: float
        }
    """

    def generate_path(
        self,
        skill_gaps: List[Dict],
        ranked_courses: List[Dict],
        job_title: str = "",
        max_steps: int = 5
    ) -> Dict[str, Any]:
        if not skill_gaps:
            return self._empty_path(job_title)

        if not ranked_courses:
            return self._empty_path(job_title)

        path: List[Dict] = []
        covered: set = set()
        remaining_gaps = [g.copy() for g in skill_gaps]  # shallow copy

        # Sort remaining gaps by priority: essential > important > nice_to_have
        priority_order = {'essential': 0, 'important': 1, 'nice_to_have': 2}
        remaining_gaps.sort(key=lambda g: priority_order.get(g.get('priority', ''), 3))

        # Track used course IDs to avoid duplicates
        used_course_ids: set = set()

        for _ in range(max_steps):
            if not remaining_gaps:
                break

            # Find best next course for remaining gaps
            best_course = self._find_best_next_course(remaining_gaps, ranked_courses, covered, used_course_ids)
            if not best_course:
                break

            course_id = best_course.get('course_id', '')
            used_course_ids.add(course_id)

            # Compute covered skills for this course
            course_skills = set(sk.lower() for sk in (best_course.get('covered_skills') or []))
            newly_covered = [g for g in remaining_gaps
                           if g.get('skill_name', '').lower() in course_skills
                           or g.get('canonical', '').lower() in course_skills]

            covered_this_step = set(g['skill_name'] for g in newly_covered)
            covered.update(covered_this_step)

            # Remove covered gaps from remaining
            for gap in newly_covered:
                remaining_gaps.remove(gap)

            # Compute reason for this step
            reason = self._build_step_reason(best_course, list(covered_this_step), len(remaining_gaps))

            # Duration
            duration = best_course.get('duration') or {}
            duration_val = duration.get('value', 0) if isinstance(duration, dict) else 0

            step = {
                'step': len(path) + 1,
                'course': {
                    'course_id': course_id,
                    'title': best_course.get('title', ''),
                    'score': best_course.get('score', 0),
                    'covered_skills': list(covered_this_step),
                    'fee': best_course.get('fee', 0),
                    'duration': duration,
                    'duration_value': duration_val,
                    'level': best_course.get('level', ''),
                    'rating': best_course.get('rating') or {},
                    'thumbnail': best_course.get('thumbnail', ''),
                    'llm_explanation': best_course.get('llm_explanation', ''),
                },
                'skills_covered': list(covered_this_step),
                'skills_remaining': len(remaining_gaps),
                'reason': reason,
            }
            path.append(step)

        # Summary
        total_weeks = sum(
            step['course'].get('duration_value', 0) or
            (step['course'].get('duration') or {}).get('value', 0)
            for step in path
        )

        skills_total = len(skill_gaps)
        skills_covered_count = len(covered)
        coverage_percent = round(skills_covered_count / skills_total * 100, 1) if skills_total > 0 else 0

        return {
            'steps': path,
            'total_steps': len(path),
            'total_weeks': total_weeks,
            'job_title': job_title,
            'skills_covered_count': skills_covered_count,
            'skills_total': skills_total,
            'coverage_percent': coverage_percent,
        }

    def _find_best_next_course(
        self,
        remaining_gaps: List[Dict],
        ranked_courses: List[Dict],
        already_covered: set,
        used_course_ids: set
    ) -> Optional[Dict]:
        """
        Tìm khóa học phù hợp nhất cho bước tiếp theo.

        Priority:
        1. Course cover essential gaps (if any remaining)
        2. Course covers most uncovered skills
        3. Not already used
        """
        # Separate by priority
        essential_remaining = [g for g in remaining_gaps if g.get('priority') == 'essential']
        important_remaining = [g for g in remaining_gaps if g.get('priority') == 'important']

        # Prefer courses covering essential gaps first
        candidates = ranked_courses

        best = None
        best_score = -1

        for course in candidates:
            course_id = course.get('course_id', '')
            if course_id in used_course_ids:
                continue

            course_skills = set(sk.lower() for sk in (course.get('covered_skills') or []))

            # Compute uncovered skills count
            uncovered_for_course = [
                g for g in remaining_gaps
                if g.get('skill_name', '').lower() in course_skills
                or g.get('canonical', '').lower() in course_skills
            ]

            # Skip if covers no new skills
            if not uncovered_for_course:
                continue

            # Priority bonus: essential coverage gets higher score
            essential_covered = sum(
                1 for g in uncovered_for_course if g.get('priority') == 'essential'
            )
            important_covered = sum(
                1 for g in uncovered_for_course if g.get('priority') == 'important'
            )

            # Score: 3 points per essential, 2 per important, 1 per nice-to-have
            score = essential_covered * 3 + important_covered * 2 + len(uncovered_for_course)
            score += (course.get('score', 0) * 10)  # tie-break with course score

            if score > best_score:
                best_score = score
                best = course

        return best

    def _build_step_reason(
        self,
        course: Dict,
        covered_skills: List[str],
        remaining_count: int
    ) -> str:
        """Build human-readable reason for this learning step."""
        if not covered_skills:
            return f"Hướng tới: {course.get('title', 'hoàn thiện kỹ năng')}"

        skills_str = ', '.join(covered_skills[:3])
        extra = f" + {len(covered_skills) - 3} kỹ năng" if len(covered_skills) > 3 else ""
        remaining_str = f", còn {remaining_count} kỹ năng" if remaining_count > 0 else ""

        return f"Bổ sung {skills_str}{extra}{remaining_str}"

    def _empty_path(self, job_title: str = "") -> Dict[str, Any]:
        return {
            'steps': [],
            'total_steps': 0,
            'total_weeks': 0,
            'job_title': job_title,
            'skills_covered_count': 0,
            'skills_total': 0,
            'coverage_percent': 0,
        }


# Singleton instance
_generator_instance: Optional[LearningPathGenerator] = None


def get_learning_path_generator() -> LearningPathGenerator:
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = LearningPathGenerator()
    return _generator_instance
