"""
Career Transition Explainer - Token Optimized Gemini Integration

Provides personalized reasoning for career transitions using Gemini 2.0 Flash.
Optimized for token efficiency with:
- Compact prompts (< 500 tokens input)
- Batch processing (multiple transitions per call)
- Selective LLM (only for complex cases)
- Aggressive caching (profile + industry based)

Usage:
    explainer = CareerTransitionExplainer()
    results = explainer.explain_all(profile, transitions)
"""

import os
import json
import logging
import hashlib
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from functools import wraps

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


def _should_use_llm_for_transitions() -> bool:
    """Check if LLM should be used for career transitions (feature flag)."""
    # Support both old and new flag names
    return os.getenv('ENABLE_GROQ_FOR_TRANSITIONS', 
                     os.getenv('ENABLE_GEMINI_FOR_TRANSITIONS', 'true')).lower() == 'true'


@dataclass
class TransitionExplanation:
    """Explained transition with reasoning."""
    type: str
    title: str
    reasoning: Dict[str, Any]
    next_steps: Dict[str, List[str]]
    pros_cons: Dict[str, List[str]]
    confidence: float
    
    def to_dict(self) -> Dict:
        return asdict(self)


class ExplanationCache:
    """
    Multi-level cache for transition explanations.
    - Profile-based: 24 hours
    - Industry-based: 1 week
    - Skill-based: 1 hour
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        
        # Cache TTL by type (seconds)
        self._ttl = {
            "profile": 86400,      # 24 hours
            "industry": 604800,    # 1 week
            "skill": 3600          # 1 hour
        }
        
        self._hits = 0
        self._misses = 0
    
    def _make_key(self, prefix: str, content: str) -> str:
        """Generate cache key."""
        return f"{prefix}_{hashlib.md5(content.encode()).hexdigest()}"
    
    def get(self, key: str) -> Optional[Dict]:
        """Get cached explanation if available and not expired."""
        if key in self._cache:
            entry = self._cache[key]
            age = time.time() - entry.get("timestamp", 0)
            
            if age < entry.get("ttl", 86400):
                self._hits += 1
                return entry.get("data")
            else:
                del self._cache[key]
        
        self._misses += 1
        return None
    
    def set(self, key: str, data: Dict, ttl_type: str = "profile"):
        """Cache explanation."""
        self._cache[key] = {
            "data": data,
            "timestamp": time.time(),
            "ttl": self._ttl.get(ttl_type, 86400)
        }
    
    def get_stats(self) -> Dict:
        """Get cache statistics."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_percent": round(hit_rate, 1),
            "total_entries": len(self._cache)
        }


# Singleton instance
_explainer_instance: Optional['CareerTransitionExplainer'] = None


