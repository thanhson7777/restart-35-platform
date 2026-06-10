#!/usr/bin/env python3
"""
RAG Context Builder for Skill Gap Analysis
==========================================
Build context from RAG for skill gap analysis.

This module provides context for the LLM refinement stage:
- Salary data
- Job requirements
- Market trends
- Skill transfer information
"""
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


class RAGContextBuilder:
    """
    Build context từ RAG cho skill gap analysis

    Provides:
    - Salary context for occupations
    - Job requirements from real job postings
    - Market trends and skill demands
    - Skill transfer recommendations
    """

    def __init__(self):
        """Initialize RAG context builder"""
        self.model = None
        self.salary_data = None
        self.job_requirements = None
        self.trends = None
        self.skill_transfer = None
        self._initialized = False

    def _ensure_init(self):
        """Lazy initialization"""
        if self._initialized:
            return

        print("Initializing RAG Context Builder...")

        # Load model
        print(f"  Loading embedding model: {MODEL_NAME}")
        self.model = SentenceTransformer(MODEL_NAME)

        # Load salary data
        salary_file = DATA_DIR / "rag" / "salary_benchmarks.json"
        if salary_file.exists():
            print(f"  Loading salary data from {salary_file}")
            with open(salary_file, 'r', encoding='utf-8') as f:
                self.salary_data = json.load(f)
        else:
            print(f"  Warning: Salary file not found at {salary_file}")
            self.salary_data = {"salaries": []}

        # Load skill transfer data
        transfer_file = DATA_DIR / "skill_transfer_matrix.json"
        if transfer_file.exists():
            print(f"  Loading skill transfer data from {transfer_file}")
            with open(transfer_file, 'r', encoding='utf-8') as f:
                self.skill_transfer = json.load(f)
        else:
            print(f"  Warning: Skill transfer file not found")
            self.skill_transfer = {"skill_transfers": {}}

        # Load skill matrix
        skill_matrix_file = DATA_DIR / "rag" / "skill_matrix.json"
        if skill_matrix_file.exists():
            print(f"  Loading skill matrix from {skill_matrix_file}")
            with open(skill_matrix_file, 'r', encoding='utf-8') as f:
                self.skill_matrix = json.load(f)
        else:
            print(f"  Warning: Skill matrix file not found")
            self.skill_matrix = {"skill_gaps_by_profile": {}}

        self._initialized = True
        print("RAG Context Builder initialized")

    def build_context(self, user_profile: Dict) -> Dict:
        """
        Build RAG context cho user profile

        Args:
            user_profile: Dict with keys like:
                - target_occupation: str
                - current_industry: str
                - current_skills: List[str]
                - age: int

        Returns:
            Dict containing:
                - salary_context: Salary range info
                - job_requirements: Real job requirements
                - market_trends: Industry trends
                - skill_transfer_info: Transferable skills info
        """
        self._ensure_init()

        occupation = user_profile.get("target_occupation", "")
        industry = user_profile.get("current_industry", "")
        current_skills = user_profile.get("current_skills", [])
        age = user_profile.get("age", 0)

        return {
            "salary_context": self._get_salary_context(occupation),
            "job_requirements": self._get_job_requirements(occupation),
            "market_trends": self._get_trends(industry or occupation),
            "skill_transfer_info": self._get_transfer_info(current_skills, age),
            "skill_matrix_info": self._get_skill_matrix_info(current_skills)
        }

    def _get_salary_context(self, occupation: str) -> str:
        """Get salary data for occupation"""
        if not self.salary_data or not occupation:
            return ""

        salaries = self.salary_data.get("salaries", [])
        occupation_lower = occupation.lower()

        # Find matching salaries
        matches = []
        for entry in salaries:
            title = entry.get("title", "").lower()
            if occupation_lower in title or any(word in title for word in occupation_lower.split()):
                matches.append(entry)

        if not matches:
            return f"Không có dữ liệu lương cụ thể cho '{occupation}'. Tham khảo mức lương chung của ngành."

        # Return top 3 matches
        context_parts = [f"Thông tin lương cho '{occupation}':"]
        for match in matches[:3]:
            title = match.get("title", "")
            range_min = match.get("range_min", 0)
            range_max = match.get("range_max", 0)
            level = match.get("level", "")

            if range_min and range_max:
                range_str = f"{range_min/1000000:.1f}-{range_max/1000000:.1f} triệu/tháng"
            else:
                range_str = "Thương lượng"

            context_parts.append(f"- {title} ({level}): {range_str}")

        return "\n".join(context_parts)

    def _get_job_requirements(self, occupation: str) -> str:
        """Get job requirements from job postings"""
        if not occupation:
            return ""

        # This would ideally query the job index
        # For now, return placeholder
        return f"Yêu cầu chung cho '{occupation}': Cần có kinh nghiệm 1-3 năm, khả năng làm việc nhóm và giao tiếp tốt."

    def _get_trends(self, industry: str) -> str:
        """Get industry trends"""
        if not industry:
            return ""

        trends_file = DATA_DIR / "rag" / "industry_trends.json"
        if not trends_file.exists():
            return ""

        try:
            with open(trends_file, 'r', encoding='utf-8') as f:
                trends = json.load(f)

            # Find matching trends
            industry_lower = industry.lower()
            for category, data in trends.items():
                if industry_lower in category.lower():
                    return data.get("summary", "")
        except Exception:
            pass

        return ""

    def _get_transfer_info(self, current_skills: List[str], age: int) -> str:
        """Get skill transfer recommendations"""
        if not self.skill_transfer or not current_skills:
            return ""

        transfers = self.skill_transfer.get("skill_transfers", {})

        # Find matching profiles
        context_parts = ["Thông tin chuyển đổi kỹ năng:"]

        for skill in current_skills[:5]:
            skill_lower = skill.lower()
            for profile_key, profile_data in transfers.items():
                label = profile_data.get("label", "").lower()
                if skill_lower in label or label in skill_lower:
                    context_parts.append(f"- Từ '{skill}': {profile_data.get('label', '')}")
                    if profile_data.get("skill_gap"):
                        context_parts.append(f"  Cần bổ sung: {', '.join(profile_data['skill_gap'])}")
                    break

        if len(context_parts) == 1:
            return ""

        return "\n".join(context_parts[:10])

    def _get_skill_matrix_info(self, current_skills: List[str]) -> str:
        """Get skill matrix recommendations based on age profile"""
        if not self.skill_matrix or not current_skills:
            return ""

        profiles = self.skill_matrix.get("skill_gaps_by_profile", {})

        # Find matching profile
        context_parts = ["Kỹ năng cần thiết theo nhóm tuổi:"]

        for profile_key, profile_data in profiles.items():
            needed = profile_data.get("needed_for_advancement", [])
            if needed:
                timeline = profile_data.get("timeline", "")
                context_parts.append(f"- {profile_key}: Cần {len(needed)} kỹ năng, thời gian {timeline}")

        if len(context_parts) == 1:
            return ""

        return "\n".join(context_parts[:5])

    def build_employment_context(self, employment_history) -> str:
        """
        Build context từ employment history, xử lý cả skip case.
        """
        context_parts = []

        if isinstance(employment_history, dict):
            if employment_history.get('status') == 'không có':
                context_parts.append("KINH NGHIỆM: CHƯA CÓ")
                context_parts.append("Người dùng chưa có kinh nghiệm làm việc chính thức.")
                context_parts.append("Gợi ý: Ưu tiên công việc entry-level, không yêu cầu kinh nghiệm.")
                return '\n'.join(context_parts)
            else:
                return self._build_single_job_context(employment_history)

        if isinstance(employment_history, list):
            valid_jobs = [j for j in employment_history
                          if j and (j.get('companyName') or j.get('position')
                                   or j.get('occupation'))]
            if not valid_jobs:
                context_parts.append("KINH NGHIỆM: CHƯA CÓ")
                context_parts.append("Người dùng chưa có kinh nghiệm làm việc chính thức.")
                return '\n'.join(context_parts)

            total_months = sum(j.get('duration', 0) for j in valid_jobs)
            context_parts.append(f"KINH NGHIỆM: CÓ ({len(valid_jobs)} công việc, ~{total_months // 12} năm)")
            for job in valid_jobs:
                context_parts.append(self._build_single_job_context(job))
            return '\n'.join(context_parts)

        return "Không có thông tin kinh nghiệm."

    def _build_single_job_context(self, job: dict) -> str:
        """Build context từ một job entry."""
        parts = []
        if job.get('companyName'):
            parts.append(f"Công ty: {job['companyName']}")
        occ = job.get('occupation')
        if occ:
            title = occ.get('titleVi', occ) if isinstance(occ, dict) else occ
            parts.append(f"Vị trí: {title}")
        if job.get('position'):
            parts.append(f"Chức danh: {job['position']}")
        if job.get('duration'):
            parts.append(f"Thời gian: {job['duration']} tháng")
        skills = job.get('skills')
        if skills:
            skill_names = [s.get('titleVi', s.get('title', str(s)))
                           if isinstance(s, dict) else str(s) for s in skills]
            parts.append(f"Kỹ năng: {', '.join(skill_names[:5])}")
        return ' | '.join(parts) if parts else ''

    def build_full_profile_context(self, profile: dict) -> str:
        """
        Build complete profile context string cho RAG, xử lý cả skip case.
        """
        parts = []

        basic_info = profile.get('basicInfo', {})
        if basic_info:
            parts.append("THÔNG TIN CƠ BẢN:")
            if basic_info.get('age'):
                parts.append(f"- Tuổi: {basic_info['age']}")
            if basic_info.get('gender'):
                parts.append(f"- Giới tính: {basic_info['gender']}")
            if basic_info.get('province'):
                parts.append(f"- Tỉnh/Thành: {basic_info['province']}")

        employment_history = profile.get('employmentHistory')
        if employment_history:
            parts.append("\nKINH NGHIỆM:")
            parts.append(self.build_employment_context(employment_history))

        aspirations = profile.get('aspirations', {})
        if aspirations:
            parts.append("\nNGUYỆN VỌNG:")
            target = aspirations.get('targetJob')
            if target:
                title = target.get('titleVi', target) if isinstance(target, dict) else str(target)
                parts.append(f"- Công việc mong muốn: {title}")
            if aspirations.get('wantsToStartBusiness'):
                parts.append("- Mong muốn: Khởi nghiệp/Tự tạo việc làm")

        return '\n'.join(parts)

    def format_context_for_llm(self, user_profile: Dict) -> str:
        """
        Format context as a string for LLM prompt

        Args:
            user_profile: User profile dict

        Returns:
            Formatted context string
        """
        context = self.build_context(user_profile)

        parts = ["## NGỮ CẢNH TỪ DỮ LIỆU"]

        if context.get("salary_context"):
            parts.append("\n### Thông tin lương:")
            parts.append(context["salary_context"])

        if context.get("job_requirements"):
            parts.append("\n### Yêu cầu công việc:")
            parts.append(context["job_requirements"])

        if context.get("skill_transfer_info"):
            parts.append("\n### Chuyển đổi kỹ năng:")
            parts.append(context["skill_transfer_info"])

        return "\n".join(parts)


def main():
    """Test RAG Context Builder"""
    print("=" * 60)
    print("Testing RAG Context Builder")
    print("=" * 60)

    builder = RAGContextBuilder()

    # Test with sample profile
    test_profile = {
        "target_occupation": "Kế toán",
        "current_industry": "Tài chính",
        "current_skills": ["Excel", "Word", "Kế toán"],
        "age": 35
    }

    print("\nTest Profile:")
    print(f"  Target: {test_profile['target_occupation']}")
    print(f"  Skills: {', '.join(test_profile['current_skills'])}")

    context = builder.build_context(test_profile)

    print("\n" + "=" * 60)
    print("CONTEXT OUTPUT")
    print("=" * 60)

    for key, value in context.items():
        print(f"\n{key.upper()}:")
        print(value if value else "(no data)")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)


if __name__ == "__main__":
    main()
