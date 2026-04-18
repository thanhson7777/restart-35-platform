"""
Text Normalizers - Vietnamese text cleaning and normalization utilities
"""
import re
import json
import unicodedata
from typing import Optional, List, Dict, Tuple
from pathlib import Path


def get_config_dir():
    """Get the config directory path"""
    current_file = Path(__file__)
    
    # Try scripts/data/config first
    config_dir = current_file.parent.parent / 'config'
    if config_dir.exists():
        return config_dir
    
    # Fallback to ai-service/config
    config_dir = current_file.parent.parent.parent / 'config'
    if config_dir.exists():
        return config_dir
    
    # Fallback to current directory
    return Path('config')


class TextNormalizer:
    """Vietnamese text normalization utilities"""
    
    # Vietnamese character replacements
    VIETNAMESE_REPLACEMENTS = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
        'đ': 'd', 'Đ': 'D',
    }
    
    def __init__(self):
        self._load_config()
    
    def _load_config(self):
        """Load configuration files"""
        config_dir = get_config_dir()
        
        with open(config_dir / 'skill_dict.json', 'r', encoding='utf-8') as f:
            self.skill_config = json.load(f)
        
        with open(config_dir / 'location_map.json', 'r', encoding='utf-8') as f:
            self.location_config = json.load(f)
        
        with open(config_dir / 'job_title_alias.json', 'r', encoding='utf-8') as f:
            self.title_config = json.load(f)
    
    def remove_html_tags(self, text: str) -> str:
        """Remove HTML tags from text"""
        if not text:
            return ""
        clean = re.sub(r'<[^>]+>', ' ', str(text))
        clean = re.sub(r'&nbsp;', ' ', clean)
        clean = re.sub(r'&amp;', '&', clean)
        clean = re.sub(r'&lt;', '<', clean)
        clean = re.sub(r'&gt;', '>', clean)
        clean = re.sub(r'&quot;', '"', clean)
        clean = re.sub(r'&#\d+;', '', clean)
        return clean
    
    def normalize_unicode(self, text: str, form: str = 'NFC') -> str:
        """Normalize Unicode text (NFC or NFD)"""
        if not text:
            return ""
        return unicodedata.normalize(form, str(text))
    
    def remove_accents(self, text: str) -> str:
        """Remove Vietnamese accents for comparison"""
        if not text:
            return ""
        text = self.normalize_unicode(text, 'NFD')
        result = []
        for char in text:
            if unicodedata.category(char) != 'Mn':
                result.append(char)
        return ''.join(result)
    
    def to_ascii(self, text: str) -> str:
        """Convert text to ASCII (no accents, lowercase)"""
        if not text:
            return ""
        text = self.remove_accents(text.lower())
        return re.sub(r'[^a-z0-9\s]', '', text)
    
    def clean_whitespace(self, text: str) -> str:
        """Clean excessive whitespace"""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', str(text))
        return text.strip()
    
    def normalize_text(self, text: str) -> str:
        """Full text normalization pipeline"""
        if not text:
            return ""
        text = self.remove_html_tags(text)
        text = self.normalize_unicode(text)
        text = self.clean_whitespace(text)
        return text
    
    def normalize_title(self, title: str) -> str:
        """Normalize job title"""
        if not title:
            return ""
        
        title = self.normalize_text(title).lower()
        title = self.remove_accents(title)
        
        mappings = self.title_config.get('title_mappings', {})
        for alias, normalized in mappings.items():
            if alias in title:
                title = title.replace(alias, normalized)
        
        return title.strip()
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract skills from text"""
        if not text:
            return []
        
        text = self.normalize_text(text).lower()
        text = self.remove_accents(text)
        
        aliases = self.skill_config.get('skill_aliases', {})
        skills = set()
        
        words = re.findall(r'\b\w+\b', text)
        
        for word in words:
            if word in aliases:
                skills.add(aliases[word])
        
        exclude_words = set(self.skill_config.get('exclude_words', []))
        for word in words:
            word_no_accent = word
            if word_no_accent not in exclude_words:
                if 2 <= len(word_no_accent) <= 50:
                    if word_no_accent not in aliases:
                        skills.add(word_no_accent)
        
        return sorted(list(skills))


class SalaryParser:
    """Parse salary strings from Vietnamese job postings"""
    
    # Patterns for salary extraction
    PATTERNS = [
        # "8 - 12 triệu/tháng" or "8-12 triệu"
        r'(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\s*(?:/tháng|/thang)?',
        # "8,000,000 - 12,000,000 đ"
        r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*[-–]\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:đ|VND|vnd)?',
        # "$800 - $1200"
        r'\$(\d+(?:[.,]\d+)?)\s*[-–]\s*\$\s*(\d+(?:[.,]\d+)?)',
        # "Từ 8 triệu"
        r'(?:từ|from)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)',
        # "Đến 12 triệu"
        r'(?:đến|to|up to)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)',
    ]
    
    USD_TO_VND = 25000
    VND_TO_MILLION = 1000000
    
    def __init__(self):
        self.patterns = [re.compile(p, re.IGNORECASE) for p in self.PATTERNS]
    
    def parse_salary(self, salary_str: str) -> Tuple[Optional[float], Optional[float], float]:
        """
        Parse salary string to (min_salary, max_salary, confidence)
        Returns: (min_vnd, max_vnd, confidence_score)
        """
        if not salary_str or salary_str.strip() == "":
            return None, None, 0.0
        
        salary_str = salary_str.lower().strip()
        
        # Check for negotiable/unknown
        negotiable_keywords = ['thương lượng', 'thuong luong', 'negotiable', 'discuss', 'cạnh tranh', 'competitive', 'nghin', 'k']
        if any(kw in salary_str for kw in negotiable_keywords):
            if any(kw in salary_str for kw in ['cạnh tranh', 'competitive']):
                return None, None, 0.0
            return None, None, 0.0
        
        # Try each pattern
        for pattern in self.patterns:
            match = pattern.search(salary_str)
            if match:
                groups = match.groups()
                
                if len(groups) == 2:
                    min_str, max_str = groups
                    min_val = self._parse_number(min_str)
                    max_val = self._parse_number(max_str)
                    
                    if min_val is None or max_val is None:
                        continue
                    
                    if min_val > max_val:
                        min_val, max_val = max_val, min_val
                    
                    # Check if values are in millions (typical Vietnamese salary)
                    if min_val < 1000:
                        min_vnd = min_val * self.VND_TO_MILLION
                        max_vnd = max_val * self.VND_TO_MILLION
                    else:
                        # Already in raw VND
                        min_vnd = min_val
                        max_vnd = max_val
                    
                    return min_vnd, max_vnd, 0.9
                
                elif len(groups) == 1:
                    val = self._parse_number(groups[0])
                    if val is None:
                        continue
                    
                    if val < 1000:
                        val = val * self.VND_TO_MILLION
                    
                    return val, val, 0.7
        
        return None, None, 0.0
    
    def _parse_number(self, num_str: str) -> Optional[float]:
        """Parse number string to float"""
        try:
            num_str = num_str.strip()
            num_str = num_str.replace(',', '')
            num_str = num_str.replace('.', '')
            return float(num_str)
        except (ValueError, AttributeError):
            return None
    
    def format_salary(self, min_vnd: float, max_vnd: float) -> str:
        """Format salary in VND to readable string"""
        if min_vnd == max_vnd:
            return f"{min_vnd / 1_000_000:.0f}-{max_vnd / 1_000_000:.0f} triệu"
        return f"{min_vnd / 1_000_000:.0f}-{max_vnd / 1_000_000:.0f} triệu"


class LocationMapper:
    """Map Vietnamese location strings to standardized format"""
    
    def __init__(self):
        self._load_config()
        self._build_lookup()
    
    def _load_config(self):
        """Load location configuration"""
        config_dir = get_config_dir()
        with open(config_dir / 'location_map.json', 'r', encoding='utf-8') as f:
            self.config = json.load(f)
    
    def _build_lookup(self):
        """Build lookup dictionary for fast matching"""
        self.city_lookup = {}
        self.city_alias_lookup = {}
        
        for city_key, city_data in self.config['cities'].items():
            self.city_lookup[city_key] = {
                'normalized': city_key,
                'region': city_data['region'],
                'region_name': city_data['region_name']
            }
            
            for alias in city_data.get('aliases', []):
                self.city_alias_lookup[alias.lower()] = city_key
        
        self.nearby_pairs = self.config.get('nearby_pairs', {})
    
    def normalize_location(self, location: str) -> Dict:
        """
        Normalize location string
        Returns: {
            'city': str or None,
            'region': str or None,
            'region_name': str or None,
            'confidence': float
        }
        """
        if not location:
            return {'city': None, 'region': None, 'region_name': None, 'confidence': 0.0}
        
        location = location.lower().strip()
        
        # Try exact alias match
        if location in self.city_alias_lookup:
            city_key = self.city_alias_lookup[location]
            return {
                'city': city_key,
                'region': self.city_lookup[city_key]['region'],
                'region_name': self.city_lookup[city_key]['region_name'],
                'confidence': 1.0
            }
        
        # Try partial match
        for alias, city_key in self.city_alias_lookup.items():
            if alias in location or location in alias:
                return {
                    'city': city_key,
                    'region': self.city_lookup[city_key]['region'],
                    'region_name': self.city_lookup[city_key]['region_name'],
                    'confidence': 0.9
                }
        
        # Try keyword match
        for city_key, city_data in self.config['cities'].items():
            city_name = city_key.replace(' ', '')
            if city_name in location.replace(' ', ''):
                return {
                    'city': city_key,
                    'region': city_data['region'],
                    'region_name': city_data['region_name'],
                    'confidence': 0.8
                }
        
        return {'city': None, 'region': None, 'region_name': None, 'confidence': 0.0}
    
    def is_nearby(self, city1: str, city2: str) -> bool:
        """Check if two cities are nearby"""
        if not city1 or not city2:
            return False
        
        city1 = city1.lower()
        city2 = city2.lower()
        
        if city1 in self.nearby_pairs:
            return city2 in self.nearby_pairs[city1]
        
        if city2 in self.nearby_pairs:
            return city1 in self.nearby_pairs[city2]
        
        return False
    
    def get_region(self, city: str) -> Optional[str]:
        """Get region for a city"""
        if not city:
            return None
        
        city = city.lower()
        if city in self.city_lookup:
            return self.city_lookup[city]['region']
        
        for alias, city_key in self.city_alias_lookup.items():
            if alias == city:
                return self.city_lookup[city_key]['region']
        
        return None


# Singleton instances
_normalizer = None
_salary_parser = None
_location_mapper = None


def get_normalizer() -> TextNormalizer:
    """Get singleton normalizer instance"""
    global _normalizer
    if _normalizer is None:
        _normalizer = TextNormalizer()
    return _normalizer


def get_salary_parser() -> SalaryParser:
    """Get singleton salary parser instance"""
    global _salary_parser
    if _salary_parser is None:
        _salary_parser = SalaryParser()
    return _salary_parser


def get_location_mapper() -> LocationMapper:
    """Get singleton location mapper instance"""
    global _location_mapper
    if _location_mapper is None:
        _location_mapper = LocationMapper()
    return _location_mapper
