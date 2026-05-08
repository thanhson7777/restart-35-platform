"""
LLM Explainer - Tao ly do goi y thong minh

Su dung Unified LLM Client (GROQ hoac Gemini) de tao ra cac ly do doc nhat,
co y nghia, so sanh cu the giua ho so user va job.

Uu tien su dung GROQ (mien phi, khong gioi han).
"""

import os
import json
import logging
import time
import hashlib
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

# Import unified LLM client
try:
    from config.groq_client import get_llm_client, LLMConfig
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logger.warning("Unified LLM client not available")

# Legacy imports for compatibility
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class ExplanationCache:
    """
    In-memory cache for Gemini explanations.
    
    Caches explanations based on job ID + user skills hash
    to avoid redundant API calls.
    
    Supports disk persistence for surviving restarts.
    """
    
    DISK_CACHE_FILE = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), 
        '..', 'logs', 'explanation_cache.json'
    )
    MAX_DISK_AGE_DAYS = 7
    
    def __init__(self, ttl_seconds: int = 86400):  # 24 hours TTL
        self._cache: Dict[str, Dict] = {}
        self._ttl_seconds = ttl_seconds
        self._hits = 0
        self._misses = 0
        self._saves = 0
        self._load_from_disk()
    
    def _get_cache_dir(self) -> str:
        """Get cache directory, create if not exists."""
        cache_dir = os.path.dirname(self.DISK_CACHE_FILE)
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
        return cache_dir
    
    def _load_from_disk(self):
        """Load cache from disk if exists."""
        try:
            if os.path.exists(self.DISK_CACHE_FILE):
                with open(self.DISK_CACHE_FILE, 'r', encoding='utf-8') as f:
                    disk_data = json.load(f)
                
                # Validate and load entries
                loaded = 0
                expired = 0
                current_time = time.time()
                
                for key, entry in disk_data.get('entries', {}).items():
                    # Check if entry is too old (max 7 days on disk)
                    age_days = (current_time - entry.get('timestamp', 0)) / 86400
                    if age_days < self.MAX_DISK_AGE_DAYS:
                        self._cache[key] = entry
                        loaded += 1
                    else:
                        expired += 1
                
                if loaded > 0:
                    logger.info(f"Loaded {loaded} cached entries from disk (expired: {expired})")
        except Exception as e:
            logger.warning(f"Failed to load disk cache: {e}")
    
    def _save_to_disk(self):
        """Save cache to disk."""
        try:
            self._get_cache_dir()
            disk_data = {
                'version': 1,
                'saved_at': datetime.now().isoformat(),
                'entries': self._cache
            }
            with open(self.DISK_CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(disk_data, f, ensure_ascii=False, indent=2)
            logger.debug(f"Saved {len(self._cache)} entries to disk cache")
        except Exception as e:
            logger.warning(f"Failed to save disk cache: {e}")
    
    def _make_key(self, job_id: str, skills: List[str]) -> str:
        """Create cache key from job_id and skills."""
        skills_str = ','.join(sorted(s.lower().strip() for s in skills)) if skills else ''
        key_str = f"{job_id}|{skills_str}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, job_id: str, skills: List[str]) -> Optional[List[str]]:
        """Get cached explanation if available and not expired."""
        key = self._make_key(job_id, skills)
        
        if key in self._cache:
            entry = self._cache[key]
            age = time.time() - entry['timestamp']
            
            if age < self._ttl_seconds:
                self._hits += 1
                logger.debug(f"Cache HIT for job {job_id} (age: {age:.0f}s)")
                return entry['reasons']
            else:
                # Expired, remove
                del self._cache[key]
                logger.debug(f"Cache EXPIRED for job {job_id}")
        
        self._misses += 1
        return None
    
    def set(self, job_id: str, skills: List[str], reasons: List[str]):
        """Save explanation to cache and persist to disk."""
        key = self._make_key(job_id, skills)
        self._cache[key] = {
            'reasons': reasons,
            'timestamp': time.time(),
            'job_id': job_id
        }
        self._saves += 1
        logger.debug(f"Cache SAVE for job {job_id} (total entries: {len(self._cache)})")
        # Auto-save to disk for persistence
        self._save_to_disk()
    
    def stats(self) -> Dict:
        """Return cache statistics."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            'hits': self._hits,
            'misses': self._misses,
            'saves': self._saves,
            'total_entries': len(self._cache),
            'hit_rate_percent': round(hit_rate, 1)
        }
    
    def clear(self):
        """Clear all cache entries."""
        self._cache.clear()
        logger.info("Cache cleared")


class GeminiExplainer:
    """
    LLM-powered explainer su dung Unified LLM Client (GROQ hoac Gemini).

    Tao cac ly do goi y doc nhat, co y nghia,
    so sanh cu the giua profile ung vien va job.

    Features:
    - Circuit breaker pattern for fault tolerance
    - In-memory caching to reduce API calls
    - Auto-fallback between GROQ and Gemini
    """
    
    def __init__(self, api_key: str = None, cache_ttl_seconds: int = 86400):
        """
        Khoi tao LLM explainer.

        Args:
            api_key: GROQ or Gemini API key. Neu None, doc tu env.
            cache_ttl_seconds: Cache TTL in seconds (default: 24 hours)
        """
        self.api_key = api_key
        self._llm_client = None
        self.model = 'llama-3.3-70b-versatile'  # Default GROQ model

        # Circuit breaker state
        self._circuit_open = False
        self._circuit_open_time = 0
        self._circuit_timeout = 60  # 60 seconds cooldown after quota exceeded
        self._consecutive_errors = 0
        self._max_consecutive_errors = 3  # Open circuit after 3 consecutive errors

        # Explanation cache
        self._cache = ExplanationCache(ttl_seconds=cache_ttl_seconds)

        # Initialize unified LLM client
        if LLM_AVAILABLE:
            try:
                self._llm_client = get_llm_client()
                logger.info("LLM Explainer initialized successfully (using unified client)")
                logger.info(f"  - Cache TTL: {cache_ttl_seconds}s")
                logger.info(f"  - Model: {self.model}")
            except Exception as e:
                logger.error(f"Failed to initialize LLM client: {e}")
                self._llm_client = None
        else:
            logger.warning("Unified LLM client not available")
    
    def get_cache_stats(self) -> Dict:
        """Return cache statistics."""
        return self._cache.stats()
    
    @property
    def _is_circuit_open(self) -> bool:
        """Check if circuit breaker is open and should block calls."""
        if not self._circuit_open:
            return False
        
        elapsed = time.time() - self._circuit_open_time
        if elapsed >= self._circuit_timeout:
            logger.info("Circuit breaker cooldown expired, resetting")
            self._circuit_open = False
            self._consecutive_errors = 0
            return False
        
        return True
    
    def _open_circuit(self):
        """Open the circuit breaker immediately."""
        if not self._circuit_open:
            logger.warning("Circuit breaker OPENED - Gemini calls blocked for 60s")
            self._circuit_open = True
            self._circuit_open_time = time.time()
    
    def _maybe_open_circuit(self):
        """Open circuit if too many consecutive errors."""
        if self._consecutive_errors >= self._max_consecutive_errors:
            self._open_circuit()
    
    def is_available(self) -> bool:
        """Kiem tra xem LLM co san sang su dung khong."""
        return self._llm_client is not None and self._llm_client.available
    
    def generate_reasons(self, user_profile: dict, job: dict, max_reasons: int = 4) -> List[str]:
        """
        Tao danh sach ly do goi y doc nhat.
        
        First checks cache, then calls Gemini if not cached.
        """
        # Circuit breaker check
        if self._is_circuit_open:
            logger.debug(f"Circuit open, skipping LLM for job {job.get('id')}")
            return []

        if not self.is_available():
            logger.warning("LLM not available, returning empty reasons")
            return []
        
        if not job or not isinstance(job, dict):
            logger.warning("Invalid job data, returning empty reasons")
            return []
        
        job_id = job.get('id', '')
        skills = user_profile.get('skills', [])
        
        # Check cache first
        cached_reasons = self._cache.get(job_id, skills)
        if cached_reasons is not None:
            logger.info(f"Using cached explanation for job: {job.get('title', 'N/A')}")
            return cached_reasons[:max_reasons]
        
        # Cache miss - call LLM
        logger.info(f"Cache MISS for job {job_id}, calling LLM...")
        
        salary_info = self._format_salary(job)
        
        user_skills = [s.lower() for s in skills]
        job_skills = [s.lower() for s in job.get('skills', [])]
        matched_skills = list(set(user_skills) & set(job_skills))
        
        prompt = self._build_prompt(user_profile, job, salary_info, matched_skills, max_reasons)
        
        try:
            # Use unified LLM client (GROQ or Gemini)
            text = self._llm_client.generate(prompt=prompt, model=self.model)

            if not text:
                self._consecutive_errors += 1
                self._maybe_open_circuit()
                logger.warning("Empty response from LLM")
                return []

            text = text.strip()
            
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
                text = text.rsplit('```', 1)[0]
                text = text.strip()
            
            reasons = json.loads(text)
            
            if isinstance(reasons, list) and all(isinstance(r, str) for r in reasons):
                self._consecutive_errors = 0
                final_reasons = reasons[:max_reasons]
                
                # Save to cache
                self._cache.set(job_id, skills, final_reasons)
                
                logger.info(f"Generated {len(final_reasons)} reasons for job: {job.get('title', 'N/A')}")
                return final_reasons
            else:
                self._consecutive_errors += 1
                self._maybe_open_circuit()
                logger.warning(f"Invalid response format from LLM: {type(reasons)}")
                return []

        except json.JSONDecodeError as e:
            self._consecutive_errors += 1
            self._maybe_open_circuit()
            logger.error(f"Failed to parse JSON from LLM: {e}")
            return []
        except Exception as e:
            error_str = str(e)

            if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str or 'quota' in error_str.lower():
                self._open_circuit()
            else:
                self._consecutive_errors += 1
                self._maybe_open_circuit()

            logger.error(f"LLM API error: {e}")
            return []
    
    def _format_salary(self, job: dict) -> str:
        """Format salary info tu job dict."""
        if not job:
            return "Không có thông tin lương"
        
        if job.get('salary_text'):
            return job.get('salary_text')
        
        salary_min = job.get('salary_min') or 0
        salary_max = job.get('salary_max') or 0
        
        if salary_min > 0 and salary_max > 0:
            return f"{salary_min/1000000:.0f}-{salary_max/1000000:.0f} triệu/tháng"
        elif salary_min > 0:
            return f"Từ {salary_min/1000000:.0f} triệu/tháng"
        elif salary_max > 0:
            return f"Đến {salary_max/1000000:.0f} triệu/tháng"
        
        return "Thương lượng"
    
    def _build_prompt(self, user_profile: dict, job: dict, salary_info: str, 
                      matched_skills: List[str], max_reasons: int) -> str:
        """Build prompt cho Gemini."""
        
        user_exp = user_profile.get('experience', 0) or 0
        job_exp = job.get('experience_required') or 0
        if user_exp > job_exp:
            exp_comparison = f"Bạn có {user_exp} năm kinh nghiệm, công việc chỉ yêu cầu {job_exp} năm - bạn đủ điều kiện."
        elif user_exp == job_exp:
            exp_comparison = f"Bạn có đủ {user_exp} năm kinh nghiệm theo yêu cầu."
        else:
            exp_comparison = f"Công việc yêu cầu {job_exp} năm kinh nghiệm, bạn có {user_exp} năm."
        
        user_salary = user_profile.get('target_salary', 0) or 0
        job_salary_min = job.get('salary_min') or 0
        if user_salary > 0 and job_salary_min > 0:
            diff = user_salary - job_salary_min
            if diff > 0:
                salary_comparison = f"Mức lương {job_salary_min/1000000:.0f} triệu thấp hơn {diff/1000000:.0f} triệu so với mong muốn của bạn."
            else:
                salary_comparison = f"Mức lương {job_salary_min/1000000:.0f} triệu đáp ứng được kỳ vọng của bạn."
        else:
            salary_comparison = ""
        
        skills_info = ", ".join(matched_skills[:3]) if matched_skills else "không có kỹ năng trùng khớp"
        
        prompt = f"""Bạn là chuyên gia tư vấn việc làm Việt Nam. Phân tích và đề xuất đúng {max_reasons} lý do NỔI BẬT NHẤT để một ứng viên nên ứng tuyển.

THÔNG TIN ỨNG VIÊN:
- Kỹ năng: {', '.join(user_profile.get('skills', [])[:5]) or 'Không có'}
- Kinh nghiệm: {user_exp} năm
- Địa điểm: {user_profile.get('location', 'Không rõ')}
- Lương mong muốn: {f"{user_salary/1000000:.0f} triệu/tháng" if user_salary > 0 else 'Không rõ'}

THÔNG TIN VIỆC LÀM:
- Tiêu đề: {job.get('title', 'Không rõ')}
- Công ty: {job.get('company', 'Không rõ')}
- Kỹ năng yêu cầu: {', '.join(job.get('skills', [])[:5]) or 'Không rõ'}
- Kinh nghiệm yêu cầu: {job_exp} năm
- Địa điểm: {job.get('location', 'Không rõ')}
- Mức lương: {salary_info}
- Hình thức: {job.get('type', 'Không rõ')}
- Mô tả: {job.get('description', '')[:300] or 'Không có mô tả'}

PHÂN TÍCH SO SÁNH:
- Kỹ năng trùng khớp: {skills_info}
- Kinh nghiệm: {exp_comparison}
- Lương: {salary_comparison}

YÊU CẦU NGHIÊM NGẶT:
1. Trả về ĐÚNG {max_reasons} lý do, KHÔNG THÊM KHÔNG BẤT
2. Mỗi lý do phải SO SÁNH CỤ THỂ giữa ỨNG VIÊN và VIỆC LÀM (dùng từ "bạn", "bạn có", "công việc này")
3. Lý do phải có ý NGHĨA THỰC TẾ, không chỉ đọc lại thông tin
4. Viết ngắn gọn 1-2 câu, KHÔNG dài quá 25 từ
5. Đa dạng: mỗi lý do nói về khía cạnh khác nhau (lương, kỹ năng, kinh nghiệm, công ty, địa điểm...)

VÍ DỤ FORMAT TỐT:
- "Bạn có 5 năm kinh nghiệm, công việc cần 3 năm - bạn có lợi thế lớn"
- "Mức lương 20-30 triệu cao hơn 5 triệu so với mong muốn của bạn"
- "Công ty tuyển 50 người tháng này, cơ hội thăng tiến cao"
- "Địa điểm TP.HCM, thuận tiện đi lại từ Bình Dương"

TRẢ VỀ ĐỊNH DẠNG JSON (chỉ JSON, không giải thích):
["Lý do 1 ngắn gọn", "Lý do 2 ngắn gọn", "Lý do 3 ngắn gọn"]"""
        
        return prompt


# Singleton instance
_explainer_instance: Optional[GeminiExplainer] = None


def get_explainer() -> GeminiExplainer:
    """Get singleton instance of GeminiExplainer."""
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = GeminiExplainer()
    return _explainer_instance
