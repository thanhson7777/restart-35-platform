# -*- coding: utf-8 -*-
"""
Test Gemini Flash API cho Career Transitions
"""

import os
import time
import json
from dotenv import load_dotenv

load_dotenv()

print('=' * 70)
print('GEMINI FLASH API TEST - Career Transitions')
print('=' * 70)

api_key = os.getenv('GEMINI_API_KEY')
print(f'\nAPI Key: {"Available" if api_key else "NOT FOUND"}')

if not api_key:
    print('ERROR: No Gemini API key found')
    exit(1)

# Import Gemini
from google import genai
client = genai.Client(api_key=api_key)

print('\n' + '=' * 70)
print('TEST 1: Simple Gemini Connection')
print('=' * 70)

try:
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents='Xin chao, ban la gi?'
    )
    print(f'SUCCESS: {response.text[:100]}...')
except Exception as e:
    print(f'ERROR: {str(e)[:200]}')

print('\n' + '=' * 70)
print('TEST 2: Career Transition Prompt')
print('=' * 70)

prompt = """Ban la chuyen gia tu van nghe nghiep Viet Nam.

THONG TIN UNG VIEN:
- Tuoi: 38
- Role hien tai: Senior Developer (IT)
- Kinh nghiem: 12 nam
- Skills: Python, JavaScript, React, AWS, Leadership
- Nghanh hien tai: IT
- Muc tieu luong: 50 trieu VND/thang

TRANSITION DE XUAT:
- Loai: Trainer (Dao Tao Vien)
- Vi tri: Corporate Trainer / Dao Tao Vien CNTT
- Muc do phu hop: 88%
- Timeline: 4 thang
- Skills can them: Presentation, Curriculum Design, Adult Learning

YEU CAU:
Tra ve JSON format nhu sau (chi JSON, khong giai thich gi them):
{
    "reasoning": {
        "structured": ["Ly do 1", "Ly do 2"],
        "free_text": "Van ban 2-3 cau giai thich tai sao phu hop"
    },
    "next_steps": {
        "immediate": ["Hanh dong ngay trong tuan nay"],
        "structured": ["Buoc 1", "Buoc 2", "Buoc 3"]
    },
    "pros_cons": {
        "pros": ["Loi ich 1", "Loi ich 2"],
        "cons": ["Nhuoc diem 1"]
    }
}
"""

try:
    print('Calling Gemini Flash...')
    start = time.time()
    
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt
    )
    
    elapsed = time.time() - start
    print(f'Response time: {elapsed:.2f}s')
    
    print(f'\n[RAW RESPONSE]')
    print('-' * 70)
    print(response.text)
    print('-' * 70)
    
    # Parse JSON
    text = response.text.strip()
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0]
    elif '```' in text:
        text = text.split('```')[1].split('```')[0]
    
    result = json.loads(text.strip())
    
    print(f'\n[PARSED RESULT]')
    print('-' * 70)
    
    print(f'\n[REASONING]')
    if 'reasoning' in result:
        if 'structured' in result['reasoning']:
            for r in result['reasoning']['structured']:
                print(f'  - {r}')
        if 'free_text' in result['reasoning']:
            print(f'\n  Free text: {result["reasoning"]["free_text"][:200]}...')
    
    print(f'\n[NEXT STEPS]')
    if 'next_steps' in result:
        if 'immediate' in result['next_steps']:
            print(f'  Immediate: {result["next_steps"]["immediate"]}')
        if 'structured' in result['next_steps']:
            for i, s in enumerate(result['next_steps']['structured'], 1):
                print(f'  {i}. {s}')
    
    print(f'\n[PROS/CONS]')
    if 'pros_cons' in result:
        print(f'  Pros: {result["pros_cons"].get("pros", [])}')
        print(f'  Cons: {result["pros_cons"].get("cons", [])}')
    
except Exception as e:
    print(f'ERROR: {str(e)[:500]}')

print('\n' + '=' * 70)
print('TEST 3: Multiple Transitions Batch')
print('=' * 70)

batch_prompt = """Ban la chuyen gia tu van nghe nghiep Viet Nam.

P: a=42, r=Truong Phong Ban Hang, e=15y, ind=ban_hang
SK: Sales, Leadership, Customer Relations, Negotiation

TRANSITIONS:
T1: trainer|Dao Tao Vien|4th
T2: consultant|Tu Van Ban Hang|6th
T3: coach|Career Coach|2th

OUTPUT JSON (toi da 500 tokens):
{
    "reasoning": ["L1", "L2"],
    "next_steps": ["B1", "B2"],
    "pros_cons": {"pros": [], "cons": []}
}
"""

try:
    print('Calling Gemini Flash (batch mode)...')
    start = time.time()
    
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=batch_prompt
    )
    
    elapsed = time.time() - start
    print(f'Response time: {elapsed:.2f}s')
    print(f'\n[RAW RESPONSE]')
    print('-' * 70)
    print(response.text[:300])
    print('-' * 70)
    
except Exception as e:
    print(f'ERROR: {str(e)[:300]}')

print('\n' + '=' * 70)
print('TOKEN OPTIMIZATION ANALYSIS')
print('=' * 70)

# Calculate approximate tokens
def count_tokens(text):
    # Rough estimate: 1 token ~= 4 chars in Vietnamese
    return len(text) // 4

print(f'\nPrompt tokens (Test 2): ~{count_tokens(prompt)}')
print(f'Prompt tokens (Test 3 - batch): ~{count_tokens(batch_prompt)}')
print(f'Token savings: ~{count_tokens(prompt) - count_tokens(batch_prompt)} tokens ({count_tokens(batch_prompt)/count_tokens(prompt)*100:.0f}% reduction)')

print('\n' + '=' * 70)
print('TEST COMPLETE')
print('=' * 70)
