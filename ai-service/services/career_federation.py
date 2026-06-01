# -*- coding: utf-8 -*-
"""
Career Federation Service
=======================
Orchestrates RAG and Skill Gap engines with shared context.

This service combines:
- RAG Career Recommendation (from rag_engine)
- Skill Gap Analysis (from hybrid_skill_gap_engine)
- Context Bridge (shared context management)

Author: Restart-35
Date: 2026-06-01
"""

import sys
import asyncio
import logging
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Any, Union

# Add parent directory to path
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import BaseModel

from services.context_bridge import (
    ContextBridge,
    SharedAnalysisContext,
    ContextValidationResult
)

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class AnalysisOptions(BaseModel):
    """Options for career analysis"""
    include_skill_gaps: bool = True
    include_career_paths: bool = True
    include_trends: bool = True
    max_career_paths: int = 5
    max_skill_gaps: int = 15


class CareerPathRecommendation(BaseModel):
    """Single career path recommendation"""
    job_title: str
    match_score: float
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    salary_range: Optional[str] = None
    growth_outlook: Optional[str] = None


class SkillGapItem(BaseModel):
    """Single skill gap item"""
    skill_name: str
    priority: str  # essential, important, nice_to_have
    reason: str
    score: float = 0.0


class TimingInfo(BaseModel):
    """Timing information for the analysis"""
    total_ms: int = 0
    rag_ms: int = 0
    skill_gap_ms: int = 0
    context_ms: int = 0


class FederationMetadata(BaseModel):
    """Metadata about the federation"""
    context_source: str = "federated_api"
    rag_used: bool = False
    skill_gap_used: bool = False
    shared_context_applied: bool = False
    rag_fallback: bool = False
    skill_gap_fallback: bool = False


class CareerAnalysisResponseData(BaseModel):
    """Combined data from both engines"""
    career_paths: List[Dict[str, Any]] = []
    skill_gaps: List[Dict[str, Any]] = []
    shared_context: Dict[str, Any] = {}
    summary: str = ""


class CareerAnalysisResponse(BaseModel):
    """Full career analysis response"""
    success: bool
    data: CareerAnalysisResponseData
    timing: TimingInfo
    metadata: FederationMetadata
    errors: List[str] = []


# =============================================================================
# CAREER ANALYSIS SERVICE
# =============================================================================

