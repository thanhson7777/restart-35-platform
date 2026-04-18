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
    GroqConfig,
    GroqClient,
    VietnamesePrompts,
    get_groq_client,
    is_groq_available,
    test_groq_connection
)

__all__ = [
    # Gemini
    'GeminiConfig',
    'GeminiClient',
    'JobEnrichmentPrompts',
    'get_gemini_client',
    'is_gemini_available',
    'test_gemini_connection',
    # Groq
    'GroqConfig',
    'GroqClient',
    'VietnamesePrompts',
    'get_groq_client',
    'is_groq_available',
    'test_groq_connection',
]
