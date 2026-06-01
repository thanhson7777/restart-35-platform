#!/usr/bin/env python3
"""
5. Load ESCO Essential Skills
===========================
Load essential skills from ESCO data and filter for commonly required skills.

Output:
- data/esco_essential/essential_skills.json
"""
import sys
import json
import re
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
ESCO_DIR = DATA_DIR / "esco_processed"
OUTPUT_DIR = DATA_DIR / "esco_essential"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_esco_skills() -> list:
    """Load ESCO skills from processed file"""
    print(f"Loading ESCO skills from {ESCO_DIR}...")

    with open(ESCO_DIR / "esco_skills.json", 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Data can be a list directly
    if isinstance(data, list):
        return data
    return data.get('skills', [])


def filter_essential_skills(skills: list) -> list:
    """
    Filter and categorize essential skills

    Categories:
    - soft_skills: Communication, teamwork, leadership
    - technical_skills: Excel, programming, data analysis
    - domain_skills: Industry-specific skills
    - tools: Software tools, platforms
    """
    print(f"Processing {len(skills)} skills...")

    essential_skills = []
    skill_types = {
        "soft_skill": [],
        "technical_skill": [],
        "domain_skill": [],
        "tool": []
    }

    # Common essential skill keywords
    soft_skill_keywords = [
        "communication", "teamwork", "leadership", "problem solving",
        "time management", "critical thinking", "presentation",
        "negotiation", "conflict resolution", "decision making",
        "giao tiếp", "làm việc nhóm", "lãnh đạo", "giải quyết vấn đề",
        "quản lý thời gian", "tư duy phản biện", "thuyết trình"
    ]

    technical_keywords = [
        "excel", "word", "powerpoint", "office", "data analysis",
        "programming", "python", "sql", "database", "statistics",
        "phân tích dữ liệu", "lập trình", "cơ sở dữ liệu"
    ]

    tool_keywords = [
        "sap", "erp", "crm", "salesforce", "adobe",
        "autocad", "photoshop", "jira", "slack", "zoom",
        "microsoft", "google", "oracle"
    ]

    for skill in skills:
        title_vi = skill.get('titleVi', '').lower()
        title_en = skill.get('titleEn', '').lower()
        combined = f"{title_vi} {title_en}"

        skill_type = "domain_skill"  # default

        # Check soft skills
        for keyword in soft_skill_keywords:
            if keyword.lower() in combined:
                skill_type = "soft_skill"
                break

        # Check technical skills
        if skill_type == "domain_skill":
            for keyword in technical_keywords:
                if keyword.lower() in combined:
                    skill_type = "technical_skill"
                    break

        # Check tools
        if skill_type == "domain_skill":
            for keyword in tool_keywords:
                if keyword.lower() in combined:
                    skill_type = "tool"
                    break

        essential_skills.append({
            "esco_uri": skill.get('uri', ''),
            "title_vi": skill.get('titleVi', ''),
            "title_en": skill.get('titleEn', ''),
            "type": skill.get('type', 'skill'),
            "category": skill_type,
            "description": skill.get('description', '')
        })

        skill_types[skill_type].append(skill.get('titleVi', ''))

    # Print stats
    print("\nSkill categorization:")
    for skill_type, skills_list in skill_types.items():
        print(f"  {skill_type}: {len(skills_list)} skills")

    return essential_skills


def main():
    print("=" * 60)
    print("Task 1.2.1: Load ESCO Essential Skills")
    print("=" * 60)

    # Load skills
    skills = load_esco_skills()
    print(f"Loaded {len(skills)} ESCO skills")

    # Filter essential skills
    essential_skills = filter_essential_skills(skills)

    # Save to file
    output_file = OUTPUT_DIR / "essential_skills.json"
    print(f"\nSaving to {output_file}...")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "skills": essential_skills,
            "stats": {
                "total": len(essential_skills),
                "by_category": {
                    "soft_skill": len([s for s in essential_skills if s['category'] == 'soft_skill']),
                    "technical_skill": len([s for s in essential_skills if s['category'] == 'technical_skill']),
                    "domain_skill": len([s for s in essential_skills if s['category'] == 'domain_skill']),
                    "tool": len([s for s in essential_skills if s['category'] == 'tool'])
                }
            }
        }, f, ensure_ascii=False, indent=2)

    # Print sample
    print("\n" + "=" * 60)
    print("SAMPLE SKILLS BY CATEGORY")
    print("=" * 60)

    categories = {}
    for skill in essential_skills:
        cat = skill['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(skill['title_vi'])

    for cat, skills_list in categories.items():
        print(f"\n{cat.upper()} ({len(skills_list)} total):")
        for skill in skills_list[:5]:
            print(f"  - {skill}")

    print("\n" + "=" * 60)
    print("SUCCESS: essential_skills.json created")
    print("=" * 60)


if __name__ == "__main__":
    main()
