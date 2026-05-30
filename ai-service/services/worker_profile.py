# -*- coding: utf-8 -*-
"""
Worker Profile Models for Job Recommendation

This module defines the data models for worker profile-based job matching.

Models:
- JobSelectionMode: Enum for job selection modes
- WorkExperienceItem: Model for a single work experience entry
- JobSelection: Model for job selection configuration
- WorkerProfileRequest: Full worker profile request

Author: Restart-35
Date: 2026-05-30
"""

from enum import Enum
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================

class JobSelectionMode(str, Enum):
    """
    Chế độ chọn nghề nghiệp cho matching.

    - RECENT_JOB: Sử dụng nghề gần đây nhất để matching
    - ALL_JOBS: Sử dụng tất cả nghề đã có kinh nghiệm
    - NEW_JOB: Sử dụng nghề mới (nhập mới)
    """
    RECENT_JOB = "recent_job"
    ALL_JOBS = "all_jobs"
    NEW_JOB = "new_job"


# =============================================================================
# MODELS
# =============================================================================

class WorkExperienceItem(BaseModel):
    """
    Một công việc trong employment history.

    Attributes:
        industry: Ngành nghề (VD: "IT", "Kế toán", "Giáo dục")
        role: Vị trí/Tiêu đề công việc (VD: "Kỹ sư phần mềm", "Kế toán tổng hợp")
        years: Số năm kinh nghiệm (0-50)
        skills: Danh sách kỹ năng đã sử dụng (VD: ["Python", "Java", "Excel"])
    """
    industry: str = Field(
        ...,
        description="Ngành nghề (VD: 'IT', 'Kế toán', 'Giáo dục')"
    )
    role: str = Field(
        ...,
        description="Vị trí/Tiêu đề công việc (VD: 'Kỹ sư phần mềm')"
    )
    years: float = Field(
        ...,
        ge=0,
        le=50,
        description="Số năm kinh nghiệm (0-50)"
    )
    skills: List[str] = Field(
        default_factory=list,
        description="Danh sách kỹ năng đã sử dụng"
    )


class JobSelection(BaseModel):
    """
    Chọn nguồn skills cho job matching.

    Attributes:
        mode: Chế độ chọn nghề (RECENT_JOB, ALL_JOBS, NEW_JOB)
        new_job_title: Tên nghề mới (chỉ khi mode = NEW_JOB)
        selected_job_index: Index của job được chọn (chỉ khi mode = RECENT_JOB)
    """
    mode: JobSelectionMode = Field(
        ...,
        description="Chế độ chọn: recent_job | all_jobs | new_job"
    )
    new_job_title: Optional[str] = Field(
        default=None,
        description="Tên nghề mới (khi mode = new_job)"
    )
    selected_job_index: Optional[int] = Field(
        default=None,
        description="Index của job được chọn trong employment_history (0-based, khi mode = recent_job)"
    )


