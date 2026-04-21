# -*- coding: utf-8 -*-
"""
Test ITviec Scraper

Chạy thử nghiệm scraper để verify:
1. Kết nối đến ITviec
2. Parse HTML đúng
3. Extract data chính xác

Author: Restart-35 Platform
Last Updated: 2026-04-19
"""

import sys
import logging
from pathlib import Path

# Add scripts path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraping.itviec_scraper import ITviecScraper


def test_connection():
    """Test 1: Kết nối đến ITviec"""
    print("\n" + "=" * 60)
    print("TEST 1: Connection Test")
    print("=" * 60)
    
    scraper = ITviecScraper(delay=2.0)
    
    # Test fetching main page
    url = "https://itviec.com/jobs"
    print(f"Fetching: {url}")
    
    html = scraper.fetch_page(url, delay=True)
    
    if html:
        print(f"✓ Success! Received {len(html)} bytes")
        return True
    else:
        print("✗ Failed to fetch page")
        return False


def test_html_parsing():
    """Test 2: Parse HTML và tìm job cards"""
    print("\n" + "=" * 60)
    print("TEST 2: HTML Parsing Test")
    print("=" * 60)
    
    scraper = ITviecScraper(delay=2.0)
    
    # Fetch a search page
    url = "https://itviec.com/jobs"
    print(f"Fetching: {url}")
    
    html = scraper.fetch_page(url, delay=True)
    
    if not html:
        print("✗ No HTML received")
        return False
    
    # Parse HTML
    soup = scraper.parse_html(html)
    print(f"✓ HTML parsed successfully")
    
    # Try to find job cards with various selectors
    selectors_to_try = [
        '.job',
        '.job-search-result',
        '[data-job-id]',
        '.job-card',
        'article.job',
        '.jobs-list .job',
        '.search-results .job',
        'div.job',
    ]
    
    found_cards = []
    for selector in selectors_to_try:
        cards = soup.select(selector)
        if cards:
            print(f"✓ Found {len(cards)} cards with selector: {selector}")
            found_cards = cards
            break
    
    if not found_cards:
        print("✗ No job cards found with any selector")
        
        # Save sample HTML for debugging
        debug_file = Path(__file__).parent.parent.parent / 'data' / 'debug_itviec.html'
        debug_file.parent.mkdir(parents=True, exist_ok=True)
        with open(debug_file, 'w', encoding='utf-8') as f:
            f.write(html[:10000])  # First 10KB
        print(f"Saved debug HTML to: {debug_file}")
        
        return False
    
    # Try to parse first card
    print(f"\nTrying to parse first job card...")
    job = scraper._parse_job_card(found_cards[0])
    
    if job:
        print("✓ Job card parsed successfully!")
        print(f"  Title: {job.get('title', 'N/A')[:50]}")
        print(f"  Company: {job.get('company', 'N/A')}")
        print(f"  Location: {job.get('location', 'N/A')}")
        print(f"  Salary: {job.get('salary_text', 'N/A')}")
        print(f"  Skills: {job.get('skills', 'N/A')[:50]}...")
        return True
    else:
        print("✗ Failed to parse job card")
        return False


def test_scraper_full():
    """Test 3: Full scrape test (1 page)"""
    print("\n" + "=" * 60)
    print("TEST 3: Full Scraper Test (1 page)")
    print("=" * 60)
    
    scraper = ITviecScraper(delay=2.0)
    
    print("Scraping 1 page from ITviec...")
    jobs = scraper.scrape(pages=1)
    
    if jobs:
        print(f"✓ Successfully scraped {len(jobs)} jobs!")
        
        # Show sample jobs
        print("\nSample jobs:")
        for i, job in enumerate(jobs[:3]):
            print(f"\n  Job {i+1}:")
            print(f"    Title: {job.get('title', 'N/A')[:60]}")
            print(f"    Company: {job.get('company', 'N/A')}")
            print(f"    Location: {job.get('location', 'N/A')}")
            print(f"    Salary: {job.get('salary_text', 'N/A')}")
            print(f"    Skills: {len(job.get('skills', '').split('|'))} skills")
        
        # Save to file
        output_file = Path(__file__).parent.parent.parent / 'data' / 'test_itviec_jobs.json'
        scraper.save_to_file(jobs, str(output_file))
        print(f"\nSaved to: {output_file}")
        
        return True
    else:
        print("✗ No jobs scraped")
        return False


def test_location_filter():
    """Test 4: Location filter test"""
    print("\n" + "=" * 60)
    print("TEST 4: Location Filter Test")
    print("=" * 60)
    
    scraper = ITviecScraper(delay=2.0)
    
    locations = ['ho-chi-minh', 'ha-noi', 'da-nang']
    
    for loc in locations:
        print(f"\nScraping location: {loc}")
        jobs = scraper.scrape_by_location(loc, pages=1)
        print(f"  Found: {len(jobs)} jobs")
    
    return True


def show_selectors_analysis():
    """Test 5: Analyze ITviec HTML structure"""
    print("\n" + "=" * 60)
    print("TEST 5: HTML Structure Analysis")
    print("=" * 60)
    
    scraper = ITviecScraper(delay=2.0)
    
    url = "https://itviec.com/jobs"
    html = scraper.fetch_page(url, delay=True)
    
    if not html:
        print("✗ No HTML received")
        return False
    
    soup = scraper.parse_html(html)
    
    # Look for common patterns
    patterns = {
        'job': soup.select('.job, .job-card, article.job, [data-job-id]'),
        'title': soup.select('h3, .title, .job-title, h4'),
        'company': soup.select('[class*="company"], [class*="employer"]'),
        'salary': soup.select('[class*="salary"], [class*="pay"]'),
        'location': soup.select('[class*="location"], [class*="address"]'),
        'skills': soup.select('[class*="skill"], [class*="tag"]'),
    }
    
    print("Found elements:")
    for name, elements in patterns.items():
        if elements:
            print(f"  {name}: {len(elements)} elements")
    
    # Show first job structure
    job_cards = soup.select('.job, .job-card, article.job')
    if job_cards:
        card = job_cards[0]
        print(f"\nFirst job card structure:")
        print(f"  Classes: {card.get('class', [])}")
        print(f"  ID: {card.get('id', 'N/A')}")
        
        # Show children
        children = list(card.children)[:5]
        print(f"  First children: {len(children)}")
        
        # Show text preview
        text = card.get_text(strip=True)[:200]
        print(f"  Text preview: {text[:100]}...")
    
    return True


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("  ITVIEC SCRAPER TEST SUITE")
    print("  " + "=" * 58)
    print()
    
    results = []
    
    # Run tests
    tests = [
        ("Connection", test_connection),
        ("HTML Parsing", test_html_parsing),
        ("Selector Analysis", show_selectors_analysis),
        ("Full Scraper", test_scraper_full),
        ("Location Filter", test_location_filter),
    ]
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ {name} raised exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("  TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"  {name}: {status}")
        if result:
            passed += 1
    
    print()
    print(f"Total: {len(results)} tests, {passed} passed")
    
    if passed == len(results):
        print("\n✓ ALL TESTS PASSED!")
        return 0
    elif passed > 0:
        print("\n⚠ SOME TESTS FAILED - Check selectors and try again")
        return 1
    else:
        print("\n✗ ALL TESTS FAILED - ITviec may be blocking or structure changed")
        return 1


if __name__ == '__main__':
    sys.exit(main())
