# -*- coding: utf-8 -*-
"""
Generate Validation Ground Truth

Creates ground truth annotations from high-confidence ESCO matches.
Skills with score >= 0.90 are used as pseudo-ground truth for threshold tuning.
"""

import json
from pathlib import Path
from typing import Dict, List
from collections import defaultdict

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def load_test_results():
    """Load test results from Phase 4."""
    test_results_file = DATA_DIR / "test_results.json"
    
    with open(test_results_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_ground_truth(test_results: Dict) -> Dict:
    """Generate ground truth from high-confidence matches."""
    
    skills_by_confidence = defaultdict(list)
    all_skills = []
    
    for result in test_results.get("sample_results", []):
        job_id = result.get("job_id", "")
        title = result.get("title", "")
        
        for entity in result.get("entities", []):
            skill_text = entity.get("text", "")
            if not skill_text:
                continue
            
            ner_label = entity.get("label", "")
            matches = entity.get("esco_matches", [])
            
            if not matches:
                continue
            
            best_match = matches[0]
            score = best_match.get("score", 0)
            uri = best_match.get("uri", "")
            label = best_match.get("label", "")
            match_type = best_match.get("match_type", "")
            
            # Determine confidence band
            if score >= 0.90:
                confidence_band = "high"
            elif score >= 0.80:
                confidence_band = "medium"
            else:
                confidence_band = "low"
            
            skill_entry = {
                "id": f"skill_{len(all_skills) + 1:04d}",
                "job_id": job_id,
                "original_text": skill_text,
                "ner_label": ner_label,
                "ground_truth_uri": uri,
                "ground_truth_label": label,
                "score": round(score, 4),
                "match_type": match_type,
                "confidence_band": confidence_band,
                "alternatives": [
                    {"uri": m["uri"], "label": m["label"], "score": round(m["score"], 4)}
                    for m in matches[1:4]  # Top 3 alternatives
                ]
            }
            
            all_skills.append(skill_entry)
            skills_by_confidence[confidence_band].append(skill_entry)
    
    return {
        "metadata": {
            "total_skills": len(all_skills),
            "high_confidence": len(skills_by_confidence["high"]),
            "medium_confidence": len(skills_by_confidence["medium"]),
            "low_confidence": len(skills_by_confidence["low"]),
            "source": "Phase 4 test_results.json",
            "generation_date": "2026-05-27"
        },
        "by_confidence_band": {
            "high": skills_by_confidence["high"],
            "medium": skills_by_confidence["medium"],
            "low": skills_by_confidence["low"]
        },
        "all_skills": all_skills,
        "by_ner_label": group_by_ner_label(all_skills)
    }


def group_by_ner_label(skills: List[Dict]) -> Dict:
    """Group skills by NER label."""
    grouped = defaultdict(list)
    for skill in skills:
        grouped[skill["ner_label"]].append(skill)
    return dict(grouped)


def create_lookup_dict(ground_truth: Dict) -> Dict[str, str]:
    """Create lookup dict: original_text -> ground_truth_uri."""
    lookup = {}
    
    for skill in ground_truth["all_skills"]:
        text_lower = skill["original_text"].lower().strip()
        lookup[text_lower] = {
            "uri": skill["ground_truth_uri"],
            "label": skill["ground_truth_label"],
            "score": skill["score"],
            "confidence_band": skill["confidence_band"]
        }
    
    return lookup


def main():
    """Main function."""
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 70)
    print("GENERATING VALIDATION GROUND TRUTH")
    print("=" * 70)
    
    # Load test results
    print("\n[1/3] Loading test results...")
    test_results = load_test_results()
    print(f"  Loaded {len(test_results.get('sample_results', []))} job results")
    
    # Generate ground truth
    print("\n[2/3] Generating ground truth annotations...")
    ground_truth = generate_ground_truth(test_results)
    
    # Print statistics
    metadata = ground_truth["metadata"]
    print(f"\n  Ground Truth Statistics:")
    print(f"  - Total skills: {metadata['total_skills']}")
    print(f"  - High confidence (score >= 0.90): {metadata['high_confidence']}")
    print(f"  - Medium confidence (0.80-0.90): {metadata['medium_confidence']}")
    print(f"  - Low confidence (<0.80): {metadata['low_confidence']}")
    
    # Print by NER label
    print(f"\n  By NER Label:")
    for label, skills in ground_truth["by_ner_label"].items():
        print(f"  - {label}: {len(skills)}")
    
    # Save ground truth
    print("\n[3/3] Saving ground truth data...")
    output_file = DATA_DIR / "validation_ground_truth.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(ground_truth, f, indent=2, ensure_ascii=False)
    print(f"  Saved to: {output_file}")
    
    # Show sample high-confidence ground truth
    print("\n" + "=" * 70)
    print("SAMPLE GROUND TRUTH (High Confidence)")
    print("=" * 70)
    
    for skill in ground_truth["all_skills"][:10]:
        if skill["confidence_band"] == "high":
            print(f"\n'{skill['original_text']}' ({skill['ner_label']})")
            print(f"  -> '{skill['ground_truth_label']}' ({skill['score']:.4f})")
    
    print("\n" + "=" * 70)
    print("GROUND TRUTH GENERATION COMPLETE")
    print("=" * 70)
    
    return ground_truth


if __name__ == "__main__":
    main()