class WorkerProfileRequest(BaseModel):
    """
    Request model cho worker profile-based job recommendation.

    Attributes:
        age: Tuổi của worker (35-65)
        gender: Giới tính ('male', 'female', hoặc None)
        education: Trình độ học vấn ('primary', 'lower_secondary', 'upper_secondary', 'college', 'university', 'postgraduate')
        province: Tỉnh/Thành phố hiện tại
        employment_history: Danh sách công việc đã làm
        job_selection: Cấu hình chọn nghề cho matching
        target_industry: Ngành mong muốn (tùy chọn)
        target_salary: Mức lương mong muốn (tùy chọn)
        preferred_job_type: Loại công việc mong muốn (full-time, part-time, contract)
        barrier_health: Rào cản sức khỏe (0 = không, 1 = có)
        barrier_family: Rào cản gia đình (0 = không, 1 = có)
        barrier_tech_gap: Rào cản công nghệ (0 = không, 1 = có)
    """
    # === Thông tin cơ bản ===
    age: int = Field(
        ...,
        ge=35,
        le=65,
        description="Tuổi của worker (35-65)"
    )
    gender: Optional[str] = Field(
        default=None,
        description="Giới tính: 'male' hoặc 'female'"
    )
    education: Optional[str] = Field(
        default=None,
        description="Trình độ học vấn: 'primary', 'lower_secondary', 'upper_secondary', 'college', 'university', 'postgraduate'"
    )
    province: Optional[str] = Field(
        default=None,
        description="Tỉnh/Thành phố hiện tại"
    )

    # === Kinh nghiệm làm việc ===
    employment_history: List[WorkExperienceItem] = Field(
        ...,
        min_length=1,
        description="Danh sách công việc đã làm (sorted by recency - gần nhất trước)"
    )

    # === CHỌN NGHỀ NGHIỆP CHO MATCHING ===
    job_selection: JobSelection = Field(
        ...,
        description="Chọn nguồn skills cho job matching"
    )

    # === Nguyện vọng khác (không lấy skills) ===
    target_industry: Optional[str] = Field(
        default=None,
        description="Ngành mong muốn"
    )
    target_salary: Optional[float] = Field(
        default=None,
        description="Mức lương mong muốn (VND)"
    )
    preferred_job_type: Optional[str] = Field(
        default=None,
        description="Loại công việc: 'full-time', 'part-time', 'contract'"
    )

    # === Rào cản ===
    barrier_health: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản sức khỏe: 0 = không, 1 = có"
    )
    barrier_family: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản gia đình: 0 = không, 1 = có"
    )
    barrier_tech_gap: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản công nghệ: 0 = không, 1 = có"
    )


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def extract_skills_for_matching(
    employment_history: List[WorkExperienceItem],
    job_selection: JobSelection
) -> Tuple[List[str], Optional[str], int]:
    """
    Trích xuất skills và thông tin matching từ job selection.

    Args:
        employment_history: Danh sách công việc đã làm
        job_selection: Cấu hình chọn nghề

    Returns:
        tuple: (skills_list, target_job, experience_years)
            - skills_list: Danh sách skills để matching
            - target_job: Tên nghề target (hoặc None)
            - experience_years: Tổng số năm kinh nghiệm
    """
    skills = []
    target_job = None
    experience_years = 0.0

    if job_selection.mode == JobSelectionMode.RECENT_JOB:
        # MODE 1: Nghề gần đây nhất
        if job_selection.selected_job_index is not None:
            # Use specified job index
            if 0 <= job_selection.selected_job_index < len(employment_history):
                job = employment_history[job_selection.selected_job_index]
            else:
                # Fallback to most recent
                job = employment_history[0]
        else:
            # Default: Use most recent job (first in list, sorted by recency)
            job = employment_history[0]

        skills = job.skills.copy()
        target_job = job.role
        experience_years = job.years

    elif job_selection.mode == JobSelectionMode.ALL_JOBS:
        # MODE 2: Tất cả nghề đã có kinh nghiệm
        all_skills = []
        total_years = 0.0
        primary_role = None

        for job in employment_history:
            all_skills.extend(job.skills)
            total_years += job.years
            if primary_role is None:
                primary_role = job.role

        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in all_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)

        skills = unique_skills
        target_job = primary_role
        experience_years = total_years

    elif job_selection.mode == JobSelectionMode.NEW_JOB:
        # MODE 3: Nghề mới
        if not job_selection.new_job_title:
            raise ValueError("new_job_title is required when mode is new_job")

        target_job = job_selection.new_job_title

        # Combine all existing skills as transferable skills
        all_skills = []
        total_years = 0.0
        for job in employment_history:
            all_skills.extend(job.skills)
            total_years += job.years

        # Remove duplicates
        seen = set()
        unique_skills = []
        for skill in all_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)

        skills = unique_skills
        experience_years = total_years

    else:
        raise ValueError(f"Unknown job selection mode: {job_selection.mode}")

    return skills, target_job, experience_years


# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

def validate_worker_profile(profile: WorkerProfileRequest) -> List[str]:
    """
    Validate worker profile and return list of warnings.

    Args:
        profile: WorkerProfileRequest instance

    Returns:
        List of warning messages (empty if valid)
    """
    warnings = []

    # Check for missing skills in employment history
    jobs_without_skills = [
        i for i, job in enumerate(profile.employment_history)
        if not job.skills
    ]
    if jobs_without_skills:
        warnings.append(
            f"Jobs at index {jobs_without_skills} have no skills listed. "
            "Consider adding skills for better matching."
        )

    # Check for missing gender
    if not profile.gender:
        warnings.append(
            "Gender not specified. Gender-based scoring will be skipped."
        )

    # Check for missing education
    if not profile.education:
        warnings.append(
            "Education not specified. Education-based scoring will be skipped."
        )

    # Check for invalid age
    if profile.age < 40:
        warnings.append(
            "Worker age is below 40. Some age-related scoring may apply."
        )

    # Validate NEW_JOB mode has new_job_title
    if profile.job_selection.mode == JobSelectionMode.NEW_JOB:
        if not profile.job_selection.new_job_title:
            warnings.append(
                "NEW_JOB mode requires new_job_title to be specified."
            )

    return warnings


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    # Test the models
    print("Testing Worker Profile Models...")

    # Create sample employment history
    history = [
        WorkExperienceItem(
            industry="IT",
            role="Kỹ sư phần mềm",
            years=3,
            skills=["Python", "Java", "SQL", "Docker"]
        ),
        WorkExperienceItem(
            industry="IT",
            role="Junior Developer",
            years=2,
            skills=["Python", "JavaScript", "HTML", "CSS"]
        ),
    ]

    # Test RECENT_JOB mode
    selection = JobSelection(mode=JobSelectionMode.RECENT_JOB)
    skills, target, years = extract_skills_for_matching(history, selection)
    print(f"RECENT_JOB: skills={skills}, target={target}, years={years}")

    # Test ALL_JOBS mode
    selection = JobSelection(mode=JobSelectionMode.ALL_JOBS)
    skills, target, years = extract_skills_for_matching(history, selection)
    print(f"ALL_JOBS: skills={skills}, target={target}, years={years}")

    # Test NEW_JOB mode
    selection = JobSelection(
        mode=JobSelectionMode.NEW_JOB,
        new_job_title="Data Analyst"
    )
    skills, target, years = extract_skills_for_matching(history, selection)
    print(f"NEW_JOB: skills={skills}, target={target}, years={years}")

    print("\nAll tests passed!")
