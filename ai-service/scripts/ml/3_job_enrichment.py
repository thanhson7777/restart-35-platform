# -*- coding: utf-8 -*-
"""
Script 3: Job Enrichment với Groq LLM
=====================================
Enrich jobs data bằng Groq LLM để tạo:

1. Job descriptions ngắn gọn (100-150 chars)
2. Required skills extracted từ job details
3. Job category normalized
4. Experience level (junior/mid/senior/executive)
5. Work environment tags (office/remote/hybrid/field)

Sử dụng Groq API (miễn phí, nhanh) thay vì Gemini.

Input:  data/jobs_cleaned.csv
Output: data/jobs_enriched.csv

Tác giả: Thanh Sơn
Ngày: 2026-04-18
"""

import os
import sys

# Load .env FIRST before any other imports
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
# GROQ CLIENT (Inline)
# ============================================================================

class GroqClient:
    """Minimal Groq Client for enrichment"""
    
    # Groq supported models (2026-04)
    MODEL_LLAMA = "llama-3.3-70b-versatile"
    MODEL_LLAMA_8B = "llama-3.1-8b-instant"
    MODEL_Gemma = "gemma2-9b-it"
    
    def __init__(self, model=None):
        self.api_key = os.getenv('GROQ_API_KEY')
        self.base_url = "https://api.groq.com/openai/v1"
        # Default to smaller/faster model
        self.model = model or self.MODEL_LLAMA_8B
        
        if not self.api_key:
            logger.error("GROQ_API_KEY not found in environment!")
            logger.info("Get your key at: https://console.groq.com/keys")
            raise ValueError("GROQ_API_KEY not found")
    
    def chat(self, messages, temperature=0.7, max_tokens=1000) -> dict:
        """Send chat request to Groq API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code != 200:
            # Parse error for rate limit
            try:
                error = response.json()
                error_msg = error.get('error', {}).get('message', '')
                
                # Handle rate limit errors
                if 'rate_limit' in error_msg.lower() or 'tpm' in error_msg.lower():
                    import re
                    # Try to extract wait time
                    wait_match = re.search(r'Try again in (\d+)m(\d+)\.(\d+)s', error_msg)
                    if wait_match:
                        minutes = int(wait_match.group(1))
                        seconds = int(wait_match.group(2))
                        wait_time = minutes * 60 + seconds
                    else:
                        # Default wait time
                        wait_time = 30
                    
                    logger.warning(f"Rate limit hit. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    
                    # Retry once
                    response = requests.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=data,
                        timeout=60
                    )
                    if response.status_code == 200:
                        return response.json()
                        
            except:
                pass
            
            logger.error(f"API error: {response.status_code} - {response.text[:200]}")
            return {}
        
        return response.json()


# ============================================================================
# CONSTANTS
# ============================================================================

# Đường dẫn
AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_INPUT_PATH = os.path.join(AI_SERVICE_DIR, 'data', 'jobs_cleaned.csv')
DEFAULT_OUTPUT_PATH = os.path.join(AI_SERVICE_DIR, 'data', 'jobs_enriched.csv')

# Groq settings
BATCH_SIZE = 1  # Xử lý từng job một để tránh rate limit
RATE_LIMIT_DELAY = 8.0  # 6000 TPM / ~500 tokens per job ≈ 12 jobs/phút


# ============================================================================
# PROMPT TEMPLATES
# ============================================================================

ENRICHMENT_PROMPT = """Bạn là chuyên gia phân tích việc làm Việt Nam.

Với thông tin job sau, hãy trả lời JSON format (không có markdown):

{{
    "description_short": "Mô tả ngắn 100-150 ký tự về công việc, dễ hiểu cho người 35+",
    "required_skills": ["skill1", "skill2", "skill3"],
    "experience_level": "junior|mid|senior|executive|any",
    "work_environment": "office|remote|hybrid|field|any",
    "job_summary": "1 câu tóm tắt vai trò chính"
}}

THÔNG TIN JOB:
- Title: {title}
- Company: {company}
- Description: {description}
- Requirements: {requirements}
- Skills: {skills}

