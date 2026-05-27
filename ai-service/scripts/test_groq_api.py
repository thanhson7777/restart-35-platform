# -*- coding: utf-8 -*-
"""
Test GROQ API directly
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')

def test_groq():
    """Test GROQ API directly"""
    print(f"GROQ_API_KEY present: {bool(GROQ_API_KEY)}")
    print(f"GROQ_API_KEY prefix: {GROQ_API_KEY[:10]}..." if GROQ_API_KEY else "None")
    
    # Test GROQ API
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "user", "content": "Hello, respond with 'OK' if you can read this."}
        ],
        "temperature": 0.1,
        "max_tokens": 50
    }
    
    print("\nCalling GROQ API...")
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            print(f"Content: {content}")
            return True
        else:
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_groq()
