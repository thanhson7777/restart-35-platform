"""
Sample Jobs Extraction Script
Creates a sample of jobs for testing ESCO normalization pipeline.
"""

import json
import random
import sys
from pathlib import Path

import pandas as pd

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Sample size
SAMPLE_SIZE = 300
RANDOM_SEED = 42

# Fix Windows console encoding
import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def load_jobs():
    """Load jobs from CSV."""
    jobs_file = DATA_DIR / "jobs.csv"

    if not jobs_file.exists():
        raise FileNotFoundError(f"Jobs file not found: {jobs_file}")

    # Try different encodings
    encodings = ['utf-8', 'latin-1', 'cp1252']
    df = None

    for encoding in encodings:
        try:
            df = pd.read_csv(jobs_file, encoding=encoding)
            print(f"Loaded {len(df)} jobs with encoding: {encoding}")
            break
        except UnicodeDecodeError:
            continue

    if df is None:
        raise ValueError("Could not decode jobs file")

    return df


def analyze_jobs(df: pd.DataFrame):
    """Analyze jobs dataset."""
    print("\n" + "=" * 60)
    print("Jobs Analysis")
    print("=" * 60)

    print(f"\nTotal jobs: {len(df)}")
    print(f"\nColumns: {df.columns.tolist()}")

    # Categories distribution
    if 'category' in df.columns:
        print(f"\nCategories ({df['category'].nunique()} unique):")
        cat_counts = df['category'].value_counts()
        for cat, count in cat_counts.head(15).items():
            print(f"  - {cat}: {count}")

    # Skills analysis
    if 'skills' in df.columns:
        non_null_skills = df['skills'].notna().sum()
        print(f"\nJobs with skills: {non_null_skills}/{len(df)} ({100*non_null_skills/len(df):.1f}%)")

        # Sample skills (handle encoding issues)
        sample_skills = df[df['skills'].notna()]['skills'].head(5).tolist()
        print("\nSample skills:")
        for i, skills in enumerate(sample_skills, 1):
            try:
                skills_list = str(skills).split('|')[:5]
                print(f"  {i}. {' | '.join(skills_list)}")
            except Exception:
                print(f"  {i}. [skills data]")

    return df


def create_sample_jobs(df: pd.DataFrame, sample_size: int = SAMPLE_SIZE):
    """Create stratified sample of jobs."""
    print(f"\n" + "=" * 60)
    print(f"Creating Sample ({sample_size} jobs)")
    print("=" * 60)

    # Ensure diverse categories
    if 'category' in df.columns:
        # Stratified sampling by category
        # Get unique categories sorted by frequency
        categories = df['category'].value_counts()

        sample_jobs_list = []
        samples_per_category = {}

        # For each category, sample proportionally but ensure minimum
        for cat in categories.index:
            cat_df = df[df['category'] == cat]

            # Minimum 5 jobs per category, or all if less than 5
            min_samples = min(5, len(cat_df))

            # Proportional samples
            prop_samples = int(sample_size * len(cat_df) / len(df))
            n_samples = max(min_samples, prop_samples)
            n_samples = min(n_samples, len(cat_df))

            cat_samples = cat_df.sample(n=n_samples, random_state=RANDOM_SEED)
            sample_jobs_list.append(cat_samples)
            samples_per_category[cat] = len(cat_samples)

        # Combine all samples
        sample_jobs = pd.concat(sample_jobs_list, ignore_index=True)

        # If we have fewer than target, add more randomly
        if len(sample_jobs) < sample_size:
            remaining_needed = sample_size - len(sample_jobs)
            remaining_indices = df[~df.index.isin(sample_jobs.index)].index
            if len(remaining_indices) > 0:
                additional = df.loc[remaining_indices].sample(
                    n=min(remaining_needed, len(remaining_indices)),
                    random_state=RANDOM_SEED + 1
                )
                sample_jobs = pd.concat([sample_jobs, additional], ignore_index=True)

        # If we have more than target, trim
        if len(sample_jobs) > sample_size:
            sample_jobs = sample_jobs.sample(n=sample_size, random_state=RANDOM_SEED)
    else:
        # Random sampling
        sample_jobs = df.sample(n=min(sample_size, len(df)), random_state=RANDOM_SEED)

    print(f"Sampled {len(sample_jobs)} jobs")
    print(f"Categories in sample: {sample_jobs['category'].nunique() if 'category' in sample_jobs.columns else 'N/A'}")

    return sample_jobs


