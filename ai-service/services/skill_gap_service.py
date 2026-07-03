#!/usr/bin/env python3
"""
Skill Gap Service - ESCO-based
============================
ESCO-centric skill gap analysis service.
Sử dụng ESCO database để phân tích skill gaps.

Usage:
    service = SkillGapService()
    gaps = service.analyze_esco_skill_gaps(
        user_skills=["Excel", "Word"],
        target_occupation="Kế toán",
        age=45
    )

Author: Restart-35
Version: 1.0
"""

import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.context_bridge import ContextBridge
from services.skill_gap_prefilter import SkillGapPreFilter

logger = logging.getLogger(__name__)

# =============================================================================
# VIETNAMESE TO ENGLISH JOB TITLE MAPPING
# =============================================================================

VI_TO_EN_JOBS: Dict[str, str] = {
    # Vietnamese -> English
    "kế toán": "accountant",
    "ke toan": "accountant",
    "nhân viên kế toán": "accountant",
    "kế toán tổng hợp": "accountant",
    "kế toán trưởng": "chief accountant",
    "giám đốc tài chính": "finance director",
    "tài chính": "finance",
    "nhân sự": "human resources",
    "hr": "human resources",
    "quản lý nhân sự": "human resources manager",
    "marketing": "marketing",
    "quảng cáo": "advertising",
    "bán hàng": "sales",
    "kinh doanh": "sales",
    "it": "it",
    "công nghệ thông tin": "information technology",
    "lập trình": "software developer",
    "lập trình viên": "software developer",
    "kỹ sư phần mềm": "software engineer",
    "quản trị mạng": "network administrator",
    "kỹ thuật viên": "technician",
    "hành chính": "administrative",
    "nhân viên hành chính": "administrative staff",
    "thư ký": "secretary",
    "trợ lý": "assistant",
    "trợ lý hành chính": "administrative assistant",
    "giáo viên": "teacher",
    "giáo dục": "education",
    "y tá": "nurse",
    "bác sĩ": "doctor",
    "y tế": "healthcare",
    "luật sư": "lawyer",
    "luật": "law",
    "kỹ sư": "engineer",
    "quản lý": "manager",
    "giám đốc": "director",
    "trưởng phòng": "department head",
    "chuyên viên": "specialist",
    "tư vấn": "consultant",
    "thiết kế": "design",
    "nhà thiết kế": "designer",
    "kế toán": "accountant",
}


