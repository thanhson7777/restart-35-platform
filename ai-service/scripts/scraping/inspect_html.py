# -*- coding: utf-8 -*-
"""
HTML Inspector - Debug và tìm CSS selectors đúng cho các trang web

Script này giúp:
1. Fetch HTML từ các trang tuyển dụng
2. Phân tích cấu trúc HTML
3. Tìm các selectors tiềm năng cho job cards
4. Suggest selectors dựa trên patterns

Usage:
    python inspect_html.py                    # Inspect all sources
    python inspect_html.py --source topcv   # Inspect specific source
    python inspect_html.py --save-html      # Save HTML to files

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import sys
import re
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from collections import Counter
from bs4 import BeautifulSoup
import requests

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HTMLInspector:
    """
    Inspector class để phân tích HTML và tìm selectors
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        })
    
    def fetch_html(self, url: str) -> str:
        """Fetch HTML từ URL"""
        logger.info(f"Fetching: {url}")
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # Handle compressed content
            content = response.content
            if response.apparent_encoding:
                try:
                    html = content.decode(response.apparent_encoding)
                except:
                    try:
                        html = content.decode('utf-8')
                    except:
                        try:
                            html = content.decode('latin-1')
                        except:
                            html = content.decode('utf-8', errors='ignore')
            else:
                try:
                    html = content.decode('utf-8')
                except:
                    html = content.decode('utf-8', errors='ignore')
            
            logger.info(f"Fetched {len(html):,} characters")
            return html
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return ""
    
    def save_html(self, html: str, filename: str) -> bool:
        """Lưu HTML vào file"""
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html)
            logger.info(f"Saved HTML to {output_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving HTML: {e}")
            return False
    
    def analyze_html(self, html: str, source: str) -> dict:
        """
        Phân tích HTML và tìm potential selectors
        
        Args:
            html: HTML content
            source: Tên nguồn
            
        Returns:
            Dict chứa phân tích
        """
        soup = BeautifulSoup(html, 'html.parser')
        
        analysis = {
            'source': source,
            'url': '',
            'total_tags': 0,
            'potential_selectors': [],
            'job_card_candidates': [],
            'common_classes': [],
            'common_ids': [],
            'suggestions': {},
            'json_data_found': [],
            'data_attributes': [],
        }
        
        # Count tags
        all_tags = soup.find_all()
        analysis['total_tags'] = len(all_tags)
        
        # Tìm JSON data trong scripts
        scripts = soup.find_all('script')
        for script in scripts:
            script_text = script.string or ''
            if script_text.strip():
                # Tìm JSON patterns
                json_matches = re.findall(r'\{[^{}]*"jobs"[^{}]*\}', script_text)
                if json_matches:
                    analysis['json_data_found'].extend(json_matches[:2])
                
                # Tìm array patterns
                if any(keyword in script_text.lower() for keyword in ['data', 'items', 'listings', 'jobs']):
                    if len(script_text) > 100 and len(script_text) < 50000:
                        analysis['json_data_found'].append({
                            'length': len(script_text),
                            'preview': script_text[:500]
                        })
        
        # Tìm data-* attributes
        for tag in soup.find_all(attrs=True):
            for attr in tag.attrs:
                if attr.startswith('data-'):
                    value = str(tag[attr])[:100]
                    if len(value) > 5:
                        analysis['data_attributes'].append({
                            'attribute': attr,
                            'value': value,
                            'tag': tag.name,
                        })
        
        # Tìm scripts với JSON data (quan trọng cho JavaScript-rendered pages)
        for script in soup.find_all('script', type='application/json'):
            try:
                import json
                data = json.loads(script.string)
                analysis['json_data_found'].append({
                    'type': 'application/json',
                    'keys': list(data.keys()) if isinstance(data, dict) else type(data).__name__
                })
            except:
                pass
        
        # Find common class patterns
        classes = []
        for tag in all_tags[:1000]:  # Limit for performance
            if tag.get('class'):
                classes.extend(tag.get('class'))
        
        # Most common classes
        class_counts = Counter(classes)
        analysis['common_classes'] = [
            {'class': cls, 'count': count}
            for cls, count in class_counts.most_common(30)
        ]
        
        # Tìm potential job card elements
        job_card_patterns = [
            'job', 'item', 'card', 'listing', 'list', 'result', 
            'vacancy', 'position', 'search-result', 'search_result'
        ]
        
        potential_cards = []
        for pattern in job_card_patterns:
            # Tìm elements có class chứa pattern
            elements = soup.find_all(class_=re.compile(pattern, re.I))
            if elements:
                potential_cards.extend([
                    {
                        'tag': str(el.name),
                        'class': ' '.join(el.get('class', [])),
                        'text_preview': el.get_text(strip=True)[:100]
                    }
                    for el in elements[:5]
                ])
        
        analysis['job_card_candidates'] = potential_cards[:20]
        
        # Tìm links (job links thường là <a> với job-related classes)
        links = soup.find_all('a')
        job_links = []
        for link in links[:50]:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            classes = link.get('class', [])
            classes_str = ' '.join(classes) if classes else ''
            
            # Check if it looks like a job link
            if any(p in (href + text + classes_str).lower() for p in job_card_patterns):
                job_links.append({
                    'text': text[:80],
                    'href': href[:100],
                    'classes': classes_str[:100]
                })
        
        analysis['job_links'] = job_links[:15]
        
        # Phân tích structure
        analysis['structure'] = self._analyze_structure(soup)
        
        # Tìm patterns cho các fields
        analysis['field_patterns'] = self._find_field_patterns(soup)
        
        return analysis
    
    def _analyze_structure(self, soup: BeautifulSoup) -> dict:
        """Phân tích cấu trúc HTML"""
        structure = {
            'top_level_tags': {},
            'div_count': 0,
            'section_count': 0,
            'ul_count': 0,
            'li_count': 0,
        }
        
        # Count main tags
        for tag in ['div', 'section', 'article', 'ul', 'li', 'span', 'a', 'h1', 'h2', 'h3', 'h4', 'p']:
            count = len(soup.find_all(tag))
            if count > 0:
                structure[f'{tag}_count'] = count
        
        # Tìm main content area
        main_content = soup.find(['main', 'div', 'section'], 
                                class_=re.compile(r'(main|content|container|body|jobs|listings)', re.I))
        
        if main_content:
            structure['main_content_tag'] = str(main_content.name)
            structure['main_content_classes'] = ' '.join(main_content.get('class', []))
        
        return structure
    
    def _find_field_patterns(self, soup: BeautifulSoup) -> dict:
        """Tìm patterns cho các fields như salary, location, company"""
        patterns = {
            'salary': [],
            'location': [],
            'company': [],
            'title': [],
            'skills': [],
        }
        
        # Salary patterns
        salary_elements = soup.find_all(class_=re.compile(r'salary|pay|wage|luong', re.I))
        patterns['salary'] = [
            {'tag': str(el.name), 'class': ' '.join(el.get('class', [])[:3]), 'text': el.get_text(strip=True)[:50]}
            for el in salary_elements[:5]
        ]
        
        # Location patterns
        location_elements = soup.find_all(class_=re.compile(r'location|location|address|diadiem|địa điểm', re.I))
        patterns['location'] = [
            {'tag': str(el.name), 'class': ' '.join(el.get('class', [])[:3]), 'text': el.get_text(strip=True)[:50]}
            for el in location_elements[:5]
        ]
        
        # Company patterns
        company_elements = soup.find_all(class_=re.compile(r'company|employer|brand|nha|cty|cong', re.I))
        patterns['company'] = [
            {'tag': str(el.name), 'class': ' '.join(el.get('class', [])[:3]), 'text': el.get_text(strip=True)[:50]}
            for el in company_elements[:5]
        ]
        
        # Title patterns
        title_elements = soup.find_all(class_=re.compile(r'title|name|job-title|ten', re.I))
        patterns['title'] = [
            {'tag': str(el.name), 'class': ' '.join(el.get('class', [])[:3]), 'text': el.get_text(strip=True)[:50]}
            for el in title_elements[:5]
        ]
        
        # Skills/tag patterns
        skill_elements = soup.find_all(class_=re.compile(r'skill|tag|keyword', re.I))
        patterns['skills'] = [
            {'tag': str(el.name), 'class': ' '.join(el.get('class', [])[:3]), 'text': el.get_text(strip=True)[:50]}
            for el in skill_elements[:5]
        ]
        
        return patterns
    
    def generate_selectors(self, analysis: dict) -> dict:
        """Generate suggested selectors từ phân tích"""
        suggestions = {
            'job_card': [],
            'title': [],
            'company': [],
            'salary': [],
            'location': [],
            'job_type': [],
            'experience': [],
            'education': [],
            'skills': [],
            'job_link': [],
        }
        
        # Từ job_card_candidates
        for candidate in analysis.get('job_card_candidates', []):
            tag = candidate['tag']
            cls = candidate['class']
            
            if tag and cls:
                # Đề xuất selectors dạng class
                suggestions['job_card'].append(f".{cls.split()[0]}" if cls.split() else f"{tag}")
        
        # Từ field_patterns
        for field, patterns in analysis.get('field_patterns', {}).items():
            for p in patterns:
                tag = p['tag']
                cls = p['class']
                
                if cls:
                    class_selector = f".{cls.split()[0]}"
                    suggestions[field].append(class_selector)
        
        # Deduplicate và giới hạn
        for key in suggestions:
            suggestions[key] = list(dict.fromkeys(suggestions[key]))[:5]
        
        return suggestions
    
    def inspect_vietnamworks(self, save_html: bool = False) -> dict:
        """Inspect VietnamWorks"""
        url = "https://www.vietnamworks.com/viec-lam/all-jobs"
        
        logger.info("=" * 50)
        logger.info("INSPECTING VIETNAMWORKS")
        logger.info("=" * 50)
        
        html = self.fetch_html(url)
        
        if not html:
            return {}
        
        if save_html:
            self.save_html(html, 'inspect/vietnamworks.html')
        
        analysis = self.analyze_html(html, 'VietnamWorks')
        analysis['url'] = url
        analysis['suggested_selectors'] = self.generate_selectors(analysis)
        
        return analysis
    
    def inspect_careerbuilder(self, save_html: bool = False) -> dict:
        """Inspect CareerBuilder"""
        url = "https://careerbuilder.vn/viec-lam"
        
        logger.info("=" * 50)
        logger.info("INSPECTING CAREERBUILDER")
        logger.info("=" * 50)
        
        html = self.fetch_html(url)
        
        if not html:
            return {}
        
        if save_html:
            self.save_html(html, 'inspect/careerbuilder.html')
        
        analysis = self.analyze_html(html, 'CareerBuilder')
        analysis['url'] = url
        analysis['suggested_selectors'] = self.generate_selectors(analysis)
        
        return analysis
    
    def inspect_topcv(self, save_html: bool = False) -> dict:
        """Inspect TopCV"""
        url = "https://topcv.vn/viec-lam"
        
        logger.info("=" * 50)
        logger.info("INSPECTING TOPCV")
        logger.info("=" * 50)
        
        html = self.fetch_html(url)
        
        if not html:
            return {}
        
        if save_html:
            self.save_html(html, 'inspect/topcv.html')
        
        analysis = self.analyze_html(html, 'TopCV')
        analysis['url'] = url
        analysis['suggested_selectors'] = self.generate_selectors(analysis)
        
        return analysis
    
    def print_analysis(self, analysis: dict) -> None:
        """In kết quả phân tích ra console"""
        print("\n" + "=" * 70)
        print(f"ANALYSIS: {analysis.get('source', 'Unknown')}")
        print("=" * 70)
        
        print(f"\nURL: {analysis.get('url', 'N/A')}")
        print(f"Total tags: {analysis.get('total_tags', 0):,}")
        
        # Structure
        print("\n--- STRUCTURE ---")
        structure = analysis.get('structure', {})
        for key, value in structure.items():
            print(f"  {key}: {value}")
        
        # Common classes
        print("\n--- COMMON CLASSES (Top 15) ---")
        for item in analysis.get('common_classes', [])[:15]:
            print(f"  .{item['class']}: {item['count']} occurrences")
        
        # Job card candidates
        print("\n--- POTENTIAL JOB CARD ELEMENTS ---")
        for i, candidate in enumerate(analysis.get('job_card_candidates', [])[:10], 1):
            print(f"  {i}. <{candidate['tag']} class='{candidate['class'][:60]}'>")
            if candidate['text_preview']:
                print(f"      Text: {candidate['text_preview'][:60]}...")
        
        # Job links
        print("\n--- JOB LINKS ---")
        for i, link in enumerate(analysis.get('job_links', [])[:8], 1):
            print(f"  {i}. {link['text'][:50]}")
            print(f"      href: {link['href'][:60]}")
            print(f"      classes: {link['classes'][:50]}")
        
        # Suggested selectors
        print("\n--- SUGGESTED SELECTORS ---")
        selectors = analysis.get('suggested_selectors', {})
        for field, selector_list in selectors.items():
            if selector_list:
                print(f"  {field}:")
                for sel in selector_list[:3]:
                    print(f"    - {sel}")
        
        # Field patterns
        print("\n--- FIELD PATTERNS ---")
        fields = analysis.get('field_patterns', {})
        for field, patterns in fields.items():
            if patterns:
                print(f"  {field}:")
                for p in patterns[:2]:
                    print(f"    <{p['tag']} class='{p['class']}'> {p['text'][:40]}")
    
    def save_analysis_report(self, analyses: list, filename: str = 'inspect/analysis_report.json') -> bool:
        """Lưu báo cáo phân tích"""
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            report = {
                'generated_at': datetime.now().isoformat(),
                'sources': {}
            }
            
            for analysis in analyses:
                if analysis:
                    source = analysis.get('source', 'unknown')
                    report['sources'][source] = analysis
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved analysis report to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving report: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description='HTML Inspector for Job Websites')
    parser.add_argument('--source', '-s', 
                       choices=['vnw', 'cb', 'topcv', 'all'],
                       default='all',
                       help='Website to inspect')
    parser.add_argument('--save-html', action='store_true',
                       help='Save HTML files')
    parser.add_argument('--url', '-u', type=str,
                       help='Custom URL to inspect')
    
    args = parser.parse_args()
    
    inspector = HTMLInspector()
    analyses = []
    
    if args.url:
        # Inspect custom URL
        html = inspector.fetch_html(args.url)
        if html:
            analysis = inspector.analyze_html(html, 'Custom')
            analysis['url'] = args.url
            analysis['suggested_selectors'] = inspector.generate_selectors(analysis)
            analyses.append(analysis)
            inspector.print_analysis(analysis)
    
    elif args.source == 'vnw':
        analysis = inspector.inspect_vietnamworks(args.save_html)
        if analysis:
            analyses.append(analysis)
            inspector.print_analysis(analysis)
    
    elif args.source == 'cb':
        analysis = inspector.inspect_careerbuilder(args.save_html)
        if analysis:
            analyses.append(analysis)
            inspector.print_analysis(analysis)
    
    elif args.source == 'topcv':
        analysis = inspector.inspect_topcv(args.save_html)
        if analysis:
            analyses.append(analysis)
            inspector.print_analysis(analysis)
    
    else:  # all
        # Inspect all sources
        vnw_analysis = inspector.inspect_vietnamworks(args.save_html)
        if vnw_analysis:
            analyses.append(vnw_analysis)
            inspector.print_analysis(vnw_analysis)
        
        cb_analysis = inspector.inspect_careerbuilder(args.save_html)
        if cb_analysis:
            analyses.append(cb_analysis)
            inspector.print_analysis(cb_analysis)
        
        topcv_analysis = inspector.inspect_topcv(args.save_html)
        if topcv_analysis:
            analyses.append(topcv_analysis)
            inspector.print_analysis(topcv_analysis)
    
    # Save report
    if analyses:
        inspector.save_analysis_report(analyses)
    
    print("\n" + "=" * 70)
    print("INSPECTION COMPLETE")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Check the suggested selectors above")
    print("2. Inspect HTML files in 'inspect/' folder (if --save-html used)")
    print("3. Update selectors in scraper files based on findings")
    print("4. Run scrapers again to test")


if __name__ == '__main__':
    main()
