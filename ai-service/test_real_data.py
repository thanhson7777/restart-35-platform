"""
Test ESCO Pipeline voi du lieu that tu jobs.csv
"""

import pandas as pd
import sys
import time
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.esco_normalizer import ESCONormalizer

def test_with_real_data():
    print("=" * 70)
    print("TEST ESCO PIPELINE VOI DU LIEU THAT")
    print("=" * 70)
    
    # Load jobs data
    df = pd.read_csv('data/jobs.csv')
    print(f"\n[*] Tong so jobs trong database: {len(df)}")
    
    # Initialize normalizer
    print("\n[*] Initializing ESCO Normalizer...")
    normalizer = ESCONormalizer(threshold=0.75)
    print("[+] Normalizer initialized successfully!")
    
    # Test voi 5 jobs khac nhau
    test_indices = [0, 2, 5, 7, 9]
    
    results = []
    
    for i, idx in enumerate(test_indices):
        if idx >= len(df):
            continue
            
        row = df.iloc[idx]
        title = row['title']
        description = str(row['description'])[:1500]  # Limit length
        
        print(f"\n{'='*70}")
        print(f"[TEST {i+1}] Job #{idx}")
        print(f"{'='*70}")
        print(f"Title: {title}")
        print(f"Company: {row['company']}")
        print(f"Location: {row['location']}")
        print(f"Category: {row['category']}")
        print("-" * 50)
        print(f"Description (first 300 chars):")
        print(f"   {description[:300]}...")
        
        # Normalize
        start_time = time.time()
        result = normalizer.normalize_text(
            text=description,
            job_id=row['id'],
            title=title
        )
        elapsed = (time.time() - start_time) * 1000
        
        print(f"\n[*] Processing time: {elapsed:.1f} ms")
        print(f"\n[RESULTS]")
        print(f"   - Total entities extracted: {len(result.entities)}")
        print(f"   - Skills matched: {result.matched_skills}")
        print(f"   - Match rate: {result.match_rate:.2%}")
        print(f"   - Avg confidence: {result.avg_confidence:.3f}")
        
        if result.entities:
            print(f"\n[EXTRACTED SKILLS]")
            for j, entity in enumerate(result.entities, 1):
                label = entity.get('label', 'UNKNOWN')
                text = entity.get('text', '')[:40]
                match = entity.get('best_match', {})
                uri = match.get('uri', 'N/A')
                similarity = match.get('similarity', 0)
                skill_label = match.get('label', 'N/A')
                
                print(f"   {j}. [{label}] '{text}'")
                print(f"      -> ESCO: {skill_label}")
                print(f"         URI: {uri}")
                print(f"         Similarity: {similarity:.3f}")
        
        results.append({
            'job_id': row['id'],
            'title': title,
            'entities': len(result.entities),
            'matched': result.matched_skills,
            'match_rate': result.match_rate,
            'confidence': result.avg_confidence,
            'time_ms': elapsed
        })
    
    # Summary
    print("\n" + "=" * 70)
    print("[SUMMARY]")
    print("=" * 70)
    
    total_entities = sum(r['entities'] for r in results)
    total_matched = sum(r['matched'] for r in results)
    avg_confidence = sum(r['confidence'] for r in results) / len(results) if results else 0
    avg_time = sum(r['time_ms'] for r in results) / len(results) if results else 0
    
    print(f"\n[*] Overall Statistics ({len(results)} jobs tested):")
    print(f"   - Total entities extracted: {total_entities}")
    print(f"   - Total skills matched: {total_matched}")
    print(f"   - Avg confidence: {avg_confidence:.3f}")
    print(f"   - Avg processing time: {avg_time:.1f} ms")
    print(f"   - Avg skills per job: {total_entities/len(results):.1f}")
    
    print("\n[*] Per-Job Results:")
    for r in results:
        title_short = r['title'][:40] if len(r['title']) > 40 else r['title']
        print(f"   - {title_short}: {r['entities']} entities, {r['matched']} matched, conf={r['confidence']:.3f}")
    
    return results

if __name__ == "__main__":
    test_with_real_data()
