# -*- coding: utf-8 -*-
"""
VietnamWorks Scraper (v2) - Cào dữ liệu việc làm từ VietnamWorks API

Phát hiện mới (2026-06-09):
- API: POST https://ms.vietnamworks.com/job-search/v1.0/search (vẫn hoạt động!)
- API trả jobUrl đúng format: https://www.vietnamworks.com/{alias}--{jobId}-{suffix}
- Response: {meta: {code, message, nbHits, page, nbPages, hitsPerPage}, data: [jobs]}
- 11014+ jobs available

Điểm quan trọng:
- jobUrl đã là URL tuyệt đối đầy đủ - dùng trực tiếp
- skills là list of objects: [{"key": "Python", "doc_count": 100}]
- benefits là list of objects: [{"benefitId": 1, "benefitName": "BHXH", "benefitValue": ""}]
- locations là list of objects: [{"locationId": 1, "cityName": "Hà Nội"}]

Author: Restart-35 Platform
Last Updated: 2026-06-09
"""

import re
import time
import logging
from typing import List, Dict, Any, Optional

from base_scraper import BaseScraper, ScraperError


class VietnamWorksV2Scraper(BaseScraper):
    """
    Scraper mới cho VietnamWorks dùng internal API v2.
    
    API: POST https://ms.vietnamworks.com/job-search/v1.0/search
    Method: POST
    Body: {"query": "", "page": 0, "hitsPerPage": 50}
    Response: {"meta": {...}, "data": [jobs]}
    
    Các field quan trọng trong response:
    - jobId, jobTitle, jobUrl, alias, companyName, companyLogo
    - locations (list of {locationId, cityName}), workingLocations
    - salaryMin, salaryMax, prettySalary
    - typeWorkingId -> full-time/part-time/etc
    - jobLevelId -> intern/entry/experienced/manager/director
    - skills (list of {key}), benefits (list of {benefitName, benefitValue})
    - jobDescription, jobRequirement, industries
    - yearsOfExperience, highestDegreeId, rangeAge
    - isUrgentJob, isTopPriority, onlineOn, expiredOn
    """

    API_BASE_URL = 'https://ms.vietnamworks.com'
    SEARCH_ENDPOINT = '/job-search/v1.0/search'
    
    # Job type working ID mapping
    JOB_TYPE_MAP = {
        1: 'full-time',
        2: 'part-time',
        3: 'internship',
        4: 'freelance',
        5: 'temporary',
        6: 'other',
        7: 'remote',
    }
    
    # Job level mapping
    JOB_LEVEL_MAP = {
        8: 'intern',
        1: 'entry',
        5: 'experienced',
        7: 'manager',
        3: 'director',
    }

    def __init__(
        self,
        delay: float = 1.0,
        max_retries: int = 3,
        timeout: int = 30,
    ):
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout,
            stealth_mode=True
        )
        
        self.session.headers.update({
            'Accept': 'application/json',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/json',
            'Origin': 'https://www.vietnamworks.com',
            'Referer': 'https://www.vietnamworks.com/tim-viec-lam/tim-tat-ca-viec-lam',
            'X-Requested-With': 'XMLHttpRequest',
        })

    def get_source_name(self) -> str:
        return 'VietnamWorks_V2'

    # ============================================================
    # API Request
    # ============================================================

    def _search_api(
        self,
        query: str = '',
        page: int = 0,
        hits_per_page: int = 50,
    ) -> Optional[Dict]:
        """Gọi VietnamWorks search API v2."""
        url = self.API_BASE_URL + self.SEARCH_ENDPOINT
        
        body = {
            'query': query,
            'page': page,
            'hitsPerPage': min(hits_per_page, 50),
        }
        
        try:
            response = self._request_with_retry(
                url,
                method='POST',
                json=body,
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout=self.timeout
            )
            
            if response and response.status_code == 200:
                try:
                    return response.json()
                except Exception:
                    return None
            
            self.logger.warning(
                f"API request failed: status {response.status_code if response else 'None'}"
            )
            return None
            
        except Exception as e:
            self.logger.error(f"API request error: {e}")
            return None

    def search_jobs(
        self,
        query: str = '',
        page: int = 0,
        hits_per_page: int = 50,
    ) -> List[Dict[str, Any]]:
        """Search jobs qua VietnamWorks API."""
        jobs = []
        
        response = self._search_api(
            query=query,
            page=page,
            hits_per_page=hits_per_page
        )
        
        if not response:
            return jobs
        
        meta = response.get('meta', {})
        if meta.get('code') != 200:
            self.logger.warning(f"API returned code: {meta.get('code')}")
            return jobs
        
        self.logger.debug(
            f"Page {page}: nbHits={meta.get('nbHits')}, "
            f"nbPages={meta.get('nbPages')}"
        )
        
        job_list = response.get('data', [])
        if not job_list:
            return jobs
        
        for item in job_list:
            job = self._parse_job_item(item)
            if job:
                jobs.append(job)
                self.stats['jobs_found'] += 1
        
        return jobs

    def scrape_all(
        self,
        max_pages: int = 20,
        hits_per_page: int = 50,
    ) -> List[Dict[str, Any]]:
        """Scrape tất cả jobs từ VietnamWorks (không query)."""
        all_jobs = []
        
        # Lấy thông tin tổng số
        response = self._search_api(page=0, hits_per_page=1)
        if not response:
            self.logger.error("Failed to get initial response")
            return all_jobs
        
        meta = response.get('meta', {})
        total_hits = meta.get('nbHits', 0)
        nb_pages = min(meta.get('nbPages', 1), max_pages)
        
        self.logger.info(
            f"Total jobs available: {total_hits}, "
            f"will scrape {nb_pages} pages (max {max_pages})"
        )
        
        for page in range(nb_pages):
            self.logger.info(f"Scraping page {page + 1}/{nb_pages}...")
            
            jobs = self.search_jobs(
                page=page,
                hits_per_page=hits_per_page,
            )
            
            if not jobs:
                self.logger.warning(f"No jobs returned from page {page}")
                continue
            
            all_jobs.extend(jobs)
            self.logger.info(
                f"Page {page + 1}: {len(jobs)} jobs, "
                f"Total so far: {len(all_jobs)}"
            )
            
            if page < nb_pages - 1:
                time.sleep(self.delay)
        
        self.logger.info(f"Scraping complete. Total jobs: {len(all_jobs)}")
        return all_jobs

    def scrape_by_query(
        self,
        query: str,
        max_pages: int = 10,
        hits_per_page: int = 50,
    ) -> List[Dict[str, Any]]:
        """Scrape jobs theo query cụ thể."""
        all_jobs = []
        
        response = self._search_api(query=query, page=0, hits_per_page=1)
        if not response:
            return all_jobs
        
        meta = response.get('meta', {})
        total_hits = meta.get('nbHits', 0)
        nb_pages = min(meta.get('nbPages', 1), max_pages)
        
        self.logger.info(
            f"Query '{query}': {total_hits} jobs found, "
            f"scraping {nb_pages} pages"
        )
        
        for page in range(nb_pages):
            jobs = self.search_jobs(
                query=query,
                page=page,
                hits_per_page=hits_per_page,
            )
            all_jobs.extend(jobs)
            
            if page < nb_pages - 1:
                time.sleep(self.delay)
        
        return all_jobs

    def scrape(
        self,
        pages: int = 10,
        keywords: str = '',
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Main scrape method."""
        if keywords:
            return self.scrape_by_query(query=keywords, max_pages=pages)
        else:
            return self.scrape_all(max_pages=pages)

    # ============================================================
    # Parsing Helpers
    # ============================================================

    def _parse_job_item(self, item: Dict) -> Optional[Dict[str, Any]]:
        """Parse một job item từ API response."""
        try:
            # jobUrl đã là URL tuyệt đối - dùng trực tiếp
            # scrapedJobId sẽ được format: scraped_vietnamworks_v2_{jobId}
            # (data_transformer sẽ override id = scraped_{source}_{index})
            # Nên lưu job_id gốc vào _scraped_job_id để import script dùng
            job_url = item.get('jobUrl', '')
            if not job_url:
                alias = item.get('alias', '')
                job_id = item.get('jobId', '')
                if alias and job_id:
                    job_url = f"https://www.vietnamworks.com/{alias}--{job_id}"
            
            title = item.get('jobTitle', '') or item.get('jobtitle', '') or ''
            if not title:
                return None
            
            company = item.get('companyName', '') or ''
            
            # Locations - try multiple fields
            # API trả: locations=None khi query có keyword, dùng nearestGeoLoc
            locations_raw = item.get('locations') or item.get('workingLocations') or []
            if isinstance(locations_raw, list) and locations_raw:
                loc = locations_raw[0]
                if isinstance(loc, dict):
                    location = loc.get('cityName', '') or loc.get('cityNameVI', '') or 'Vietnam'
                else:
                    location = str(loc)
            elif isinstance(locations_raw, dict):
                location = locations_raw.get('cityName', '') or locations_raw.get('cityNameVI', '') or 'Vietnam'
            else:
                # Fallback: nearestGeoLoc hoặc address
                nearest = item.get('nearestGeoLoc', '')
                if nearest:
                    location = nearest
                else:
                    addr = item.get('address', '') or ''
                    location = addr if addr else 'Vietnam'
            
            # Salary
            salary_min = self._parse_salary_value(item.get('salaryMin', 0))
            salary_max = self._parse_salary_value(item.get('salaryMax', 0))
            salary_text = item.get('prettySalary', '') or item.get('salary', '') or ''
            
            # Job type
            type_id = item.get('typeWorkingId', 1)
            job_type = self.JOB_TYPE_MAP.get(type_id, 'full-time')
            
            # Job level
            level_id = item.get('jobLevelId', 0)
            job_level = self.JOB_LEVEL_MAP.get(level_id, 'experienced')
            job_level_text = item.get('jobLevelVI', '') or item.get('jobLevel', '') or job_level
            
            # Experience
            experience = item.get('yearsOfExperience', 0) or 0
            
            # Education
            education_id = item.get('highestDegreeId', 0)
            education = self._map_education(education_id)
            
            # Age preference
            age_text = item.get('rangeAge', '') or ''
            
            # Skills - list of objects: [{"key": "Python", "doc_count": 100}]
            skills_raw = item.get('skills', []) or []
            skills = self._parse_skills(skills_raw)
            
            # Description
            job_desc = item.get('jobDescription', '') or ''
            job_req = item.get('jobRequirement', '') or ''
            description = job_desc
            if job_req and job_req not in job_desc:
                description = f"{job_desc}\n\nYêu cầu:\n{job_req}".strip()
            
            # Benefits - list of objects: [{"benefitId": 1, "benefitName": "BHXH", "benefitValue": ""}]
            benefits_raw = item.get('benefits', []) or []
            if isinstance(benefits_raw, list) and benefits_raw:
                benefit_names = []
                for b in benefits_raw:
                    if isinstance(b, dict):
                        name = b.get('benefitName', '')
                        value = b.get('benefitValue', '')
                        if name:
                            benefit_names.append(f"{name}{': ' + value if value else ''}")
                    elif isinstance(b, str) and b:
                        benefit_names.append(b)
                benefits_text = ', '.join(benefit_names)
            else:
                benefits_text = ''
            
            # Industries
            industries_raw = item.get('industries', []) or item.get('industriesV3', []) or []
            if isinstance(industries_raw, list) and industries_raw:
                ind_names = []
                for ind in industries_raw:
                    if isinstance(ind, dict):
                        name = ind.get('nameVI', '') or ind.get('nameEn', '') or ind.get('name', '')
                        if name:
                            ind_names.append(name)
                    elif isinstance(ind, str):
                        ind_names.append(ind)
                industries_text = '|'.join(ind_names)
            else:
                industries_text = ''
            
            # Posted date
            online_on = item.get('onlineOn', '') or item.get('createdOn', '') or ''
            
            # Expired date
            expired_on = item.get('expiredOn', '') or ''
            
            # Gender
            gender_map = {1: 'male', 2: 'female', 0: 'any'}
            gender_id = item.get('genderId', 0)
            gender = gender_map.get(gender_id, 'any')
            
            # Extra flags
            is_urgent = bool(item.get('isUrgentJob', False))
            is_priority = bool(item.get('isTopPriority', False))
            is_active = bool(item.get('isActive', True))
            
            job = {
                'source': 'VietnamWorks_V2',
                'title': title,
                'company': company,
                'location': location,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'salary_text': salary_text,
                'type': job_type,
                'job_level': job_level,
                'job_level_text': job_level_text,
                'experience_required': experience,
                'education_required': education,
                'age_preference': age_text,
                'gender': gender,
                'skills': '|'.join(skills) if skills else '',
                'description': description[:10000] if description else '',
                'job_url': job_url,
                'job_id': str(item.get('jobId', '')),
                'posted_date': online_on,
                'expired_date': expired_on,
                'benefits': benefits_text,
                'industries': industries_text,
                'is_active': is_active,
                'is_urgent': is_urgent,
                'is_priority': is_priority,
                # Extra
                '_company_logo': item.get('companyLogo', ''),
                '_company_id': item.get('companyId', ''),
                '_company_size': item.get('companySizeVI', '') or item.get('companySize', ''),
                '_company_profile': item.get('companyProfile', ''),
                '_num_applications': item.get('numOfApplications', 0),
            }
            
            return job
            
        except Exception as e:
            self.logger.warning(f"Error parsing job item: {e}")
            return None

    def _parse_salary_value(self, value: Any) -> int:
        """
        Parse salary value to VND.
        VietnamWorks API trả:
        - salaryMin/salaryMax là numbers (USD nếu có $ prefix trong prettySalary)
        - prettySalary chứa currency info: "$ 1,000-2,000 /tháng" = USD
          hoặc "8,000,000 - 15,000,000 đ/tháng" = VND
        """
        if not value or value == 0:
            return 0
        
        raw_num = value
        if isinstance(value, (int, float)):
            raw_num = float(value)
        elif isinstance(value, str):
            try:
                clean = value.replace(',', '').strip()
                raw_num = float(clean)
            except ValueError:
                return 0
        
        if not isinstance(raw_num, (int, float)) or raw_num <= 0:
            return 0
        
        # If the parsed number is < 1000, it's likely USD (e.g., 1000 USD)
        # Convert to VND: 1 USD ≈ 25,000 VND
        if raw_num < 1000:
            return int(raw_num * 25_000)
        
        # If >= 1000, assume it's in VND (or USD if very large)
        # VietnamJobs salaryMax can be in USD (e.g., 200 USD)
        # but salaries in VND are typically 5M-50M VND (5000-50000)
        # If value is between 1000-999, assume VND thousands or USD small
        # For safety: if < 10000, treat as USD; else as VND
        if raw_num < 10000:
            # Likely USD (e.g., 2000 = $2000)
            return int(raw_num * 25_000)
        
        # >= 10000, treat as VND (e.g., 10000000 = 10M VND)
        return int(raw_num)

    def _parse_skills(self, skills_raw: Any) -> List[str]:
        """Parse skills từ list of objects hoặc list of strings."""
        if not skills_raw:
            return []
        
        if isinstance(skills_raw, list):
            skills = []
            for s in skills_raw:
                if isinstance(s, dict):
                    # API v2: {"skillId": 123, "skillName": "Python", "skillWeight": 100}
                    key = s.get('skillName', '') or s.get('key', '') or s.get('name', '')
                    if key:
                        skills.append(key)
                elif isinstance(s, str) and s.strip():
                    skills.append(s.strip())
            return skills
        
        if isinstance(skills_raw, str):
            if '|' in skills_raw:
                return [s.strip() for s in skills_raw.split('|') if s.strip()]
            return [skills_raw.strip()]
        
        return []

    def _map_education(self, degree_id: int) -> str:
        """Map education degree ID to string."""
        edu_map = {
            0: 'none',
            1: 'primary',
            2: 'middle',
            3: 'high',
            4: 'vocational',
            5: 'college',
            6: 'university',
            7: 'master',
            8: 'phd',
        }
        return edu_map.get(degree_id, 'high')


def main():
    """Test scraper."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    scraper = VietnamWorksV2Scraper(delay=1.0, max_retries=3)
    
    print("Testing VietnamWorks V2 Scraper...")
    print("=" * 50)
    
    # Test 1 page
    print("\n--- Test: Scrape 2 pages ---")
    jobs = scraper.scrape_all(max_pages=2, hits_per_page=20)
    
    print(f"\nTotal jobs scraped: {len(jobs)}")
    
    if jobs:
        print("\n--- Sample job ---")
        sample = jobs[0]
        for key, value in sample.items():
            if not key.startswith('_'):
                print(f"  {key}: {str(value)[:100]}")
    
    scraper.print_stats()
    
    return jobs


if __name__ == '__main__':
    main()
