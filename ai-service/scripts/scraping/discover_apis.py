# -*- coding: utf-8 -*-
"""
API Discovery Script - Khám phá hidden JSON APIs của TopCV & CareerBuilder

Sử dụng Playwright để navigate trang, monitor network requests,
filter JSON API calls, và extract API patterns.

Usage:
    python discover_apis.py --source topcv
    python discover_apis.py --source careerbuilder
    python discover_apis.py --source all
"""

import argparse
import json
import re
import sys
import time
import logging
from typing import Dict, List, Set, Optional, Any
from urllib.parse import urlparse, parse_qs

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================
# API Test Patterns
# ============================================================

TOPCV_API_PATTERNS = [
    # Search APIs
    ('POST', 'https://www.topcv.vn/api/job/search', {
        'keyword': 'data analyst',
        'page': 1,
        'page_size': 20,
    }),
    ('POST', 'https://www.topcv.vn/api/v4/job/search', {
        'keyword': '',
        'page': 1,
        'page_size': 20,
    }),
    ('POST', 'https://www.topcv.vn/api/job/search-full-text', {
        'keyword': 'data analyst',
        'page': 1,
    }),
    ('GET', 'https://www.topcv.vn/api/job/search', None),
    ('POST', 'https://www.topcv.vn/api/v2/search', {
        'query': 'data analyst',
        'page': 1,
        'limit': 20,
    }),
    ('POST', 'https://www.topcv.vn/api/v3/search', {
        'keyword': '',
        'page': 1,
        'limit': 20,
    }),
    # Job detail APIs
    ('GET', 'https://www.topcv.vn/api/job/detail/{}', None),
    ('GET', 'https://www.topcv.vn/api/v1/job/{}', None),
    # Company APIs
    ('GET', 'https://www.topcv.vn/api/company/{}', None),
    ('GET', 'https://www.topcv.vn/api/company/jobs/{}', None),
    # Category/tag APIs
    ('GET', 'https://www.topcv.vn/api/categories', None),
    ('GET', 'https://www.topcv.vn/api/tags', None),
    ('GET', 'https://www.topcv.vn/api/v1/categories', None),
]

CAREERBUILDER_API_PATTERNS = [
    # Search APIs
    ('POST', 'https://careerbuilder.vn/api/vi/search', {
        'keyword': 'data analyst',
        'page': 1,
        'page_size': 20,
    }),
    ('POST', 'https://careerbuilder.vn/api/v2/search', {
        'query': 'data analyst',
        'page': 1,
        'limit': 20,
    }),
    ('GET', 'https://careerbuilder.vn/api/search', None),
    ('POST', 'https://careerbuilder.vn/api/jobs/search', {
        'keyword': 'data analyst',
        'page': 0,
        'size': 20,
    }),
    ('POST', 'https://careerbuilder.vn/api/v1/search', {
        'keyword': '',
        'page': 1,
        'limit': 20,
    }),
    # Job detail
    ('GET', 'https://careerbuilder.vn/api/job/{}', None),
    ('GET', 'https://careerbuilder.vn/api/v1/job/{}', None),
    # Category
    ('GET', 'https://careerbuilder.vn/api/categories', None),
    ('GET', 'https://careerbuilder.vn/api/v1/categories', None),
    # Recom APIs
    ('GET', 'https://careerbuilder.vn/api/recommended-jobs', None),
]


# ============================================================
# Playwright-based API Discovery
# ============================================================