class CareerTransitionExplainer:
    """
    Token-optimized LLM integration for career transitions.
    
    Optimization strategies:
    1. Compact prompts (< 500 tokens input)
    2. Batch processing (multiple transitions per call)
    3. Selective LLM (only for complex cases)
    4. Aggressive caching (profile + industry based)
    5. Fallback to rules for simple transitions
    """
    
    # Token budgets
    MAX_INPUT_TOKENS = 500
    MAX_OUTPUT_TOKENS = 300
    MAX_TRANSITIONS_PER_BATCH = 5
    
    # Cache TTL
    PROFILE_CACHE_TTL = "profile"      # 24 hours
    INDUSTRY_CACHE_TTL = "industry"   # 1 week
    
    # Simple transition types (use rules, no LLM)
    SIMPLE_TYPES = ["management_track", "within_industry"]
    
    # Complex transition types (use LLM)
    COMPLEX_TYPES = [
        "trainer", "consultant", "coach", "entrepreneur", "freelancer",
        "cross_industry", "career_pivot", "multi_industry"
    ]

    # Skills mapping by industry/job keywords
    SKILLS_BY_INDUSTRY = {
        "bao_ve": ["Security Audit", "Risk Assessment", "Report Writing", "Conflict Resolution", "Patrol Procedures"],
        "lai_xe": ["Fleet Management", "GPS Navigation", "Route Planning", "Vehicle Maintenance", "Defensive Driving"],
        "co_khi": ["Lean Manufacturing", "Six Sigma", "Quality Control", "CNC Operations", "Machine Maintenance"],
        "ban_hang": ["Sales Strategy", "Customer Service", "Negotiation", "Inventory Management", "POS Operations"],
        "phuc_vu": ["Restaurant Operations", "Food Safety", "Cost Control", "Customer Relations", "Event Planning"],
        "hanh_chinh": ["Legal Knowledge", "Compliance Systems", "Document Management", "Records Management", "Office Administration"],
        "nhan_su": ["HR Consulting", "Compensation Design", "LMS", "Recruitment", "Performance Management"],
        "tu_van": ["Business Strategy", "Change Management", "Coaching", "Problem Solving", "Stakeholder Management"]
    }

    # Skills mapping by job title keywords
    SKILLS_BY_KEYWORD = {
        "ban_hang": ["bán hàng", "bán lẻ", "thu ngân", "sales", "retail"],
        "nhan_vien": ["chăm sóc khách hàng", "customer service", "nhập liệu", "data entry"],
        "tai_xe": ["lái xe", "giao hàng", "vận chuyển", "driver"],
        "bao_ve": ["bảo vệ", "an ninh", "security", "bảo an"],
        "nau_an": ["nấu ăn", "đầu bếp", "cook", "chef"],
        "may": ["may mặc", "cắt may", "sewing", "tailoring"],
        "lon_lap": ["lắp ráp", "assembly", "production"],
        "han": ["hàn", "welding"],
        "dien": ["điện", "điện nước", "electrical", "plumbing"],
        "ke_toan": ["kế toán", "accounting", "tài chính"],
        "quan_ly": ["quản lý", "management", "giám sát"],
        "hanh_chinh": ["hành chính", "administrative", "văn phòng"]
    }

    def __init__(self):
        self._initialized = False
        self._init_error: Optional[str] = None
        self._llm_client = None
        self._cache = ExplanationCache()
        
        # Circuit breaker
        self._circuit_open = False
        self._circuit_open_time: float = 0
        self._circuit_timeout = 60  # 60 seconds
        self._error_count = 0
        self._error_threshold = 3
        
        # Token stats
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        
        self._initialize()
    
    def _initialize(self) -> None:
        """Initialize LLM client (only if feature flag is enabled)."""
        # Check feature flag first
        if not _should_use_llm_for_transitions():
            self._init_error = "LLM disabled by ENABLE_GROQ_FOR_TRANSITIONS flag"
            logger.info(f"CareerTransitionExplainer: {self._init_error}")
            return
        
        if not LLM_AVAILABLE:
            self._init_error = "Unified LLM client not available"
            return
        
        try:
            self._llm_client = get_llm_client()
            if self._llm_client.available:
                self._initialized = True
                logger.info("CareerTransitionExplainer initialized successfully with unified LLM client")
            else:
                self._init_error = "No LLM provider available (check API keys)"
        except Exception as e:
            self._init_error = str(e)
            logger.error(f"Failed to initialize: {e}")
    
    def _check_circuit(self) -> bool:
        """Check if circuit breaker is open."""
        if not self._circuit_open:
            return False
        
        elapsed = time.time() - self._circuit_open_time
        if elapsed >= self._circuit_timeout:
            self._circuit_open = False
            self._error_count = 0
            logger.info("Circuit breaker reset")
            return False
        
        return True
    
    def is_available(self) -> bool:
        """Check if LLM is available."""
        if self._init_error:
            return False
        if self._check_circuit():
            return False
        return True
    
    def _open_circuit(self):
        """Open circuit breaker."""
        self._circuit_open = True
        self._circuit_open_time = time.time()
        logger.warning("Circuit breaker opened")
    
    def _record_error(self, error: Exception):
        """Record an error for circuit breaker."""
        self._error_count += 1
        if self._error_count >= self._error_threshold:
            self._open_circuit()
    
    def _build_profile_hash(self, profile: Dict) -> str:
        """Generate hash for user profile."""
        content = f"{profile.get('age', 0)}_{profile.get('current_industry', '')}_{profile.get('experience_years', 0)}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _is_simple_transition(self, transition_type: str) -> bool:
        """Check if transition is simple (use rules)."""
        return transition_type in self.SIMPLE_TYPES
    
    def _is_complex_transition(self, transition_type: str) -> bool:
        """Check if transition is complex (use LLM)."""
        return transition_type in self.COMPLEX_TYPES

    def _extract_skills_from_position(self, position: str, industry: str = "") -> List[str]:
        """
        Extract skills from job position and industry.
        Used as fallback when user doesn't provide skills explicitly.
        """
        if not position:
            return []

        position_lower = position.lower()
        skills = []

        # First, try industry-based skills
        if industry and industry in self.SKILLS_BY_INDUSTRY:
            skills.extend(self.SKILLS_BY_INDUSTRY[industry][:3])

        # Then, try keyword matching in job title
        for keyword, keyword_skills in self.SKILLS_BY_KEYWORD.items():
            if keyword in position_lower:
                for skill in keyword_skills:
                    # Map keyword skill to English skill if available
                    for ind, ind_skills in self.SKILLS_BY_INDUSTRY.items():
                        if skill.lower() in [s.lower() for s in ind_skills]:
                            skills.extend([s for s in ind_skills if s not in skills][:2])
                            break

        # Default skills based on common patterns
        default_mapping = {
            "nhân viên": ["Customer Service", "Teamwork", "Communication"],
            "quản lý": ["Leadership", "Team Management", "Decision Making"],
            "giám đốc": ["Strategic Planning", "Leadership", "Business Development"],
            "trưởng phòng": ["Team Leadership", "Budget Management", "Planning"],
            "phó phòng": ["Team Support", "Coordination", "Reporting"],
            "chuyên viên": ["Analysis", "Reporting", "Communication"],
            "kỹ thuật": ["Technical Skills", "Problem Solving", "Troubleshooting"],
            "tài xế": ["Vehicle Operation", "Route Planning", "Time Management"],
            "bảo vệ": ["Security Awareness", "Incident Response", "Communication"],
            "phục vụ": ["Customer Service", "Food Handling", "Coordination"],
            "đầu bếp": ["Food Preparation", "Kitchen Management", "Hygiene"],
            "kế toán": ["Financial Reporting", "Data Analysis", "Attention to Detail"],
            "hành chính": ["Organization", "Documentation", "Scheduling"]
        }

        for keyword, default_skills in default_mapping.items():
            if keyword in position_lower:
                for skill in default_skills:
                    if skill not in skills:
                        skills.append(skill)
                break

        return list(dict.fromkeys(skills))[:5]  # Dedupe and limit to 5

    def _get_barriers_text(self, barriers: List[str]) -> str:
        """
        Format barriers for prompt inclusion.
        """
        if not barriers:
            return "Không có rào cản đáng kể"

        barrier_names = {
            "health": "Hạn chế về sức khỏe",
            "family": "Cần chăm sóc gia đình",
            "techGap": "Hạn chế về công nghệ",
            "location": "Hạn chế về vị trí địa lý",
            "other": "Có rào cản khác"
        }

        barrier_texts = []
        for barrier in barriers:
            name = barrier_names.get(barrier, barrier)
            barrier_texts.append(name)

        return ", ".join(barrier_texts)
    
    def _build_compact_prompt(
        self, 
        profile: Dict, 
        transitions: List[Dict]
    ) -> str:
        """
        Build compressed prompt targeting < 500 tokens input.
        Uses abbreviations and concise format.
        """
        # Compact profile
        profile_text = f"""
P: a={profile['age']}, r={profile['current_role'][:20] if profile.get('current_role') else 'N/A'}, 
   e={profile.get('experience_years', 0)}y, ind={profile.get('current_industry', 'N/A')}
SK: {','.join(profile.get('skills', [])[:5])}
SAL: {profile.get('target_salary', 'N/A')}
"""
        
        # Compact transitions (max 5 per batch)
        max_trans = min(len(transitions), self.MAX_TRANSITIONS_PER_BATCH)
        transitions_text = "\n".join([
            f"T{i+1}: {t.get('type', 'N/A')}|{t.get('title', 'N/A')[:25]}|{t.get('timeline_months', '?')}th"
            for i, t in enumerate(transitions[:max_trans])
        ])
        
        return f"""
TV Viet Nam. De xuat career transitions cho 35+.
{profile_text}
TRANSITIONS:
{transitions_text}
OUTPUT JSON (toi da {self.MAX_OUTPUT_TOKENS * max_trans} tokens):
{{
    "reasoning": ["L1", "L2"],
    "next_steps": ["B1", "B2"],
    "pros_cons": {{"pros": [], "cons": []}}
}}
"""

    def _build_vietnam_expert_prompt(
        self,
        profile: Dict,
        transitions: List[Dict]
    ) -> str:
        """
        Build Vietnam Expert prompt - dai dien cho chuyen gia tu van Viet Nam 2026.

        Dac diem:
        - Am hieu thi truong lao dong Viet Nam
        - Thuc te, data-based, khong mo huong
        - Nhan manh loi the cua nguoi co kinh nghiem da nganh
        """

        # Format work history neu co
        work_hist = ""
        if profile.get('work_history'):
            work_hist = "\n\n[LICH SU LAM VIEC - RAT QUAN TRONG]\n"
            for job in profile['work_history']:
                ind_name = job.get('industry', 'N/A')
                role = job.get('role', 'N/A')
                years = job.get('years', 0)
                # Get skills from job or extract from position
                job_skills = job.get('skills', [])
                if not job_skills and role:
                    job_skills = self._extract_skills_from_position(role, ind_name)
                skills = ', '.join(job_skills[:5])
                work_hist += f"- {years} nam {ind_name}: {role}\n"
                work_hist += f"  Skills: {skills}\n"

        # Extract skills for current position if not provided
        current_skills = profile.get('combined_skills', profile.get('skills', []))
        if not current_skills and profile.get('current_role'):
            current_skills = self._extract_skills_from_position(
                profile.get('current_role'),
                profile.get('current_industry', '')
            )
        skills_text = ', '.join(current_skills[:10])

        # Format barriers
        barriers = profile.get('barriers', [])
        barriers_text = self._get_barriers_text(barriers)

        # Format transitions
        trans_text = ""
        for i, t in enumerate(transitions[:5], 1):
            title = t.get('title', 'N/A')
            trans_type = t.get('type', 'N/A')
            salary = t.get('salary_range', {})
            salary_text = f"{salary.get('min', 0)/1e6:.0f}-{salary.get('max', 0)/1e6:.0f}M"
            timeline = t.get('timeline_months', '?')
            skill_gaps = ', '.join(t.get('skill_gaps', [])[:3])
            pros = ', '.join(t.get('pros', [])[:2])

            trans_text += f"\n{i}. {title} ({trans_type})"
            trans_text += f"\n   Muc luong: {salary_text}/thang | Thoi gian: {timeline} thang"
            trans_text += f"\n   Ky nang can them: {skill_gaps}"
            trans_text += f"\n   Loi ich: {pros}"

        return f"""BAN LA: Chuyen gia tu van chuyen doi nghe nghiep hang dau VIET NAM.
- 15+ nam kinh nghiem tu van nguoi lao dong 35-55 tuoi
- Am hieu sau thi truong lao dong Viet Nam 2026 (bao gom ca COVID recovery, digital transformation)
- Chuyen gia ve career coaching, HR, labor market analysis
- Da tu van thanh cong 1000+ case chuyen nganh

NHIEM VU: Phan tich va goi y CHI TIET, THUC TE cho nguoi cung hoan canh.

=== THONG TIN UNG VIEN ===
- Tuoi: {profile.get('age', 'N/A')} tuoi
- Tong kinh nghiem: {profile.get('experience_years', 'N/A')} nam
- Nghe/Nghanh hien tai: {profile.get('current_role', 'N/A')} / {profile.get('current_industry', 'N/A')}
- Muc tieu luong: {profile.get('target_salary', 'N/A') or 'Chua xac dinh'} VND/thang
- Ky nang hien tai: {skills_text}
- Rao can hien tai: {barriers_text}
{work_hist}

=== CAC GOI Y CHUYEN DOI ===
{trans_text}

=== YEU CAU TRA LOI - DOC LAP, CHI TIET ===

1. VOI MOI GOI Y, BAN PHAI CUNG CAP:
   - Diem phu hop (0-100%): Tinh toan cu the, khong nghi chuong
   - Ly do CHI TIET: Tai sao nguoi nay phu hop HON nguoi khac
   - Thu nhap thuc te VN 2026: Khoang VND X-Y tri/thang (data-based)
   - Thoi gian chuyen doi: X-Y thang (thuc te)
   - Ky nang can hoc them: Cu the, co the bat dau ngay
   - Han che/Rui ro: That su, khong phai chi "can co gang"

2. VOI NGUOI CO KINH NGHIEM DA NGANH (work_history):
   - NHAN MANH LOI THE: "Ban co kinh nghiem X nam A + Y nam B"
   - GIOI THIEU nhung nghề ma NGUOI CHI CO 1 NGANH KHONG LAM DUOC
   - GIAI THICH tai sao loi the nay HIEM CO va CO GIA TRI

3. VOI NGUOI CO RAO CAN (barriers):
   - TUYET DOI phai xem xet rao can trong MOI goi y
   - Neu co "health": Tranh nhung nghe nang, di lai nhieu, lam ca dem
   - Neu co "family": Uu tien cong viec o gan nha, thoi gian linh hoat
   - Neu co "techGap": Tranh nhung nghe can ky nang tech cao
   - Neu co "location": Chi goi y nhung nghe co the lam tai dia phuong
   - GIAI THICH RO RANG: Tai sao nghe nay PHAI HOAC KHONG NEN voi rao can cua ho

3. XU HUONG THI TRUONG 2026:
   - Nhung nganh nao dang TUYEN DUNG manh?
   - Nhung nganh nao se BI AN TU?
   - Muc luong co xu huong TANG hay GIAM?

4. STYLE TRA LOI:
   - Thuc te, chi tiet, co so lieu
   - Khong mo huong, khong "co the", "co gang"
   - Chi de xuat nhung gi CO THE THUC HIEN DUOC NGAY
   - Tu van nhu dang noi chuyen voi nguoi ban, khong phai may moc

=== OUTPUT JSON FORMAT ===
Tra ve JSON chinh xac, khong markdown:
{{
    "recommendations": [
        {{
            "title": "Ten nghe cu the",
            "match_score": 0.85,
            "salary_vnd": "20-35 tri/thang",
            "timeline_months": 6,
            "reasoning": "Ly do chi tiet tai sao phu hop voi profile nay...",
            "skill_gaps": ["Ky nang cu the 1", "Ky nang cu the 2"],
            "why_unique": "Tai sao nguoi nay phu hop hon nguoi chi co 1 nganh"
        }}
    ],
    "insights": {{
        "advantage": "Loi the cua profile nay so voi thi truong",
        "warnings": ["Rui ro thuc su can luu y"],
        "market_trend": "Xu huong thi truong 2026 cho nganh nay"
    }}
}}"""

    def _call_llm(self, prompt: str) -> Optional[str]:
        """Call LLM API with retry (supports GROQ or Gemini)."""
        if not self.is_available():
            return None
        
        for attempt in range(3):
            try:
                response = self._llm_client.generate(prompt=prompt)
                
                if response:
                    # Estimate tokens (rough)
                    self._total_input_tokens += len(prompt.split())
                    self._total_output_tokens += len(response.split())
                    
                    self._error_count = 0  # Reset on success
                    return response
                    
            except Exception as e:
                logger.warning(f"LLM call failed (attempt {attempt + 1}): {e}")
                if attempt < 2:
                    time.sleep(2 * (attempt + 1))
        
        self._record_error(Exception("LLM call failed"))
        return None
    
    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """Parse JSON from LLM response."""
        try:
            text = response.strip()
            
            # Handle markdown code blocks
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                text = text[start:end]
            elif "```" in text:
                start = text.find("```") + 3
                end = text.find("```", start)
                text = text[start:end]
            
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON: {e}")
            return None
    
    def _generate_rule_based_explanation(
        self, 
        profile: Dict, 
        transition: Dict
    ) -> TransitionExplanation:
        """Generate explanation using rules (no LLM)."""
        exp_years = profile.get("experience_years", 0)
        age = profile.get("age", 35)
        industry = profile.get("current_industry", "")
        
        # Generate structured reasoning
        reasoning = {
            "structured": [
                f"{exp_years} nam kinh nghiem trong nghanh {industry}",
                f"Tuoi {age} - giai doan co loi the kinh nghiem",
            ],
            "free_text": f"Voi {exp_years} nam kinh nghiem, ban co nen tang vung de chuyen doi sang {transition.get('title', 'nghe moi')}. Day la huong di phu hop voi nguoi co {age} tuoi."
        }
        
        # Generate next steps
        next_steps = {
            "immediate": ["Tim hieu ve linh vuc muon chuyen"],
            "structured": [
                f"Buoc 1: Hoc ky nang {transition.get('skill_gaps', ['ky nang moi'])[0]}" if transition.get('skill_gaps') else "Buoc 1: Danh gia ky nang hien tai",
                "Buoc 2: Tao portfolio/du an mau",
                "Buoc 3: Apply cac vi tri phu hop"
            ]
        }
        
        # Pros and cons
        pros_cons = {
            "pros": transition.get("pros", ["Co gang doi lon", "Tri tue"]),
            "cons": transition.get("cons", ["Can thoi gian hoc hoi"])
        }
        
        return TransitionExplanation(
            type=transition.get("type", "unknown"),
            title=transition.get("title", "N/A"),
            reasoning=reasoning,
            next_steps=next_steps,
            pros_cons=pros_cons,
            confidence=0.7
        )
    
    def _generate_llm_explanation(
        self, 
        profile: Dict, 
        transitions: List[Dict]
    ) -> List[TransitionExplanation]:
        """Generate explanations using LLM with Vietnam Expert prompt."""
        explanations = []
        
        # Check cache first
        profile_hash = self._build_profile_hash(profile)
        cache_key = f"llm_{profile_hash}_{len(transitions)}"
        cached = self._cache.get(cache_key)
        
        if cached:
            logger.info("Using cached LLM explanation")
            return [TransitionExplanation(**c) for c in cached]
        
        # Determine which prompt to use
        has_multi_industry = any(t.get('type') == 'multi_industry' for t in transitions)
        has_work_history = bool(profile.get('work_history'))
        
        # Use Vietnam Expert prompt for multi-industry or work_history profiles
        if has_multi_industry or has_work_history:
            prompt = self._build_vietnam_expert_prompt(profile, transitions)
        else:
            prompt = self._build_compact_prompt(profile, transitions)
        
        # Call LLM
        response = self._call_llm(prompt)
        
        if response:
            parsed = self._parse_json_response(response)
            if parsed:
                # Parse responses for each transition
                for i, trans in enumerate(transitions[:self.MAX_TRANSITIONS_PER_BATCH]):
                    # Get recommendation from parsed response if available
                    rec = None
                    if 'recommendations' in parsed and i < len(parsed['recommendations']):
                        rec = parsed['recommendations'][i]
                    
                    if rec:
                        # Use Vietnam Expert format
                        exp = TransitionExplanation(
                            type=trans.get("type", "unknown"),
                            title=trans.get("title", "N/A"),
                            reasoning={
                                "structured": [rec.get('reasoning', '')],
                                "free_text": rec.get('reasoning', ''),
                                "why_unique": rec.get('why_unique', '')
                            },
                            next_steps={
                                "immediate": [],
                                "structured": rec.get('skill_gaps', [])
                            },
                            pros_cons={
                                "pros": rec.get('skill_gaps', [])[:3],
                                "cons": []
                            },
                            confidence=0.95
                        )
                    else:
                        # Fallback to simple format
                        exp = TransitionExplanation(
                            type=trans.get("type", "unknown"),
                            title=trans.get("title", "N/A"),
                            reasoning=parsed.get("reasoning", {"structured": [], "free_text": ""}),
                            next_steps=parsed.get("next_steps", {"immediate": [], "structured": []}),
                            pros_cons=parsed.get("pros_cons", {"pros": [], "cons": []}),
                            confidence=0.9
                        )
                    explanations.append(exp)
                
                # Cache the results
                self._cache.set(
                    cache_key, 
                    [e.to_dict() for e in explanations],
                    self.PROFILE_CACHE_TTL
                )
                return explanations
        
        # Fallback to rule-based for each transition
        logger.info("Falling back to rule-based explanations")
        return [
            self._generate_rule_based_explanation(profile, t) 
            for t in transitions[:self.MAX_TRANSITIONS_PER_BATCH]
        ]
    
    def explain_all(
        self, 
        profile: Dict, 
        transitions_by_type: Dict[str, List[Dict]]
    ) -> Dict[str, List[TransitionExplanation]]:
        """
        Explain all transitions.
        
        Uses selective LLM:
        - Simple transitions: Rule-based
        - Complex transitions: LLM (batched)
        """
        results = {}
        all_explanations = []
        
        # Process each category
        for category, transitions in transitions_by_type.items():
            if not transitions:
                results[category] = []
                continue
            
            # Separate simple and complex
            simple = []
            complex_ = []
            
            for t in transitions:
                if self._is_simple_transition(t.get("type", "")):
                    simple.append(t)
                elif self._is_complex_transition(t.get("type", "")):
                    complex_.append(t)
                else:
                    # Default: use rules for management, LLM for others
                    if t.get("type") == "management_track":
                        simple.append(t)
                    else:
                        complex_.append(t)
            
            # Process simple with rules
            simple_results = [
                self._generate_rule_based_explanation(profile, t)
                for t in simple
            ]
            
            # Process complex with LLM (batched)
            complex_results = []
            if complex_:
                # Batch up to MAX_TRANSITIONS_PER_BATCH
                for i in range(0, len(complex_), self.MAX_TRANSITIONS_PER_BATCH):
                    batch = complex_[i:i + self.MAX_TRANSITIONS_PER_BATCH]
                    batch_results = self._generate_llm_explanation(profile, batch)
                    complex_results.extend(batch_results)
            
            # Combine and sort by confidence
            category_results = simple_results + complex_results
            category_results.sort(key=lambda x: x.confidence, reverse=True)
            
            results[category] = category_results
            all_explanations.extend(category_results)
        
        results["all"] = all_explanations
        return results
    
    def explain_single(
        self, 
        profile: Dict, 
        transition: Dict
    ) -> TransitionExplanation:
        """Explain a single transition."""
        trans_type = transition.get("type", "")
        
        if self._is_simple_transition(trans_type):
            return self._generate_rule_based_explanation(profile, transition)
        
        # Use LLM for complex transitions
        results = self._generate_llm_explanation(profile, [transition])
        return results[0] if results else self._generate_rule_based_explanation(profile, transition)
    
    def get_token_stats(self) -> Dict:
        """Get token usage statistics."""
        return {
            "total_input_tokens": self._total_input_tokens,
            "total_output_tokens": self._total_output_tokens,
            "total_tokens": self._total_input_tokens + self._total_output_tokens,
            "cache_stats": self._cache.get_stats(),
            "llm_available": self.is_available(),
            "optimization": {
                "max_input_tokens": self.MAX_INPUT_TOKENS,
                "max_output_tokens": self.MAX_OUTPUT_TOKENS,
                "batch_size": self.MAX_TRANSITIONS_PER_BATCH,
                "selective_llm": True
            }
        }


