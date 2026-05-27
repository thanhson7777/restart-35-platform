# -*- coding: utf-8 -*-
"""
Tests cho job_matching_utils module
"""

import pytest
from routers.ai import (
    JobSelectionMode, 
    JobSelection, 
    WorkExperienceItem, 
    WorkerProfileRequest
)
from services.job_matching_utils import (
    extract_skills_for_matching,
    get_job_selection_summary
)


class TestExtractSkillsForMatching:
    """Test cases cho extract_skills_for_matching function"""

    def test_recent_job_default(self):
        """Test RECENT_JOB mode - không chỉ định index (lấy job đầu tiên)"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán", "Excel", "Thuế", "SAP"]
            ),
            WorkExperienceItem(
                industry="Kinh doanh",
                role="Nhân viên bán hàng",
                years=3,
                skills=["Bán hàng", "Giao tiếp", "Chăm sóc khách hàng"]
            )
        ]
        
        job_selection = JobSelection(mode=JobSelectionMode.RECENT_JOB)
        
        skills, target_job, experience = extract_skills_for_matching(
            employment_history, job_selection
        )
        
        assert skills == ["Kế toán", "Excel", "Thuế", "SAP"]
        assert target_job == "Kế toán tổng hợp"
        assert experience == 5

    def test_recent_job_with_index(self):
        """Test RECENT_JOB mode - chỉ định index cụ thể"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán", "Excel"]
            ),
            WorkExperienceItem(
                industry="Kinh doanh",
                role="Nhân viên bán hàng",
                years=3,
                skills=["Bán hàng", "Giao tiếp"]
            )
        ]
        
        job_selection = JobSelection(
            mode=JobSelectionMode.RECENT_JOB,
            selected_job_index=1
        )
        
        skills, target_job, experience = extract_skills_for_matching(
            employment_history, job_selection
        )
        
        assert skills == ["Bán hàng", "Giao tiếp"]
        assert target_job == "Nhân viên bán hàng"
        assert experience == 3

    def test_recent_job_invalid_index(self):
        """Test RECENT_JOB mode - index không hợp lệ (fallback to first)"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán", "Excel"]
            )
        ]
        
        job_selection = JobSelection(
            mode=JobSelectionMode.RECENT_JOB,
            selected_job_index=99  # Invalid index
        )
        
        skills, target_job, experience = extract_skills_for_matching(
            employment_history, job_selection
        )
        
        # Should fallback to first job
        assert skills == ["Kế toán", "Excel"]
        assert experience == 5

    def test_all_jobs_mode(self):
        """Test ALL_JOBS mode - lấy tất cả skills từ mọi job"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán", "Excel", "Thuế"]
            ),
            WorkExperienceItem(
                industry="Kinh doanh",
                role="Nhân viên bán hàng",
                years=3,
                skills=["Bán hàng", "Giao tiếp", "Kế toán"]  # Duplicate skill
            )
        ]
        
        job_selection = JobSelection(mode=JobSelectionMode.ALL_JOBS)
        
        skills, target_job, experience = extract_skills_for_matching(
            employment_history, job_selection
        )
        
        # Skills should be deduplicated
        assert len(skills) == 5  # 6 total - 1 duplicate = 5
        assert "Kế toán" in skills
        assert "Excel" in skills
        assert "Bán hàng" in skills
        # Total experience
        assert experience == 8

    def test_new_job_mode(self):
        """Test NEW_JOB mode - nhập nghề mới muốn theo đuổi"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán", "Excel"]
            ),
            WorkExperienceItem(
                industry="Kinh doanh",
                role="Nhân viên bán hàng",
                years=3,
                skills=["Bán hàng", "Giao tiếp"]
            )
        ]
        
        job_selection = JobSelection(
            mode=JobSelectionMode.NEW_JOB,
            new_job_title="Quản lý nhà hàng"
        )
        
        skills, target_job, experience = extract_skills_for_matching(
            employment_history, job_selection
        )
        
        # Skills từ tất cả jobs
        assert len(skills) == 4
        assert target_job == "Quản lý nhà hàng"
        assert experience == 8  # Total years

    def test_new_job_mode_missing_title(self):
        """Test NEW_JOB mode - thiếu new_job_title (raise error)"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán"]
            )
        ]
        
        job_selection = JobSelection(mode=JobSelectionMode.NEW_JOB)
        # new_job_title is None
        
        with pytest.raises(ValueError, match="new_job_title is required"):
            extract_skills_for_matching(employment_history, job_selection)

    def test_empty_employment_history(self):
        """Test với employment_history rỗng"""
        job_selection = JobSelection(mode=JobSelectionMode.RECENT_JOB)
        
        skills, target_job, experience = extract_skills_for_matching(
            [], job_selection
        )
        
        assert skills == []
        assert target_job is None
        assert experience == 0

    def test_job_with_empty_skills(self):
        """Test job có skills rỗng"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=[]  # Empty skills
            )
        ]
        
        job_selection = JobSelection(mode=JobSelectionMode.RECENT_JOB)
        
        skills, target_job, experience = extract_skills_for_matching(
            employment_history, job_selection
        )
        
        assert skills == []
        assert experience == 5


class TestGetJobSelectionSummary:
    """Test cases cho get_job_selection_summary function"""

    def test_summary_recent_job(self):
        """Test summary cho RECENT_JOB mode"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán tổng hợp",
                years=5,
                skills=["Kế toán", "Excel", "Thuế", "SAP", "Tài chính", "Ngân hàng"]
            )
        ]
        
        job_selection = JobSelection(mode=JobSelectionMode.RECENT_JOB)
        
        summary = get_job_selection_summary(employment_history, job_selection)
        
        assert summary["mode"] == "recent_job"
        assert summary["total_jobs"] == 1
        assert summary["total_skills"] == 6
        assert summary["total_years"] == 5
        assert len(summary["skills_preview"]) == 5  # Max 5 preview

    def test_summary_all_jobs(self):
        """Test summary cho ALL_JOBS mode"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán",
                years=5,
                skills=["Excel", "Word"]
            ),
            WorkExperienceItem(
                industry="IT",
                role="Developer",
                years=3,
                skills=["Python", "Java"]
            )
        ]
        
        job_selection = JobSelection(mode=JobSelectionMode.ALL_JOBS)
        
        summary = get_job_selection_summary(employment_history, job_selection)
        
        assert summary["mode"] == "all_jobs"
        assert summary["total_jobs"] == 2
        assert summary["total_skills"] == 4
        assert summary["total_years"] == 8

    def test_summary_new_job(self):
        """Test summary cho NEW_JOB mode"""
        employment_history = [
            WorkExperienceItem(
                industry="Kế toán",
                role="Kế toán",
                years=5,
                skills=["Excel"]
            )
        ]
        
        job_selection = JobSelection(
            mode=JobSelectionMode.NEW_JOB,
            new_job_title="Quản lý"
        )
        
        summary = get_job_selection_summary(employment_history, job_selection)
        
        assert summary["mode"] == "new_job"
        assert summary["new_job_title"] == "Quản lý"
        assert summary["total_skills"] == 1


class TestWorkerProfileRequest:
    """Test cases cho WorkerProfileRequest model"""

    def test_valid_request_recent_job(self):
        """Test WorkerProfileRequest hợp lệ với RECENT_JOB"""
        request = WorkerProfileRequest(
            age=45,
            gender="female",
            education="college",
            province="Hồ Chí Minh",
            employment_history=[
                WorkExperienceItem(
                    industry="Kế toán",
                    role="Kế toán tổng hợp",
                    years=5,
                    skills=["Kế toán", "Excel"]
                )
            ],
            job_selection=JobSelection(mode=JobSelectionMode.RECENT_JOB),
            target_salary=15000000,
            barrier_family=1
        )
        
        assert request.age == 45
        assert request.gender == "female"
        assert len(request.employment_history) == 1
        assert request.job_selection.mode == JobSelectionMode.RECENT_JOB

    def test_valid_request_all_jobs(self):
        """Test WorkerProfileRequest hợp lệ với ALL_JOBS"""
        request = WorkerProfileRequest(
            age=45,
            employment_history=[
                WorkExperienceItem(
                    industry="Kế toán",
                    role="Kế toán",
                    years=5,
                    skills=["Kế toán"]
                ),
                WorkExperienceItem(
                    industry="IT",
                    role="Developer",
                    years=3,
                    skills=["Python"]
                )
            ],
            job_selection=JobSelection(mode=JobSelectionMode.ALL_JOBS)
        )
        
        assert request.job_selection.mode == JobSelectionMode.ALL_JOBS

    def test_valid_request_new_job(self):
        """Test WorkerProfileRequest hợp lệ với NEW_JOB"""
        request = WorkerProfileRequest(
            age=45,
            employment_history=[
                WorkExperienceItem(
                    industry="Kế toán",
                    role="Kế toán",
                    years=5,
                    skills=["Kế toán"]
                )
            ],
            job_selection=JobSelection(
                mode=JobSelectionMode.NEW_JOB,
                new_job_title="Quản lý nhà hàng"
            )
        )
        
        assert request.job_selection.mode == JobSelectionMode.NEW_JOB
        assert request.job_selection.new_job_title == "Quản lý nhà hàng"

    def test_invalid_age_below_min(self):
        """Test age dưới giới hạn tối thiểu (35)"""
        with pytest.raises(Exception):
            WorkerProfileRequest(
                age=30,  # Below min (35)
                employment_history=[
                    WorkExperienceItem(
                        industry="Kế toán",
                        role="Kế toán",
                        years=5,
                        skills=[]
                    )
                ],
                job_selection=JobSelection(mode=JobSelectionMode.RECENT_JOB)
            )

    def test_invalid_age_above_max(self):
        """Test age trên giới hạn tối đa (65)"""
        with pytest.raises(Exception):
            WorkerProfileRequest(
                age=70,  # Above max (65)
                employment_history=[
                    WorkExperienceItem(
                        industry="Kế toán",
                        role="Kế toán",
                        years=5,
                        skills=[]
                    )
                ],
                job_selection=JobSelection(mode=JobSelectionMode.RECENT_JOB)
            )

    def test_empty_employment_history(self):
        """Test employment_history rỗng (phải có ít nhất 1 job)"""
        with pytest.raises(Exception):
            WorkerProfileRequest(
                age=45,
                employment_history=[],  # Must have at least 1
                job_selection=JobSelection(mode=JobSelectionMode.RECENT_JOB)
            )

    def test_barrier_values(self):
        """Test barrier fields chỉ chấp nhận 0 hoặc 1"""
        request = WorkerProfileRequest(
            age=45,
            employment_history=[
                WorkExperienceItem(
                    industry="Kế toán",
                    role="Kế toán",
                    years=5,
                    skills=[]
                )
            ],
            job_selection=JobSelection(mode=JobSelectionMode.RECENT_JOB),
            barrier_health=1,
            barrier_family=0,
            barrier_techGap=1
        )
        
        assert request.barrier_health == 1
        assert request.barrier_family == 0
        assert request.barrier_techGap == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
