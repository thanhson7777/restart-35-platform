import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

load_dotenv(Path(__file__).parent.parent.parent / '.env')

try:
    client = genai.Client()
    print("Available Gemini models:")
    for m in client.models.list():
        if 'flash' in m.name:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
