"""
Manual Annotation Tool
A simple CLI tool for annotating skill entities in job descriptions.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"

# Entity labels
LABELS = ['SKILL_TECHNICAL', 'SKILL_TOOL', 'SKILL_SOFT', 'SKILL_LANGUAGE', 'CERTIFICATION']


def load_jobs(file_path: str) -> list:
    """Load jobs from file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def find_entities(text: str, pattern: str, label: str, pos: int = 0) -> list:
    """Find pattern in text and return positions."""
    entities = []
    start = 0

    while True:
        idx = text.lower().find(pattern.lower(), start)
        if idx == -1:
            break

        entities.append({
            'start': idx,
            'end': idx + len(pattern),
            'label': label,
            'text': text[idx:idx + len(pattern)],
            'normalized': None
        })
        start = idx + 1

    return entities


def suggest_entities(text: str) -> list:
    """Suggest common skill entities based on keywords."""
    suggestions = []

    # Common skill patterns
    skill_keywords = {
        'SKILL_TOOL': [
            'Excel', 'Word', 'PowerPoint', 'AutoCAD', 'SAP', 'Photoshop',
            'Illustrator', 'Outlook', 'Teams', 'Zoom', 'Google', 'Microsoft',
            'CRM', 'ERP', 'POS', 'SQL', 'Python', 'Java', 'JavaScript',
            'HTML', 'CSS', 'Git', 'Docker', 'AWS', 'Azure', 'Linux',
            'Windows', 'MacOS', 'iOS', 'Android', 'React', 'Angular', 'Vue',
            'Node', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails',
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
            'Tableau', 'Power BI', 'Looker', 'Salesforce', 'HubSpot',
            'Shopify', 'WooCommerce', 'Magento', 'WordPress', 'Joomla',
            'sketchup', 'Revit', 'Lumion', '3ds Max', 'Maya', 'Blender',
            'SolidWorks', 'Catia', 'Creo', 'Inventor', 'NX', 'Mastercam'
        ],
        'SKILL_SOFT': [
            'giao tiếp', 'communication', 'teamwork', 'làm việc nhóm',
            'leadership', 'lãnh đạo', 'problem solving', 'giải quyết vấn đề',
            'time management', 'quản lý thời gian', 'presentation', 'thuyết trình',
            'negotiation', 'đàm phán', 'critical thinking', 'tư duy phản biện',
            'creativity', 'sáng tạo', 'adaptability', 'thích nghi',
            'multitasking', 'đa nhiệm', 'organization', 'tổ chức',
            'interpersonal', 'quan hệ', 'collaboration', 'hợp tác',
            'stress management', 'quản lý stress', 'flexibility', 'linh hoạt'
        ],
        'SKILL_LANGUAGE': [
            'tiếng Anh', 'English', 'tiếng Nhật', 'Japanese', 'Nihongo',
            'tiếng Trung', 'Chinese', 'Mandarin', 'tiếng Hàn', 'Korean',
            'Korean', 'tiếng Pháp', 'French', 'tiếng Đức', 'German',
            'tiếng Tây Ban Nha', 'Spanish', 'tiếng Ý', 'Italian',
            'tiếng Nga', 'Russian', 'tiếng Bồ Đào Nha', 'Portuguese',
            'Hán', '喃', 'TOEFL', 'IELTS', 'TOEIC', 'JLPT', 'HSK'
        ],
        'SKILL_TECHNICAL': [
            'hàn', 'welding', 'cắt', 'cutting', 'tiện', 'turning', 'phay', 'milling',
            'lắp ráp', 'assembly', 'gia công', 'machining', 'CNC', 'máy CNC',
            'vận hành', 'operating', 'sửa chữa', 'repair', 'bảo trì', 'maintenance',
            'lập trình', 'programming', 'coding', 'debugging', 'testing',
            'quản lý', 'management', 'điều hành', 'supervising',
            'marketing', 'bán hàng', 'sales', 'kế toán', 'accounting',
            'tài chính', 'finance', 'nhân sự', 'HR', 'recruitment', 'tuyển dụng',
            'logistics', 'vận tải', 'chuỗi cung ứng', 'supply chain',
            'chất lượng', 'quality', 'QC', 'QA', 'ISO', 'Lean', 'Six Sigma'
        ],
        'CERTIFICATION': [
            'PMP', 'CPA', 'CFA', 'ACCA', 'CA', 'CMA',
            'CCNA', 'CCNP', 'AWS', 'Azure', 'GCP', 'MCSE', 'MCSA',
            'MOS', 'MOS Master', 'TOEFL', 'IELTS', 'TOEIC',
            'JLPT', 'N1', 'N2', 'N3', 'N4', 'N5',
            'HSK', 'TOCFL', 'DELF', 'DALF',
            'bằng lái xe', 'driver license', 'license',
            'đại học', 'university', 'cao đẳng', 'college',
            'THPT', 'high school', 'chứng chỉ', 'certificate', 'cert'
        ]
    }

    for label, keywords in skill_keywords.items():
        for keyword in keywords:
            start = 0
            while True:
                idx = text.lower().find(keyword.lower(), start)
                if idx == -1:
                    break
                suggestions.append({
                    'start': idx,
                    'end': idx + len(keyword),
                    'label': label,
                    'text': text[idx:idx + len(keyword)]
                })
                start = idx + 1

    # Remove duplicates
    seen = set()
    unique = []
    for s in suggestions:
        key = (s['start'], s['end'], s['label'])
        if key not in seen:
            seen.add(key)
            unique.append(s)

    return sorted(unique, key=lambda x: x['start'])


