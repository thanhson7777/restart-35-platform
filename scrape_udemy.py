from scrapling.fetchers.stealth_chrome import StealthyFetcher
import re

print('Fetching Udemy course page...')
page = StealthyFetcher.fetch(
    'https://www.udemy.com/course/video-production-masterclass/',
    network_idle=True, wait=2000, block_ads=True, timeout=60000
)

html = page.html_content
print('HTML fetched:', len(html), 'chars')
print()

# --- JSON-LD Structured Data (Google-recommended, always present) ---
print('=' * 60)
print('JSON-LD STRUCTURED DATA (Google schema):')
print('=' * 60)
json_ld_blocks = re.findall(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    html, re.DOTALL
)
for i, j in enumerate(json_ld_blocks):
    if '"@type"' in j and ('Course' in j or 'Product' in j or 'VideoObject' in j):
        print(f'Block {i+1}:')
        # Pretty print
        import json
        try:
            data = json.loads(j)
            for k, v in data.items():
                if isinstance(v, str) and len(v) > 200:
                    v = v[:200] + '...'
                elif isinstance(v, list) and len(v) > 5:
                    v = str(v[:5]) + '... (truncated)'
                elif isinstance(v, dict):
                    v = str({kk: vv for kk, vv in list(v.items())[:5]}) + '... (truncated)'
                print(f'  {k}: {v}')
        except:
            print(j[:500])
        print()
        break

# --- Search HTML for course info ---
print('=' * 60)
print('HTML PATTERN SEARCH:')
print('=' * 60)

# Rating
patterns = [
    r'"ratingValue"\s*:\s*"([0-9.,]+)"',
    r'"rating"\s*:\s*([0-9.,]+)',
    r'([0-9].[0-9])\s*/\s*5',
]
for p in patterns:
    m = re.search(p, html[:200000])
    if m:
        print('RATING:', m.group(0))
        break

# Students
patterns2 = [
    r'"studentCount"\s*:\s*"([0-9,]+)"',
    r'"numStudents"\s*:\s*([0-9,]+)',
    r'"enrollmentCount"\s*:\s*"([0-9,]+)"',
]
for p in patterns2:
    m = re.search(p, html[:200000])
    if m:
        print('STUDENTS:', m.group(0))
        break

# Price - look for the actual price display
# Find all dollar amounts and filter
price_matches = re.findall(r'\\\$([0-9]+)', html[:200000])
unique_prices = sorted(set(int(x) for x in price_matches))
print('PRICE CANDIDATES ($ amounts found):', unique_prices[:10])

# --- Instructor via selector ---
print()
print('=' * 60)
print('SELECTOR EXTRACTION:')
print('=' * 60)

instructor = page.find('[data-purpose="instructor-name"]')
if instructor:
    print('INSTRUCTOR (data-purpose):', instructor.text.strip())

instructor2 = page.find('[class*="instructor"] a')
if instructor2:
    print('INSTRUCTOR (class*instructor a):', instructor2.text.strip())

# Course description
desc = page.find('[data-purpose="course-description"]')
if desc:
    print('DESCRIPTION:', desc.text.strip()[:400])

# What people say about the course
headline = page.find('[data-purpose="course-headline"]')
if headline:
    print('HEADLINE:', headline.text.strip()[:200])

# Last updated
updated = page.find('[data-purpose="last-updated"]')
if updated:
    print('LAST UPDATED:', updated.text.strip())

# Language
lang = page.find('[data-purpose="course-language"]')
if lang:
    print('LANGUAGE:', lang.text.strip())

# Number of lectures
lectures = page.find('[data-purpose="lecture"]')
if not lectures:
    lectures = page.find('[class*="lecture-count"]')
if lectures:
    print('LECTURES:', lectures.text.strip())

# Total length
length = page.find('[data-purpose="content-length"]')
if length:
    print('TOTAL LENGTH:', length.text.strip())

print()
print('=' * 60)
print('SAMPLE HTML around course info:')
print('=' * 60)
# Find course data in HTML
for marker in ['"ratingValue"', '"numStudents"', '"price"', '"description"']:
    idx = html.find(marker)
    if idx > 0 and idx < 200000:
        print(f'[{marker}]: ...{html[idx-20:idx+200]}...')
        print()
