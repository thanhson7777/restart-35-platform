"""
Keyword-Based Pre-Annotation Script
Generates pre-annotations using keyword matching for NER training bootstrap.
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"


class KeywordAnnotator:
    """Rule-based annotator using keyword patterns."""

    # Priority order (higher = more specific)
    SKILL_PATTERNS = {
        'SKILL_LANGUAGE': [
            # Vietnamese patterns
            r'\btiếng Anh\b', r'\btiếng Nhật\b', r'\btiếng Trung\b', r'\btiếng Hàn\b',
            r'\btiếng Pháp\b', r'\btiếng Đức\b', r'\btiếng Tây Ban Nha\b',
            r'\btiếng Ý\b', r'\btiếng Nga\b', r'\btiếng Bồ Đào Nha\b',
            # English patterns
            r'\bEnglish\b', r'\bJapanese\b', r'\bChinese\b', r'\bKorean\b',
            r'\bFrench\b', r'\bGerman\b', r'\bSpanish\b', r'\bItalian\b',
            # Abbreviations
            r'\bJLPT\s*[Nn][1-5]\b', r'\bHSK\s*[1-6]\b', r'\bJLPT\b',
            r'\bTOEFL\b', r'\bIELTS\b', r'\bTOEIC\b',
        ],
        'CERTIFICATION': [
            # Professional certifications
            r'\bPMP\b', r'\bCPA\b', r'\bCFA\b', r'\bACCA\b', r'\bCA\b', r'\bCMA\b',
            r'\bCCNA\b', r'\bCCNP\b', r'\bMCSE\b', r'\bMCSA\b',
            r'\bMOS\b', r'\bAWS\b(?!\s*(Services|EC2|S3|Cloud))',
            # Vietnamese patterns
            r'\btốt nghiệp\s+(đại học|cao đẳng|trung cấp)\b',
            r'\bđại học\b', r'\bcao đẳng\b', r'\btrung cấp\b',
            r'\bbằng lái xe\s*[A-Z][0-9]\b', r'\bbằng lái\s*[A-Z][0-9]\b',
            r'\bchứng chỉ\b',
        ],
        'SKILL_TOOL': [
            # Microsoft Office
            r'\bExcel\b', r'\bWord\b', r'\bPowerPoint\b', r'\bOutlook\b',
            r'\bMicrosoft\s*(Office)?\s*(Excel|Word|PowerPoint|Outlook)?\b',
            # Design software
            r'\bAutoCAD\b', r'\bPhotoshop\b', r'\bIllustrator\b',
            r'\bSketchUp\b', r'\bSketchup\b', r'\bRevit\b', r'\bLumion\b',
            r'\b3ds\s*Max\b', r'\b3dsMax\b', r'\bMaya\b', r'\bBlender\b',
            # Engineering software
            r'\bSolidWorks\b', r'\bCatia\b', r'\bCreo\b', r'\bInventor\b',
            r'\bNX\b', r'\bMastercam\b', r'\bProE\b',
            # Programming/IT
            r'\bPython\b', r'\bJava\b(?!\s*Script)', r'\bJavaScript\b',
            r'\bC\+\+\b', r'\bC#\b', r'\bRuby\b', r'\bGo\b', r'\bRust\b',
            r'\bPHP\b', r'\bSwift\b', r'\bKotlin\b', r'\bScala\b',
            # Web
            r'\bHTML\b', r'\bCSS\b', r'\bReact\b', r'\bAngular\b', r'\bVue\b',
            r'\bNode\.?js\b', r'\bNodeJS\b', r'\bDjango\b', r'\bFlask\b',
            r'\bSpring\b', r'\bLaravel\b', r'\bRails\b', r'\bRuby on Rails\b',
            # Databases
            r'\bSQL\b', r'\bMySQL\b', r'\bPostgreSQL\b', r'\bMongoDB\b',
            r'\bRedis\b', r'\bElasticsearch\b', r'\bOracle\b',
            # Cloud/DevOps
            r'\bAWS\b', r'\bAzure\b', r'\bGCP\b', r'\bDocker\b', r'\bKubernetes\b',
            r'\bGit\b', r'\bJenkins\b', r'\bTerraform\b',
            # Business tools
            r'\bSAP\b', r'\bERP\b', r'\bCRM\b', r'\bPOS\b', r'\bHRM\b',
            # BI tools
            r'\bTableau\b', r'\bPower\s*BI\b', r'\bLooker\b',
            # E-commerce
            r'\bShopify\b', r'\bWooCommerce\b', r'\bMagento\b',
            r'\bWordPress\b', r'\bJoomla\b', r'\bDrupal\b',
            # Communication
            r'\bZoom\b', r'\bTeams\b', r'\bSlack\b', r'\bMeet\b',
        ],
        'SKILL_SOFT': [
            # Vietnamese
            r'\bkỹ năng giao tiếp\b', r'\bgiao tiếp\b',
            r'\blàm việc nhóm\b', r'\blàm việc theo nhóm\b',
            r'\bquản lý thời gian\b',
            r'\bgiải quyết vấn đề\b', r'\bgiải quyết vấn đề\b',
            r'\bchịu áp lực\b', r'\báp lực công việc\b',
            r'\bsáng tạo\b', r'\btư duy sáng tạo\b',
            r'\bthuyết trình\b',
            r'\bđàm phán\b', r'\bđàm phán\b',
            r'\bquản lý\b',  # general management
            r'\blãnh đạo\b', r'\bleadership\b',
            r'\btổ chức\b', r'\borganiz.*\b',
            # English
            r'\bteamwork\b', r'\bteam\s*work\b',
            r'\bcommunication\b',
            r'\bproblem\s*solving\b',
            r'\btime\s*management\b',
            r'\bpresentation\b',
            r'\bleadership\b',
            r'\bnegotiation\b',
            r'\bcritical\s*thinking\b',
            r'\bcreativity\b', r'\bcreative\b',
            r'\badaptability\b', r'\badapt\b',
            r'\bmultitasking\b',
            r'\bflexibility\b',
            r'\binterpersonal\b',
            r'\bcollaboration\b',
        ],
        'SKILL_TECHNICAL': [
            # Manufacturing
            r'\bhàn\b(?:\s*MIG|MAG|TIG|CO2)?',
            r'\b(cắt|gọt|tiện|phay)\b',
            r'\bmáy\s*CNC\b', r'\bCNC\b',
            r'\blắp\s*ráp\b', r'\blắp\b',
            r'\bgia\s*công\b',
            r'\bvận\s*hành\b',
            r'\bsửa\s*chữa\b', r'\bsửa\b',
            r'\bbảo\s*trì\b', r'\bbảo dưỡng\b',
            # Programming
            r'\blập\s*trình\b', r'\bprogramming\b', r'\bcoding\b',
            r'\bdebug\b', r'\btesting\b',
            # Business
            r'\bmarketing\b', r'\bseo\b', r'\bsem\b',
            r'\bbán\s*hàng\b', r'\bsales\b',
            r'\bkế\s*toán\b', r'\baccounting\b',
            r'\btài\s*chính\b', r'\bfinance\b',
            r'\bHR\b(?!\s*system)', r'\bnhân\s*sự\b', r'\btuyển\s*dụng\b',
            # Quality
            r'\bchất\s*lượng\b', r'\bquality\b', r'\bQC\b', r'\bQA\b',
            r'\bISO\b',
            # Process
            r'\blogistics\b', r'\bvận\s*tải\b', r'\bvận\s*chuyển\b',
            r'\bchuỗi\s*cung\s*ứng\b', r'\bsupply\s*chain\b',
            # Methods
            r'\bLean\b', r'\bSix\s*Sigma\b',
            # Other
            r'\bmaching\b', r'\bfabrication\b',
        ],
    }

    def __init__(self):
        self.compiled_patterns = {}
        for label, patterns in self.SKILL_PATTERNS.items():
            self.compiled_patterns[label] = [
                re.compile(p, re.IGNORECASE) for p in patterns
            ]

    def annotate(self, text: str) -> List[Dict]:
        """Find all skill mentions in text."""
        entities = []
        seen_positions = set()

        # Process each label in priority order
        for label in ['CERTIFICATION', 'SKILL_LANGUAGE', 'SKILL_TOOL',
                       'SKILL_SOFT', 'SKILL_TECHNICAL']:
            if label not in self.compiled_patterns:
                continue

            for pattern in self.compiled_patterns[label]:
                for match in pattern.finditer(text):
                    start, end = match.start(), match.end()

                    # Skip if this position is already covered
                    # (only if it's a shorter match)
                    skip = False
                    for pos in range(start, end):
                        if pos in seen_positions:
                            skip = True
                            break

                    if not skip:
                        entity_text = text[start:end]
                        entities.append({
                            'start': start,
                            'end': end,
                            'label': label,
                            'text': entity_text,
                            'normalized': None,
                            'source': 'keyword_pattern'
                        })
                        for pos in range(start, end):
                            seen_positions.add(pos)

        # Sort by position
        entities.sort(key=lambda x: x['start'])

        # Merge overlapping entities (prefer higher priority)
        return self._merge_overlapping(entities)

    def _merge_overlapping(self, entities: List[Dict]) -> List[Dict]:
        """Merge overlapping entities."""
        if not entities:
            return []

        merged = []
        current = entities[0].copy()

        for entity in entities[1:]:
            if entity['start'] <= current['end']:
                # Overlapping - keep the longer one
                if (entity['end'] - entity['start']) > (current['end'] - current['start']):
                    current = entity.copy()
            else:
                merged.append(current)
                current = entity.copy()

        merged.append(current)
        return merged


def load_raw_jobs(file_path: str) -> list:
    """Load raw jobs from file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_annotations(annotations: list, output_file: str):
    """Save annotations to file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(annotations, f, ensure_ascii=False, indent=2)


def compute_stats(annotations: list) -> Dict:
    """Compute annotation statistics."""
    stats = {
        'total_jobs': len(annotations),
        'jobs_with_entities': 0,
        'total_entities': 0,
        'by_label': {},
        'avg_entities_per_job': 0
    }

    for ann in annotations:
        entities = ann.get('entities', [])
        if entities:
            stats['jobs_with_entities'] += 1

        for ent in entities:
            label = ent.get('label', 'UNKNOWN')
            stats['by_label'][label] = stats['by_label'].get(label, 0) + 1
            stats['total_entities'] += 1

    if stats['jobs_with_entities'] > 0:
        stats['avg_entities_per_job'] = round(
            stats['total_entities'] / stats['jobs_with_entities'], 2
        )

    return stats


def main():
    """Main execution."""
    print("=" * 70)
    print("KEYWORD-BASED PRE-ANNOTATION")
    print("=" * 70)

    annotator = KeywordAnnotator()

    # Process each split
    splits = ['train', 'dev', 'test']
    all_stats = {}

    for split in splits:
        raw_file = ANNOTATIONS_DIR / f"{split}_raw.json"
        output_file = ANNOTATIONS_DIR / f"{split}_annotations.json"

        if not raw_file.exists():
            print(f"\n[SKIP] {split}: {raw_file} not found")
            continue

        print(f"\n[Processing] {split}")
        print(f"  Input: {raw_file}")

        # Load raw jobs
        jobs = load_raw_jobs(str(raw_file))
        print(f"  Jobs: {len(jobs)}")

        # Annotate
        annotated = []
        for job in jobs:
            text = job.get('text', '')
            entities = annotator.annotate(text)

            # Update job with entities
            annotated_job = job.copy()
            annotated_job['entities'] = entities
            annotated_job['metadata'] = job.get('metadata', {}).copy()
            annotated_job['metadata']['annotated_at'] = datetime.now().isoformat()
            annotated_job['metadata']['annotator'] = 'keyword_pattern'
            annotated_job['metadata']['status'] = 'pre_annotated'
            annotated.append(annotated_job)

        # Save
        save_annotations(annotated, str(output_file))
        print(f"  Output: {output_file}")

        # Compute stats
        stats = compute_stats(annotated)
        all_stats[split] = stats

        print(f"\n  Statistics:")
        print(f"    Jobs with entities: {stats['jobs_with_entities']}/{stats['total_jobs']}")
        print(f"    Total entities: {stats['total_entities']}")
        print(f"    Avg entities/job: {stats['avg_entities_per_job']}")
        print(f"    By label:")
        for label, count in sorted(stats['by_label'].items()):
            print(f"      {label}: {count}")

    # Save combined stats
    stats_file = ANNOTATIONS_DIR / "pre_annotation_stats.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(all_stats, f, indent=2)
    print(f"\n[Saved] Stats: {stats_file}")

    print("\n" + "=" * 70)
    print("PRE-ANNOTATION COMPLETE")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Review and correct annotations manually")
    print("2. Run convert_to_spacy.py to convert to spaCy format")
    print("3. Train the NER model")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
