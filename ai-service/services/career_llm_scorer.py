"""
Career Path LLM Scorer Service

Uses Unified LLM (GROQ/Gemini) to score and explain career path recommendations.
Follows the same singleton + circuit breaker pattern.

Usage:
    scorer = CareerLLMScorer.get_scorer()
    scored_paths = scorer.score_paths(candidates, user_profile)
"""

import os
import json
import logging
import time
import hashlib
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path

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


def _should_use_llm_for_scoring() -> bool:
    """Check if LLM should be used for scoring (feature flag)."""
    # Support both old and new flag names
    return os.getenv('ENABLE_GROQ_FOR_LLM_SCORING', 
                     os.getenv('ENABLE_GEMINI_FOR_LLM_SCORING', 'false')).lower() == 'true'


class CareerPathExplanationCache:
    """
    In-memory cache for career path explanations.
    """
    
    def __init__(self, ttl_seconds: int = 86400):
        self._cache: Dict[str, Dict] = {}
        self._ttl_seconds = ttl_seconds
    
    def _generate_key(self, path_title: str, profile_hash: str) -> str:
        """Generate cache key."""
        content = f"{path_title}|{profile_hash}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get(self, path_title: str, profile_hash: str) -> Optional[Dict]:
        """Get cached explanation."""
        key = self._generate_key(path_title, profile_hash)
        
        if key in self._cache:
            entry = self._cache[key]
            age = time.time() - entry.get('timestamp', 0)
            
            if age < self._ttl_seconds:
                return entry.get('data')
            else:
                del self._cache[key]
        
        return None
    
    def set(self, path_title: str, profile_hash: str, data: Dict):
        """Cache explanation."""
        key = self._generate_key(path_title, profile_hash)
        self._cache[key] = {
            'data': data,
            'timestamp': time.time()
        }


# Singleton instance
_scorer_instance: Optional['CareerLLMScorer'] = None


