# -*- coding: utf-8 -*-
"""
Career Path Generator - Gemini-powered career path generation
=============================================================
Tạo career paths với job titles CỤ THỂ từ:
1. Job titles thực từ Job Recommender
2. Reasoning thông minh từ Gemini

Benefits:
- Job titles không còn chung chung
- Reasoning cá nhân hóa theo profile
- Kết nối career paths với job DB thực

Usage:
    generator = CareerPathGenerator()
    result = generator.generate_paths(user_profile, job_recommender)
"""

import json
import logging
import time
import hashlib
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

from services.gemini_explainer import get_explainer

logger = logging.getLogger(__name__)

try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-genai not installed. Gemini features disabled.")


class CareerPathCache:
    """
    In-memory cache cho career path generation.
    
    Cache based on: user_profile hash + timestamp
    TTL: 1 hour (profiles change infrequently)
    """
    
    MAX_AGE_HOURS = 1
    
    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Dict[str, Dict] = {}
        self._ttl_seconds = ttl_seconds
    
    def _make_key(self, profile: dict) -> str:
        """Tạo cache key từ profile."""
        key_data = f"{profile.get('age', 0)}_{profile.get('industry', '')}_{profile.get('experience', 0)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, profile: dict) -> Optional[List[dict]]:
        """Get cached paths nếu còn valid."""
        key = self._make_key(profile)
        
        if key in self._cache:
            entry = self._cache[key]
            age = time.time() - entry['timestamp']
            
            if age < self._ttl_seconds:
                logger.debug(f"Cache HIT for career paths (age: {age:.0f}s)")
                return entry['paths']
            else:
                del self._cache[key]
                logger.debug(f"Cache EXPIRED for career paths")
        
        return None
    
    def set(self, profile: dict, paths: List[dict]):
        """Save paths to cache."""
        key = self._make_key(profile)
        self._cache[key] = {
            'paths': paths,
            'timestamp': time.time()
        }
        logger.debug(f"Cache SAVE career paths (total entries: {len(self._cache)})")


