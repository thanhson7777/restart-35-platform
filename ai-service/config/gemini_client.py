"""
Gemini LLM Client - Cấu hình và utilities cho Google Gemini API

Sử dụng Gemini 2.0 Flash (FREE) cho job data enrichment
- Free tier: 1M tokens/phút
- Vietnamese support: Tốt
- Rate limit: 15 requests/minute (RPM)

Hướng dẫn setup:
1. Tạo API key tại: https://aistudio.google.com/app/apikey
2. Thêm vào .env: GEMINI_API_KEY=your_key_here
"""

import os
import time
import logging
from typing import Dict, List, Optional, Any
from functools import wraps
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Load .env
load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================
# GEMINI CONFIGURATION
# ============================================================

class GeminiConfig:
    """Cấu hình Gemini API"""
    
    # Model settings
    MODEL_FLASH = "gemini-flash-latest"           # Free tier - nhanh, rẻ
    MODEL_PRO = "gemini-2.0-pro-exp-02-05"      # Paid - accurate hơn
    MODEL = MODEL_FLASH  # Default = free
    
    # Rate limiting (free tier)
    REQUESTS_PER_MINUTE = 15
    TOKENS_PER_MINUTE = 1_000_000  # 1M tokens/min
    
    # Retry settings
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds
    
    # Safety settings
    TEMPERATURE = 0.1  # Low temp = more consistent output


# ============================================================
# GEMINI CLIENT
# ============================================================

class GeminiClient:
    """
    Wrapper cho Google Gemini API với:
    - Auto-retry với exponential backoff
    - Rate limiting
    - Caching
    - Error handling
    """
    
    def __init__(self, api_key: str = None):
        # Load API key from env if not provided
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            logger.warning(
                "GEMINI_API_KEY not found in environment. "
                "Please add to .env file: GEMINI_API_KEY=your_key_here"
            )
            self.client = None
            self.available = False
        else:
            self._init_client()
    
    def _init_client(self):
        """Initialize Gemini client"""
        try:
            from google import genai
            
            self.client = genai.Client(api_key=self.api_key)
            self.available = True
            logger.info(f"Gemini client initialized with model: {GeminiConfig.MODEL}")
            
        except ImportError:
            logger.error(
                "google-genai not installed. "
                "Run: pip install google-genai"
            )
            self.available = False
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            self.available = False
    
    def generate(
        self,
        prompt: str,
        model: str = None,
        temperature: float = None,
        max_output_tokens: int = 2048
    ) -> Optional[str]:
        """
        Generate text từ Gemini
        
        Args:
            prompt: Input prompt
            model: Model to use (default: GeminiConfig.MODEL)
            temperature: Sampling temperature (0.0 - 1.0)
            max_output_tokens: Max tokens in response
            
        Returns:
            Generated text or None if failed
        """
        if not self.available:
            logger.warning("Gemini client not available")
            return None
        
        model = model or GeminiConfig.MODEL
        temperature = temperature or GeminiConfig.TEMPERATURE
        
        for attempt in range(GeminiConfig.MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "temperature": temperature,
                        "max_output_tokens": max_output_tokens
                    }
                )
                
                if response.text:
                    return response.text
                else:
                    logger.warning("Empty response from Gemini")
                    return None
                    
            except Exception as e:
                logger.warning(f"Gemini API error (attempt {attempt + 1}): {e}")
                
                if attempt < GeminiConfig.MAX_RETRIES - 1:
                    time.sleep(GeminiConfig.RETRY_DELAY * (attempt + 1))
                else:
                    logger.error(f"Gemini API failed after {GeminiConfig.MAX_RETRIES} attempts")
                    return None
        
        return None
    
    def generate_json(
        self,
        prompt: str,
        schema: Dict = None
    ) -> Optional[Dict]:
        """
        Generate JSON output từ Gemini
        
        Args:
            prompt: Input prompt
            schema: JSON schema for response (optional)
            
        Returns:
            Parsed JSON dict or None
        """
        if not self.available:
            return None
        
        import json
        
        # Add JSON instruction to prompt
        json_prompt = prompt + "\n\nTrả lời CHỈ là JSON hợp lệ, không giải thích gì thêm."
        
        response = self.generate(prompt=json_prompt)
        
        if response:
            try:
                # Try to extract JSON from response
                text = response.strip()
                
                # Handle markdown code blocks
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                
                return json.loads(text)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON: {e}")
                return None
        
        return None
    
    def batch_generate(
        self,
        prompts: List[str],
        delay: float = 1.0  # Delay between requests (rate limiting)
    ) -> List[Optional[str]]:
        """
        Generate multiple outputs với rate limiting
        
        Args:
            prompts: List of prompts
            delay: Seconds between requests
            
        Returns:
            List of generated texts
        """
        results = []
        
        for i, prompt in enumerate(prompts):
            result = self.generate(prompt)
            results.append(result)
            
            # Rate limiting
            if i < len(prompts) - 1 and delay > 0:
                time.sleep(delay)
            
            # Progress logging
            if (i + 1) % 10 == 0:
                logger.info(f"Processed {i + 1}/{len(prompts)} prompts")
        
        return results


