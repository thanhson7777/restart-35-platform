# -*- coding: utf-8 -*-
"""
Playwright Inspector - Sử dụng Playwright để render JavaScript và inspect HTML

Script này cần:
    pip install playwright
    playwright install chromium

Usage:
    python playwright_inspector.py --source topcv
    python playwright_inspector.py --source all

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
from bs4 import BeautifulSoup

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def try_import_playwright():
    """Try to import playwright, install if not available"""
    try:
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        logger.warning("Playwright not installed. Installing...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
        try:
            from playwright.sync_api import sync_playwright
            return True
        except:
            return False


class PlaywrightInspector:
    """
    Inspector sử dụng Playwright để render JavaScript
    """
    
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        
        if not try_import_playwright():
            logger.error("Cannot import playwright. Please install manually:")
            logger.error("  pip install playwright")
            logger.error("  playwright install chromium")
            sys.exit(1)
        
        from playwright.sync_api import sync_playwright
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        self.page = self.context.new_page()
        
        # Set default timeout
        self.page.set_default_timeout(30000)
    
    def close(self):
        """Close browser"""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
    
    def fetch_page(self, url: str, wait_for: str = None) -> Optional[str]:
        """
        Fetch page với JavaScript rendering
        
        Args:
            url: URL to fetch
            wait_for: Selector to wait for (e.g., '.job-item')
            
        Returns:
            HTML content
        """
        logger.info(f"Fetching: {url}")
        
        try:
            response = self.page.goto(url, wait_until='networkidle')
            logger.info(f"Status: {response.status if response else 'N/A'}")
            
            # Wait for content to load
            if wait_for:
                try:
                    self.page.wait_for_selector(wait_for, timeout=10000)
                    logger.info(f"Waited for: {wait_for}")
                except Exception as e:
                    logger.warning(f"Selector not found: {wait_for}")
                    # Wait a bit anyway
                    self.page.wait_for_timeout(3000)
            else:
                # Wait for network to be idle
                self.page.wait_for_timeout(3000)
            
            # Get HTML
            html = self.page.content()
            logger.info(f"Got {len(html):,} characters")
            
            return html
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def find_selectors(self, html: str, source: str) -> Dict:
        """
        Tìm các selectors từ HTML
        
        Args:
            html: HTML content
            source: Source name
            
        Returns:
            Dict chứa selectors
        """
        soup = BeautifulSoup(html, 'html.parser')
        
        result = {
            'source': source,
            'total_tags': len(soup.find_all()),
            'job_cards': [],
            'job_titles': [],
            'salary_elements': [],
            'location_elements': [],
            'company_elements': [],
            'links': [],
        }
        
        # Common patterns for job sites
        patterns = [
            'job', 'item', 'card', 'listing', 'list', 'result', 
            'vacancy', 'position', 'search-result'
        ]
        
        # Find job cards
        for pattern in patterns:
            elements = soup.find_all(class_=lambda c: c and pattern in c.lower())
            if elements:
                for el in elements[:10]:
                    classes = el.get('class', [])
                    tag = el.name
                    text = el.get_text(strip=True)[:80]
                    result['job_cards'].append({
                        'tag': tag,
                        'class': ' '.join(classes),
                        'text_preview': text
                    })
        
        # Find job titles (usually <h3>, <h4>, <a> with job in class)
        title_elements = soup.find_all(['h1', 'h2', 'h3', 'h4', 'a'], 
                                     class_=lambda c: c and any(p in c.lower() for p in patterns))
        for el in title_elements[:20]:
            text = el.get_text(strip=True)
            if text and len(text) > 5 and len(text) < 150:
                result['job_titles'].append({
                    'tag': el.name,
                    'class': ' '.join(el.get('class', [])),
                    'text': text
                })
        
        # Find salary elements
        salary_elements = soup.find_all(class_=lambda c: c and 'salary' in ' '.join(c).lower())
        for el in salary_elements[:10]:
            text = el.get_text(strip=True)
            if text:
                result['salary_elements'].append({
                    'tag': el.name,
                    'class': ' '.join(el.get('class', [])),
                    'text': text[:50]
                })
        
        # Find location elements
        location_elements = soup.find_all(class_=lambda c: c and 'location' in ' '.join(c).lower())
        for el in location_elements[:10]:
            text = el.get_text(strip=True)
            if text:
                result['location_elements'].append({
                    'tag': el.name,
                    'class': ' '.join(el.get('class', [])),
                    'text': text[:50]
                })
        
        # Find company elements
        company_elements = soup.find_all(class_=lambda c: c and 'company' in ' '.join(c).lower())
        for el in company_elements[:10]:
            text = el.get_text(strip=True)
            if text:
                result['company_elements'].append({
                    'tag': el.name,
                    'class': ' '.join(el.get('class', [])),
                    'text': text[:50]
                })
        
        # Find links that look like job links
        all_links = soup.find_all('a', href=True)
        for link in all_links[:50]:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            classes = ' '.join(link.get('class', []))
            
            # Check if it looks like a job link
            if any(p in (href + text + classes).lower() for p in patterns):
                if text and len(text) > 3:
                    result['links'].append({
                        'text': text[:60],
                        'href': href[:80],
                        'class': classes[:60]
                    })
        
        return result
    
    def inspect_topcv(self) -> Dict:
        """Inspect TopCV"""
        logger.info("=" * 60)
        logger.info("INSPECTING TOPCV (with Playwright)")
        logger.info("=" * 60)
        
        html = self.fetch_page("https://topcv.vn/viec-lam", wait_for=None)
        
        if not html:
            return {}
        
        # Save HTML
        output_dir = Path(__file__).parent / 'inspect'
        output_dir.mkdir(exist_ok=True)
        
        with open(output_dir / 'topcv_rendered.html', 'w', encoding='utf-8') as f:
            f.write(html)
        logger.info(f"Saved rendered HTML to inspect/topcv_rendered.html")
        
        result = self.find_selectors(html, 'TopCV')
        result['url'] = 'https://topcv.vn/viec-lam'
        
        return result
    
    def inspect_vietnamworks(self) -> Dict:
        """Inspect VietnamWorks"""
        logger.info("=" * 60)
        logger.info("INSPECTING VIETNAMWORKS (with Playwright)")
        logger.info("=" * 60)
        
        html = self.fetch_page("https://www.vietnamworks.com/viec-lam", wait_for=None)
        
        if not html:
            return {}
        
        result = self.find_selectors(html, 'VietnamWorks')
        result['url'] = 'https://www.vietnamworks.com/viec-lam'
        
        return result
    
    def inspect_careerbuilder(self) -> Dict:
        """Inspect CareerBuilder"""
        logger.info("=" * 60)
        logger.info("INSPECTING CAREERBUILDER (with Playwright)")
        logger.info("=" * 60)
        
        html = self.fetch_page("https://careerbuilder.vn/viec-lam", wait_for=None)
        
        if not html:
            return {}
        
        result = self.find_selectors(html, 'CareerBuilder')
        result['url'] = 'https://careerbuilder.vn/viec-lam'
        
        return result
    
    def print_results(self, results: List[Dict]) -> None:
        """Print inspection results"""
        for result in results:
            if not result:
                continue
                
            print("\n" + "=" * 70)
            print(f"RESULTS: {result.get('source', 'Unknown')}")
            print("=" * 70)
            
            print(f"\nURL: {result.get('url', 'N/A')}")
            print(f"Total tags: {result.get('total_tags', 0):,}")
            
            # Job cards
            print("\n--- JOB CARD ELEMENTS ---")
            for i, card in enumerate(result.get('job_cards', [])[:5], 1):
                print(f"  {i}. <{card['tag']} class='{card['class'][:60]}'>")
                if card['text_preview']:
                    print(f"      Text: {card['text_preview'][:60]}...")
            
            # Job titles
            print("\n--- JOB TITLES ---")
            for i, title in enumerate(result.get('job_titles', [])[:10], 1):
                print(f"  {i}. <{title['tag']} class='{title['class'][:40]}'>")
                print(f"      Text: {title['text'][:60]}")
            
            # Salary
            if result.get('salary_elements'):
                print("\n--- SALARY ELEMENTS ---")
                for elem in result.get('salary_elements', [])[:5]:
                    print(f"  <{elem['tag']} class='{elem['class']}'> {elem['text']}")
            
            # Location
            if result.get('location_elements'):
                print("\n--- LOCATION ELEMENTS ---")
                for elem in result.get('location_elements', [])[:5]:
                    print(f"  <{elem['tag']} class='{elem['class']}'> {elem['text']}")
            
            # Company
            if result.get('company_elements'):
                print("\n--- COMPANY ELEMENTS ---")
                for elem in result.get('company_elements', [])[:5]:
                    print(f"  <{elem['tag']} class='{elem['class']}'> {elem['text']}")
            
            # Links
            if result.get('links'):
                print("\n--- JOB LINKS ---")
                for i, link in enumerate(result.get('links', [])[:8], 1):
                    print(f"  {i}. {link['text'][:50]}")
                    print(f"      href: {link['href'][:60]}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Playwright HTML Inspector')
    parser.add_argument('--source', '-s', 
                       choices=['vnw', 'cb', 'topcv', 'all'],
                       default='all',
                       help='Website to inspect')
    args = parser.parse_args()
    
    inspector = PlaywrightInspector()
    results = []
    
    try:
        if args.source == 'vnw':
            result = inspector.inspect_vietnamworks()
            if result:
                results.append(result)
                
        elif args.source == 'cb':
            result = inspector.inspect_careerbuilder()
            if result:
                results.append(result)
                
        elif args.source == 'topcv':
            result = inspector.inspect_topcv()
            if result:
                results.append(result)
                
        else:  # all
            result = inspector.inspect_vietnamworks()
            if result:
                results.append(result)
            
            result = inspector.inspect_careerbuilder()
            if result:
                results.append(result)
            
            result = inspector.inspect_topcv()
            if result:
                results.append(result)
        
        # Print results
        inspector.print_results(results)
        
        # Save results
        output_dir = Path(__file__).parent / 'inspect'
        output_dir.mkdir(exist_ok=True)
        
        report_file = output_dir / 'playwright_inspection_report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print("\n" + "=" * 70)
        print("INSPECTION COMPLETE")
        print("=" * 70)
        print(f"\nSaved report to: {report_file}")
        print("\nNext steps:")
        print("1. Check the rendered HTML file for actual structure")
        print("2. Update selectors in scraper files based on findings")
        print("3. Run scrapers again")
        
    finally:
        inspector.close()


if __name__ == '__main__':
    main()
