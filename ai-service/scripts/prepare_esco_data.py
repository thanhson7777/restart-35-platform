"""
ESCO Data Preparation Script
Loads ESCO skills dataset, creates lookup tables, and prepares data for normalization pipeline.
"""

import json
import os
import sys
from pathlib import Path

import pandas as pd

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ESCO_DIR = PROJECT_ROOT / "ESCO dataset - v1.2.1 - classification - en - csv"
OUTPUT_DIR = DATA_DIR / "esco_processed"


def load_esco_skills():
    """Load ESCO skills from CSV file."""
    skills_file = ESCO_DIR / "skills_en.csv"

    if not skills_file.exists():
        raise FileNotFoundError(f"ESCO skills file not found: {skills_file}")

    # Try different encodings
    encodings = ['utf-8', 'latin-1', 'cp1252']
    df = None

    for encoding in encodings:
        try:
            df = pd.read_csv(skills_file, encoding=encoding)
            print(f"Successfully loaded with encoding: {encoding}")
            break
        except UnicodeDecodeError:
            continue

    if df is None:
        raise ValueError("Could not decode skills file with any encoding")

    return df


def analyze_skills(df: pd.DataFrame):
    """Analyze ESCO skills structure."""
    print("\n" + "=" * 60)
    print("ESCO Skills Analysis")
    print("=" * 60)

    print(f"\nTotal skills: {len(df)}")
    print(f"\nColumns: {df.columns.tolist()}")

    # Check column info
    print("\nColumn details:")
    for col in df.columns:
        non_null = df[col].notna().sum()
        print(f"  - {col}: {non_null}/{len(df)} non-null ({100*non_null/len(df):.1f}%)")

    # Show sample
    print("\nSample skills (first 5):")
    if 'preferredLabel' in df.columns:
        for i, row in df.head(5).iterrows():
            print(f"  {i+1}. {row['preferredLabel']}")
            if 'uri' in df.columns:
                print(f"     URI: {row['uri']}")

    return df


def create_lookup_tables(df: pd.DataFrame):
    """Create lookup tables for URI <-> Label mapping."""
    print("\n" + "=" * 60)
    print("Creating Lookup Tables")
    print("=" * 60)

    # Initialize lookup dictionaries
    uri_to_label = {}
    label_to_uri = {}
    alt_labels = {}

    # Map URI to preferredLabel
    for _, row in df.iterrows():
        uri = row.get('conceptUri')  # ESCO uses 'conceptUri' column
        label = row.get('preferredLabel')

        if pd.notna(uri) and pd.notna(label):
            uri_to_label[uri] = label
            label_to_uri[label] = uri

    print(f"URI -> Label mappings: {len(uri_to_label)}")
    print(f"Label -> URI mappings: {len(label_to_uri)}")

    # Build altLabels index (alternative labels for fuzzy matching)
    if 'altLabels' in df.columns:
        for _, row in df.iterrows():
            uri = row.get('conceptUri')  # ESCO uses 'conceptUri' column
            alts = row.get('altLabels')

            if pd.notna(uri) and pd.notna(alts):
                # altLabels can be pipe-separated
                alt_list = str(alts).split('|')
                alt_labels[uri] = [alt.strip() for alt in alt_list if alt.strip()]

                # Add to reverse lookup
                for alt in alt_labels[uri]:
                    label_to_uri[alt] = uri  # URI is 'conceptUri' column

        print(f"Skills with altLabels: {len(alt_labels)}")
        print(f"Total altLabel mappings: {sum(len(v) for v in alt_labels.values())}")

    return uri_to_label, label_to_uri, alt_labels


def save_processed_data(uri_to_label: dict, label_to_uri: dict, alt_labels: dict):
    """Save processed data to JSON files."""
    print("\n" + "=" * 60)
    print("Saving Processed Data")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save ESCO skills lookup
    skills_data = {
        'uri_to_label': uri_to_label,
        'label_to_uri': label_to_uri,
        'alt_labels': alt_labels
    }

    skills_file = OUTPUT_DIR / "esco_skills.json"
    with open(skills_file, 'w', encoding='utf-8') as f:
        json.dump(skills_data, f, ensure_ascii=False, indent=2)
    print(f"Saved: {skills_file}")

    # Save URIs list
    uris_data = {
        'uris': list(uri_to_label.keys())
    }

    uris_file = OUTPUT_DIR / "esco_uris.json"
    with open(uris_file, 'w', encoding='utf-8') as f:
        json.dump(uris_data, f, ensure_ascii=False, indent=2)
    print(f"Saved: {uris_file}")

    # Save metadata
    metadata = {
        'total_skills': len(uri_to_label),
        'total_alt_labels': sum(len(v) for v in alt_labels.values()),
        'created_at': pd.Timestamp.now().isoformat(),
        'source': 'ESCO Dataset v1.2.1'
    }

    metadata_file = OUTPUT_DIR / "esco_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved: {metadata_file}")

    return skills_file, uris_file, metadata_file


def analyze_skill_types(df: pd.DataFrame):
    """Analyze skill types from ESCO dataset."""
    print("\n" + "=" * 60)
    print("Skill Type Analysis")
    print("=" * 60)

    # Check for type/ISFOccupationArea columns
    type_columns = [col for col in df.columns if 'type' in col.lower() or 'area' in col.lower()]

    for col in type_columns:
        print(f"\n{col}:")
        print(df[col].value_counts().head(10))

    # Check skill descriptions
    if 'description' in df.columns:
        non_null_desc = df['description'].notna().sum()
        print(f"\nSkills with descriptions: {non_null_desc}/{len(df)} ({100*non_null_desc/len(df):.1f}%)")


def main():
    """Main execution function."""
    print("=" * 60)
    print("ESCO Data Preparation Pipeline")
    print("=" * 60)

    # Step 1: Load ESCO skills
    print("\n[1/5] Loading ESCO skills dataset...")
    df = load_esco_skills()

    # Step 2: Analyze skills structure
    print("\n[2/5] Analyzing skills structure...")
    analyze_skills(df)

    # Step 3: Analyze skill types
    print("\n[3/5] Analyzing skill types...")
    analyze_skill_types(df)

    # Step 4: Create lookup tables
    print("\n[4/5] Creating lookup tables...")
    uri_to_label, label_to_uri, alt_labels = create_lookup_tables(df)

    # Step 5: Save processed data
    print("\n[5/5] Saving processed data...")
    skills_file, uris_file, metadata_file = save_processed_data(
        uri_to_label, label_to_uri, alt_labels
    )

    print("\n" + "=" * 60)
    print("Preparation Complete!")
    print("=" * 60)
    print(f"\nOutput files:")
    print(f"  - {skills_file}")
    print(f"  - {uris_file}")
    print(f"  - {metadata_file}")
    print(f"\nNext step: Run compute_esco_embeddings.py to generate embeddings")

    return df, uri_to_label, label_to_uri, alt_labels


if __name__ == "__main__":
    try:
        df, uri_to_label, label_to_uri, alt_labels = main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