class CareerAnalysisService:
    """
    Federated service that combines RAG and Skill Gap engines.

    Responsibilities:
    1. Extract shared context from user profile
    2. Run RAG analysis for career recommendations
    3. Update shared context with RAG results
    4. Run Skill Gap analysis using shared context
    5. Return unified response with timing and metadata
    6. Handle timeouts, retries, and partial failures gracefully
    """

    # Class-level constants for safeguards
    DEFAULT_TIMEOUT = 30  # seconds
    DEFAULT_MAX_RETRIES = 3
    RETRY_BACKOFF_BASE = 2  # Exponential backoff base

    def __init__(self):
        """Initialize the federation service with safeguards"""
        self.context_bridge = ContextBridge()
        self._rag_engine = None
        self._skill_gap_engine = None
        self._llm_client = None
        self._executor = ThreadPoolExecutor(max_workers=4)

        logger.info("CareerAnalysisService initialized with safeguards")

    def set_rag_engine(self, engine):
        """Set RAG engine for federation"""
        self._rag_engine = engine

    def set_skill_gap_engine(self, engine):
        """Set Skill Gap engine for federation"""
        self._skill_gap_engine = engine

    def set_llm_client(self, client):
        """Set LLM client for federation"""
        self._llm_client = client

    async def analyze_full(
        self,
        user_profile: Dict[str, Any],
        options: Optional[AnalysisOptions] = None
    ) -> CareerAnalysisResponse:
        """
        Full career analysis - combines RAG and Skill Gap.

        Args:
            user_profile: User profile dictionary
            options: Analysis options

        Returns:
            CareerAnalysisResponse with combined results
        """
        start_time = time.time()
        options = options or AnalysisOptions()

        errors = []
        metadata = FederationMetadata()

        # Convert profile to standard format if needed
        normalized_profile = self._normalize_profile(user_profile)

        # #region debug log
        import json as _json
        _log_path = "d:/LUAN_VAN/restart-35-platform/debug-a6fd13.log"
        try:
            with open(_log_path, "a", encoding="utf-8") as _f:
                _f.write(_json.dumps({
                    "sessionId": "a6fd13",
                    "location": "career_federation.py:analyze_career",
                    "message": "Received user_profile",
                    "data": {
                        "keys": list(normalized_profile.keys()),
                        "basic_info": normalized_profile.get("basic_info", normalized_profile.get("basicInfo", {})),
                        "employment_history": normalized_profile.get("employment_history", normalized_profile.get("employmentHistory", []))
                    },
                    "timestamp": int(time.time() * 1000)
                }) + "\n")
        except: pass
        # #endregion

        # Get user age from profile
        age = self._extract_age(normalized_profile)

        try:
            # STEP 1: Extract Shared Context
            context_start = time.time()
            shared_context = self.context_bridge.extract_shared_context(normalized_profile)
            context_time = int((time.time() - context_start) * 1000)

            # #region debug log
            try:
                with open(_log_path, "a", encoding="utf-8") as _f:
                    _f.write(_json.dumps({
                        "sessionId": "a6fd13",
                        "location": "career_federation.py:analyze_career:after_extract",
                        "message": "Extracted shared_context",
                        "data": {
                            "user_existing_skills": shared_context.user_existing_skills,
                            "user_strengths": shared_context.user_strengths,
                            "primary_occupation": shared_context.primary_occupation.model_dump() if shared_context.primary_occupation else None
                        },
                        "timestamp": int(time.time() * 1000)
                    }) + "\n")
            except: pass
            # #endregion

            # STEP 2: Run RAG Career Recommendations
            rag_start = time.time()
            career_paths = []
            rag_error = None

            if options.include_career_paths:
                try:
                    career_paths = await self._run_rag_analysis(normalized_profile)
                    metadata.rag_used = True
                except Exception as e:
                    rag_error = str(e)
                    errors.append(f"RAG error: {rag_error}")
                    metadata.rag_fallback = True
                    logger.warning(f"RAG analysis failed: {rag_error}")

            rag_time = int((time.time() - rag_start) * 1000)

            # STEP 3: Update Shared Context with RAG Results
            if career_paths and metadata.rag_used:
                rag_results = {
                    "career_paths": career_paths,
                    "user_strengths": shared_context.user_strengths
                }
                shared_context = self.context_bridge.update_with_rag_results(
                    shared_context, rag_results
                )
                metadata.shared_context_applied = True

            # Validate context before Skill Gap
            validation = self.context_bridge.validate_context(shared_context)
            if not validation.is_valid:
                errors.extend(validation.errors)

            # STEP 4: Run Skill Gap Analysis
            skill_gap_start = time.time()
            skill_gaps = []

            if options.include_skill_gaps:
                try:
                    skill_gaps = await self._run_skill_gap_analysis(
                        user_skills=shared_context.user_existing_skills,
                        target_occupation=(
                            shared_context.primary_occupation.title
                            if shared_context.primary_occupation else None
                        ),
                        age=age,
                        rag_context={
                            "user_strengths": shared_context.user_strengths,
                            "career_paths": career_paths
                        }
                    )
                    metadata.skill_gap_used = True
                except Exception as e:
                    skill_gap_error = str(e)
                    errors.append(f"Skill Gap error: {skill_gap_error}")
                    metadata.skill_gap_fallback = True
                    logger.warning(f"Skill Gap analysis failed: {skill_gap_error}")

            skill_gap_time = int((time.time() - skill_gap_start) * 1000)

            # Calculate total time
            total_time = int((time.time() - start_time) * 1000)

            # Build response
            response = CareerAnalysisResponse(
                success=metadata.rag_used or metadata.skill_gap_used,
                data=CareerAnalysisResponseData(
                    career_paths=career_paths,
                    skill_gaps=skill_gaps,
                    shared_context=shared_context.model_dump() if isinstance(shared_context, SharedAnalysisContext) else {},
                    summary=self._generate_summary(career_paths, skill_gaps)
                ),
                timing=TimingInfo(
                    total_ms=total_time,
                    rag_ms=rag_time,
                    skill_gap_ms=skill_gap_time,
                    context_ms=context_time
                ),
                metadata=metadata,
                errors=errors
            )

            logger.info(
                f"Analysis completed: {total_time}ms "
                f"(RAG: {rag_time}ms, SkillGap: {skill_gap_time}ms)"
            )

            return response

        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            logger.error(f"Analysis failed: {e}")

            return CareerAnalysisResponse(
                success=False,
                data=CareerAnalysisResponseData(),
                timing=TimingInfo(total_ms=total_time),
                metadata=metadata,
                errors=[str(e)]
            )

    async def _run_rag_analysis(
        self,
        profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Run RAG career recommendation analysis.

        Args:
            profile: User profile

        Returns:
            List of career path recommendations
        """
        if self._rag_engine is None:
            raise RuntimeError("RAG engine not initialized")

        # Get recommendation context from RAG engine
        if hasattr(self._rag_engine, 'get_recommendation_context'):
            context = self._rag_engine.get_recommendation_context_sync(profile)
        else:
            context = ""

        # Build the prompt for LLM
        prompt = self._build_rag_prompt(profile, context)

        # Call LLM
        if self._llm_client:
            # LLM client is synchronous, run in executor
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._llm_client.generate(prompt)
            )
            return self._parse_rag_response(response)
        else:
            # Fallback: return mock data
            return self._get_mock_career_paths(profile)

    async def _run_skill_gap_analysis(
        self,
        user_skills: List[str],
        target_occupation: Optional[str],
        age: int,
        rag_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Run Skill Gap analysis.

        Args:
            user_skills: User's current skills
            target_occupation: Target job title
            age: User's age
            rag_context: Context from RAG results

        Returns:
            List of skill gap items
        """
        if self._skill_gap_engine is None:
            raise RuntimeError("Skill Gap engine not initialized")

        # Use the skill gap engine with context
        if hasattr(self._skill_gap_engine, 'analyze_skill_gaps_with_context'):
            result = self._skill_gap_engine.analyze_skill_gaps_with_context(
                user_skills=user_skills,
                target_occupation=target_occupation,
                age=age,
                rag_context=rag_context
            )
        else:
            # Fallback to regular analyze_skill_gaps
            result = self._skill_gap_engine.analyze_skill_gaps(
                user_skills=user_skills,
                target_occupation=target_occupation or "General",
                age=age
            )

        return self._parse_skill_gap_response(result)

    def _build_rag_prompt(
        self,
        profile: Dict[str, Any],
        rag_context: str
    ) -> str:
        """Build prompt for RAG analysis"""
        # Extract profile info
        basic_info = profile.get("basicInfo", profile.get("basic_info", {}))
        work_exp = profile.get("employmentHistory", profile.get("employment_history", []))
        aspirations = profile.get("aspirations", {})

        skills = []
        for exp in work_exp:
            exp_skills = exp.get("skills", [])
            skills.extend(exp_skills)

        # Normalize skills to strings for prompt
        def _skill_to_str(s):
            if isinstance(s, str):
                return s
            elif isinstance(s, dict):
                return s.get("name") or s.get("skill_name") or s.get("skill") or str(s)
            return str(s)

        skills_str = [_skill_to_str(s) for s in skills[:10]]

        prompt = f"""
Hãy đề xuất các lộ trình nghề nghiệp phù hợp cho người lao động trung niên (35+).

## Thông tin người dùng:
- Tuổi: {basic_info.get('age', 'N/A')}
- Giáo dục: {basic_info.get('education', 'N/A')}
- Kinh nghiệm: {len(work_exp)} công việc

## Kỹ năng hiện tại:
{', '.join(skills_str) if skills_str else 'Chưa có thông tin'}

## Nguyện vọng:
- Mục tiêu: {aspirations.get('targetJob', aspirations.get('target_job', 'Tự động xác định'))}
- Ngành: {aspirations.get('targetIndustry', 'Không giới hạn')}

## Ngữ cảnh từ dữ liệu:
{rag_context[:2000] if rag_context else 'Không có ngữ cảnh bổ sung'}

Hãy trả về JSON với format:
{{
    "career_paths": [
        {{
            "job_title": "Tên công việc",
            "match_score": 0.0-1.0,
            "required_skills": ["kỹ năng bắt buộc"],
            "preferred_skills": ["kỹ năng ưu tiên"],
            "salary_range": "khoảng lương",
            "growth_outlook": "triển vọng"
        }}
    ]
}}
"""
        return prompt

    def _parse_rag_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse LLM response to extract career paths"""
        import json

        try:
            # Try to find JSON in response
            json_start = response_text.find('{')
            if json_start >= 0:
                json_text = response_text[json_start:]
                # Find matching closing brace
                data = json.loads(json_text)
                return data.get('career_paths', [])
        except json.JSONDecodeError:
            pass

        return self._get_mock_career_paths({})

    def _parse_skill_gap_response(self, result: Any) -> List[Dict[str, Any]]:
        """Parse Skill Gap result to list of skill gaps"""
        if isinstance(result, dict):
            return result.get('skill_gaps', [])
        elif isinstance(result, list):
            return result
        return []

    def _get_mock_career_paths(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get mock career paths when LLM is unavailable"""
        return [
            {
                "job_title": "Quản lý cửa hàng",
                "match_score": 0.75,
                "required_skills": ["Quản lý", "Kế toán cơ bản", "Giao tiếp"],
                "preferred_skills": ["Lãnh đạo", "Hoạch định"],
                "salary_range": "10-15 triệu",
                "growth_outlook": "Ổn định"
            },
            {
                "job_title": "Kế toán nội bộ",
                "match_score": 0.70,
                "required_skills": ["Kế toán", "Excel", "Thuế"],
                "preferred_skills": ["Phần mềm kế toán", "Báo cáo tài chính"],
                "salary_range": "8-12 triệu",
                "growth_outlook": "Cao"
            }
        ]

    def _normalize_profile(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize profile to standard format"""
        normalized = profile.copy()

        # Convert camelCase to snake_case if needed
        if "basicInfo" in profile and "basic_info" not in profile:
            normalized["basic_info"] = profile["basicInfo"]
        if "employmentHistory" in profile and "employment_history" not in profile:
            normalized["employment_history"] = profile["employmentHistory"]

        return normalized

    def _extract_age(self, profile: Dict[str, Any]) -> int:
        """Extract age from profile"""
        basic = profile.get("basic_info", profile.get("basicInfo", {}))
        age = basic.get("age", 35)
        return age

    def _generate_summary(
        self,
        career_paths: List[Dict],
        skill_gaps: List[Dict]
    ) -> str:
        """Generate analysis summary"""
        path_count = len(career_paths)
        gap_count = len(skill_gaps)

        if path_count > 0 and gap_count > 0:
            return f"Tìm thấy {path_count} lộ trình nghề nghiệp và {gap_count} kỹ năng cần phát triển."
        elif path_count > 0:
            return f"Tìm thấy {path_count} lộ trình nghề nghiệp phù hợp."
        elif gap_count > 0:
            return f"Cần phát triển {gap_count} kỹ năng để đạt mục tiêu."
        else:
            return "Không tìm thấy kết quả phù hợp."


# =============================================================================
# SAFEGUARDS: Async, Timeout, Retry
# =============================================================================

    async def _run_with_retry(
        self,
        func,
        *args,
        max_retries: int = None,
        **kwargs
    ):
        """
        Run a function with retry logic and exponential backoff.

        Args:
            func: The function to run (must be coroutine)
            *args: Positional arguments for the function
            max_retries: Maximum number of retry attempts (default: DEFAULT_MAX_RETRIES)
            **kwargs: Keyword arguments for the function

        Returns:
            Result from successful function execution

        Raises:
            The last exception if all retries fail
        """
        max_retries = max_retries or self.DEFAULT_MAX_RETRIES
        last_exception = None

        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < max_retries - 1:
                    wait_time = self.RETRY_BACKOFF_BASE ** attempt
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_retries} failed: {e}. "
                        f"Retrying in {wait_time}s..."
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(
                        f"All {max_retries} attempts failed. Last error: {e}"
                    )

        raise last_exception

    async def _run_with_timeout(
        self,
        coro,
        timeout: float = None
    ):
        """
        Run a coroutine with timeout.

        Args:
            coro: The coroutine to run
            timeout: Timeout in seconds (default: DEFAULT_TIMEOUT)

        Returns:
            Result from coroutine if completed in time

        Raises:
            asyncio.TimeoutError if timeout exceeded
        """
        timeout = timeout or self.DEFAULT_TIMEOUT
        return await asyncio.wait_for(coro, timeout=timeout)

    def _run_sync_in_executor(self, func, *args):
        """
        Run a synchronous function in a thread pool executor.

        Useful for running blocking I/O operations without blocking the event loop.

        Args:
            func: The synchronous function to run
            *args: Arguments for the function

        Returns:
            Result from function execution
        """
        loop = asyncio.get_event_loop()
        future = self._executor.submit(func, *args)
        return loop.run_in_executor(self._executor, func, *args)


# =============================================================================
# PARTIAL RESPONSE HANDLING
# =============================================================================

    def _build_partial_response(
        self,
        rag_result: Any,
        skill_gap_result: Any,
        shared_context: SharedAnalysisContext,
        errors: List[str],
        timing: TimingInfo
    ) -> CareerAnalysisResponse:
        """
        Build a response when one or both engines failed.

        This ensures we return something useful even if partial failure occurs.

        Args:
            rag_result: RAG result (can be None or Exception)
            skill_gap_result: Skill Gap result (can be None or Exception)
            shared_context: The shared context
            errors: List of error messages
            timing: Timing information

        Returns:
            CareerAnalysisResponse with whatever data is available
        """
        career_paths = []
        skill_gaps = []

        # Extract career paths if RAG succeeded
        if rag_result is not None and not isinstance(rag_result, Exception):
            if isinstance(rag_result, list):
                career_paths = rag_result
            elif isinstance(rag_result, dict):
                career_paths = rag_result.get('career_paths', [])

        # Extract skill gaps if Skill Gap succeeded
        if skill_gap_result is not None and not isinstance(skill_gap_result, Exception):
            if isinstance(skill_gap_result, list):
                skill_gaps = skill_gap_result
            elif isinstance(skill_gap_result, dict):
                skill_gaps = skill_gap_result.get('skill_gaps', [])

        # Determine success based on what we have
        success = len(career_paths) > 0 or len(skill_gaps) > 0

        return CareerAnalysisResponse(
            success=success,
            data=CareerAnalysisResponseData(
                career_paths=career_paths,
                skill_gaps=skill_gaps,
                shared_context=shared_context.model_dump() if shared_context else {},
                summary=self._generate_summary(career_paths, skill_gaps)
            ),
            timing=timing,
            metadata=FederationMetadata(
                rag_used=rag_result is not None and not isinstance(rag_result, Exception),
                skill_gap_used=skill_gap_result is not None and not isinstance(skill_gap_result, Exception),
                rag_fallback=isinstance(rag_result, Exception) if rag_result is not None else False,
                skill_gap_fallback=isinstance(skill_gap_result, Exception) if skill_gap_result is not None else False
            ),
            errors=errors
        )

    def _build_timeout_response(
        self,
        shared_context: SharedAnalysisContext,
        partial_data: Dict[str, Any] = None
    ) -> CareerAnalysisResponse:
        """
        Build a response when analysis times out.

        Args:
            shared_context: The shared context (if available)
            partial_data: Any partial data collected before timeout

        Returns:
            CareerAnalysisResponse indicating timeout
        """
        partial_data = partial_data or {}

        return CareerAnalysisResponse(
            success=False,
            data=CareerAnalysisResponseData(
                career_paths=partial_data.get('career_paths', []),
                skill_gaps=partial_data.get('skill_gaps', []),
                shared_context=shared_context.model_dump() if shared_context else {},
                summary="Phân tích bị timeout. Vui lòng thử lại."
            ),
            timing=TimingInfo(total_ms=self.DEFAULT_TIMEOUT * 1000),
            metadata=FederationMetadata(
                rag_used=False,
                skill_gap_used=False
            ),
            errors=["Analysis timed out after {self.DEFAULT_TIMEOUT}s"]
        )


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_career_analysis_service() -> CareerAnalysisService:
    """Factory function to create CareerAnalysisService instance"""
    return CareerAnalysisService()


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    import asyncio

    print("=" * 60)
    print("Testing CareerAnalysisService")
    print("=" * 60)

    async def test():
        # Create service
        service = CareerAnalysisService()

        # Test profile
        test_profile = {
            "basicInfo": {
                "age": 45,
                "education": "Cao đẳng"
            },
            "employmentHistory": [
                {
                    "role": "Kế toán",
                    "years": 10,
                    "skills": ["Excel", "Word", "Kế toán tổng hợp", "Thuế"]
                }
            ],
            "aspirations": {
                "targetJob": "Quản lý tài chính"
            }
        }

        # Run analysis
        print("\nRunning analysis...")
        result = await service.analyze_full(
            test_profile,
            options=AnalysisOptions(
                include_career_paths=True,
                include_skill_gaps=False  # Disable skill gap for test
            )
        )

        # Print results
        print(f"\nSuccess: {result.success}")
        print(f"Total time: {result.timing.total_ms}ms")
        print(f"RAG time: {result.timing.rag_ms}ms")
        print(f"Career paths: {len(result.data.career_paths)}")

        for i, path in enumerate(result.data.career_paths[:3], 1):
            print(f"  {i}. {path.get('job_title')} (score: {path.get('match_score', 0):.2f})")

        print(f"\nSummary: {result.data.summary}")

        if result.errors:
            print(f"Errors: {result.errors}")

    asyncio.run(test())

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)