class CareerPathGenerator:
    """
    Gemini-powered Career Path Generator.
    
    Features:
    - Tạo career paths với job titles CỤ THỂ (không chung chung)
    - Reasoning cá nhân hóa từ Gemini
    - Kết nối với Job Recommender để lấy job titles thực
    - Fallback rule-based nếu Gemini unavailable
    """
    
    # Prompt templates
    PROMPT_TEMPLATE = """Bạn là chuyên gia tư vấn nghề nghiệp Việt Nam với 20 năm kinh nghiệm.

NHIỆM VỤ: Đề xuất 3 career paths CỤ THỂ và THỰC TẾ nhất cho ứng viên.

THÔNG TIN ỨNG VIÊN:
- Tuổi: {age}
- Ngành hiện tại: {industry}
- Kinh nghiệm: {experience} năm
- Kỹ năng: {skills}
- Rào cản: {barriers}
- Mục tiêu lương: {target_salary}
- Tình trạng: {employment_status}

CÁC CÔNG VIỆC CÓ SẴN TRONG HỆ THỐNG (dùng TÊN CHÍNH XÁC này):
{available_jobs}

YÊU CẦU NGHIÊM NGẶT:
1. Chỉ dùng job titles TỪ DANH SÁCH TRÊN (không sáng tạo tên mới)
2. Mỗi path phải khác nhau về CẤP BẬC: entry/mid/senior
3. Reasoning phải SO SÁNH cụ thể với profile (dùng "bạn", "bạn có")
4. Timeline phải THỰC TẾ, không viển vông
5. Missing skills phải CỤ THỂ, có thể đạt được

OUTPUT FORMAT (chỉ JSON, không giải thích gì thêm):
{{
  "career_paths": [
    {{
      "title": "NV Kinh doanh B2B",  // EXACT title từ danh sách trên
      "level": "mid",
      "match_score": 0.85,
      "salary_range": "15-25 triệu",
      "timeline_months": 6,
      "reasoning": "Bạn có {X} năm kinh nghiệm - phù hợp với vai trò mid-level...",
      "missing_skills": ["Kỹ năng đàm phán", "Quản lý khách hàng"],
      "immediate_action": "Hành động cụ thể trong tháng này"
    }}
  ]
}}"""

    FALLBACK_PROMPT = """Bạn là chuyên gia tư vấn nghề nghiệp Việt Nam.

Với profile: {age} tuổi, {experience} năm kinh nghiệm ngành {industry}

Đề xuất 3 career paths với:
- Title CỤ THỂ (không chung chung như "Tư vấn độc lập")
- Salary range thực tế
- Timeline cụ thể

Trả về JSON:
{{
  "career_paths": [
    {{
      "title": "Trưởng phòng Kinh doanh",
      "level": "senior",
      "match_score": 0.8,
      "salary_range": "20-30 triệu",
      "timeline_months": 12,
      "reasoning": "Bạn có {experience} năm kinh nghiệm...",
      "missing_skills": ["Quản lý nhóm", "Chiến lược kinh doanh"],
      "immediate_action": "Bắt đầu từ..."
    }}
  ]
}}"""

    def __init__(self, api_key: str = None):
        """
        Khởi tạo CareerPathGenerator.
        
        Args:
            api_key: Gemini API key. Nếu None, đọc từ env.
        """
        self.api_key = api_key
        self.client = None
        self.model = 'gemini-2.0-flash'
        self._cache = CareerPathCache(ttl_seconds=3600)  # 1 hour cache
        
        # Circuit breaker
        self._circuit_open = False
        self._circuit_open_time = 0
        self._circuit_timeout = 60
        
        self._init_client()
    
    def _init_client(self):
        """Initialize Gemini client."""
        if not GEMINI_AVAILABLE:
            logger.warning("google-genai not installed")
            return
        
        if not self.api_key:
            from dotenv import load_dotenv
            load_dotenv()
            self.api_key = os.getenv('GEMINI_API_KEY')
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("CareerPathGenerator: Gemini client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.client = None
        else:
            logger.warning("GEMINI_API_KEY not set")
    
    @property
    def is_available(self) -> bool:
        """Check if Gemini is available."""
        return self.client is not None and not self._circuit_open
    
    def generate_paths(
        self,
        user_profile: dict,
        available_jobs: List[dict] = None
    ) -> List[dict]:
        """
        Generate career paths với job titles cụ thể.
        
        Args:
            user_profile: User profile dict với keys:
                - age: int
                - industry: str
                - experience: float (years)
                - skills: List[str]
                - barriers: Dict[str, bool]
                - target_salary: int (VND)
                - employment_status: str
            available_jobs: Optional list of jobs từ job recommender
        
        Returns:
            List of career path dicts
        """
        # Check circuit breaker
        if self._is_circuit_open():
            logger.warning("Circuit breaker open, using fallback")
            return self._generate_fallback_paths(user_profile)
        
        # Check cache
        cached_paths = self._cache.get(user_profile)
        if cached_paths:
            return cached_paths
        
        # Generate with Gemini
        if self.is_available:
            try:
                paths = self._generate_with_gemini(user_profile, available_jobs)
                if paths:
                    self._cache.set(user_profile, paths)
                    return paths
            except Exception as e:
                logger.error(f"Gemini generation failed: {e}")
                self._handle_error(e)
        
        # Fallback to rule-based
        return self._generate_fallback_paths(user_profile)
    
    def _generate_with_gemini(
        self,
        user_profile: dict,
        available_jobs: List[dict] = None
    ) -> List[dict]:
        """Generate paths using Gemini."""
        
        # Format available jobs
        if available_jobs and len(available_jobs) > 0:
            jobs_text = "\n".join([
                f"- {job.get('title', '')} ({job.get('location', '')})"
                for job in available_jobs[:30]  # Max 30 jobs
            ])
        else:
            jobs_text = "- Các công việc phù hợp với ngành nghề"
        
        # Format barriers
        barriers = user_profile.get('barriers', {})
        barriers_list = [
            k for k, v in barriers.items() if v
        ] if barriers else []
        barriers_str = ", ".join(barriers_list) if barriers_list else "Không có"
        
        # Format skills
        skills = user_profile.get('skills', [])
        skills_str = ", ".join(skills[:10]) if skills else "Không có"
        
        # Format salary
        salary = user_profile.get('target_salary', 0)
        salary_str = f"{salary/1000000:.0f} triệu/tháng" if salary > 0 else "Thương lượng"
        
        # Format experience
        exp = user_profile.get('experience', 0)
        industry = user_profile.get('industry', 'unknown')
        employment = user_profile.get('employment_status', 'unknown')
        
        # Build prompt
        if available_jobs and len(available_jobs) > 0:
            prompt = self.PROMPT_TEMPLATE.format(
                age=user_profile.get('age', 40),
                industry=industry,
                experience=exp,
                skills=skills_str,
                barriers=barriers_str,
                target_salary=salary_str,
                employment_status=employment,
                available_jobs=jobs_text
            )
        else:
            prompt = self.FALLBACK_PROMPT.format(
                age=user_profile.get('age', 40),
                industry=industry,
                experience=exp
            )
        
        # Call Gemini
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            text = response.text.strip()
            
            # Parse JSON
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
                text = text.rsplit('```', 1)[0]
                text = text.strip()
            
            data = json.loads(text)
            paths = data.get('career_paths', [])
            
            logger.info(f"Generated {len(paths)} career paths with Gemini")
            return paths
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return []
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise
    
    def _generate_fallback_paths(self, user_profile: dict) -> List[dict]:
        """
        Fallback: Rule-based career path generation.
        
        Dùng khi Gemini unavailable.
        """
        age = user_profile.get('age', 40)
        exp = user_profile.get('experience', 0)
        industry = user_profile.get('industry', 'general')
        skills = user_profile.get('skills', [])
        target_salary = user_profile.get('target_salary', 0)
        
        # Determine level based on experience
        if exp < 3:
            level = "entry"
            timeline = 3
        elif exp < 7:
            level = "mid"
            timeline = 6
        else:
            level = "senior"
            timeline = 12
        
        # Generate based on industry
        paths = self._get_rule_based_paths(
            age=age,
            experience=exp,
            industry=industry,
            skills=skills,
            target_salary=target_salary,
            level=level,
            timeline=timeline
        )
        
        logger.info(f"Generated {len(paths)} fallback career paths")
        return paths
    
    def _get_rule_based_paths(
        self,
        age: int,
        experience: float,
        industry: str,
        skills: List[str],
        target_salary: int,
        level: str,
        timeline: int
    ) -> List[dict]:
        """Generate rule-based paths cho fallback."""
        
        # Mapping industry -> possible titles
        industry_titles = {
            'IT': ['Lập trình viên', 'Senior Developer', 'Tech Lead', 'Quản lý dự án IT'],
            'manufacturing': ['Nhân viên sản xuất', 'Giám sát sản xuất', 'Quản lý xưởng'],
            'retail': ['Nhân viên bán hàng', 'Trưởng ca', 'Quản lý cửa hàng'],
            'service': ['Nhân viên phục vụ', 'Giám sát', 'Quản lý nhà hàng'],
            'finance': ['Nhân viên kế toán', 'Kế toán tổng hợp', 'Trưởng phòng tài chính'],
            'education': ['Giáo viên', 'Trưởng bộ môn', 'Hiệu trưởng'],
            'healthcare': ['Điều dưỡng', 'Trưởng khoa', 'Quản lý bệnh viện'],
            'construction': ['Công nhân xây dựng', 'Giám sát công trình', 'Chỉ huy trưởng'],
            'transport': ['Tài xế', 'Giám sát vận tải', 'Quản lý logistics'],
            'general': ['Nhân viên', 'Trưởng nhóm', 'Quản lý']
        }
        
        titles = industry_titles.get(industry.lower(), industry_titles['general'])
        
        # Generate 3 paths at different levels
        result = []
        
        for i, title in enumerate(titles[:3]):
            path_level = ['entry', 'mid', 'senior'][i]
            
            # Calculate salary range based on level
            base_salary = target_salary if target_salary > 0 else 10000000
            if path_level == 'entry':
                salary_min = base_salary * 0.7
                salary_max = base_salary * 1.0
            elif path_level == 'mid':
                salary_min = base_salary * 1.0
                salary_max = base_salary * 1.5
            else:
                salary_min = base_salary * 1.5
                salary_max = base_salary * 2.5
            
            path = {
                'title': title,
                'level': path_level,
                'match_score': 0.7 + (i * 0.1),  # Higher for better matches
                'salary_range': f"{int(salary_min/1000000)}-{int(salary_max/1000000)} triệu",
                'timeline_months': timeline * (i + 1),
                'reasoning': self._generate_rule_reasoning(
                    age=age,
                    experience=experience,
                    title=title,
                    level=path_level
                ),
                'missing_skills': self._get_missing_skills(title, skills),
                'immediate_action': self._generate_action(title, path_level)
            }
            
            result.append(path)
        
        return result
    
    def _generate_rule_reasoning(
        self,
        age: int,
        experience: float,
        title: str,
        level: str
    ) -> str:
        """Generate reasoning cho fallback paths."""
        
        if level == 'entry':
            return f"Với {experience:.0f} năm kinh nghiệm, bạn phù hợp với vị trí {title} cấp entry."
        elif level == 'mid':
            return f"Bạn có {experience:.0f} năm kinh nghiệm - đủ điều kiện cho vai trò {title} cấp trung."
        else:
            return f"Với {experience:.0f} năm kinh nghiệm, bạn có cơ hội thăng tiến lên {title}."
    
    def _get_missing_skills(self, title: str, current_skills: List[str]) -> List[str]:
        """Get missing skills cho một title."""
        # Generic skill mapping
        skill_map = {
            'leadership': ['Kỹ năng lãnh đạo', 'Quản lý nhóm'],
            'management': ['Quản lý', 'Báo cáo'],
            'sales': ['Kỹ năng bán hàng', 'Đàm phán'],
            'technical': ['Kỹ thuật chuyên môn'],
            'communication': ['Giao tiếp', 'Thuyết trình']
        }
        
        title_lower = title.lower()
        missing = []
        
        for key, skills in skill_map.items():
            if key in title_lower:
                for skill in skills:
                    if skill not in current_skills:
                        missing.append(skill)
        
        return missing[:3] if missing else ['Kỹ năng mềm']
    
    def _generate_action(self, title: str, level: str) -> str:
        """Generate immediate action recommendation."""
        if level == 'entry':
            return f"Tìm việc {title} phù hợp với kinh nghiệm hiện tại"
        elif level == 'mid':
            return f"Nâng cấp kỹ năng để sẵn sàng cho vai trò {title}"
        else:
            return f"Xây dựng portfolio và network cho vị trí {title}"
    
    def _is_circuit_open(self) -> bool:
        """Check circuit breaker status."""
        if not self._circuit_open:
            return False
        
        elapsed = time.time() - self._circuit_open_time
        if elapsed >= self._circuit_timeout:
            logger.info("Circuit breaker cooldown expired")
            self._circuit_open = False
            return False
        
        return True
    
    def _handle_error(self, error: Exception):
        """Handle error và update circuit breaker."""
        error_str = str(error)
        
        if '429' in error_str or 'quota' in error_str.lower():
            logger.warning("Quota exceeded, opening circuit breaker")
            self._circuit_open = True
            self._circuit_open_time = time.time()


# Singleton instance
_generator_instance = None


def get_career_path_generator() -> CareerPathGenerator:
    """Get singleton instance of CareerPathGenerator."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = CareerPathGenerator()
    return _generator_instance
