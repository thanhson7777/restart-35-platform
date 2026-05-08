"""
Config package - Cấu hình cho AI service
"""

from .gemini_client import (
    GeminiConfig,
    GeminiClient,
    JobEnrichmentPrompts,
    get_gemini_client,
    is_gemini_available,
    test_gemini_connection
)

from .groq_client import (
    LLMConfig,
    UnifiedLLMClient,
    get_llm_client,
    is_llm_available,
    test_llm_connection
)

__all__ = [
    # Gemini
    'GeminiConfig',
    'GeminiClient',
    'JobEnrichmentPrompts',
    'get_gemini_client',
    'is_gemini_available',
    'test_gemini_connection',
    # Unified LLM Client (GROQ + Gemini)
    'LLMConfig',
    'UnifiedLLMClient',
    'get_llm_client',
    'is_llm_available',
    'test_llm_connection',
]