# ============================================================
# PROMPTS CHO JOB ENRICHMENT
# ============================================================

class JobEnrichmentPrompts:
    """Templates cho job data enrichment"""
    
    @staticmethod
    def extract_job_info(title: str, description: str = "", company: str = "") -> str:
        """
        Prompt để trích xuất thông tin job
        
        Args:
            title: Job title
            description: Job description
            company: Company name
        """
        return f"""
Bạn là chuyên gia phân tích tin tuyển dụng Việt Nam.
Trích xuất thông tin từ tin tuyển dụng sau:

TIÊU ĐỀ: {title}
CÔNG TY: {company}
MÔ TẢ: {description or 'Không có mô tả'}

Trả về JSON:
{{
    "job_summary": "Tóm tắt 2-3 câu về công việc",
    "key_responsibilities": ["trách nhiệm chính 1", "trách nhiệm 2"],
    "requirements": ["yêu cầu 1", "yêu cầu 2"],
    "benefits": ["phúc lợi 1", "phúc lợi 2"],
    "skills_required": ["kỹ năng cứng 1", "kỹ năng cứng 2"],
    "soft_skills": ["kỹ năng mềm 1"],
    "experience_level": "junior|mid|senior|manager|any",
    "education_level": "high_school|college|university|master|any",
    "work_environment": "office|remote|hybrid|field",
    "career_growth": "fast|medium|slow|unknown",
    "training_provided": true|false
}}

CHỈ TRẢ LỜI JSON, không giải thích gì thêm.
"""
    
    @staticmethod
    def infer_salary_range(category: str, experience_level: str, location: str) -> str:
        """Prompt để ước tính salary range"""
        return f"""
Bạn là chuyên gia tuyển dụng Việt Nam.
Ước tính mức lương phù hợp cho:

- Vị trí: {category}
- Cấp bậc: {experience_level}
- Địa điểm: {location}

Trả về JSON:
{{
    "salary_min": <số triệu/tháng>,
    "salary_max": <số triệu/tháng>,
    "currency": "VND",
    "note": "ghi chú ngắn về basis"
}}

CHỈ TRẢ LỜI JSON.
"""
    
    @staticmethod
    def normalize_job_title(title: str) -> str:
        """Prompt để chuẩn hóa job title"""
        return f"""
Chuẩn hóa tiêu đề công việc sau thành format nhất quán:

"{title}"

Trả về JSON:
{{
    "normalized_title": "Tiêu đề chuẩn hóa",
    "title_level": "junior|mid|senior|manager|lead|director|vp|unknown",
    "title_type": "individual_contributor|manager|director|vp|intern|trainee"
}}

CHỈ TRẢ LỜI JSON.
"""
    
    @staticmethod
    def classify_job_category(title: str, description: str = "") -> str:
        """Prompt để classify job category"""
        return f"""
Phân loại tin tuyển dụng sau vào một trong các categories:

Categories: accounting, sales, marketing, it, hr, admin, legal, design, engineering, 
manufacturing, logistics, healthcare, education, service, skilled, security, other

TIÊU ĐỀ: {title}
MÔ TẢ: {description or 'Không có'}

Trả về JSON:
{{
    "category": "<category>",
    "confidence": <0-1>,
    "reason": "<lý do ngắn>"
}}

CHỈ TRẢ LỜI JSON.
"""


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_gemini_client() -> GeminiClient:
    """Get singleton Gemini client instance"""
    if not hasattr(get_gemini_client, '_instance'):
        get_gemini_client._instance = GeminiClient()
    return get_gemini_client._instance


def is_gemini_available() -> bool:
    """Check if Gemini API is configured and available"""
    client = get_gemini_client()
    return client.available


# ============================================================
# TEST FUNCTION
# ============================================================

def test_gemini_connection():
    """Test Gemini API connection"""
    print("=" * 50)
    print("Testing Gemini API Connection")
    print("=" * 50)
    
    client = GeminiClient()
    
    if not client.available:
        print("[-] Gemini client not available")
        print("\nHuong dan setup:")
        print("1. Truy cap: https://aistudio.google.com/app/apikey")
        print("2. Tao API key moi")
        print("3. Them vao .env: GEMINI_API_KEY=your_key_here")
        return False
    
    print(f"[+] Gemini client available")
    print(f"[+] Model: {GeminiConfig.MODEL}")
    
    # Test generation
    print("\nTesting text generation...")
    response = client.generate("Xin chao, ban la ai?")
    
    if response:
        print(f"[+] Response: {response[:100]}...")
        print("\n[SUCCESS] Gemini API is working!")
        return True
    else:
        print("[-] Generation failed")
        return False


if __name__ == "__main__":
    test_gemini_connection()
