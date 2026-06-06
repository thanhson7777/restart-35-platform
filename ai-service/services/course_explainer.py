# -*- coding: utf-8 -*-
"""
Course Explainer - LLM-powered explanation for course recommendations
=================================================================
Tạo câu giải thích bằng tiếng Việt cho từng khóa học được gợi ý,
dựa trên profile người dùng, kỹ năng còn thiếu, và job mục tiêu.

Uses unified LLM client (GROQ/Gemini) with:
- In-memory cache per course_id
- Circuit breaker pattern
- Graceful fallback khi LLM unavailable
"""

import os
import json
import logging
import time
import hashlib
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

try:
    from config.groq_client import get_llm_client, LLM_AVAILABLE
except ImportError:
    LLM_AVAILABLE = False
    logger.warning("Unified LLM client not available")

COURSE_PROMPT_TEMPLATE = """Bạn là chuyên gia tư vấn học tập cho người lao động Việt Nam.

THÔNG TIN KHÓA HỌC:
- Tiêu đề: {course_title}
- Kỹ năng bù được: {covered_skills}
- Kỹ năng còn thiếu: {remaining_skills}
- Job mục tiêu: {job_title}
- Thời lượng: {duration}
- Học phí: {fee}
- Trình độ: {level}

YÊU CẦU:
- Viết 1-2 câu tiếng Việt, ngắn gọn, dễ hiểu
- Tập trung giá trị thực tế cho công việc
- So sánh với profile người dùng (dùng "bạn", "khóa học này")
- Không quá 25 từ

Trả về JSON: {{"explanation": "câu giải thích ngắn gọn"}}
"""


class CourseExplainerCache:
    """In-memory cache for course explanations. TTL: 1 hour."""

    MAX_AGE_SECONDS = 3600

    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._hits = 0
        self._misses = 0

    def _make_key(self, course_id: str, covered_skills: List[str]) -> str:
        skills_str = ','.join(sorted(s.lower().strip() for s in covered_skills[:5]))
        key_str = f"{course_id}|{skills_str}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def get(self, course_id: str, covered_skills: List[str]) -> Optional[str]:
        key = self._make_key(course_id, covered_skills)
        if key in self._cache:
            entry = self._cache[key]
            age = time.time() - entry.get('timestamp', 0)
            if age < self.MAX_AGE_SECONDS:
                self._hits += 1
                return entry['explanation']
            else:
                del self._cache[key]
        self._misses += 1
        return None

    def set(self, course_id: str, covered_skills: List[str], explanation: str):
        key = self._make_key(course_id, covered_skills)
        self._cache[key] = {
            'explanation': explanation,
            'timestamp': time.time()
        }

    def stats(self) -> Dict:
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            'hits': self._hits,
            'misses': self._misses,
            'total_entries': len(self._cache),
            'hit_rate_percent': round(hit_rate, 1)
        }