def create_ground_truth_template(sample_jobs: pd.DataFrame):
    """Create ground truth annotation template."""
    print("\n" + "=" * 60)
    print("Creating Ground Truth Template")
    print("=" * 60)

    ground_truth = []
    for _, job in sample_jobs.iterrows():
        entry = {
            'job_id': str(job.get('id', '')),
            'title': str(job.get('title', '')) if pd.notna(job.get('title')) else '',
            'company': str(job.get('company', '')) if pd.notna(job.get('company')) else '',
            'text': str(job.get('description', '')) if pd.notna(job.get('description')) else '',
            'skills_mentioned': (
                str(job.get('skills', '')).split('|')
                if pd.notna(job.get('skills')) else []
            ),
            'category': str(job.get('category', '')) if pd.notna(job.get('category')) else '',
            # To be filled by annotators
            'annotated_skills': [],
            'esco_uris': [],
            'notes': ''
        }
        ground_truth.append(entry)

    return ground_truth


def save_sample_data(sample_jobs: pd.DataFrame, ground_truth: list):
    """Save sample jobs and ground truth."""
    print("\n" + "=" * 60)
    print("Saving Sample Data")
    print("=" * 60)

    # Save sample jobs CSV
    sample_file = DATA_DIR / "sample_jobs.csv"
    sample_jobs.to_csv(sample_file, index=False, encoding='utf-8')
    print(f"Saved: {sample_file}")

    # Save ground truth template
    ground_truth_file = DATA_DIR / "sample_jobs_ground_truth.json"
    with open(ground_truth_file, 'w', encoding='utf-8') as f:
        json.dump(ground_truth, f, ensure_ascii=False, indent=2)
    print(f"Saved: {ground_truth_file}")

    # Save metadata
    metadata = {
        'sample_size': int(len(sample_jobs)),
        'random_seed': int(RANDOM_SEED),
        'categories': {
            str(k): int(v) for k, v in
            sample_jobs['category'].value_counts().to_dict().items()
        } if 'category' in sample_jobs.columns else {},
        'jobs_with_skills': int(
            sample_jobs['skills'].notna().sum()
            if 'skills' in sample_jobs.columns else 0
        )
    }

    metadata_file = DATA_DIR / "sample_jobs_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved: {metadata_file}")

    return sample_file, ground_truth_file, metadata_file


def main():
    """Main execution function."""
    print("=" * 60)
    print("Sample Jobs Extraction Pipeline")
    print("=" * 60)

    # Step 1: Load jobs
    print("\n[1/4] Loading jobs...")
    df = load_jobs()

    # Step 2: Analyze jobs
    print("\n[2/4] Analyzing jobs...")
    analyze_jobs(df)

    # Step 3: Create sample
    print("\n[3/4] Creating sample...")
    sample_jobs = create_sample_jobs(df)

    # Step 4: Create ground truth template
    print("\n[4/4] Creating ground truth template...")
    ground_truth = create_ground_truth_template(sample_jobs)

    # Step 5: Save
    print("\n[5/5] Saving sample data...")
    sample_file, ground_truth_file, metadata_file = save_sample_data(sample_jobs, ground_truth)

    print("\n" + "=" * 60)
    print("Sample Jobs Extraction Complete!")
    print("=" * 60)
    print(f"\nOutput files:")
    print(f"  - {sample_file}")
    print(f"  - {ground_truth_file}")
    print(f"  - {metadata_file}")
    print(f"\nTotal sample jobs: {len(sample_jobs)}")

    return sample_jobs, ground_truth


if __name__ == "__main__":
    try:
        sample_jobs, ground_truth = main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
