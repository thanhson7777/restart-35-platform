# -*- coding: utf-8 -*-
"""
Script 3b: Job Enrichment với Gemini API
=========================================
Enrich jobs data bằng Gemini API (MIỄN PHÍ với free tier)

Trích xuất:
1. Job descriptions ngắn gọn
2. Required skills extracted
3. Experience level
4. Work environment
5. Benefits/perks

Input:  data/jobs_cleaned.csv
Output: data/jobs_enriched.csv

Author: Thanh Sơn
Date: 2026-04-19
"""

import os
import sys

# Load .env FIRST
_env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
if os.path.exists(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip().strip("'\"")

import json
import time
import pandas as pd
import logging
import requests
from typing import Dict, List, Optional
from datetime import datetime

# Config logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# GEMINI CLIENT (Inline)
# ============================================================================

class GeminiClient:
    """Minimal Gemini Client for enrichment"""
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
    MODEL = "gemini-2.0-flash"  # Fast, cheap, good at Vietnamese
    
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.model = model or self.MODEL
        
        if not self.api_key:
            logger.error("GEMINI_API_KEY not found!")
            raise ValueError("GEMINI_API_KEY required")
    
    def chat(self, prompt: str, temperature: float = 0.3, max_tokens: int = 500) -> dict:
        """Send chat request to Gemini API"""
        url = f"{self.BASE_URL}/{self.model}:generateContent"
        
        params = {
            "key": self.api_key
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        
        response = requests.post(
            url,
            params=params,
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code != 200:
            error_msg = response.text
            logger.error(f"API error {response.status_code}: {error_msg[:200]}")
            return {}
        
        result = response.json()
        
        # Extract text from response
        if 'candidates' in result and len(result['candidates']) > 0:
            content = result['candidates'][0].get('content', {})
            parts = content.get('parts', [])
            if parts and 'text' in parts[0]:
                return {'text': parts[0]['text']}
        
        return {}


# ============================================================================
# PROMPT TEMPLATES
# ============================================================================

EXTRACTION_PROMPT = """Bạn là chuyên gia phân tích việc làm Việt Nam.

Trích xuất thông tin từ job sau và trả JSON:

{{
    "description_short": "Mô tả ngắn 100-150 ký tự, dễ hiểu cho người 35+",
    "required_skills": ["skill1", "skill2", "skill3"],
    "experience_level": "junior|mid|senior|executive",
    "work_environment": "office|remote|hybrid|field",
    "job_summary": "1 câu tóm tắt vai trò chính",
    "benefits": ["bảo hiểm", "thưởng", "đào tạo", "khác"]
}}

THÔNG TIN JOB:
- Title: {title}
- Company: {company}
- Description: {description}
- Requirements: {requirements}
- Skills: {skills}

QUY TẮC:
- required_skills: tối đa 5 skills phổ biến nhất, lowercase, không dấu
- experience_level: junior(<2yr), mid(2-5yr), senior(5-10yr), executive(>10yr)
- benefits: các phúc lợi có trong job (bảo hiểm, thưởng, lương tháng 13, etc)
- Trả lời CHỈ JSON, không có gì khác
"""


# ============================================================================
# CONSTANTS
# ============================================================================

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_INPUT_PATH = os.path.join(AI_SERVICE_DIR, 'data', 'jobs_cleaned.csv')
DEFAULT_OUTPUT_PATH = os.path.join(AI_SERVICE_DIR, 'data', 'jobs_enriched.csv')

RATE_LIMIT_DELAY = 2.0  # Gemini allows 15 req/min


# ============================================================================
# JOB ENRICHER CLASS
# ============================================================================

class JobEnricher:
    """Enrich job data using Gemini LLM"""
    
    def __init__(self):
        self.client = GeminiClient()
        self.stats = {
            'total': 0,
            'enriched': 0,
            'failed': 0,
            'api_calls': 0
        }
    
    def enrich_job(self, job: Dict) -> Dict:
        """Enrich a single job with LLM-generated fields"""
        
        def safe_str(val, max_len=500):
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return ''
            return str(val)[:max_len]
        
        prompt = EXTRACTION_PROMPT.format(
            title=job.get('title', 'N/A'),
            company=job.get('company', 'N/A'),
            description=safe_str(job.get('description', '')),
            requirements=safe_str(job.get('requirements', '')),
            skills=job.get('skills', 'N/A')
        )
        
        # Retry logic
        for attempt in range(3):
            try:
                response = self.client.chat(prompt, temperature=0.3, max_tokens=300)
                self.stats['api_calls'] += 1
                
                if response and 'text' in response:
                    text = response['text'].strip()
                    
                    # Parse JSON
                    json_str = self._extract_json(text)
                    if json_str:
                        try:
                            enriched = json.loads(json_str)
                            return {**job, **enriched}
                        except json.JSONDecodeError as e:
                            logger.warning(f"JSON parse error (attempt {attempt+1}): {e}")
                            continue
                
                time.sleep(2)
                
            except Exception as e:
                logger.warning(f"Error enriching job {job.get('id', 'unknown')}: {e}")
                time.sleep(2)
        
        self.stats['failed'] += 1
        return job
    
    def _extract_json(self, text: str) -> Optional[str]:
        """Extract JSON from response text"""
        if not text:
            return None
        
        # Method 1: Find JSON block
        if '{' in text:
            start = text.find('{')
            
            # Count braces
            depth = 0
            end = start
            for i, char in enumerate(text[start:], start):
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            
            json_str = text[start:end]
            
            if len(json_str) > 20 and '"' in json_str:
                return json_str
        
        return None
    
    def enrich_batch(self, jobs: List[Dict], batch_num: int = 1, total_batches: int = 1) -> List[Dict]:
        """Enrich a batch of jobs"""
        
        enriched_jobs = []
        
        for i, job in enumerate(jobs):
            title_short = job.get('title', 'N/A')[:50]
            logger.info(f"  Batch {batch_num}/{total_batches} - Job {i+1}/{len(jobs)}: {title_short}")
            
            enriched_job = self.enrich_job(job)
            enriched_jobs.append(enriched_job)
            
            # Rate limiting - Gemini allows 15 req/min
            time.sleep(RATE_LIMIT_DELAY)
        
        return enriched_jobs
    
    def enrich_dataframe(self, df: pd.DataFrame, save_every: int = 100) -> pd.DataFrame:
        """Enrich entire dataframe"""
        
        self.stats['total'] = len(df)
        enriched_data = []
        
        logger.info(f"Starting Gemini enrichment for {len(df)} jobs...")
        logger.info(f"Rate limit: 15 requests/min (delay 2s between calls)")
        
        # Calculate batches
        batch_size = 10
        total_batches = (len(df) + batch_size - 1) // batch_size
        
        # Process in batches
        for batch_idx in range(0, len(df), batch_size):
            batch = df.iloc[batch_idx:batch_idx+batch_size].to_dict('records')
            batch_num = batch_idx // batch_size + 1
            
            logger.info(f"\n=== Batch {batch_num}/{total_batches} ({batch_idx+1}-{min(batch_idx+batch_size, len(df))}) ===")
            
            enriched_batch = self.enrich_batch(batch, batch_num, total_batches)
            enriched_data.extend(enriched_batch)
            
            # Progress
            self.stats['enriched'] = len(enriched_data)
            progress_pct = len(enriched_data) / len(df) * 100
            logger.info(f"Progress: {len(enriched_data)}/{len(df)} ({progress_pct:.1f}%)")
            
            # Save checkpoint
            if batch_num % 5 == 0:
                checkpoint_df = pd.DataFrame(enriched_data)
                checkpoint_path = DEFAULT_OUTPUT_PATH.replace('.csv', '_checkpoint.csv')
                checkpoint_df.to_csv(checkpoint_path, index=False, encoding='utf-8')
                logger.info(f"Checkpoint saved: {checkpoint_path}")
            
            # Rate limit between batches
            time.sleep(1)
        
        # Create result dataframe
        result_df = pd.DataFrame(enriched_data)
        
        # Log stats
        logger.info("\n" + "="*60)
        logger.info("GEMINI ENRICHMENT COMPLETE")
        logger.info("="*60)
        logger.info(f"Total jobs: {self.stats['total']}")
        logger.info(f"Enriched: {self.stats['enriched']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"API calls: {self.stats['api_calls']}")
        
        return result_df


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Enrich jobs with Gemini API (FREE)')
    parser.add_argument('-i', '--input', default=DEFAULT_INPUT_PATH, help='Input CSV file')
    parser.add_argument('-o', '--output', default=DEFAULT_OUTPUT_PATH, help='Output CSV file')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of jobs')
    parser.add_argument('--resume', action='store_true', help='Resume from existing output')
    parser.add_argument('--start', type=int, default=0, help='Start index')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size')
    
    args = parser.parse_args()
    
    # Check API key
    if not os.getenv('GEMINI_API_KEY'):
        logger.error("GEMINI_API_KEY not found!")
        logger.info("Get free key at: https://aistudio.google.com/app/apikey")
        return
    
    # Load data
    logger.info(f"Loading jobs from: {args.input}")
    
    if not os.path.exists(args.input):
        logger.error(f"Input file not found: {args.input}")
        return
    
    df = pd.read_csv(args.input)
    logger.info(f"Loaded {len(df)} jobs")
    
    # Resume feature
    start_idx = args.start
    if args.resume and os.path.exists(args.output):
        existing_df = pd.read_csv(args.output)
        already_done = existing_df[existing_df.get('required_skills', pd.Series(dtype=str)).notna()]['id'].tolist()
        df = df[~df['id'].isin(already_done)]
        logger.info(f"Resuming: {len(df)} jobs remaining (skipping {len(already_done)} done)")
    
    if args.limit:
        df = df.iloc[start_idx:start_idx + args.limit]
    else:
        df = df.iloc[start_idx:]
    
    logger.info(f"Processing {len(df)} jobs from index {start_idx}")
    
    # Estimate time
    # Gemini: 15 req/min, each job = 1 req
    # With 2s delay: ~30 jobs/min
    estimated_minutes = len(df) / 30
    logger.info(f"Estimated time: ~{estimated_minutes:.0f} minutes ({estimated_minutes/60:.1f} hours)")
    
    # Enrich
    enricher = JobEnricher()
    enriched_df = enricher.enrich_dataframe(df)
    
    # Save
    if args.resume and os.path.exists(args.output):
        existing_df = pd.read_csv(args.output)
        new_ids = enriched_df['id'].tolist()
        existing_df = existing_df[~existing_df['id'].isin(new_ids)]
        final_df = pd.concat([existing_df, enriched_df], ignore_index=True)
    else:
        final_df = enriched_df
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    final_df.to_csv(args.output, index=False, encoding='utf-8')
    logger.info(f"\nSaved enriched jobs to: {args.output} ({len(final_df)} total rows)")
    
    # Save stats
    stats_path = args.output.replace('.csv', '_stats.json')
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(enricher.stats, f, indent=2)
    logger.info(f"Saved stats to: {stats_path}")


if __name__ == '__main__':
    main()
