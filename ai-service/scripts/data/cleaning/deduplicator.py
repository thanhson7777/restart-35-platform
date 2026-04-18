"""
Job Deduplicator - Detect and remove duplicate job postings
"""
from typing import List, Dict, Tuple, Set, Optional
from dataclasses import dataclass
from collections import defaultdict
import re

try:
    from rapidfuzz import fuzz, process
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    RAPIDFUZZ_AVAILABLE = False


@dataclass
class DuplicateGroup:
    """Group of duplicate jobs"""
    canonical_id: str
    duplicate_ids: List[str]
    similarity_score: float
    reason: str


class JobDeduplicator:
    """
    Detect and remove duplicate job postings using multi-stage deduplication:
    1. Exact match (title + company + location)
    2. Fuzzy match (Levenshtein similarity)
    3. URL match (same source URL)
    """
    
    EXACT_MATCH_THRESHOLD = 1.0  # 100% match
    FUZZY_MATCH_THRESHOLD = 0.92  # 92% similarity
    TITLE_WEIGHT = 0.5
    COMPANY_WEIGHT = 0.3
    LOCATION_WEIGHT = 0.2
    
    def __init__(self):
        self.rapidfuzz_available = RAPIDFUZZ_AVAILABLE
        if not RAPIDFUZZ_AVAILABLE:
            import warnings
            warnings.warn("rapidfuzz not installed. Install with: pip install rapidfuzz")
    
    def normalize_for_comparison(self, text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s]', '', text)
        return text
    
    def exact_match(self, job1: Dict, job2: Dict) -> bool:
        """Check if two jobs are exactly the same"""
        title1 = self.normalize_for_comparison(job1.get('title', ''))
        title2 = self.normalize_for_comparison(job2.get('title', ''))
        company1 = self.normalize_for_comparison(job1.get('company', ''))
        company2 = self.normalize_for_comparison(job2.get('company', ''))
        location1 = self.normalize_for_comparison(job1.get('location', ''))
        location2 = self.normalize_for_comparison(job2.get('location', ''))
        
        return (title1 == title2 and 
                company1 == company2 and 
                location1 == location2)
    
    def fuzzy_match(self, job1: Dict, job2: Dict) -> float:
        """
        Calculate fuzzy similarity between two jobs
        Returns score between 0 and 1
        """
        if not self.rapidfuzz_available:
            return self._simple_fuzzy_match(job1, job2)
        
        title1 = self.normalize_for_comparison(job1.get('title', ''))
        title2 = self.normalize_for_comparison(job2.get('title', ''))
        company1 = self.normalize_for_comparison(job1.get('company', ''))
        company2 = self.normalize_for_comparison(job2.get('company', ''))
        location1 = self.normalize_for_comparison(job1.get('location', ''))
        location2 = self.normalize_for_comparison(job2.get('location', ''))
        
        title_sim = fuzz.ratio(title1, title2) / 100
        company_sim = fuzz.ratio(company1, company2) / 100
        location_sim = fuzz.ratio(location1, location2) / 100
        
        total_sim = (title_sim * self.TITLE_WEIGHT + 
                     company_sim * self.COMPANY_WEIGHT + 
                     location_sim * self.LOCATION_WEIGHT)
        
        return total_sim
    
    def _simple_fuzzy_match(self, job1: Dict, job2: Dict) -> float:
        """Simple fuzzy match without rapidfuzz"""
        def simple_ratio(s1, s2):
            if not s1 and not s2:
                return 1.0
            if not s1 or not s2:
                return 0.0
            
            s1 = self.normalize_for_comparison(s1)
            s2 = self.normalize_for_comparison(s2)
            
            if s1 == s2:
                return 1.0
            
            longer = max(len(s1), len(s2))
            if longer == 0:
                return 1.0
            
            return 1 - (abs(len(s1) - len(s2)) / longer)
        
        title_sim = simple_ratio(job1.get('title', ''), job2.get('title', ''))
        company_sim = simple_ratio(job1.get('company', ''), job2.get('company', ''))
        location_sim = simple_ratio(job1.get('location', ''), job2.get('location', ''))
        
        return (title_sim * self.TITLE_WEIGHT + 
                company_sim * self.COMPANY_WEIGHT + 
                location_sim * self.LOCATION_WEIGHT)
    
    def url_match(self, job1: Dict, job2: Dict) -> bool:
        """Check if two jobs have the same source URL"""
        url1 = job1.get('source_url', job1.get('url', '')).strip().lower()
        url2 = job2.get('source_url', job2.get('url', '')).strip().lower()
        
        if not url1 or not url2:
            return False
        
        return url1 == url2
    
    def find_duplicates(self, jobs: List[Dict], job_id_field: str = 'id') -> List[DuplicateGroup]:
        """
        Find all duplicate groups in job list
        
        Args:
            jobs: List of job dictionaries
            job_id_field: Field name for job ID
        
        Returns:
            List of DuplicateGroup objects
        """
        duplicate_groups = []
        processed_ids = set()
        n = len(jobs)
        
        for i in range(n):
            job1 = jobs[i]
            id1 = job1.get(job_id_field)
            
            if id1 in processed_ids:
                continue
            
            duplicates = []
            duplicate_ids = [id1]
            
            for j in range(i + 1, n):
                job2 = jobs[j]
                id2 = job2.get(job_id_field)
                
                if id2 in processed_ids:
                    continue
                
                is_duplicate = False
                similarity = 0.0
                reason = ""
                
                if self.url_match(job1, job2):
                    is_duplicate = True
                    similarity = 1.0
                    reason = "Same source URL"
                elif self.exact_match(job1, job2):
                    is_duplicate = True
                    similarity = 1.0
                    reason = "Exact match (title + company + location)"
                else:
                    sim = self.fuzzy_match(job1, job2)
                    if sim >= self.FUZZY_MATCH_THRESHOLD:
                        is_duplicate = True
                        similarity = sim
                        reason = f"Fuzzy match ({sim:.1%} similarity)"
                
                if is_duplicate:
                    duplicates.append((id2, similarity, reason))
                    processed_ids.add(id2)
            
            if duplicates:
                total_sim = sum(d[1] for d in duplicates) / len(duplicates)
                duplicate_groups.append(DuplicateGroup(
                    canonical_id=id1,
                    duplicate_ids=[d[0] for d in duplicates],
                    similarity_score=total_sim,
                    reason=reason
                ))
        
        return duplicate_groups
    
    def deduplicate(self, jobs: List[Dict], job_id_field: str = 'id', 
                    keep_latest: bool = True) -> Tuple[List[Dict], List[DuplicateGroup]]:
        """
        Remove duplicate jobs, keeping the best one
        
        Args:
            jobs: List of job dictionaries
            job_id_field: Field name for job ID
            keep_latest: If True, keep job with latest scraped_at date
        
        Returns:
            Tuple of (cleaned_jobs, duplicate_groups)
        """
        duplicate_groups = self.find_duplicates(jobs, job_id_field)
        
        duplicate_ids = set()
        for group in duplicate_groups:
            duplicate_ids.update(group.duplicate_ids)
        
        if keep_latest:
            duplicate_map = {job.get(job_id_field): job for job in jobs}
            
            for group in duplicate_groups:
                canonical = duplicate_map.get(group.canonical_id)
                if not canonical:
                    continue
                
                canonical_time = canonical.get('scraped_at', '')
                
                for dup_id in group.duplicate_ids:
                    dup_job = duplicate_map.get(dup_id)
                    if dup_job:
                        dup_time = dup_job.get('scraped_at', '')
                        if dup_time > canonical_time:
                            duplicate_ids.discard(dup_id)
                            duplicate_ids.add(group.canonical_id)
                            group.canonical_id = dup_id
                            canonical_time = dup_time
        
        cleaned_jobs = [job for job in jobs if job.get(job_id_field) not in duplicate_ids]
        
        return cleaned_jobs, duplicate_groups
    
    def get_duplicate_stats(self, duplicate_groups: List[DuplicateGroup]) -> Dict:
        """Get statistics about duplicates"""
        if not duplicate_groups:
            return {
                'total_groups': 0,
                'total_duplicates': 0,
                'avg_similarity': 0.0,
                'max_group_size': 0
            }
        
        total_duplicates = sum(len(g.duplicate_ids) for g in duplicate_groups)
        avg_similarity = sum(g.similarity_score for g in duplicate_groups) / len(duplicate_groups)
        max_group_size = max(len(g.duplicate_ids) for g in duplicate_groups)
        
        return {
            'total_groups': len(duplicate_groups),
            'total_duplicates': total_duplicates,
            'avg_similarity': avg_similarity,
            'max_group_size': max_group_size
        }


# Singleton instance
_deduplicator = None


def get_deduplicator() -> JobDeduplicator:
    """Get singleton deduplicator instance"""
    global _deduplicator
    if _deduplicator is None:
        _deduplicator = JobDeduplicator()
    return _deduplicator
