"""
Groq LLM Client - Alternative miễn phí cho Gemini

Groq cung cấp:
- Miễn phí 100% với rate limit cao
- 10 requests/giây
- Không cần credit card
- Hỗ trợ Vietnamese (yếu hơn Gemini)

Hướng dẫn:
1. Đăng ký: https://console.groq.com/keys
2. Lấy API key
3. Thêm vào .env: GROQ_API_KEY=your_key
"""

import os
import time
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class GroqConfig:
    """Cấu hình Groq API"""
    
    # Models
    MODEL_LLAMA = "llama-3.3-70b-versatile"      # Nhanh, đa năng
    MODEL_MIXTRAL = "mixtral-8x7b-32768"         # Rẻ, nhanh
    MODEL_QWEN = "qwen-2.5-72b-chat-32k"        # Tốt cho Vietnamese
    MODEL = MODEL_LLAMA  # Default
    
    # Rate limits (free tier)
    REQUESTS_PER_MINUTE = 30
    TOKENS_PER_MINUTE = 15000
    
    # Retry
    MAX_RETRIES = 3
    RETRY_DELAY = 2


class GroqClient:
    """
    Wrapper cho Groq API
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            logger.warning("GROQ_API_KEY not found. Add to .env: GROQ_API_KEY=your_key")
            self.available = False
        else:
            self._init_client()
    
    def _init_client(self):
        """Initialize Groq client"""
        try:
            from groq import Groq
            self.client = Groq(api_key=self.api_key)
            self.available = True
            logger.info(f"Groq client initialized with model: {GroqConfig.MODEL}")
        except ImportError:
            logger.error("groq not installed. Run: pip install groq")
            self.available = False
        except Exception as e:
            logger.error(f"Failed to init Groq: {e}")
            self.available = False
    
    def generate(
        self,
        prompt: str,
        model: str = None,
        temperature: float = 0.1,
        max_tokens: int = 2048
    ) -> Optional[str]:
        """Generate text từ Groq"""
        if not self.available:
            return None
        
        model = model or GroqConfig.MODEL
        
        for attempt in range(GroqConfig.MAX_RETRIES):
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                return response.choices[0].message.content
                
            except Exception as e:
                logger.warning(f"Groq error (attempt {attempt + 1}): {e}")
                if attempt < GroqConfig.MAX_RETRIES - 1:
                    time.sleep(GroqConfig.RETRY_DELAY * (attempt + 1))
        
        return None
    
    def generate_json(self, prompt: str) -> Optional[Dict]:
        """Generate JSON output"""
        json_prompt = prompt + "\n\nCHI tra loi JSON hop le, khong giai thich."
        
        response = self.generate(prompt=json_prompt)
        
        if response:
            try:
                text = response.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                return json.loads(text)
            except json.JSONDecodeError:
                return None
        
        return None


# Vietnamese-optimized prompts (dùng cho Groq vì nó yếu về tiếng Việt)
class VietnamesePrompts:
    """Prompts được viết đơn giản hơn cho Groq"""
    
    @staticmethod
    def extract_job_info(title: str, description: str = "") -> str:
        return f"""Extract job info. Return JSON only.

Title: {title}
Description: {description or 'N/A'}

JSON format:
{{
    "job_summary": "2-3 sentence summary",
    "key_responsibilities": ["resp1", "resp2"],
    "requirements": ["req1", "req2"],
    "benefits": ["benefit1"],
    "skills_required": ["skill1", "skill2"],
    "experience_level": "junior|mid|senior|manager",
    "education_level": "high_school|college|university|any",
    "work_environment": "office|remote|hybrid"
}}

JSON only:"""


def get_groq_client() -> GroqClient:
    """Get singleton Groq client"""
    if not hasattr(get_groq_client, '_instance'):
        get_groq_client._instance = GroqClient()
    return get_groq_client._instance


def is_groq_available() -> bool:
    """Check if Groq is available"""
    return get_groq_client().available


def test_groq_connection():
    """Test Groq connection"""
    print("=" * 50)
    print("Testing Groq API Connection")
    print("=" * 50)
    
    client = GroqClient()
    
    if not client.available:
        print("[-] Groq not available")
        print("\nSetup instructions:")
        print("1. Go to: https://console.groq.com/keys")
        print("2. Sign up (free, no credit card)")
        print("3. Create API key")
        print("4. Add to .env: GROQ_API_KEY=your_key")
        return False
    
    print(f"[+] Groq available")
    print(f"[+] Model: {GroqConfig.MODEL}")
    
    print("\nTesting generation...")
    response = client.generate("Hello, who are you? Reply in 1 sentence.")
    
    if response:
        print(f"[+] Response: {response[:100]}...")
        print("\n[SUCCESS] Groq API is working!")
        return True
    else:
        print("[-] Generation failed")
        return False


if __name__ == "__main__":
    test_groq_connection()
