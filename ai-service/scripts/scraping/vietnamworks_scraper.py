# -*- coding: utf-8 -*-
"""
VietnamWorks Scraper - Cào dữ liệu việc làm từ vietnamworks.com

VietnamWorks là một trong những trang tuyển dụng lớn nhất Việt Nam,
cung cấp hàng nghìn việc làm mỗi ngày.

Website: https://vietnamworks.com
Expected output: ~2000 jobs/ngày (70% success rate)

Author: Restart-35 Platform
Last Updated: 2026-04-13
"""

import re
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import urlencode, quote_plus

from bs4 import BeautifulSoup

from base_scraper import BaseScraper, ScraperError


class VietnamWorksScraper(BaseScraper):
    """
    Scraper cho VietnamWorks
    
    Trang chủ: https://vietnamworks.com
    Search URL: https://www.vietnamworks.com/viec-lam/all-jobs
    
    Lưu ý:
    - VietnamWorks sử dụng JavaScript rendering nên có thể cần Playwright
    - Tuy nhiên, trang search có API endpoint có thể scrape được
    """
    
    # Base URL cho search
    BASE_URL = 'https://www.vietnamworks.com'
    SEARCH_URL = 'https://www.vietnamworks.com/viec-lam/all-jobs'
    
    # API endpoint (nếu có)
    API_URL = 'https://www.vietnamworks.com/api/search'
    
    # Các selectors CSS cho job listings
    # Lưu ý: Selectors này cần được verify khi website thay đổi
    SELECTORS = {
        # Job card container
        'job_card': [
            '.job-item',
            '.search-result-item',
            '[data-job-id]',
            '.job-search-result-item',
        ],
        
        # Job title
        'title': [
            '.job-title',
            '.title a',
            'h3.title a',
            '[class*="job-title"]',
        ],
        
        # Company name
        'company': [
            '.company-name',
            '.employer-name',
            '[class*="company"]',
        ],
        
        # Salary
        'salary': [
            '.salary',
            '[class*="salary"]',
            '.job-salary',
        ],
        
        # Location
        'location': [
            '.location',
            '[class*="location"]',
            '.address',
        ],
        
        # Job type
        'job_type': [
            '.job-type',
            '[class*="type"]',
            '.employment-type',
        ],
        
        # Experience required
        'experience': [
            '.experience',
            '[class*="experience"]',
            '.years-experience',
        ],
        
        # Education
        'education': [
            '.education',
            '[class*="education"]',
            '.academic-level',
        ],
        
        # Description/Excerpt
        'description': [
            '.description',
            '.excerpt',
            '[class*="desc"]',
        ],
        
        # Skills tags
        'skills': [
            '.skills a',
            '.tags a',
            '[class*="skill"]',
            '.keyword-tags a',
        ],
        
        # Age preference (nếu có)
        'age': [
            '[class*="age"]',
            '.requirement-age',
        ],
        
        # Posted date
        'posted_date': [
            '.posted-date',
            '.date-posted',
            '[class*="posted"]',
            '.time-ago',
        ],
        
        # Job link
        'job_link': [
            '.job-title a',
            'h3 a',
            '.job-item a',
        ],
    }
    
    def __init__(
        self,
        delay: float = 3.0,
        max_retries: int = 3,
        timeout: int = 30
    ):
        """
        Khởi tạo VietnamWorks Scraper
        
        Args:
            delay: Delay giữa các requests (giây)
            max_retries: Số lần retry khi thất bại
            timeout: Timeout cho request (giây)
        """
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout
        )
        
        self.logger = logging.getLogger(__name__)
        
        # Thêm Accept-Language header cho tiếng Việt
        self.session.headers.update({
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        })
    
    def get_source_name(self) -> str:
        """Trả về tên nguồn dữ liệu"""
        return 'VietnamWorks'
    
    def _find_element_by_selectors(self, soup: BeautifulSoup, selectors: List[str]) -> Optional[Any]:
        """
        Thử tìm element với nhiều selectors
        
        Args:
            soup: BeautifulSoup object
            selectors: List các CSS selectors
            
        Returns:
            Element đầu tiên tìm được hoặc None
        """
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return element
        return None
    
    def _find_all_elements_by_selectors(self, soup: BeautifulSoup, selectors: List[str]) -> List:
        """
        Thử tìm tất cả elements với nhiều selectors
        
        Args:
            soup: BeautifulSoup object
            selectors: List các CSS selectors
            
        Returns:
            List các elements tìm được
        """
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                return elements
        return []
    
    def _parse_salary(self, salary_text: str) -> tuple:
        """
        Parse salary text thành min/max values
        
        Args:
            salary_text: Text chứa salary (ví dụ: "8 - 15 triệu", "25-40 triệu")
            
        Returns:
            Tuple (salary_min, salary_max) trong VND
        """
        if not salary_text:
            return 0, 0
        
        # Clean text - normalize spaces and common separators
        text = re.sub(r'[\s,]+', ' ', salary_text.lower()).strip()
        
        # Các patterns để match salary - ORDER MATTERS! (specific to general)
        patterns = [
            # "8 - 15 triệu" hoặc "8-15 triệu" (range with space)
            (r'([\d.]+)\s*[-–to]+\s*([\d.]+)\s*(?:tr|iệu|m)', 'range'),
            # "8 triệu" or "8triệu" (single value with unit)
            (r'([\d.]+)\s*(?:tr|iệu|m)', 'single'),
            # "25,000,000" (number with comma - VND format)
            (r'([\d,]+)', 'number'),
            # "$1000-2000" (USD range)
            (r'\$?([\d.]+)\s*[-–]\s*\$?([\d.]+)', 'usd_range'),
            # "$1000" (single USD)
            (r'\$?([\d.]+)', 'usd_single'),
        ]
        
        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                if pattern_type == 'range' and len(matches[0]) == 2:
                    min_val = float(matches[0][0])
                    max_val = float(matches[0][1])
                    # Chuyển đổi sang VND nếu nhỏ hơn 1000
                    if min_val < 1000:
                        min_val *= 1_000_000
                    if max_val < 1000:
                        max_val *= 1_000_000
                    return int(min_val), int(max_val)
                    
                elif pattern_type == 'single':
                    val = float(matches[0])
                    if val < 1000:
                        val *= 1_000_000
                    return int(val), int(val)
                    
                elif pattern_type == 'number':
                    val_str = matches[0].replace(',', '')
                    try:
                        val = float(val_str)
                        # If value is small (like 25), it's likely already in VND without commas properly parsed
                        # Large values like 25000000 should be returned as-is
                        return int(val), int(val)
                    except ValueError:
                        continue
                        
                elif pattern_type == 'usd_range' and len(matches[0]) == 2:
                    # USD to VND (approximate rate: 1 USD = 25,000 VND)
                    min_val = float(matches[0][0]) * 25_000
                    max_val = float(matches[0][1]) * 25_000
                    return int(min_val), int(max_val)
                    
                elif pattern_type == 'usd_single':
                    val = float(matches[0]) * 25_000
                    return int(val), int(val)
        
        return 0, 0
    
    def _parse_job_type(self, type_text: str) -> str:
        """
        Map job type text sang chuẩn của hệ thống
        
        Args:
            type_text: Text về loại công việc
            
        Returns:
            Job type chuẩn: full-time, part-time, temporary, freelance
        """
        if not type_text:
            return 'full-time'
        
        text = type_text.lower().strip()
        
        # Mapping cho các loại job
        type_mappings = {
            'full-time': ['full time', 'full-time', 'toàn thời gian', 'chính thức', 'permanent'],
            'part-time': ['part time', 'part-time', 'bán thời gian', 'parttime'],
            'temporary': ['temporary', 'tạm thời', 'theo hợp đồng', 'contract', 'seasonal'],
            'freelance': ['freelance', 'freelancer', 'tự do', 'remote', 'từ xa'],
        }
        
        for standard_type, keywords in type_mappings.items():
            for keyword in keywords:
                if keyword in text:
                    return standard_type
        
        return 'full-time'  # Default
    
    def _parse_experience(self, exp_text: str) -> int:
        """
        Parse experience text thành số năm
        
        Args:
            exp_text: Text về kinh nghiệm (ví dụ: "2-3 năm", "5 years")
            
        Returns:
            Số năm kinh nghiệm
        """
        if not exp_text:
            return 0
        
        text = exp_text.lower()
        
        # Tìm số trong text
        numbers = re.findall(r'(\d+)', text)
        if numbers:
            # Lấy số đầu tiên
            return int(numbers[0])
        
        # Check cho "không yêu cầu" hoặc "fresh graduate"
        if any(kw in text for kw in ['không', 'no experience', 'fresh', 'không yêu cầu']):
            return 0
        
        return 0
    
    def _parse_education(self, edu_text: str) -> str:
        """
        Map education text sang chuẩn của hệ thống
        
        Args:
            edu_text: Text về trình độ học vấn
            
        Returns:
            Education level chuẩn
        """
        if not edu_text:
            return 'none'
        
        text = edu_text.lower()
        
        edu_mappings = {
            'none': ['không', 'no requirement', 'không yêu cầu'],
            'primary': ['tiểu học', 'primary'],
            'middle': ['trung học', 'thcs', 'secondary'],
            'high': ['thpt', 'trung học phổ thông', 'high school', '12/12'],
            'vocational': ['trung cấp', 'cao đẳng nghề', 'vocational'],
            'college': ['cao đẳng', 'college'],
            'university': ['đại học', 'university', 'cử nhân', 'thạc sĩ', 'phó tiến sĩ', 'tiến sĩ', 'master', 'phd', 'bachelor'],
        }
        
        for level, keywords in edu_mappings.items():
            for keyword in keywords:
                if keyword in text:
                    return level
        
        return 'high'  # Default assumption
    
    def _parse_age_preference(self, age_text: str) -> str:
        """
        Parse age preference text
        
        Args:
            age_text: Text về độ tuổi yêu cầu
            
        Returns:
            Age preference: <35, <40, <45, <50, <55, any
        """
        if not age_text:
            return 'any'
        
        text = age_text.lower()
        
        # Tìm số tuổi
        numbers = re.findall(r'(\d+)', text)
        if numbers:
            age = int(numbers[0])
            
            # Xác định threshold
            if age <= 35:
                return '<35'
            elif age <= 40:
                return '<40'
            elif age <= 45:
                return '<45'
            elif age <= 50:
                return '<50'
            elif age <= 55:
                return '<55'
            else:
                return 'any'
        
        if 'không giới hạn' in text or 'any' in text or 'tất cả' in text:
            return 'any'
        
        return 'any'
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """
        Extract skills từ text
        
        Args:
            text: Text chứa skills
            
        Returns:
            List các skills
        """
        if not text:
            return []
        
        # Common skill patterns
        skill_patterns = [
            'excel', 'word', 'powerpoint', 'outlook',
            'python', 'java', 'javascript', 'sql', 'html', 'css',
            'photoshop', 'illustrator', 'design',
            'bán hàng', 'chăm sóc khách hàng', 'telesale',
            'lái xe', 'forklift', 'xe nâng',
            'kế toán', 'hr', 'nhân sự',
            'marketing', 'seo', 'facebook', 'content',
            'tiếng anh', 'english', 'tiếng nhật', 'japanese',
            'quản lý', 'management', 'leadership',
            'communication', ' teamwork', 'teamwork',
            'erp', 'sap', 'accounting',
            'warehouse', 'kho vận', 'logistics',
            'production', 'sản xuất', 'qc', 'quality',
            'security', 'bảo vệ', 'guard',
            'nấu ăn', 'cooking', 'chef',
            'phục vụ', 'service', 'receptionist',
            'cleaning', 'lao công', 'giúp việc',
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in skill_patterns:
            if skill in text_lower:
                # Clean và format skill name
                skill_name = skill.title()
                if skill_name not in found_skills:
                    found_skills.append(skill_name)
        
        return found_skills
    
    def _parse_job_card(self, card) -> Optional[Dict[str, Any]]:
        """
        Parse một job card element thành dict
        
        Args:
            card: BeautifulSoup element của job card
            
        Returns:
            Dict chứa job data hoặc None nếu parse fail
        """
        try:
            # Extract various fields
            title_elem = self._find_element_by_selectors(card, self.SELECTORS['title'])
            company_elem = self._find_element_by_selectors(card, self.SELECTORS['company'])
            salary_elem = self._find_element_by_selectors(card, self.SELECTORS['salary'])
            location_elem = self._find_element_by_selectors(card, self.SELECTORS['location'])
            job_type_elem = self._find_element_by_selectors(card, self.SELECTORS['job_type'])
            experience_elem = self._find_element_by_selectors(card, self.SELECTORS['experience'])
            education_elem = self._find_element_by_selectors(card, self.SELECTORS['education'])
            description_elem = self._find_element_by_selectors(card, self.SELECTORS['description'])
            skills_elems = self._find_all_elements_by_selectors(card, self.SELECTORS['skills'])
            age_elem = self._find_element_by_selectors(card, self.SELECTORS['age'])
            link_elem = self._find_element_by_selectors(card, self.SELECTORS['job_link'])
            
            # Get text content
            title = title_elem.get_text(strip=True) if title_elem else ''
            company = company_elem.get_text(strip=True) if company_elem else ''
            salary_text = salary_elem.get_text(strip=True) if salary_elem else ''
            location = location_elem.get_text(strip=True) if location_elem else ''
            job_type_text = job_type_elem.get_text(strip=True) if job_type_elem else ''
            experience_text = experience_elem.get_text(strip=True) if experience_elem else ''
            education_text = education_elem.get_text(strip=True) if education_elem else ''
            description = description_elem.get_text(strip=True) if description_elem else ''
            age_text = age_elem.get_text(strip=True) if age_elem else ''
            
            # Get job link
            job_url = ''
            if link_elem:
                job_url = link_elem.get('href', '')
                if job_url and not job_url.startswith('http'):
                    job_url = self.BASE_URL + job_url
            
            # Extract skills from tags
            skills = [elem.get_text(strip=True) for elem in skills_elems if elem.get_text(strip=True)]
            
            # If no explicit skills, try to extract from description
            if not skills and description:
                skills = self._extract_skills_from_text(description)
            
            # Parse salary
            salary_min, salary_max = self._parse_salary(salary_text)
            
            # Parse other fields
            job_type = self._parse_job_type(job_type_text)
            experience = self._parse_experience(experience_text)
            education = self._parse_education(education_text)
            age_preference = self._parse_age_preference(age_text)
            
            # Build result
            job = {
                'source': 'VietnamWorks',
                'title': title,
                'company': company,
                'location': location,
                'salary_text': salary_text,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'type': job_type,
                'experience_required': experience,
                'education_required': education,
                'age_preference': age_preference,
                'skills': '|'.join(skills) if skills else '',
                'description': description[:500] if description else '',  # Limit length
                'job_url': job_url,
                'scraped_at': None,  # Will be filled by transformer
            }
            
            # Validate required fields
            if not job['title']:
                self.logger.warning("Skipping job: no title found")
                return None
            
            self.stats['jobs_found'] += 1
            return job
            
        except Exception as e:
            self.logger.error(f"Error parsing job card: {e}")
            return None
    
    def scrape_search_page(self, page: int = 1, keywords: str = '') -> List[Dict[str, Any]]:
        """
        Scrape một trang search results
        
        Args:
            page: Số trang
            keywords: Từ khóa tìm kiếm
            
        Returns:
            List các jobs từ trang này
        """
        jobs = []
        
        # Build URL với query params
        params = {
            'page': page,
            'sort': 'recent',
        }
        
        if keywords:
            params['keywords'] = keywords
        
        # Build full URL
        url = self.SEARCH_URL
        if params:
            url += '?' + urlencode(params, quote_via=quote_plus)
        
        self.logger.info(f"Scraping page {page}: {url}")
        
        # Fetch page
        html = self.fetch_page(url)
        if not html:
            self.logger.error(f"Failed to fetch page {page}")
            return jobs
        
        # Parse HTML
        soup = self.parse_html(html)
        
        # Find job cards với nhiều selectors
        job_cards = []
        for selector in self.SELECTORS['job_card']:
            cards = soup.select(selector)
            if cards:
                job_cards = cards
                self.logger.info(f"Found {len(cards)} job cards with selector: {selector}")
                break
        
        if not job_cards:
            # Thử alternative selectors
            alt_selectors = [
                '.job-listing',
                '.jobs-list .job',
                'article.job',
                '.search-results .item',
                'div[class*="job"]',
            ]
            for selector in alt_selectors:
                cards = soup.select(selector)
                if cards:
                    job_cards = cards
                    self.logger.info(f"Found {len(cards)} with alternative selector: {selector}")
                    break
        
        # Parse mỗi job card
        for card in job_cards:
            job = self._parse_job_card(card)
            if job:
                jobs.append(job)
        
        self.logger.info(f"Parsed {len(jobs)} jobs from page {page}")
        
        return jobs
    
    def scrape_by_category(self, category: str, pages: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape jobs theo category
        
        Args:
            category: Tên category
            pages: Số trang cần scrape
            
        Returns:
            List các jobs
        """
        jobs = []
        
        # Category URLs (VietnamWorks categories)
        category_urls = {
            'it': 'https://www.vietnamworks.com/viec-lam-it',
            'kinh-doanh': 'https://www.vietnamworks.com/viec-lam-kinh-doanh-ban-hang',
            'ke-toan': 'https://www.vietnamworks.com/viec-lam-ke-toan-kiem-toan',
            'nhan-su': 'https://www.vietnamworks.com/viec-lam-nhan-su',
            'marketing': 'https://www.vietnamworks.com/viec-lam-marketing-truyen-thong',
            'san-xuat': 'https://www.vietnamworks.com/viec-lam-san-xuat',
            'lao-dong': 'https://www.vietnamworks.com/viec-lam-lao-dong-pho-thong',
            'hanh-chinh': 'https://www.vietnamworks.com/viec-lam-hanh-chinh-van-phong',
            'dich-vu': 'https://www.vietnamworks.com/viec-lam-dich-vu',
            'xay-dung': 'https://www.vietnamworks.com/viec-lam-xay-dung',
        }
        
        base_url = category_urls.get(category.lower())
        if not base_url:
            self.logger.warning(f"Unknown category: {category}")
            return jobs
        
        for page in range(1, pages + 1):
            url = f"{base_url}?page={page}"
            self.logger.info(f"Scraping {category} page {page}: {url}")
            
            html = self.fetch_page(url)
            if not html:
                continue
            
            soup = self.parse_html(html)
            job_cards = []
            
            for selector in self.SELECTORS['job_card']:
                job_cards = soup.select(selector)
                if job_cards:
                    break
            
            for card in job_cards:
                job = self._parse_job_card(card)
                if job:
                    jobs.append(job)
        
        return jobs
    
    def scrape_all(self, pages: int = 10, keywords: str = '') -> List[Dict[str, Any]]:
        """
        Scrape tất cả jobs từ nhiều trang
        
        Args:
            pages: Số trang cần scrape
            keywords: Từ khóa tìm kiếm (để trống = tất cả)
            
        Returns:
            List tất cả jobs đã scrape
        """
        all_jobs = []
        
        for page in range(1, pages + 1):
            jobs = self.scrape_search_page(page=page, keywords=keywords)
            
            if not jobs:
                self.logger.warning(f"No jobs found on page {page}, stopping...")
                break
            
            all_jobs.extend(jobs)
            
            # Log progress
            self.logger.info(f"Page {page}: {len(jobs)} jobs, Total: {len(all_jobs)}")
        
        self.logger.info(f"Scraping complete. Total jobs: {len(all_jobs)}")
        return all_jobs
    
    def scrape_by_jobs_list(self, job_urls: List[str]) -> List[Dict[str, Any]]:
        """
        Scrape chi tiết jobs từ list URLs
        
        Args:
            job_urls: List các job detail URLs
            
        Returns:
            List các jobs với chi tiết đầy đủ
        """
        jobs = []
        
        for url in job_urls:
            self.logger.info(f"Scraping job: {url}")
            
            html = self.fetch_page(url)
            if not html:
                continue
            
            soup = self.parse_html(html)
            
            # Extract full details
            job = {
                'source': 'VietnamWorks',
                'title': soup.select_one('h1') or '',
                'company': '',
                'location': '',
                'salary_min': 0,
                'salary_max': 0,
                'type': 'full-time',
                'experience_required': 0,
                'education_required': 'high',
                'age_preference': 'any',
                'skills': '',
                'description': '',
                'job_url': url,
            }
            
            # Find company
            company_elem = soup.select_one('[class*="company"]')
            if company_elem:
                job['company'] = company_elem.get_text(strip=True)
            
            # Find salary
            salary_elem = soup.select_one('[class*="salary"]')
            if salary_elem:
                salary_text = salary_elem.get_text(strip=True)
                job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)
            
            # Find description
            desc_elem = soup.select_one('[class*="description"], [class*="content"]')
            if desc_elem:
                job['description'] = desc_elem.get_text(strip=True)[:1000]
            
            # Find skills
            skills_elems = soup.select('[class*="skill"], [class*="tag"] a')
            if skills_elems:
                job['skills'] = '|'.join([e.get_text(strip=True) for e in skills_elems])
            
            jobs.append(job)
            self.stats['jobs_found'] += 1
        
        return jobs
    
    def scrape(self, pages: int = 10, keywords: str = '', **kwargs) -> List[Dict[str, Any]]:
        """
        Main scrape method - implemented từ base class
        
        Args:
            pages: Số trang cần scrape
            keywords: Từ khóa tìm kiếm
            **kwargs: Các arguments khác
            
        Returns:
            List các jobs đã scrape
        """
        return self.scrape_all(pages=pages, keywords=keywords)