class SkillGapService:
    """
    ESCO-based Skill Gap Analysis Service
    
    Reuses:
    - ContextBridge.extract_shared_context() - Extract user skills from profile
    - SkillGapPreFilter - ESCO database search
    
    Output:
    - List of skill gaps with priority (essential, important, nice_to_have)
    - Source: ESCO / trending
    """

    def __init__(self):
        """Initialize Skill Gap Service"""
        logger.info("Initializing SkillGapService...")
        self.context_bridge = ContextBridge()
        self.prefilter = SkillGapPreFilter()
        logger.info("SkillGapService initialized")

    def translate_to_english(self, text: str) -> str:
        """
        Translate Vietnamese text to English for ESCO search.
        
        Args:
            text: Vietnamese text (job title)
            
        Returns:
            English translation or original if not found
        """
        if not text:
            return text
            
        text_lower = text.lower().strip()
        
        # Direct lookup
        if text_lower in VI_TO_EN_JOBS:
            return VI_TO_EN_JOBS[text_lower]
        
        # Partial match - check if any key is in the text
        for vi_key, en_value in VI_TO_EN_JOBS.items():
            if vi_key in text_lower:
                # Replace Vietnamese with English
                result = text_lower.replace(vi_key, en_value)
                # Clean up and return
                return result.strip()
        
        # Return original if no match
        return text

    def extract_user_skills_from_profile(self, user_profile: Dict[str, Any]) -> List[str]:
        """
        Extract user skills from profile using ContextBridge.
        
        Args:
            user_profile: User profile dictionary
            
        Returns:
            List of user skills
        """
        context = self.context_bridge.extract_shared_context(user_profile)
        return context.user_existing_skills

    def _legacy_analyze_esco_skill_gaps(
        self,
        user_skills: List[str],
        target_occupation: str,
        age: int = 30,
        max_gaps: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Analyze skill gaps using ESCO database.
        
        Args:
            user_skills: User's current skills
            target_occupation: Target job title
            age: User's age
            max_gaps: Maximum number of gaps to return
            
        Returns:
            List of skill gaps with structure:
            {
                "skill_name": str,
                "priority": "essential" | "important" | "nice_to_have",
                "reason": str,
                "source": "esco" | "trending"
            }
        """
        if not user_skills:
            logger.warning("No user skills provided")
            return []
            
        if not target_occupation:
            logger.warning("No target occupation provided")
            return []
        
        logger.info(f"Analyzing skill gaps using hybrid taxonomy for: {target_occupation}")
        
        # 1. Initialize normalizer
        from services.esco_normalizer import get_normalizer
        normalizer = get_normalizer()
        
        required_skills_vi = []
        target_occupation_lower = target_occupation.lower().strip()
        
        # 2. Get required skills from vietnam_taxonomy or local_taxonomy
        # Normalizer loads vietnam_taxonomy into its exact match index, but we can also read it directly
        local_tax_path = normalizer.data_dir.parent / "vietnam_taxonomy.json"
        if local_tax_path.exists():
            import json
            with open(local_tax_path, 'r', encoding='utf-8') as f:
                local_tax = json.load(f)
                if target_occupation_lower in local_tax:
                    required_skills_vi = local_tax[target_occupation_lower].get("skills", [])
        
        # Fallback to local_taxonomy (informal jobs)
        if not required_skills_vi:
            informal_tax_path = normalizer.data_dir.parent / "local_taxonomy.json"
            if informal_tax_path.exists():
                with open(informal_tax_path, 'r', encoding='utf-8') as f:
                    informal_tax = json.load(f)
                    if target_occupation_lower in informal_tax:
                        required_skills_vi = informal_tax[target_occupation_lower].get("skills", [])
        
        # Fallback to ESCO embeddings search if not found in local taxonomy
        if not required_skills_vi:
            logger.info(f"'{target_occupation}' not found in local taxonomy. Falling back to ESCO embeddings.")
            # Search ESCO directly using multilingual embeddings
            esco_matches = self.prefilter.search_esco_by_occupation(
                occupation=target_occupation, # no need to translate to English since it's multilingual
                top_k=max_gaps * 2
            )
            required_skills_vi = [match.get("name") for match in esco_matches if match.get("name")]
            
        # 3. Normalize user skills for fast checking
        user_skills_lower = {s.lower().strip() for s in user_skills if s}
        
        # We can also semantically embed user skills to match against required skills
        # Since ESCONormalizer has _embedding_match, we can use it.
        # But for simplicity, we just use the SentenceTransformer model to compute similarity
        model = normalizer._get_model()
        
        user_embeddings = None
        if user_skills_lower:
            user_embeddings = model.encode(list(user_skills_lower), convert_to_numpy=True, normalize_embeddings=True)
            
        gaps = []
        total_skills = len(required_skills_vi)
        
        # Deduplicate required skills
        seen_skills = set()
        unique_required_skills = []
        for sk in required_skills_vi:
            if sk.lower() not in seen_skills:
                unique_required_skills.append(sk)
                seen_skills.add(sk.lower())
                
        total_skills = len(unique_required_skills)
        
        for idx, skill_name in enumerate(unique_required_skills):
            skill_lower = skill_name.lower().strip()
            
            # Exact match first
            if skill_lower in user_skills_lower:
                continue
                
            # Semantic match
            is_matched = False
            if user_embeddings is not None:
                skill_emb = model.encode([skill_lower], convert_to_numpy=True, normalize_embeddings=True)
                from sklearn.metrics.pairwise import cosine_similarity
                sims = cosine_similarity(skill_emb, user_embeddings)[0]
                if len(sims) > 0 and max(sims) >= 0.75: # threshold for having the skill
                    is_matched = True
                    
            if is_matched:
                continue
                
            # It's a gap!
            if idx < total_skills // 3:
                priority = "essential"
                reason = f"Kỹ năng thiết yếu cho vị trí {target_occupation}"
            elif idx < (total_skills * 2) // 3:
                priority = "important"
                reason = f"Kỹ năng quan trọng cho {target_occupation}"
            else:
                priority = "nice_to_have"
                reason = f"Kỹ năng bổ sung giá trị cho {target_occupation}"
            
            gaps.append({
                "skill_name": skill_name,
                "priority": priority,
                "reason": reason,
                "source": "hybrid_taxonomy",
                "score": 1.0 - (idx / max(total_skills, 1))
            })
            
            if len(gaps) >= max_gaps:
                break
        
        # Get job-related skills as additional nice_to_have
        job_result = self.prefilter.search_jobs_by_occupation(
            occupation=target_occupation,
            top_k=max_gaps
        )
        
        # job_result is List[Dict] with {job_id, title, skills, score, source}
        for job_data in job_result:
            job_skills = job_data.get("skills", [])
            for skill in job_skills:
                skill_name = skill if isinstance(skill, str) else skill.get("name", "")
                if not skill_name or skill_name.lower() in user_skills_lower:
                    continue
                    
                # Check if already in gaps
                if any(g["skill_name"].lower() == skill_name.lower() for g in gaps):
                    continue
                    
                gaps.append({
                    "skill_name": skill_name,
                    "priority": "nice_to_have",
                    "reason": f"Kỹ năng bổ sung giá trị cho {target_occupation}",
                    "source": "trending"
                })
        
        # Remove duplicates and limit
        seen = set()
        unique_gaps = []
        for gap in gaps:
            key = gap["skill_name"].lower()
            if key not in seen:
                seen.add(key)
                unique_gaps.append(gap)
        
        # Sort by priority
        priority_order = {"essential": 0, "important": 1, "nice_to_have": 2}
        unique_gaps.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        # Limit results
        result = unique_gaps[:max_gaps]
        
        logger.info(f"Found {len(result)} skill gaps")
        return result

    def analyze_llm_skill_gaps(
        self,
        user_skills: List[str],
        target_occupation: str,
        age: int = 30,
        career_context: Optional[dict] = None
    ) -> Dict[str, Any]:
        """
        Analyze skill gaps using Pure LLM Generative Approach.
        Returns a dictionary containing skill_gaps, trending_skills, and soft_skills.
        """
        try:
            import re
            import json
            from config.groq_client import get_llm_client
            from prompts.skill_gap_llm import format_skill_gap_llm_prompt

            llm = get_llm_client()
            if not llm or not llm.available:
                logger.warning("GROQ not available, falling back to legacy ESCO gap")
                return {
                    "skill_gaps": self._legacy_analyze_esco_skill_gaps(user_skills, target_occupation, age),
                    "trending_skills": [],
                    "soft_skills": []
                }

            system_prompt, user_prompt = format_skill_gap_llm_prompt(
                occupation=target_occupation,
                user_skills=user_skills,
                age=age,
                career_context=career_context
            )

            logger.info(f"Calling GROQ for skill gap analysis: {target_occupation}")
            # Try to get JSON response
            response = llm.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=2048,
                # Depending on the Groq client implementation, we might not have response_format param available.
                # So we parse from markdown/regex.
            )

            if not response:
                logger.warning("Empty response from GROQ, falling back to legacy ESCO gap")
                return {
                    "skill_gaps": self._legacy_analyze_esco_skill_gaps(user_skills, target_occupation, age),
                    "trending_skills": [],
                    "soft_skills": []
                }

            # Extract JSON block
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if not json_match:
                logger.warning("No JSON found in GROQ response, falling back to legacy ESCO gap")
                return {
                    "skill_gaps": self._legacy_analyze_esco_skill_gaps(user_skills, target_occupation, age),
                    "trending_skills": [],
                    "soft_skills": []
                }

            result = json.loads(json_match.group())
            
            # Ensure safe structure
            return {
                "skill_gaps": result.get("skill_gaps", []),
                "trending_skills": result.get("trending_skills", []),
                "soft_skills": result.get("soft_skills", [])
            }
            
        except Exception as e:
            logger.error(f"Error in LLM skill gap analysis: {e}")
            # Fallback to legacy
            return {
                "skill_gaps": self._legacy_analyze_esco_skill_gaps(user_skills, target_occupation, age),
                "trending_skills": [],
                "soft_skills": []
            }

    def analyze_from_profile(
        self,
        user_profile: Dict[str, Any],
        target_occupation: Optional[str] = None,
        max_gaps: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Analyze skill gaps directly from user profile.
        
        Args:
            user_profile: User profile dictionary
            target_occupation: Optional override for target occupation
            max_gaps: Maximum number of gaps
            
        Returns:
            List of skill gaps
        """
        # Extract user skills
        user_skills = self.extract_user_skills_from_profile(user_profile)
        
        if not user_skills:
            logger.warning("No skills extracted from profile")
            return []
        
        # Determine target occupation
        if not target_occupation:
            # Try to get from aspirations
            aspirations = user_profile.get("aspirations", {})
            target_occupation = aspirations.get("targetJob") or aspirations.get("target_job")
            
        if not target_occupation:
            # Try to get from employment history
            emp_history = user_profile.get("employmentHistory", user_profile.get("employment_history", []))
            if emp_history and len(emp_history) > 0:
                target_occupation = emp_history[0].get("role", "")
        
        if not target_occupation:
            logger.warning("No target occupation found")
            return []
        
        return self.analyze_esco_skill_gaps(
            user_skills=user_skills,
            target_occupation=target_occupation,
            age=user_profile.get("basicInfo", user_profile.get("basic_info", {})).get("age", 30),
            max_gaps=max_gaps
        )


    def enhance_with_groq(
        self,
        gaps: list,
        occupation: str,
        age: int,
        user_skills: list,
        max_trending: int = 5,
        max_soft: int = 5,
        career_context: Optional[dict] = None
    ) -> dict:
        """
        Bổ sung trending skills + soft skills bằng GROQ.

        Sau khi ESCO trả raw gaps, dùng GROQ để phân tích
        và supplement thêm trending skills và soft skills.

        Args:
            gaps: List of skill gaps from ESCO
            occupation: Target occupation
            age: User age
            user_skills: List of user current skills
            max_trending: Max trending skills to return
            max_soft: Max soft skills to return
            career_context: Optional context about industry, strengths, aspirations

        Returns:
            Dict with trending_skills, soft_skills, reasoning
        """
        try:
            import re
            from config.groq_client import get_llm_client
            from prompts.skill_gap_enhance import format_skill_gap_enhance_prompt

            llm = get_llm_client()
            if not llm or not llm.available:
                logger.warning("GROQ not available, skipping enhancement")
                return {"trending_skills": [], "soft_skills": [], "reasoning": []}

            system_prompt, user_prompt = format_skill_gap_enhance_prompt(
                gaps=gaps,
                occupation=occupation,
                age=age,
                user_skills=user_skills,
                max_trending=max_trending,
                max_soft=max_soft,
                career_context=career_context
            )

            logger.info(f"Calling GROQ for skill gap enhancement: {occupation}")
            response = llm.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=1024
            )

            if not response:
                logger.warning("Empty response from GROQ")
                return {"trending_skills": [], "soft_skills": [], "reasoning": []}

            # Parse JSON from response - try multiple approaches
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if not json_match:
                logger.warning("No JSON found in GROQ response")
                return {"trending_skills": [], "soft_skills": [], "reasoning": []}

            import json
            result = json.loads(json_match.group())

            logger.info(
                f"GROQ enhancement done: "
                f"{len(result.get('trending_skills', []))} trending, "
                f"{len(result.get('soft_skills', []))} soft skills"
            )

            return {
                "trending_skills": result.get("trending_skills", [])[:max_trending],
                "soft_skills": result.get("soft_skills", [])[:max_soft],
                "reasoning": result.get("reasoning", [])
            }

        except Exception as e:
            logger.warning(f"GROQ enhancement failed: {e}")
            return {"trending_skills": [], "soft_skills": [], "reasoning": []}


# Singleton instance
_service_instance: Optional[SkillGapService] = None


def get_skill_gap_service() -> SkillGapService:
    """Get singleton SkillGapService instance"""
    global _service_instance
    if _service_instance is None:
        _service_instance = SkillGapService()
    return _service_instance
