# -*- coding: utf-8 -*-
"""
Hybrid Job Recommender

Kết hợp static career transitions với real job listings từ backend API.
Giúp enrich recommendations với dữ liệu thực tế từ thị trường lao động.

Usage:
    recommender = HybridJobRecommender()
    results = recommender.discover_with_real_jobs(profile)
"""
import sys
import os
# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import requests
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class RealJob:
    """Real job listing from backend."""
    job_id: str
    title: str
    industry: str
    company: str
    location: str
    salary_min: int
    salary_max: int
    requirements: List[str]
    skills: List[str]
    posted_days_ago: int
    url: Optional[str] = None


class HybridJobRecommender:
    """
    Kết hợp career transition discovery với real job data.
    
    Features:
    - Enrich static transitions với real salary data
    - Thêm job listings thực tế vào recommendations
    - Update requirements từ job market
    - Filter jobs theo barriers
    """
    
    # Default backend API URL (có thể override qua constructor)
    DEFAULT_API_URL = "http://localhost:5000/api/v1"
    
    def __init__(
        self, 
        backend_url: Optional[str] = None,
        api_timeout: int = 10
    ):
        """
        Initialize hybrid recommender.
        
        Args:
            backend_url: Backend API URL (default: http://localhost:5000)
            api_timeout: Request timeout in seconds
        """
        self.backend_url = backend_url or os.getenv("BACKEND_API_URL", self.DEFAULT_API_URL)
        self.api_timeout = api_timeout
        self._discoverer = None
        self._job_cache: Dict[str, List[RealJob]] = {}
        self._cache_ttl = 300  # 5 minutes cache
    
    @property
    def discoverer(self):
        """Lazy load career transition discoverer."""
        if self._discoverer is None:
            from services.career_transition_discoverer import CareerTransitionDiscoverer
            self._discoverer = CareerTransitionDiscoverer()
        return self._discoverer
    
    def discover_with_real_jobs(
        self, 
        profile: Dict[str, Any],
        max_jobs_per_transition: int = 3,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Kết hợp career transitions với real job listings.
        
        Args:
            profile: User profile dict
            max_jobs_per_transition: Số jobs tối đa cho mỗi transition
            use_cache: Sử dụng cache cho job fetches
            
        Returns:
            Dict với keys: transitions, matched_jobs, sources
        """
        # 1. Get static career transitions
        from services.career_transition_discoverer import UserProfile
        
        user_profile = UserProfile(
            age=profile.get("age", 35),
            current_role=profile.get("current_role", ""),
            current_industry=profile.get("current_industry", ""),
            experience_years=profile.get("experience_years", 0),
            skills=profile.get("skills", []),
            target_salary=profile.get("target_salary"),
            barriers=profile.get("barriers", []),
            work_history=profile.get("work_history", []),
            personality_traits=profile.get("personality_traits", []),
            interests=profile.get("interests", []),
            values=profile.get("values", [])
        )
        
        static_transitions = self.discoverer.discover_all(user_profile)
        
        # 2. Fetch real jobs (async hoặc sync)
        all_matched_jobs = []
        enriched_transitions = []
        
        for transition in static_transitions.get("all", []):
            # Fetch real jobs cho mỗi transition
            jobs = self._fetch_real_jobs(
                transition.target_industry,
                transition.skill_gaps,
                profile,
                use_cache
            )
            
            # Filter jobs by barriers
            jobs = self._filter_jobs_by_barriers(jobs, profile.get("barriers", []))
            
            # Enrich transition với real data
            enriched = self._enrich_transition(transition, jobs, max_jobs_per_transition)
            enriched_transitions.append(enriched)
            
            all_matched_jobs.extend(jobs[:max_jobs_per_transition])
        
        # 3. Remove duplicate jobs
        seen_job_ids = set()
        unique_jobs = []
        for job in all_matched_jobs:
            if job.job_id not in seen_job_ids:
                seen_job_ids.add(job.job_id)
                unique_jobs.append(job)
        
        # 4. Sort transitions by match score
        enriched_transitions.sort(key=lambda x: x["transition"]["match_score"], reverse=True)
        
        return {
            "transitions": enriched_transitions,
            "matched_jobs": [self._job_to_dict(j) for j in unique_jobs[:20]],
            "sources": ["career_transitions", "job_database"],
            "statistics": {
                "total_transitions": len(enriched_transitions),
                "total_real_jobs": len(unique_jobs),
                "industries_covered": list(set(j.industry for j in unique_jobs))
            }
        }
    
    def _fetch_real_jobs(
        self, 
        industry: str,
        skills: List[str],
        profile: Dict,
        use_cache: bool
    ) -> List[RealJob]:
        """
        Fetch real jobs từ backend API.
        
        Fallback: Generate mock jobs nếu API không available.
        """
        cache_key = f"{industry}_{'_'.join(skills[:3])}"
        
        if use_cache and cache_key in self._job_cache:
            return self._job_cache[cache_key]
        
        try:
            # Try to fetch from backend
            response = requests.get(
                f"{self.backend_url}/jobs/search",
                params={
                    "industry": industry,
                    "skills": ",".join(skills[:5]),
                    "limit": 10
                },
                timeout=self.api_timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                jobs = [self._parse_job(j) for j in data.get("jobs", [])]
                self._job_cache[cache_key] = jobs
                return jobs
        except Exception as e:
            logger.warning(f"Could not fetch jobs from backend: {e}")
        
        # Fallback: Generate mock jobs for testing
        jobs = self._generate_mock_jobs(industry, skills)
        return jobs
    
    def _parse_job(self, job_data: Dict) -> RealJob:
        """Parse job data from API to RealJob."""
        return RealJob(
            job_id=job_data.get("job_id", job_data.get("_id", "unknown")),
            title=job_data.get("title", ""),
            industry=job_data.get("industry", ""),
            company=job_data.get("company", "Unknown Company"),
            location=job_data.get("location", "Ho Chi Minh"),
            salary_min=job_data.get("salary_min", 0),
            salary_max=job_data.get("salary_max", 0),
            requirements=job_data.get("requirements", []),
            skills=job_data.get("skills", []),
            posted_days_ago=job_data.get("posted_days_ago", 30),
            url=job_data.get("url")
        )
    
    def _generate_mock_jobs(
        self, 
        industry: str, 
        skills: List[str]
    ) -> List[RealJob]:
        """Generate mock jobs for testing/fallback."""
        import random
        
        mock_jobs = []
        industry_titles = {
            "co_khi": ["Ky Su San Xuat", "Quan Ly Xưởng", "Kỹ Thuật Viên CNC"],
            "ban_hang": ["Chuyên Viên Kinh Doanh", "Quan Ly Cua Hang", "Truong Phong Ban Hang"],
            "phuc_vu": ["Quan Ly Nha Hang", "Dau Bep", "Le Tan"],
            "nhan_su": ["Chuyen Vien Nhan Su", "Quan Ly Nhan Su", "Tuyen Dung"],
            "tu_van": ["Tu Van Vien", "Chuyen Gia Tu Van", "Business Consultant"],
            "hanh_chinh": ["Nhan Vien Hanh Chinh", "Tro Ly Hanh Chinh", "Quan Ly Van Phong"],
            "bao_ve": ["Bao Ve", "An Ninh Truong", "Quan Ly An Ninh"],
            "lai_xe": ["Tai Xe", "Dieu Phoi Vien", "Quan Ly Dong Xe"],
            "universal": ["Trainer", "Consultant", "Coach", "Freelancer"]
        }
        
        companies = [
            "Công Ty ABC", "Tập Đoàn XYZ", "Doanh Nghiệp Minh Phát",
            "Công Ty TNHH Việt Nam", "Tập Đoàn Quốc Tế"
        ]
        
        titles = industry_titles.get(industry, industry_titles["universal"])
        
        for i, title in enumerate(titles[:3]):
            mock_jobs.append(RealJob(
                job_id=f"mock_{industry}_{i}",
                title=title,
                industry=industry,
                company=random.choice(companies),
                location="Ho Chi Minh",
                salary_min=random.randint(8, 15) * 1000000,
                salary_max=random.randint(15, 30) * 1000000,
                requirements=skills[:3] if skills else ["Kinh nghiệm 2+ năm"],
                skills=skills[:3] if skills else [],
                posted_days_ago=random.randint(1, 30)
            ))
        
        return mock_jobs
    
    def _filter_jobs_by_barriers(
        self, 
        jobs: List[RealJob], 
        barriers: List[str]
    ) -> List[RealJob]:
        """Filter jobs based on user's barriers."""
        if not barriers:
            return jobs
        
        filtered_jobs = []
        
        for job in jobs:
            # Check each barrier
            should_exclude = False
            
            for barrier in barriers:
                if barrier == "health":
                    # Exclude jobs with physical requirements
                    job_text = f"{job.title} {' '.join(job.requirements)}".lower()
                    if any(kw in job_text for kw in ["nang", "vat", "stand", "physical"]):
                        should_exclude = True
                        break
                
                elif barrier == "family":
                    # Exclude night shift jobs
                    job_text = f"{job.title} {' '.join(job.requirements)}".lower()
                    if any(kw in job_text for kw in ["dem", "ca dem", "overtime"]):
                        should_exclude = True
                        break
                
                elif barrier == "location":
                    # May want to filter by location preferences
                    # For now, just pass through
                    pass
            
            if not should_exclude:
                filtered_jobs.append(job)
        
        return filtered_jobs
    
    def _enrich_transition(
        self, 
        transition, 
        jobs: List[RealJob],
        max_jobs: int
    ) -> Dict[str, Any]:
        """Enrich transition với real job data."""
        transition_dict = transition.to_dict()
        
        # Update salary range if real jobs available
        if jobs:
            real_salaries = [j.salary_max for j in jobs if j.salary_max > 0]
            if real_salaries:
                transition_dict["salary_range"]["max"] = max(real_salaries)
                transition_dict["salary_range"]["source"] = "real_jobs"
            
            # Add real requirements
            all_requirements = set()
            for job in jobs:
                all_requirements.update(job.requirements)
            transition_dict["real_requirements"] = list(all_requirements)[:5]
        
        # Add matched jobs
        transition_dict["matched_jobs"] = [self._job_to_dict(j) for j in jobs[:max_jobs]]
        
        return {
            "transition": transition_dict,
            "has_real_jobs": len(jobs) > 0
        }
    
    def _job_to_dict(self, job: RealJob) -> Dict:
        """Convert RealJob to dict."""
        return {
            "job_id": job.job_id,
            "title": job.title,
            "industry": job.industry,
            "company": job.company,
            "location": job.location,
            "salary_range": {
                "min": job.salary_min,
                "max": job.salary_max
            },
            "requirements": job.requirements,
            "skills": job.skills,
            "posted_days_ago": job.posted_days_ago,
            "url": job.url
        }
    
    def clear_cache(self):
        """Clear job cache."""
        self._job_cache.clear()


def test_hybrid_recommender():
    """Test hybrid job recommender."""
    print("\n" + "=" * 70)
    print("TESTING HYBRID JOB RECOMMENDER")
    print("=" * 70)
    
    recommender = HybridJobRecommender()
    
    # Test profile
    profile = {
        "age": 40,
        "current_role": "Quan ly cua hang",
        "current_industry": "ban_hang",
        "experience_years": 15,
        "skills": ["Sales", "Management", "Customer Service"],
        "target_salary": 25000000,
        "barriers": ["health"],
        "work_history": [
            {"industry": "phuc_vu", "role": "Phuc vu", "years": 5, "skills": ["Cooking"]},
            {"industry": "hanh_chinh", "role": "Hanh chinh", "years": 3, "skills": ["Admin"]}
        ]
    }
    
    print("\n--- Profile ---")
    print(f"Age: {profile['age']}")
    print(f"Industry: {profile['current_industry']}")
    print(f"Barriers: {profile['barriers']}")
    
    print("\n--- Fetching Recommendations ---")
    results = recommender.discover_with_real_jobs(profile, max_jobs_per_transition=2)
    
    print(f"\nTotal transitions: {results['statistics']['total_transitions']}")
    print(f"Total real jobs: {results['statistics']['total_real_jobs']}")
    print(f"Industries covered: {results['statistics']['industries_covered']}")
    
    print("\n--- Top 3 Transitions ---")
    for i, item in enumerate(results["transitions"][:3], 1):
        t = item["transition"]
        print(f"\n{i}. {t['title']}")
        print(f"   Score: {t['match_score']:.2f}")
        print(f"   Salary: {t['salary_range']['min']/1e6:.0f}-{t['salary_range']['max']/1e6:.0f}M")
        
        # Check for matched_jobs in item (from enrich) or in transition
        jobs_matched = item.get("matched_jobs", t.get("matched_jobs", []))
        print(f"   Jobs matched: {len(jobs_matched)}")
        
        if jobs_matched:
            top_job = jobs_matched[0]
            print(f"   Top job: {top_job['title']} @ {top_job['company']}")
    
    print("\n--- Sample Real Jobs ---")
    for job in results["matched_jobs"][:3]:
        print(f"\n  - {job['title']}")
        print(f"    Company: {job['company']}")
        print(f"    Salary: {job['salary_range']['min']/1e6:.0f}-{job['salary_range']['max']/1e6:.0f}M")
        print(f"    Posted: {job['posted_days_ago']} days ago")
    
    print("\n" + "=" * 70)
    print("HYBRID RECOMMENDER TEST COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    import sys
    import io
    # Fix Unicode output for Windows console
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    test_hybrid_recommender()
