import sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai
import os

load_dotenv(Path(__file__).parent.parent.parent / '.env')

models = [
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-2.0-flash-lite',
]

client = genai.Client()
prompt = "Say test"

for m in models:
    try:
        print(f"Testing {m}...")
        response = client.models.generate_content(model=m, contents=prompt)
        print(f"✅ Success with {m}: {response.text.strip()}")
    except Exception as e:
        print(f"❌ Failed with {m}: {e}")