def get_explainer() -> CareerTransitionExplainer:
    """Get singleton instance."""
    global _explainer_instance
    
    if _explainer_instance is None:
        _explainer_instance = CareerTransitionExplainer()
    
    return _explainer_instance


def main():
    """Test the explainer."""
    print("=" * 60)
    print("Testing Career Transition Explainer")
    print("=" * 60)
    
    explainer = CareerTransitionExplainer()
    
    print(f"\nLLM Available: {explainer.is_available()}")
    print(f"Token Stats: {explainer.get_token_stats()}")
    
    # Test profile
    profile = {
        "age": 38,
        "current_role": "Truong Phong Kinh Doanh",
        "current_industry": "ban_hang",
        "experience_years": 10,
        "skills": ["Sales", "Team Management", "Excel", "Presentation"],
        "target_salary": 30000000
    }
    
    # Test transitions
    transitions = {
        "all": [
            {
                "type": "trainer",
                "title": "Huan Luyen Vien Ban Hang",
                "timeline_months": 6,
                "skill_gaps": ["Presentation", "Training Design"],
                "pros": ["Tri tue", "Linh hoat"],
                "cons": ["Can ky nang huan luyen"]
            },
            {
                "type": "consultant",
                "title": "Tu Van Ban Hang",
                "timeline_months": 8,
                "skill_gaps": ["Consulting", "Strategy"],
                "pros": ["Thu nhap cao", "HOT TREND"],
                "cons": ["Can network manh"]
            },
            {
                "type": "management_track",
                "title": "Giam Doc Kinh Doanh",
                "timeline_months": 12,
                "skill_gaps": [],
                "pros": ["Thang tien tu nhien"],
                "cons": ["Can ky nang chien luoc"]
            }
        ]
    }
    
    print("\n--- Testing explain_all ---")
    results = explainer.explain_all(profile, transitions)
    
    print(f"\nCategories: {list(results.keys())}")
    print(f"Total explanations: {len(results['all'])}")
    
    for i, exp in enumerate(results["all"], 1):
        print(f"\n{i}. {exp.title}")
        print(f"   Type: {exp.type}")
        print(f"   Confidence: {exp.confidence}")
        print(f"   Reasoning: {exp.reasoning.get('structured', [])[:2]}")
    
    print(f"\n--- Token Stats ---")
    print(explainer.get_token_stats())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
