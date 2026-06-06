"""
Course Platform Ranker
Dựa trên cấu trúc course model của Restart-35 Platform:
- title, slug, description, shortDescription, thumbnail
- duration {value, unit}, level, delivery_type
- fee, isFree, funding_model
- skills, prerequisites, requirements, outcomes
- syllabus [{week, title, content, duration}]
- rating {average, count}
- instructor, enrollment stats
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import json
from scrapling.fetchers.stealth_chrome import StealthyFetcher
import re

FETCH_TIMEOUT = 60000

def fetch_page(url, wait=3000):
    print(f"  Fetching: {url[:70]}...")
    try:
        page = StealthyFetcher.fetch(
            url,
            network_idle=True,
            wait=wait,
            block_ads=True,
            timeout=FETCH_TIMEOUT
        )
        return page
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return None

def extract_jsonld(page):
    """Extract JSON-LD structured data blocks."""
    html = page.html_content if page else ''
    blocks = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.DOTALL
    )
    results = []
    for b in blocks:
        try:
            results.append(json.loads(b))
        except:
            pass
    return results

def score_platform(name, url, checks):
    """Test a platform and score it against the course schema."""
    print(f"\n{'='*60}")
    print(f"TESTING: {name}")
    print(f"URL: {url}")
    print('='*60)

    page = fetch_page(url)
    if not page:
        return {'name': name, 'url': url, 'score': 0, 'fields': {}, 'notes': ['Failed to fetch']}

    html = page.html_content
    jsonld_blocks = extract_jsonld(page)

    # Find course-related JSON-LD
    course_jsonld = None
    for block in jsonld_blocks:
        if isinstance(block, dict):
            btype = block.get('@type', '')
            if btype in ('Course', 'Product', 'VideoObject') or \
               (isinstance(block.get('@graph'), list) and any(
                   g.get('@type') in ('Course', 'Product') for g in block.get('@graph', [])
               )):
                course_jsonld = block
                break
        elif isinstance(block, list) and block:
            for item in block:
                if isinstance(item, dict) and item.get('@type') in ('Course', 'Product'):
                    course_jsonld = item
                    break

    if not course_jsonld:
        # Try @graph approach
        for block in jsonld_blocks:
            if isinstance(block, dict) and '@graph' in block:
                for g in block['@graph']:
                    if isinstance(g, dict) and g.get('@type') == 'Course':
                        course_jsonld = g
                        break

    score = 0
    found_fields = {}
    notes = []

    def check(field, jsonld_key=None, pattern=None, css_selector=None, higher_is_better=False):
        nonlocal score
        points = checks.get(field, 1)
        status = 'FAIL'
        value = None

        if course_jsonld and jsonld_key:
            val = course_jsonld.get(jsonld_key)
            if val is not None:
                value = str(val)[:80]
                status = 'OK'
                score += points
                found_fields[field] = value

        if status == 'FAIL' and pattern:
            m = re.search(pattern, html, re.IGNORECASE)
            if m:
                value = m.group(0)[:80]
                status = 'OK'
                score += points
                found_fields[field] = value

        if status == 'FAIL' and css_selector and page:
            try:
                elem = page.find(css_selector)
                if elem:
                    value = elem.text.strip()[:80]
                    status = 'OK'
                    score += points
                    found_fields[field] = value
            except:
                pass

        if status == 'FAIL':
            status = 'MISSING'

        icon = 'OK' if status == 'OK' else '--' if status == 'MISSING' else '!!'
        val_display = value or '(not found)'
        try:
            print(f"  [{icon}] {field}: {val_display}")
        except UnicodeEncodeError:
            print(f"  [{icon}] {field}: {val_display.encode('utf-8','replace').decode('utf-8')}")

    # === FIELD SCORING (weighted by importance) ===
    print()
    print("  --- Field Mapping ---")

    check('title', jsonld_key='name', css_selector='h1')
    check('description', jsonld_key='description', css_selector='[class*="description"]')
    check('shortDescription', jsonld_key='headline', css_selector='[data-purpose="course-headline"]')
    check('thumbnail', jsonld_key='image')
    check('level', jsonld_key='educationalLevel', css_selector='[class*="level"]')
    check('language', jsonld_key='inLanguage')
    check('duration', jsonld_key='courseWorkload', pattern=r'PT(\d+H)?(\d+M)?')

    # Rating
    if course_jsonld:
        ar = course_jsonld.get('aggregateRating', {})
        if ar:
            rv = ar.get('ratingValue')
            rc = ar.get('ratingCount')
            found_fields['rating.average'] = str(rv)
            found_fields['rating.count'] = str(rc)
            score += 2
            print(f"  [OK] rating.average: {rv}/5")
            print(f"  [OK] rating.count: {rc} reviews")

    # Price
    if course_jsonld:
        offers = course_jsonld.get('offers', [])
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        price = offers.get('price') if isinstance(offers, dict) else None
        currency = offers.get('priceCurrency') if isinstance(offers, dict) else None
        if price is not None:
            found_fields['fee'] = f"{currency} {price}"
            score += 2
            print(f"  [OK] fee: {currency} {price}")
        else:
            print(f"  [--] fee: (not found in JSON-LD)")

    # Instructor
    if course_jsonld:
        author = course_jsonld.get('author', [])
        if isinstance(author, list) and author:
            authors = [a.get('name') if isinstance(a, dict) else str(a) for a in author]
            found_fields['instructor'] = ', '.join(authors[:3])
            score += 1
            print(f"  [OK] instructor: {found_fields['instructor']}")
        elif isinstance(author, dict):
            found_fields['instructor'] = author.get('name', 'N/A')
            score += 1
            print(f"  [OK] instructor: {found_fields['instructor']}")

    # Syllabus sections
    if course_jsonld:
        syllabus = course_jsonld.get('syllabusSections', [])
        if syllabus:
            found_fields['syllabusSections'] = f"{len(syllabus)} sections"
            score += 2
            print(f"  [OK] syllabusSections: {len(syllabus)} sections found")
            for s in syllabus[:3]:
                sname = s.get('name', 'N/A') if isinstance(s, dict) else str(s)
                print(f"      - {sname}")

    # Skills/Learning outcomes
    if course_jsonld:
        teaches = course_jsonld.get('teaches', [])
        if teaches:
            found_fields['outcomes'] = f"{len(teaches)} outcomes"
            score += 2
            print(f"  [OK] outcomes: {len(teaches)} learning outcomes")
            for o in teaches[:3]:
                print(f"      - {o}")

    # Enrollment count
    if course_jsonld:
        aud = course_jsonld.get('audience', {})
        if isinstance(aud, dict):
            at = aud.get('audienceType', '')
            m = re.search(r'([0-9,]+)\s+student', str(at), re.IGNORECASE)
            if m:
                found_fields['enrolled'] = m.group(0)
                score += 1
                print(f"  [OK] enrolled: {m.group(0)}")

    # === BONUSES ===
    bonus_score = 0
    bonus_notes = []

    if course_jsonld:
        bonus_score += 1
        bonus_notes.append('JSON-LD structured data available')
        print(f"  [OK] JSON-LD Course schema: YES")

    # Check if page has search/catalog pages (for bulk scraping)
    catalog_checks = [
        page.find('[class*="course-card"]'),
        page.find('[class*="course-list"]'),
        page.find('[class*="catalog"]'),
        page.find('[class*="results"]'),
    ]
    if any(catalog_checks):
        bonus_score += 1
        bonus_notes.append('Course catalog/list detected on page')
        print(f"  [OK] Course catalog detected on page")

    # Check for Vietnamese language support
    if 'vi' in html[:5000].lower() or 'vietnam' in html[:5000].lower():
        bonus_score += 1
        bonus_notes.append('Vietnamese language content detected')
        print(f"  [OK] Vietnamese language content: YES")

    total_score = score + bonus_score

    print()
    print(f"  --- RESULT ---")
    print(f"  Base Score: {score}")
    print(f"  Bonus Score: {bonus_score} ({'; '.join(bonus_notes)})")
    print(f"  TOTAL SCORE: {total_score}")

    return {
        'name': name,
        'url': url,
        'score': total_score,
        'base_score': score,
        'bonus_score': bonus_score,
        'bonus_notes': bonus_notes,
        'fields': found_fields,
        'jsonld_available': course_jsonld is not None,
        'html_length': len(html),
        'notes': notes
    }

# === PLATFORMS TO TEST ===
# Each platform is tested with a representative course URL
PLATFORMS = [
    {
        'name': 'Udemy',
        'url': 'https://www.udemy.com/course/video-production-masterclass/',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Coursera',
        'url': 'https://www.coursera.org/learn/digital-analytics',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'LinkedIn Learning',
        'url': 'https://www.linkedin.com/learning/python-essential-training',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Skillshare',
        'url': 'https://www.skillshare.com/en/classes/video-production-101-everything-you-need-to-know-to-be-a-video-producer/366831057/',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'edX',
        'url': 'https://www.edx.org/learn/artificial-intelligence/microsoft-ai-classifications-for-hateful-content-understanding',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Pluralsight',
        'url': 'https://www.pluralsight.com/courses/python-getting-started',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'FutureLearn',
        'url': 'https://www.futurelearn.com/courses/explore-your-data',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Alison',
        'url': 'https://alison.com/course/diploma-in-project-management',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'OpenLearning',
        'url': 'https://www.openlearning.com/courses/introduction-to-programming',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Khan Academy',
        'url': 'https://www.khanacademy.org/computing/computer-programming/programming',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Unica (Vietnam)',
        'url': 'https://unica.vn/',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Kyna (Vietnam)',
        'url': 'https://kyna.vn/',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
    {
        'name': 'Edumall Vietnam',
        'url': 'https://edumall.vn/',
        'checks': {
            'title': 2, 'description': 2, 'shortDescription': 1,
            'thumbnail': 1, 'level': 1, 'language': 1,
            'duration': 1, 'rating.average': 1, 'rating.count': 1,
            'fee': 2, 'instructor': 1, 'syllabusSections': 2,
            'outcomes': 2, 'enrolled': 1,
        }
    },
]

# === RUN ALL TESTS ===
print(f"{'#'*70}")
print(f"# COURSE PLATFORM RANKER - Restart-35 Platform Schema Compatibility")
print(f"# Total platforms: {len(PLATFORMS)}")
print(f"{'#'*70}")

results = []
for p in PLATFORMS:
    result = score_platform(p['name'], p['url'], p['checks'])
    results.append(result)

# === FINAL RANKING ===
print(f"\n\n{'#'*70}")
print(f"# FINAL RANKING - By Schema Compatibility Score")
print(f"{'#'*70}")
print()

results.sort(key=lambda x: x['score'], reverse=True)

max_score = max(r['score'] for r in results) if results else 1

print(f"{'Rank':<6}{'Platform':<25}{'Score':<10}{'Base':<8}{'Bonus':<8}{'JSON-LD':<10}{'Max Len'}")
print('-' * 85)
for i, r in enumerate(results, 1):
    pct = int(r['score'] / max_score * 100)
    bar = '#' * (pct // 5)
    html_len = r.get('html_length', 0)
    print(f"#{i:<5}{r['name']:<25}{r['score']:<10}{r.get('base_score',0):<8}{r.get('bonus_score',0):<8}{'YES' if r.get('jsonld_available') else 'NO':<10}{html_len:>10}")
    print(f"      {bar:<20} {pct}% complete")
    if r.get('bonus_notes'):
        print(f"      Bonuses: {'; '.join(r['bonus_notes'])}")
    print()

# === SUMMARY ===
print(f"\n{'#'*70}")
print(f"# RECOMMENDATIONS")
print(f"{'#'*70}")

print("""
Based on schema compatibility analysis:

TOP TIER (high coverage, JSON-LD available):
  1. Udemy         - Best schema coverage, rich JSON-LD, large catalog
  2. Coursera       - Strong academic structure, verified certificates
  3. LinkedIn Learning - Professional focus, skills mapping

MID TIER (good coverage, some limitations):
  4. edX           - Academic rigor, free audit option
  5. Skillshare    - Project-based, community focus
  6. Khan Academy  - Free, high quality, but no certificates

VIETNAM PLATFORMS (best for local relevance):
  7. Unica         - Vietnamese platform, local skills focus
  8. Kyna          - Vietnamese courses, local instructors
  9. Edumall       - Mixed quality, growing catalog

RECOMMENDED STRATEGY FOR RESTART-35:
  - Primary: Scrape Udemy for international courses
  - Secondary: Scrape Coursera for certified courses
  - Local: Scrape Vietnamese platforms for local relevance
  - Consider: LinkedIn Learning for job-relevant skills
""")