def print_text_with_highlights(text: str, entities: list):
    """Print text with highlighted entities."""
    if not entities:
        print(text)
        return

    # Sort entities by position
    sorted_entities = sorted(entities, key=lambda x: x['start'])

    output = []
    last_end = 0

    for ent in sorted_entities:
        # Add text before entity
        if ent['start'] > last_end:
            output.append(text[last_end:ent['start']])

        # Add highlighted entity
        label_short = ent['label'].replace('SKILL_', '').replace('CERTIFICATION', 'CERT')
        output.append(f"[{ent['text']}|{label_short}]")

        last_end = ent['end']

    # Add remaining text
    if last_end < len(text):
        output.append(text[last_end:])

    print(''.join(output))


def annotate_job(job: dict, auto_suggest: bool = True) -> dict:
    """Annotate a single job."""
    text = job.get('text', '')
    print(f"\n{'=' * 70}")
    print(f"JOB: {job.get('title', 'Unknown')}")
    print(f"Company: {job.get('company', 'Unknown')}")
    print(f"Category: {job.get('category', 'Unknown')}")
    print('=' * 70)
    print(f"\nDescription:\n{text[:500]}..." if len(text) > 500 else f"\nDescription:\n{text}")

    entities = []

    # Auto-suggest
    if auto_suggest:
        suggestions = suggest_entities(text)
        if suggestions:
            print(f"\n[AUTO-SUGGEST] Found {len(suggestions)} potential entities:")
            for i, s in enumerate(suggestions[:20]):
                print(f"  {i+1}. [{s['label']}] '{s['text']}' at {s['start']}-{s['end']}")
            if len(suggestions) > 20:
                print(f"  ... and {len(suggestions) - 20} more")

            accept = input("\nAccept all suggestions? (y/n/a for custom): ").lower()
            if accept == 'y':
                entities = suggestions
            elif accept == 'a':
                pass  # Custom annotation
            else:
                entities = []  # Start fresh

    # Manual annotation
    while True:
        print(f"\nCurrent entities: {len(entities)}")
        if entities:
            print_text_with_highlights(text, entities)

        print("\nCommands:")
        print("  1. Add entity")
        print("  2. Remove entity")
        print("  3. View all entities")
        print("  4. Save and next")
        print("  5. Skip this job")
        print("  6. Quit")

        cmd = input("\nCommand: ").strip()

        if cmd == '1':
            try:
                start = int(input("  Start position: "))
                end = int(input("  End position: "))
                print(f"  Selected text: '{text[start:end]}'")
                print(f"  Labels: {', '.join(LABELS)}")
                label = input("  Label: ").strip().upper()
                if label not in LABELS:
                    print("  Invalid label!")
                    continue
                entities.append({
                    'start': start,
                    'end': end,
                    'label': label,
                    'text': text[start:end],
                    'normalized': None
                })
            except ValueError:
                print("  Invalid input!")

        elif cmd == '2':
            for i, e in enumerate(entities):
                print(f"  {i+1}. [{e['label']}] '{e['text']}' at {e['start']}-{e['end']}")
            try:
                idx = int(input("  Entity number to remove: ")) - 1
                if 0 <= idx < len(entities):
                    entities.pop(idx)
                    print("  Removed!")
                else:
                    print("  Invalid number!")
            except ValueError:
                print("  Invalid input!")

        elif cmd == '3':
            print("\nAll entities:")
            for e in entities:
                print(f"  [{e['label']}] '{e['text']}' at {e['start']}-{e['end']}")

        elif cmd == '4':
            break

        elif cmd == '5':
            return None

        elif cmd == '6':
            sys.exit(0)

    # Update job with annotations
    job['entities'] = entities
    job['metadata']['annotated_at'] = datetime.now().isoformat()
    job['metadata']['status'] = 'annotated'

    return job


