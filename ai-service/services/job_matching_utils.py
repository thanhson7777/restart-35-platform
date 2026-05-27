# -*- coding: utf-8 -*-
"""
Job Matching Utilities
=====================
Functions cho job matching với employment history và job selection.
"""

from typing import List, Tuple, Optional
from routers.ai import WorkExperienceItem, JobSelection, JobSelectionMode


def extract_skills_for_matching(
    employment_history: List[WorkExperienceItem],
    job_selection: JobSelection
) -> Tuple[List[str], Optional[str], int]:
    """
    Trích xuất skills và thông tin matching từ job selection.
    
    Args:
        employment_history: Danh sách công việc đã làm
        job_selection: Chế độ chọn nghề nghiệp
    
    Returns:
        Tuple gồm:
        - skills_list: Danh sách skills đã trích xuất
        - target_job: Tên công việc mục tiêu (hoặc None)
        - experience_years: Tổng số năm kinh nghiệm
    """
    if not employment_history:
        return [], None, 0
    
    skills = []
    target_job = None
    experience_years = 0.0
    
    if job_selection.mode == JobSelectionMode.RECENT_JOB:
        # MODE 1: Nghề gần đây nhất
        if job_selection.selected_job_index is not None:
            # Validate index
            if 0 <= job_selection.selected_job_index < len(employment_history):
                job = employment_history[job_selection.selected_job_index]
            else:
                # Invalid index, fallback to first
                job = employment_history[0]
        else:
            # Default: job gần nhất (list sorted by recency)
            job = employment_history[0]
        
        skills = list(job.skills) if job.skills else []
        target_job = job.role
        experience_years = job.years
        
    elif job_selection.mode == JobSelectionMode.ALL_JOBS:
        # MODE 2: Tất cả nghề đã có kinh nghiệm
        all_skills = []
        total_years = 0.0
        primary_role = None
        
        for job in employment_history:
            if job.skills:
                all_skills.extend(job.skills)
            total_years += job.years
            if primary_role is None and job.role:
                primary_role = job.role
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in all_skills:
            if skill not in seen:
                seen.add(skill)
                unique_skills.append(skill)
        
        skills = unique_skills
        target_job = primary_role
        experience_years = total_years
        
    elif job_selection.mode == JobSelectionMode.NEW_JOB:
        # MODE 3: Nghề mới
        if not job_selection.new_job_title:
            raise ValueError("new_job_title is required when mode is new_job")
        
        target_job = job_selection.new_job_title
        
        # Union all skills from employment history
        all_skills = []
        total_years = 0.0
        
        for job in employment_history:
            if job.skills:
                all_skills.extend(job.skills)
            total_years += job.years
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in all_skills:
            if skill not in seen:
                seen.add(skill)
                unique_skills.append(skill)
        
        skills = unique_skills
        experience_years = total_years
    
    return skills, target_job, experience_years


def get_job_selection_summary(
    employment_history: List[WorkExperienceItem],
    job_selection: JobSelection
) -> dict:
    """
    Tạo summary của job selection để hiển thị cho user.
    
    Args:
        employment_history: Danh sách công việc đã làm
        job_selection: Chế độ chọn nghề nghiệp
    
    Returns:
        Dict chứa summary information
    """
    summary = {
        "mode": job_selection.mode.value,
        "selected_job": None,
        "total_jobs": len(employment_history),
        "total_skills": 0,
        "total_years": 0.0,
        "skills_preview": []
    }
    
    if job_selection.mode == JobSelectionMode.RECENT_JOB:
        if employment_history:
            selected_idx = job_selection.selected_job_index or 0
            if 0 <= selected_idx < len(employment_history):
                selected_job = employment_history[selected_idx]
                summary["selected_job"] = {
                    "industry": selected_job.industry,
                    "role": selected_job.role,
                    "years": selected_job.years,
                    "skills_count": len(selected_job.skills) if selected_job.skills else 0
                }
                summary["total_skills"] = len(selected_job.skills) if selected_job.skills else 0
                summary["total_years"] = selected_job.years
                summary["skills_preview"] = list(selected_job.skills)[:5] if selected_job.skills else []
    
    elif job_selection.mode == JobSelectionMode.ALL_JOBS:
        total_skills = set()
        total_years = 0.0
        all_skills = []
        
        for job in employment_history:
            if job.skills:
                total_skills.update(job.skills)
                all_skills.extend(job.skills)
            total_years += job.years
        
        summary["total_skills"] = len(total_skills)
        summary["total_years"] = total_years
        summary["skills_preview"] = list(total_skills)[:5]
    
    elif job_selection.mode == JobSelectionMode.NEW_JOB:
        total_skills = set()
        total_years = 0.0
        
        for job in employment_history:
            if job.skills:
                total_skills.update(job.skills)
            total_years += job.years
        
        summary["total_skills"] = len(total_skills)
        summary["total_years"] = total_years
        summary["new_job_title"] = job_selection.new_job_title
        summary["skills_preview"] = list(total_skills)[:5]
    
    return summary
