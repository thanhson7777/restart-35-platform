# -*- coding: utf-8 -*-
"""
Prompts Module for RAG-based Career Recommendations

Exports:
    - CAREER_RECOMMEND_SYSTEM_PROMPT: System prompt for career recommendations
    - CAREER_RECOMMEND_USER_PROMPT: User prompt for career recommendations
    - STARTUP_PROMPT: Prompt for startup suggestions
    - SKILLS_GAP_PROMPT: Prompt for skills gap analysis
    - format_career_prompt: Helper function to format prompts
"""

from .career_recommend import (
    CAREER_RECOMMEND_SYSTEM_PROMPT,
    CAREER_RECOMMEND_USER_PROMPT,
    STARTUP_PROMPT,
    SKILLS_GAP_PROMPT,
    format_career_prompt,
    format_startup_prompt,
    format_skills_gap_prompt,
)

__all__ = [
    "CAREER_RECOMMEND_SYSTEM_PROMPT",
    "CAREER_RECOMMEND_USER_PROMPT",
    "STARTUP_PROMPT",
    "SKILLS_GAP_PROMPT",
    "format_career_prompt",
    "format_startup_prompt",
    "format_skills_gap_prompt",
]