class CourseExplainer:
    """
    LLM-powered explainer cho course recommendations.

    Features:
    - Uses unified LLM client (GROQ primary, Gemini fallback)
    - In-memory cache per course_id + covered_skills
    - Circuit breaker khi LLM quota exceeded
    - Graceful fallback sang template reason khi LLM unavailable
    """

    def __init__(self, cache_ttl_seconds: int = 3600):
        self._llm_client = None
        self._cache = CourseExplainerCache()

        # Circuit breaker
        self._circuit_open = False
        self._circuit_open_time = 0
        self._circuit_timeout = 60
        self._consecutive_errors = 0
        self._max_consecutive_errors = 3

        if LLM_AVAILABLE:
            try:
                self._llm_client = get_llm_client()
                if self._llm_client and self._llm_client.available:
                    logger.info("CourseExplainer: LLM client initialized")
                else:
                    logger.warning("CourseExplainer: no LLM provider available")
            except Exception as e:
                logger.error(f"CourseExplainer: failed to init LLM: {e}")

    @property
    def _is_circuit_open(self) -> bool:
        if not self._circuit_open:
            return False
        elapsed = time.time() - self._circuit_open_time
        if elapsed >= self._circuit_timeout:
            logger.info("CourseExplainer: circuit breaker cooldown expired")
            self._circuit_open = False
            self._consecutive_errors = 0
            return False
        return True

    def _open_circuit(self):
        if not self._circuit_open:
            logger.warning("CourseExplainer: circuit breaker OPENED (60s)")
            self._circuit_open = True
            self._circuit_open_time = time.time()

    def _maybe_open_circuit(self):
        if self._consecutive_errors >= self._max_consecutive_errors:
            self._open_circuit()

    def is_available(self) -> bool:
        return (
            self._llm_client is not None
            and self._llm_client.available
            and not self._is_circuit_open
        )

    def explain(
        self,
        course: Dict,
        covered_skills: List[str],
        remaining_skills: Optional[List[str]] = None,
        job_title: str = ""
    ) -> str:
        """
        Generate explanation for a course recommendation.

        Args:
            course: Course dict with course_id, title, fee, duration, level
            covered_skills: List of skills this course covers
            remaining_skills: List of remaining skill gaps
            job_title: Target job title

        Returns:
            Vietnamese explanation string (max ~25 words)
        """
        course_id = str(course.get('course_id', ''))

        # 1. Check cache
        cached = self._cache.get(course_id, covered_skills)
        if cached is not None:
            logger.debug(f"CourseExplainer: cache HIT for {course_id}")
            return cached

        # 2. If circuit open or LLM unavailable, use fallback
        if self._is_circuit_open or not self.is_available():
            logger.debug(f"CourseExplainer: using fallback for {course_id}")
            explanation = self._fallback_reason(course, covered_skills)
            self._cache.set(course_id, covered_skills, explanation)
            return explanation

        # 3. Build prompt
        prompt = self._build_prompt(course, covered_skills, remaining_skills, job_title)

        # 4. Call LLM
        try:
            text = self._llm_client.generate(prompt=prompt)

            if not text:
                self._consecutive_errors += 1
                self._maybe_open_circuit()
                return self._fallback_reason(course, covered_skills)

            text = text.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
                text = text.rsplit('```', 1)[0]
                text = text.strip()

            data = json.loads(text)
            explanation = data.get('explanation', '')
            if not explanation:
                raise ValueError("Empty explanation in LLM response")

            self._consecutive_errors = 0
            explanation = explanation.strip()

        except json.JSONDecodeError as e:
            logger.error(f"CourseExplainer: JSON parse error: {e}")
            self._consecutive_errors += 1
            self._maybe_open_circuit()
            explanation = self._fallback_reason(course, covered_skills)

        except Exception as e:
            error_str = str(e)
            if '429' in error_str or 'quota' in error_str.lower() or 'RESOURCE_EXHAUSTED' in error_str:
                self._open_circuit()
            else:
                self._consecutive_errors += 1
                self._maybe_open_circuit()
            logger.error(f"CourseExplainer: LLM error: {e}")
            explanation = self._fallback_reason(course, covered_skills)

        # 5. Cache & return
        self._cache.set(course_id, covered_skills, explanation)
        return explanation

    def _build_prompt(
        self,
        course: Dict,
        covered_skills: List[str],
        remaining_skills: Optional[List[str]],
        job_title: str
    ) -> str:
        course_title = course.get('title', 'Khóa học không tên')
        covered_str = ', '.join(covered_skills[:5]) if covered_skills else 'không có'
        remaining_str = ', '.join(remaining_skills[:5]) if remaining_skills else 'không còn'
        duration_val = course.get('duration', {})
        duration_str = f"{duration_val.get('value', '?')} {duration_val.get('unit', 'tuần')}" if duration_val else 'Không rõ'
        fee = course.get('fee', 0)
        fee_str = 'Miễn phí' if fee == 0 else f"{fee:,.0f} đồng"
        level = course.get('level', 'Không rõ')
        job_str = job_title or 'công việc mục tiêu'

        return COURSE_PROMPT_TEMPLATE.format(
            course_title=course_title,
            covered_skills=covered_str,
            remaining_skills=remaining_str,
            job_title=job_str,
            duration=duration_str,
            fee=fee_str,
            level=level
        )

    def _fallback_reason(self, course: Dict, covered_skills: List[str]) -> str:
        """Fallback template reason when LLM is unavailable."""
        title = course.get('title', 'Khóa học này')
        if covered_skills:
            skills_str = ', '.join(covered_skills[:3])
            suffix = f" + {len(covered_skills) - 3} kỹ năng khác" if len(covered_skills) > 3 else ""
            return f"Khóa học giúp bạn bổ sung {skills_str}{suffix} — kỹ năng quan trọng cho công việc mục tiêu."
        return f"Khóa học '{title}' phù hợp với lộ trình phát triển nghề nghiệp của bạn."

    def get_cache_stats(self) -> Dict:
        return self._cache.stats()

    def clear_cache(self):
        self._cache._cache.clear()
        logger.info("CourseExplainer: cache cleared")


# Singleton instance
_explainer_instance: Optional[CourseExplainer] = None


def get_course_explainer() -> CourseExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = CourseExplainer()
    return _explainer_instance