def discover_with_playwright(target_url: str, source: str) -> Dict[str, Any]:
    """
    Use Playwright to navigate and capture network requests.

    Args:
        target_url: URL to navigate to
        source: Source name (topcv/careerbuilder)

    Returns:
        Dict of discovered API endpoints
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.warning("Playwright not installed, using requests fallback")
        return {}

    results = {
        'source': source,
        'url': target_url,
        'api_endpoints': [],
        'json_responses': [],
        'xhr_requests': [],
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )

        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            locale='vi-VN',
            extra_http_headers={
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'application/json, text/plain, */*',
            },
        )

        page = context.new_page()

        # Capture XHR/Fetch requests
        xhr_requests = []
        json_responses = []

        def handle_request(request):
            url = request.url
            method = request.method

            # Filter for API-like requests
            if any(x in url.lower() for x in ['/api/', '/v1/', '/v2/', '/v3/', '/v4/', '/search', '/job']):
                if urlparse(url).netloc == urlparse(target_url).netloc or 'topcv' in url or 'careerbuilder' in url:
                    req_info = {
                        'url': url,
                        'method': method,
                        'resource_type': request.resource_type,
                        'headers': dict(request.headers),
                    }
                    xhr_requests.append(req_info)

        def handle_response(response):
            url = response.url
            content_type = response.headers.get('content-type', '')

            # Check for JSON response
            if 'json' in content_type.lower() or any(x in url.lower() for x in ['/api/', '/v1/', '/v2/']):
                try:
                    body = response.text()
                    if body and len(body) > 10:
                        # Try to parse as JSON
                        try:
                            json_data = json.loads(body)
                            json_responses.append({
                                'url': url,
                                'status': response.status,
                                'preview': _truncate_json(json_data, 300),
                                'keys': list(json_data.keys()) if isinstance(json_data, dict) else type(json_data).__name__,
                            })
                        except json.JSONDecodeError:
                            # Might be HTML or other text
                            pass
                except Exception:
                    pass

        page.on('request', handle_request)
        page.on('response', handle_response)

        try:
            logger.info(f"Navigating to {target_url}...")
            page.goto(target_url, timeout=30000, wait_until='networkidle')
            page.wait_for_timeout(3000)  # Wait for dynamic content
        except Exception as e:
            logger.warning(f"Navigation error: {e}")

        # Try search functionality if on homepage
        try:
            search_input = page.query_selector('input[type="text"], input[name*="search"], input[name*="keyword"]')
            if search_input:
                search_input.fill('data analyst')
                page.wait_for_timeout(500)

                submit_btn = page.query_selector('button[type="submit"], button:has-text("Tìm")')
                if submit_btn:
                    submit_btn.click()
                    page.wait_for_timeout(3000)
        except Exception:
            pass

        results['xhr_requests'] = xhr_requests
        results['json_responses'] = json_responses
        results['total_xhr'] = len(xhr_requests)
        results['total_json'] = len(json_responses)

        browser.close()

    return results


def _truncate_json(data: Any, max_len: int) -> str:
    """Truncate JSON data for preview."""
    try:
        text = json.dumps(data, ensure_ascii=False, default=str)
        if len(text) > max_len:
            return text[:max_len] + '...'
        return text
    except Exception:
        return str(data)[:max_len]


# ============================================================
# HTTP-based API Testing
# ============================================================

def test_api_endpoints(
    patterns: List[tuple],
    source: str,
    timeout: int = 15
) -> Dict[str, Any]:
    """
    Test a list of API patterns.

    Args:
        patterns: List of (method, url, body) tuples
        source: Source name

    Returns:
        Dict of test results
    """
    import requests

    results = {
        'source': source,
        'tested': [],
        'working': [],
        'failed': [],
    }

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/json',
        'Origin': 'https://www.topcv.vn' if 'topcv' in source else 'https://careerbuilder.vn',
        'Referer': 'https://www.topcv.vn/' if 'topcv' in source else 'https://careerbuilder.vn/',
        'X-Requested-With': 'XMLHttpRequest',
    }

    session = requests.Session()
    session.headers.update(headers)

    for method, url, body in patterns:
        try:
            logger.info(f"Testing {method} {url[:80]}...")

            if method == 'POST':
                response = session.post(url, json=body, timeout=timeout)
            else:
                response = session.get(url, timeout=timeout)

            result = {
                'method': method,
                'url': url,
                'status': response.status_code,
                'content_type': response.headers.get('content-type', ''),
                'content_length': len(response.content),
            }

            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'json' in content_type.lower():
                    try:
                        data = response.json()
                        result['data'] = _truncate_json(data, 500)
                        result['keys'] = list(data.keys()) if isinstance(data, dict) else type(data).__name__
                        result['sample_count'] = len(data.get('data', data.get('jobs', [])))
                        results['working'].append(result)
                    except json.JSONDecodeError:
                        result['error'] = 'Invalid JSON'
                        results['failed'].append(result)
                else:
                    result['preview'] = response.text[:200]
                    results['failed'].append(result)
            else:
                result['error'] = f"HTTP {response.status_code}"
                results['failed'].append(result)

            results['tested'].append({
                'method': method,
                'url': url,
                'status': response.status_code,
            })

            time.sleep(0.5)  # Be polite

        except requests.exceptions.Timeout:
            result = {'method': method, 'url': url, 'error': 'Timeout'}
            results['failed'].append(result)
        except requests.exceptions.ConnectionError as e:
            result = {'method': method, 'url': url, 'error': f'ConnectionError: {e}'}
            results['failed'].append(result)
        except Exception as e:
            result = {'method': method, 'url': url, 'error': str(e)}
            results['failed'].append(result)

    return results


# ============================================================
# HTML Analysis
# ============================================================

def analyze_html_api_hints(html: str) -> List[Dict]:
    """Extract API hints from HTML source."""
    hints = []

    # Look for JSON data embedded in HTML
    patterns = [
        r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
        r'window\.__NEXT_DATA__\s*=\s*({.*?});',
        r'<script type="application/json">(.*?)</script>',
        r'"apiUrl"\s*:\s*"([^"]+)"',
        r'"api_url"\s*:\s*"([^"]+)"',
        r'"baseUrl"\s*:\s*"([^"]+)"',
        r'fetch\(["\']([^"\']+/api/[^"\']+)["\']',
        r'axios\.[a-z]+\(["\']([^"\']+/api/[^"\']+)["\']',
        r'URL\s*=\s*["\']([^"\']*api[^"\']*)["\']',
        r'endpoint\s*:\s*["\']([^"\']+)["\']',
        r'apiEndpoint\s*:\s*["\']([^"\']+)["\']',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, html, re.DOTALL | re.IGNORECASE)
        for m in matches[:5]:  # Limit to 5 matches per pattern
            hints.append({
                'pattern': pattern[:50],
                'match': m[:200] if isinstance(m, str) else str(m)[:200],
            })

    return hints


# ============================================================
# Main Discovery Functions
# ============================================================

def discover_topcv():
    """Discover TopCV APIs."""
    logger.info("=" * 60)
    logger.info("DISCOVERING TopCV APIs")
    logger.info("=" * 60)

    source = 'topcv'
    base_url = 'https://www.topcv.vn'

    # Step 1: Try Playwright to capture live requests
    logger.info("\n--- Step 1: Playwright Network Capture ---")
    pw_results = discover_with_playwright(
        f"{base_url}/viec-lam/data-analyst",
        source
    )

    if pw_results.get('total_xhr', 0) > 0:
        logger.info(f"Captured {pw_results['total_xhr']} XHR/API requests")
        for req in pw_results['xhr_requests'][:10]:
            logger.info(f"  {req['method']} {req['url'][:100]}")

    if pw_results.get('total_json', 0) > 0:
        logger.info(f"Found {pw_results['total_json']} JSON responses")
        for resp in pw_results['json_responses'][:5]:
            logger.info(f"  [{resp['status']}] {resp['url'][:80]}")
            if 'keys' in resp:
                logger.info(f"    Keys: {resp['keys']}")

    # Step 2: Test known API patterns
    logger.info("\n--- Step 2: Testing Known API Patterns ---")
    api_results = test_api_endpoints(TOPCV_API_PATTERNS, source)

    logger.info(f"\nTested: {len(api_results['tested'])} endpoints")
    logger.info(f"Working: {len(api_results['working'])}")
    logger.info(f"Failed: {len(api_results['failed'])}")

    if api_results['working']:
        logger.info("\n--- WORKING APIs ---")
        for r in api_results['working']:
            logger.info(f"  [{r['status']}] {r['method']} {r['url'][:80]}")
            if 'keys' in r:
                logger.info(f"    Response keys: {r['keys']}")
            if 'sample_count' in r:
                logger.info(f"    Sample count: {r['sample_count']}")
            if 'data' in r:
                logger.info(f"    Preview: {r['data'][:300]}")

    # Step 3: Analyze HTML for API hints
    logger.info("\n--- Step 3: HTML Analysis ---")
    import requests
    resp = requests.get(f"{base_url}/", timeout=15)
    hints = analyze_html_api_hints(resp.text)
    logger.info(f"Found {len(hints)} API hints in HTML")
    for hint in hints[:5]:
        logger.info(f"  Pattern: {hint['pattern']}")
        logger.info(f"  Match: {hint['match'][:150]}")

    # Return best working API
    if api_results['working']:
        best = api_results['working'][0]
        return {
            'success': True,
            'source': source,
            'working_api': {
                'url': best['url'],
                'method': best['method'],
                'keys': best.get('keys', ''),
                'sample_count': best.get('sample_count', 0),
                'preview': best.get('data', '')[:500],
            },
            'all_working': api_results['working'],
            'xhr_requests': pw_results.get('xhr_requests', []),
        }

    return {'success': False, 'source': source, 'error': 'No working API found'}


def discover_careerbuilder():
    """Discover CareerBuilder APIs."""
    logger.info("=" * 60)
    logger.info("DISCOVERING CareerBuilder APIs")
    logger.info("=" * 60)

    source = 'careerbuilder'
    base_url = 'https://careerbuilder.vn'

    # Step 1: Try Playwright
    logger.info("\n--- Step 1: Playwright Network Capture ---")
    pw_results = discover_with_playwright(
        f"{base_url}/vi/tim-viec-lam",
        source
    )

    if pw_results.get('total_xhr', 0) > 0:
        logger.info(f"Captured {pw_results['total_xhr']} XHR/API requests")
        for req in pw_results['xhr_requests'][:10]:
            logger.info(f"  {req['method']} {req['url'][:100]}")

    if pw_results.get('total_json', 0) > 0:
        logger.info(f"Found {pw_results['total_json']} JSON responses")
        for resp in pw_results['json_responses'][:5]:
            logger.info(f"  [{resp['status']}] {resp['url'][:80]}")

    # Step 2: Test known patterns
    logger.info("\n--- Step 2: Testing Known API Patterns ---")
    api_results = test_api_endpoints(CAREERBUILDER_API_PATTERNS, source)

    logger.info(f"\nTested: {len(api_results['tested'])} endpoints")
    logger.info(f"Working: {len(api_results['working'])}")
    logger.info(f"Failed: {len(api_results['failed'])}")

    if api_results['working']:
        logger.info("\n--- WORKING APIs ---")
        for r in api_results['working']:
            logger.info(f"  [{r['status']}] {r['method']} {r['url'][:80]}")
            if 'keys' in r:
                logger.info(f"    Response keys: {r['keys']}")
            if 'data' in r:
                logger.info(f"    Preview: {r['data'][:300]}")

    if api_results['working']:
        best = api_results['working'][0]
        return {
            'success': True,
            'source': source,
            'working_api': {
                'url': best['url'],
                'method': best['method'],
                'keys': best.get('keys', ''),
                'preview': best.get('data', '')[:500],
            },
            'all_working': api_results['working'],
            'xhr_requests': pw_results.get('xhr_requests', []),
        }

    return {'success': False, 'source': source, 'error': 'No working API found'}


# ============================================================
# Main Entry Point
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='API Discovery for TopCV & CareerBuilder')
    parser.add_argument('--source', choices=['topcv', 'careerbuilder', 'all'], default='all',
                        help='Which source to discover')
    parser.add_argument('--output', help='Save results to JSON file')

    args = parser.parse_args()

    all_results = {}

    if args.source in ['topcv', 'all']:
        result = discover_topcv()
        all_results['topcv'] = result

        if result.get('success'):
            logger.info(f"\n[SUCCESS] TopCV API found: {result['working_api']['url']}")
        else:
            logger.warning(f"\n[FAILED] TopCV: {result.get('error', 'Unknown error')}")

    if args.source in ['careerbuilder', 'all']:
        result = discover_careerbuilder()
        all_results['careerbuilder'] = result

        if result.get('success'):
            logger.info(f"\n[SUCCESS] CareerBuilder API found: {result['working_api']['url']}")
        else:
            logger.warning(f"\n[FAILED] CareerBuilder: {result.get('error', 'Unknown error')}")

    # Save results
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
        logger.info(f"\nResults saved to {args.output}")

    return all_results


if __name__ == '__main__':
    main()