class CareerLLMScorer:
    """
    LLM-powered career path scorer.
    
    Features:
    - Singleton pattern
    - Circuit breaker for API failures
    - In-memory caching
    - Fallback to rule-based scoring
    """
    
    def __init__(self):
        self._initialized = False
        self._init_error: Optional[str] = None
        self._llm_client = None
        self._cache = CareerPathExplanationCache()
        
        # Circuit breaker
        self._circuit_open = False
        self._circuit_open_time: float = 0
        self._circuit_timeout = 60  # 60 seconds
        self._error_count = 0
        self._error_threshold = 3
        
        self._initialize()
    
    def _initialize(self) -> None:
        """Initialize LLM client (only if feature flag is enabled)."""
        # Check feature flag first
        if not _should_use_llm_for_scoring():
            self._init_error = "LLM disabled by ENABLE_GROQ_FOR_LLM_SCORING flag"
            logger.info(f"CareerLLMScorer: {self._init_error}")
            return
        
        if not LLM_AVAILABLE:
            self._init_error = "Unified LLM client not available"
            return
        
        try:
            self._llm_client = get_llm_client()
            if self._llm_client.available:
                self._initialized = True
                logger.info("CareerLLMScorer initialized successfully with unified LLM client")
            else:
                self._init_error = "No LLM provider available (check API keys)"
        except Exception as e:
            self._init_error = str(e)
            logger.error(f"Failed to initialize CareerLLMScorer: {e}")
    
    def _check_circuit(self) -> bool:
        """Check if circuit breaker is open."""
        if not self._circuit_open:
            return False
        
        elapsed = time.time() - self._circuit_open_time
        if elapsed >= self._circuit_timeout:
            self._circuit_open = False
            self._error_count = 0
            logger.info("CareerLLMScorer circuit breaker reset")
            return False
        
        return True
    
    def is_available(self) -> bool:
        """Check if LLM scorer is available."""
        if self._init_error:
            return False
        
        if self._check_circuit():
            return False
        
        return True
    
    def _open_circuit(self):
        """Open circuit breaker."""
        self._circuit_open = True
        self._circuit_open_time = time.time()
        logger.warning("CareerLLMScorer circuit breaker opened")
    
    def _record_error(self, error: Exception):
        """Record an error for circuit breaker."""
        self._error_count += 1
        if self._error_count >= self._error_threshold:
            self._open_circuit()
    
    def _generate_profile_hash(self, profile: Dict) -> str:
        """Generate hash for user profile."""
        content = json.dumps(profile, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()
    
    def _build_scoring_prompt(self, paths: List[Dict], profile: Dict) -> str:
        """Build prompt for LLM to score career paths."""
        
        profile_text = f"""
THONG TIN UNG VIEN:
- Tuoi: {profile.get('age', 'N/A')}
- Tong kinh nghiem: {profile.get('total_experience_years', 'N/A')} nam
- Nghanh chinh: {profile.get('primary_industry', 'N/A')}
- Kinh nghiem: {profile.get('experiences', [])}
- Ky nang: {profile.get('skills', [])}
- Muc tieu luong: {profile.get('target_salary', 'N/A')}
"""
        
        paths_text = "\n".join([
            f"""
{idx+1}. {p.get('title', 'N/A')}
   - Loai: {p.get('path_type', 'N/A')}
   - Mo ta: {p.get('description', 'N/A')}
   - Muc do khan cap: {p.get('urgency', 'N/A')}
   - Khoang luong: {p.get('salary_range', {}).get('display', 'N/A')}
   - Thoi gian: {p.get('timeline_months', 'N/A')} thang
   - Yeu cau: {', '.join(p.get('requirements', [])[:3])}
   - Skills thieu: {', '.join(p.get('missing_skills', [])[:3])}
"""
            for idx, p in enumerate(paths)
        ])
        
        prompt = f"""
Ban la mot chuyen gia tu van su nghiep. Danh gia va cham diem cac lo hanh nghe phia duoi.

{profile_text}

CAC PHUONG AN NGANH NGHE:
{paths_text}

YEU CAU:
1. Danh gia CHI TIET tung phuong an:
   - Diem phu hop (0-100%) voi ho so cua ung vien
   - Tai sao phu hop hoac khong phu hop
   - Loi ich khi chuyen sang nghe nay
   - Rui ro khi chuyen doi
   - Khoang thoi gian can thiet de chuyen doi

2. Xep hang cac phuong an theo do uu tien

3. Dua ra 3 de xuat thi that su quan trong nhat

Tra loi theo format JSON:
{{
  "ranked_paths": [
    {{
      "original_index": 0,
      "score": 85,
      "reasoning": "Ly do chi tiet...",
      "benefits": ["Loi ich 1", "Loi ich 2"],
      "risks": ["Rui ro 1", "Rui ro 2"],
      "timeline_realistic": "6-12 thang",
      "priority": 1
    }}
  ],
  "top_3_advice": [
    "Loi khuyen thuc te nhat cho ung vien nay"
  ]
}}
"""
        return prompt
    
    def _score_with_llm(self, paths: List[Dict], profile: Dict) -> Optional[Dict]:
        """
        Score paths using LLM.
        
        Returns:
            Dict with scored and ranked paths, or None if fails
        """
        if not self.is_available():
            return None
        
        try:
            prompt = self._build_scoring_prompt(paths, profile)
            
            # Use unified LLM client
            response_text = self._llm_client.generate(prompt=prompt)
            
            if not response_text:
                logger.error("Empty response from LLM")
                return None
            
            # Try to extract JSON from response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end]
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end]
            
            result = json.loads(response_text.strip())
            
            # Reset error count on success
            self._error_count = 0
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            self._record_error(e)
            return None
        except Exception as e:
            logger.error(f"LLM scoring failed: {e}")
            self._record_error(e)
            return None
    
    def _score_rule_based(self, paths: List[Dict], profile: Dict) -> Dict:
        """
        Fallback: Score paths using rules when LLM fails.
        
        Returns:
            Dict with scored and ranked paths
        """
        # Already scored by CareerPathDiscoverer
        # Just add some rule-based enhancements
        
        profile_age = profile.get('age', 30)
        profile_exp = profile.get('total_experience_years', 0)
        
        scored_paths = []
        for idx, path in enumerate(paths):
            score = path.get('score', 0.5) * 100  # Convert to percentage
            
            # Age-based adjustments
            urgency = path.get('urgency', 'low')
            if urgency == 'high' and 35 <= profile_age <= 40:
                score += 15  # Boost for optimal transition age
            elif urgency == 'critical' and profile_age >= 40:
                score += 10
            
            # Experience match adjustments
            timeline = path.get('timeline_months', 0)
            if timeline <= 6 and profile_exp >= 5:
                score += 10  # Quick transition for experienced
            
            scored_paths.append({
                'original_index': idx,
                'score': min(100, round(score, 1)),
                'reasoning': self._generate_rule_reasoning(path, profile),
                'benefits': path.get('pros', []),
                'risks': path.get('cons', []),
                'timeline_realistic': f"{timeline} thang",
                'priority': 0
            })
        
        # Sort by score
        scored_paths.sort(key=lambda x: x['score'], reverse=True)
        
        # Assign priorities
        for i, sp in enumerate(scored_paths):
            sp['priority'] = i + 1
        
        return {
            'ranked_paths': scored_paths,
            'top_3_advice': self._generate_rule_advice(scored_paths, profile)
        }
    
    def _generate_rule_reasoning(self, path: Dict, profile: Dict) -> str:
        """Generate reasoning using rules."""
        profile_age = profile.get('age', 30)
        profile_exp = profile.get('total_experience_years', 0)
        
        urgency = path.get('urgency', 'low')
        path_type = path.get('path_type', '')
        
        if urgency == 'high':
            return f"Tuoi {profile_age} la giai doan vang de chuyen doi. Kinh nghiem {profile_exp} nam giup ban co loi the."
        elif path_type == 'management':
            return f"Thien uoc thang tien trong nghanh - phu hop voi nguoi co {profile_exp} nam kinh nghiem."
        else:
            return f"Phuong an nay co ti le phu hop {path.get('score', 0)*100:.0f}% voi ho so cua ban."
    
    def _generate_rule_advice(self, scored_paths: List[Dict], profile: Dict) -> List[str]:
        """Generate advice using rules."""
        advice = []
        
        if not scored_paths:
            return ["Khong tim thay phuong an phu hop. Hay xem xet cac kha nang khac."]
        
        top = scored_paths[0]
        advice.append(f"Huong di tot nhat: {top.get('reasoning', '')}")
        
        if top.get('timeline_realistic'):
            advice.append(f"Thoi gian uoc tinh: {top['timeline_realistic']}")
        
        return advice[:3]
    
    def score_paths(self, paths: List[Dict], profile: Dict) -> Dict:
        """
        Score and rank career paths.
        
        Args:
            paths: List of career paths from CareerPathDiscoverer
            profile: User profile dict
        
        Returns:
            Dict with scored, ranked paths and advice
        """
        if not paths:
            return {
                'ranked_paths': [],
                'top_3_advice': ["Khong co phuong an nao duoc goi y."]
            }
        
        # Check cache first
        profile_hash = self._generate_profile_hash(profile)
        cache_key = f"{len(paths)}_paths"
        
        # Try LLM first
        if self.is_available():
            result = self._score_with_llm(paths, profile)
            if result:
                return result
        
        # Fallback to rule-based
        logger.info("Using rule-based scoring (fallback)")
        return self._score_rule_based(paths, profile)
    
    def generate_path_explanation(self, path: Dict, profile: Dict) -> str:
        """
        Generate detailed explanation for a single path.
        
        Args:
            path: Career path dict
            profile: User profile dict
        
        Returns:
            Detailed explanation string
        """
        cache = self._cache.get(path.get('title', ''), profile_hash)
        if cache:
            return cache.get('explanation', '')
        
        # Build explanation
        profile_age = profile.get('age', 30)
        profile_exp = profile.get('total_experience_years', 0)
        
        lines = [
            f"# {path.get('title', 'N/A')}",
            "",
            f"**Loai:** {path.get('path_type', 'N/A')}",
            f"**Do phu hop:** {path.get('score', 0)*100:.0f}%",
            f"**Muc do khan cap:** {path.get('urgency', 'N/A').upper()}",
            "",
            "## Mo ta",
            path.get('description', ''),
            "",
            "## Ly do goi y"
        ]
        
        for reason in path.get('reasoning', []):
            lines.append(f"- {reason}")
        
        if path.get('requirements'):
            lines.extend(["", "## Yeu cau", *[f"- {r}" for r in path['requirements']]])
        
        if path.get('missing_skills'):
            lines.extend(["", "## Skills can bo sung", *[f"- {s}" for s in path['missing_skills']]])
        
        if path.get('pros'):
            lines.extend(["", "## Loi ich", *[f"- {p}" for p in path['pros']]])
        
        if path.get('cons'):
            lines.extend(["", "## Rui ro", *[f"- {c}" for c in path['cons']]])
        
        explanation = '\n'.join(lines)
        
        # Cache
        self._cache.set(
            path.get('title', ''),
            profile_hash,
            {'explanation': explanation}
        )
        
        return explanation