QUY TẮC:
- required_skills: tối đa 5 skills phổ biến nhất, lowercase, không dấu cách
- experience_level: junior (<2yr), mid (2-5yr), senior (5-10yr), executive (>10yr)
- work_environment: office (văn phòng), remote (từ xa), hybrid (kết hợp), field (ngoài trời/nhà máy)
- Mô tả phải phù hợp với người tìm việc 35-65 tuổi
- Trả lời CHỈ JSON, không có gì khác
"""


# ============================================================================
# JOB ENRICHER CLASS
# ============================================================================

class JobEnricher:
    """Enrich job data using Groq LLM"""
    
    def __init__(self, batch_size: int = BATCH_SIZE, model: str = None):
        self.client = GroqClient(model=model)
        self.batch_size = batch_size
        self.stats = {
            'total': 0,
            'enriched': 0,
            'failed': 0,
            'api_calls': 0
        }
    
    def enrich_job(self, job: Dict) -> Dict:
        """Enrich a single job with LLM-generated fields"""
        
        # Prepare context - handle NaN values
        def safe_str(val, max_len=500):
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return ''
            return str(val)[:max_len]
        
        prompt = ENRICHMENT_PROMPT.format(
            title=job.get('title', 'N/A'),
            company=job.get('company', 'N/A'),
            description=safe_str(job.get('description', '')),
            requirements=safe_str(job.get('requirements', '')),
            skills=job.get('skills', 'N/A')
        )
        
        # Retry logic với exponential backoff
        for attempt in range(5):  # Tăng số retry
            try:
                response = self.client.chat(
                    messages=[
                        {"role": "system", "content": "Bạn là chuyên gia phân tích việc làm Việt Nam. Trả lời JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=300
                )
                
                self.stats['api_calls'] += 1
                
                if response and 'choices' in response:
                    content = response['choices'][0]['message']['content'].strip()
                    
                    # Parse JSON từ response
                    json_str = self._extract_json(content)
                    if json_str:
                        try:
                            enriched = json.loads(json_str)
                            return {**job, **enriched}
                        except json.JSONDecodeError as e:
                            logger.warning(f"JSON parse error (attempt {attempt+1}): {e}")
                            continue
                
                # Rate limit wait
                time.sleep(2)
                
            except Exception as e:
                logger.warning(f"Error enriching job {job.get('id', 'unknown')} (attempt {attempt+1}): {e}")
                time.sleep(2)
        
        self.stats['failed'] += 1
        return job
    
    def _extract_json(self, text: str) -> Optional[str]:
        """Extract JSON from response text - more robust"""
        if not text:
            return None
        
        # Method 1: Find JSON block
        if '{' in text:
            start = text.find('{')
            
            # Count braces to find matching end
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
            
            # Validate it's not just noise
            if len(json_str) > 20 and '"' in json_str:
                return json_str
        
        # Method 2: Try to find any JSON-like structure
        import re
        # Match JSON object
        match = re.search(r'\{[^{}]*"[a-z_]+"[^{}]*\}', text, re.IGNORECASE)
        if match:
            return match.group()
        
        return None
    
    def enrich_batch(self, jobs: List[Dict]) -> List[Dict]:
        """Enrich a batch of jobs"""
        
        enriched_jobs = []
        
        for i, job in enumerate(jobs):
            logger.info(f"  Enriching job {i+1}/{len(jobs)}: {job.get('title', 'N/A')[:50]}")
            
            enriched_job = self.enrich_job(job)
            enriched_jobs.append(enriched_job)
            
            # Rate limiting
            time.sleep(RATE_LIMIT_DELAY)
        
        return enriched_jobs
    
    def enrich_dataframe(self, df: pd.DataFrame, save_every: int = 50) -> pd.DataFrame:
        """Enrich entire dataframe"""
        
        self.stats['total'] = len(df)
        enriched_data = []
        
        logger.info(f"Starting enrichment for {len(df)} jobs...")
        
        # Process in batches
        for i in range(0, len(df), self.batch_size):
            batch = df.iloc[i:i+self.batch_size].to_dict('records')
            
            logger.info(f"\n=== Batch {i//self.batch_size + 1} ({i+1}-{min(i+self.batch_size, len(df))}) ===")
            
            enriched_batch = self.enrich_batch(batch)
            enriched_data.extend(enriched_batch)
            
            # Progress update
            self.stats['enriched'] = len(enriched_data)
            logger.info(f"Progress: {len(enriched_data)}/{len(df)} jobs enriched")
            
            # Rate limit between batches
            time.sleep(1)
        
        # Create result dataframe
        result_df = pd.DataFrame(enriched_data)
        
        # Log stats
        logger.info("\n" + "="*60)
        logger.info("ENRICHMENT COMPLETE")
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
    
    parser = argparse.ArgumentParser(description='Enrich jobs with Groq LLM')
    parser.add_argument('-i', '--input', default=DEFAULT_INPUT_PATH, help='Input CSV file')
    parser.add_argument('-o', '--output', default=DEFAULT_OUTPUT_PATH, help='Output CSV file')
    parser.add_argument('-b', '--batch', type=int, default=BATCH_SIZE, help='Batch size')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of jobs to process')
    parser.add_argument('--resume', action='store_true', help='Resume from existing output file')
    parser.add_argument('--start', type=int, default=0, help='Start index')
    parser.add_argument('--model', choices=['llama', 'llama8b', 'gemma'], default='llama8b', 
                       help='Groq model: llama (big), llama8b (fast), gemma')
    
    args = parser.parse_args()
    
    # Check API key
    if not os.getenv('GROQ_API_KEY'):
        logger.error("GROQ_API_KEY not found in environment!")
        logger.info("Get your key at: https://console.groq.com/keys")
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
        already_done = existing_df[existing_df['required_skills'].notna()]['id'].tolist()
        df = df[~df['id'].isin(already_done)]
        logger.info(f"Resuming: {len(df)} jobs remaining (skipping {len(already_done)} already done)")
    
    if args.limit:
        df = df.iloc[start_idx:start_idx + args.limit]
    else:
        df = df.iloc[start_idx:]
    
    logger.info(f"Processing {len(df)} jobs from index {start_idx}")
    
    # Enrich
    model_map = {
        'llama': GroqClient.MODEL_LLAMA,
        'llama8b': GroqClient.MODEL_LLAMA_8B,
        'gemma': GroqClient.MODEL_Gemma
    }
    model = model_map.get(args.model, GroqClient.MODEL_LLAMA_8B)
    enricher = JobEnricher(batch_size=args.batch, model=model)
    enriched_df = enricher.enrich_dataframe(df)
    
    # Save - append if resuming
    if args.resume and os.path.exists(args.output):
        # Merge with existing data
        existing_df = pd.read_csv(args.output)
        # Keep original enriched rows, add new ones
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