def main():
    """Main function."""
    print("=" * 70)
    print("MANUAL SKILL ANNOTATION TOOL")
    print("=" * 70)

    # Check for input file
    input_file = ANNOTATIONS_DIR / "train_raw.json"
    output_file = ANNOTATIONS_DIR / "train_annotations.json"

    if not input_file.exists():
        print(f"\n[ERROR] Input file not found: {input_file}")
        sys.exit(1)

    # Load jobs
    print(f"\nLoading jobs from: {input_file}")
    jobs = load_jobs(str(input_file))
    print(f"Loaded {len(jobs)} jobs")

    # Check for existing annotations
    if output_file.exists():
        existing = load_jobs(str(output_file))
        annotated = {j.get('job_id') for j in existing if j.get('entities')}
        jobs_to_annotate = [j for j in jobs if j.get('job_id') not in annotated]
        print(f"Already annotated: {len(annotated)}")
        print(f"Remaining to annotate: {len(jobs_to_annotate)}")

        # Load existing annotations
        all_annotations = existing
    else:
        jobs_to_annotate = jobs
        all_annotations = []

    if not jobs_to_annotate:
        print("\n[INFO] All jobs already annotated!")
        return

    # Ask about auto-suggest
    auto_suggest = input("\nEnable auto-suggest? (y/n): ").lower() == 'y'

    # Start annotation
    print("\n" + "=" * 70)
    print("STARTING ANNOTATION")
    print("=" * 70)

    for i, job in enumerate(jobs_to_annotate):
        print(f"\n[Progress] {i+1}/{len(jobs_to_annotate)}")

        result = annotate_job(job, auto_suggest)

        if result is not None:
            all_annotations.append(result)

        # Auto-save every 10 jobs
        if (i + 1) % 10 == 0:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_annotations, f, ensure_ascii=False, indent=2)
            print(f"\n[Auto-saved] {len(all_annotations)} annotations to {output_file}")

    # Final save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_annotations, f, ensure_ascii=False, indent=2)

    print(f"\n" + "=" * 70)
    print("ANNOTATION COMPLETE")
    print("=" * 70)
    print(f"\nTotal annotations: {len(all_annotations)}")
    print(f"Saved to: {output_file}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