def get_scorer() -> CareerLLMScorer:
    """
    Get singleton CareerLLMScorer instance.
    
    Returns:
        CareerLLMScorer singleton
    """
    global _scorer_instance
    
    if _scorer_instance is None:
        _scorer_instance = CareerLLMScorer()
    
    return _scorer_instance


def main():
    """Test the scorer."""
    scorer = CareerLLMScorer.get_scorer()
    
    print(f"LLM Scorer available: {scorer.is_available()}")
    
    if scorer.is_available():
        # Test with sample data
        paths = [
            {
                'title': 'Engineering Manager',
                'path_type': 'management',
                'score': 0.75,
                'urgency': 'low',
                'salary_range': {'display': '35-50M'},
                'timeline_months': 6,
                'requirements': ['Leadership', 'Project Management'],
                'missing_skills': ['Strategic Planning'],
                'pros': ['High salary', 'Career growth'],
                'cons': ['High responsibility', 'Long hours'],
                'reasoning': ['10 years IT experience']
            },
            {
                'title': 'Corporate Trainer',
                'path_type': 'age_transition',
                'score': 0.65,
                'urgency': 'high',
                'salary_range': {'display': '25-40M'},
                'timeline_months': 3,
                'requirements': ['Presentation', 'Teaching'],
                'missing_skills': ['Training certification'],
                'pros': ['Flexible', 'In-demand'],
                'cons': ['Lower salary'],
                'reasoning': ['Age 38 - transition period']
            }
        ]
        
        profile = {
            'age': 38,
            'total_experience_years': 10,
            'primary_industry': 'IT',
            'skills': ['Python', 'Java', 'SQL', 'Leadership'],
            'target_salary': 45000000
        }
        
        result = scorer.score_paths(paths, profile)
        print("\n=== Scored Result ===")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
