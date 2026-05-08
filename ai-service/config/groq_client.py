"""
Unified LLM Client - Hỗ trợ GROQ và Gemini

GROQ (Miễn phí, không giới hạn):
- llama-3.3-70b-versatile: Nhanh, đa năng
- mixtral-8x7b-32768: Rẻ, nhanh
- qwen-2.5-72b-chat-32k: Tốt cho Vietnamese

Gemini (Có quota):
- gemini-2.0-flash: Nhanh, miễn phí (có giới hạn)

Sử dụng:
    from config.llm_client import get_llm_client
    client = get_llm_client()
    response = client.generate("Your prompt here")
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


class LLMConfig:
    """Cấu hình LLM API - Unified"""
    
    # Provider mặc định: 'groq' hoặc 'gemini'
    DEFAULT_PROVIDER = os.getenv('LLM_PROVIDER', 'groq').lower()
    
    # GROQ Models (Miễn phí, không giới hạn)
    GROQ_LLAMA = "llama-3.3-70b-versatile"
    GROQ_MIXTRAL = "mixtral-8x7b-32768"
    GROQ_QWEN = "qwen-2.5-72b-chat-32k"
    
    # Gemini Models (Có quota)
    GEMINI_FLASH = "gemini-2.0-flash"
    
    # Model mapping theo provider
    DEFAULT_MODEL = GROQ_LLAMA if DEFAULT_PROVIDER == 'groq' else GEMINI_FLASH
    
    # Rate limits
    REQUESTS_PER_MINUTE = 30 if DEFAULT_PROVIDER == 'groq' else 15
    TOKENS_PER_MINUTE = 15000 if DEFAULT_PROVIDER == 'groq' else 1_000_000
    
    # Retry settings
    MAX_RETRIES = 3
    RETRY_DELAY = 2


class UnifiedLLMClient:
    """
    Unified LLM Client hỗ trợ nhiều providers:
    - GROQ: Miễn phí, không giới hạn (recommend)
    - Gemini: Có quota limit
    """
    
    def __init__(self, provider: str = None, api_key: str = None):
        self.provider = provider or LLMConfig.DEFAULT_PROVIDER
        self._groq_client = None
        self._gemini_client = None
        
        # Initialize GROQ client
        groq_api_key = api_key or os.getenv("GROQ_API_KEY")
        if groq_api_key:
            self._init_groq(groq_api_key)
        
        # Initialize Gemini client
        gemini_api_key = api_key or os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            self._init_gemini(gemini_api_key)
        
        self.available = self._groq_client is not None or self._gemini_client is not None
    
    def _init_groq(self, api_key: str):
        """Initialize GROQ client"""
        try:
            from groq import Groq
            self._groq_client = Groq(api_key=api_key)
            logger.info(f"GROQ client initialized (model: {LLMConfig.GROQ_LLAMA})")
        except ImportError:
            logger.warning("groq not installed. Run: pip install groq")
        except Exception as e:
            logger.error(f"Failed to init GROQ: {e}")
    
    def _init_gemini(self, api_key: str):
        """Initialize Gemini client"""
        try:
            from google import genai
            self._gemini_client = genai.Client(api_key=api_key)
            logger.info("Gemini client initialized")
        except ImportError:
            logger.warning("google-genai not installed")
        except Exception as e:
            logger.error(f"Failed to init Gemini: {e}")
    
    def generate(
        self,
        prompt: str,
        model: str = None,
        temperature: float = 0.1,
        max_tokens: int = 2048
    ) -> Optional[str]:
        """
        Generate text từ LLM provider.
        
        Args:
            prompt: Input prompt
            model: Model name (auto-select based on provider if not specified)
            temperature: Sampling temperature (0.0 - 1.0)
            max_tokens: Max tokens in response
            
        Returns:
            Generated text or None if failed
        """
        if not self.available:
            logger.warning("No LLM client available")
            return None
        
        # Auto-select model based on provider
        if model is None:
            model = LLMConfig.GROQ_LLAMA if self.provider == 'groq' else LLMConfig.GEMINI_FLASH
        
        for attempt in range(LLMConfig.MAX_RETRIES):
            try:
                if self.provider == 'groq' and self._groq_client:
                    return self._call_groq(model, prompt, temperature, max_tokens)
                elif self.provider == 'gemini' and self._gemini_client:
                    return self._call_gemini(model, prompt, temperature, max_tokens)
                else:
                    # Fallback: try other provider
                    if self._groq_client and self.provider != 'groq':
                        logger.info("Falling back to GROQ")
                        return self._call_groq(LLMConfig.GROQ_LLAMA, prompt, temperature, max_tokens)
                    elif self._gemini_client:
                        logger.info("Falling back to Gemini")
                        return self._call_gemini(LLMConfig.GEMINI_FLASH, prompt, temperature, max_tokens)
                        
            except Exception as e:
                logger.warning(f"LLM error (attempt {attempt + 1}): {e}")
                if attempt < LLMConfig.MAX_RETRIES - 1:
                    time.sleep(LLMConfig.RETRY_DELAY * (attempt + 1))
        
        return None
    
    def _call_groq(self, model: str, prompt: str, temperature: float, max_tokens: int) -> Optional[str]:
        """Call GROQ API"""
        response = self._groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    def _call_gemini(self, model: str, prompt: str, temperature: float, max_tokens: int) -> Optional[str]:
        """Call Gemini API"""
        response = self._gemini_client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "temperature": temperature,
                "max_output_tokens": max_tokens
            }
        )
        return response.text if response.text else None
    
    def generate_json(self, prompt: str) -> Optional[Dict]:
        """Generate JSON output"""
        json_prompt = prompt + "\n\nTra loi CHI la JSON hop le, khong giai thich gi them."
        
        response = self.generate(prompt=json_prompt)
        
        if response:
            try:
                text = response.strip()
                # Handle markdown code blocks
                if text.startswith("```"):
                    parts = text.split("```")
                    if len(parts) >= 3:
                        text = parts[1]
                        if text.startswith("json"):
                            text = text[4:]
                return json.loads(text)
            except json.JSONDecodeError:
                return None
        
        return None


# Singleton instance
_llm_client_instance: Optional[UnifiedLLMClient] = None


def get_llm_client() -> UnifiedLLMClient:
    """Get singleton LLM client instance"""
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = UnifiedLLMClient()
    return _llm_client_instance


def is_llm_available() -> bool:
    """Check if any LLM client is available"""
    return get_llm_client().available


# Export flag for other modules to check
LLM_AVAILABLE = is_llm_available()


def test_llm_connection():
    """Test LLM connection"""
    print("=" * 50)
    print("Testing Unified LLM API Connection")
    print("=" * 50)
    
    client = get_llm_client()
    
    if not client.available:
        print("[-] No LLM client available")
        print("\nSetup instructions:")
        print("GROQ (Recommended - Free):")
        print("  1. Go to: https://console.groq.com/keys")
        print("  2. Create API key")
        print("  3. Add to .env: GROQ_API_KEY=your_key")
        print("\nGemini (Has quota limits):")
        print("  1. Go to: https://aistudio.google.com/app/apikey")
        print("  2. Create API key")
        print("  3. Add to .env: GEMINI_API_KEY=your_key")
        return False
    
    print(f"[+] LLM client available")
    print(f"[+] Provider: {client.provider}")
    print(f"[+] GROQ available: {client._groq_client is not None}")
    print(f"[+] Gemini available: {client._gemini_client is not None}")
    
    print("\nTesting generation...")
    response = client.generate("Hello! Reply in 1 sentence: Who are you?")
    
    if response:
        print(f"[+] Response: {response[:100]}...")
        print("\n[SUCCESS] LLM API is working!")
        return True
    else:
        print("[-] Generation failed")
        return False


if __name__ == "__main__":
    test_llm_connection()
