# -*- coding: utf-8 -*-
"""
Pipeline Evaluation Script

Comprehensive evaluation of ESCO normalization pipeline.
Measures NER metrics, normalization accuracy, and performance.
"""

import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple
import json
import time
from datetime import datetime
from collections import Counter

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from services.esco_normalizer import ESCONormalizer
from services.esco_storage_service import ESCOStorageService


def _check_stdout():
    """Check and reset stdout if needed."""
    try:
        if sys.platform == 'win32':
            import io
            if not hasattr(sys.stdout, 'buffer') or sys.stdout.closed:
                sys.stdout = io.TextIOWrapper(sys.__stdout__.buffer, encoding='utf-8', errors='replace')
    except:
        pass


class PipelineEvaluator:
    """
    Evaluate ESCO normalization pipeline.
    
    Measures:
    - NER Precision, Recall, F1
    - Normalization accuracy
    - Performance metrics
    """
    
    def __init__(self, threshold: float = 0.75):
        self.threshold = threshold
        print("\nInitializing evaluator...")
        self.normalizer = ESCONormalizer(threshold=threshold)
        self.storage = ESCOStorageService()
        print("  - Normalizer ready")
        print("  - Storage service ready")
    
    def load_ground_truth(self) -> List[Dict]:
        """Load ground truth data."""
        gt_file = PROJECT_ROOT / "data" / "sample_jobs_ground_truth.json"
        
        if not gt_file.exists():
            print(f"Warning: Ground truth file not found: {gt_file}")
            return []
        
        with open(gt_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Filter items with annotations
        annotated = [item for item in data if item.get("annotated_skills")]
        print(f"Loaded {len(annotated)} annotated items from ground truth")
        
        return annotated
    
    def evaluate_ner_metrics(self, sample_size: int = 100) -> Dict:
        """
        Calculate NER precision, recall, F1.
        
        Uses ground truth annotations to evaluate skill extraction.
        """
        _check_stdout()
        
        print("\n" + "=" * 70)
        print("NER EVALUATION")
        print("=" * 70)
        
        ground_truth = self.load_ground_truth()
        
        if not ground_truth:
            print("No ground truth data available. Using sample jobs.")
            return self._evaluate_on_samples(sample_size)
        
        # Sample from ground truth
        import random
        samples = random.sample(ground_truth, min(sample_size, len(ground_truth)))
        
        true_positives = 0
        false_positives = 0
        false_negatives = 0
        
        skill_details = []
        
        for item in samples:
            text = item.get("text", "")[:2000]  # Limit text length
            gt_skills = set(item.get("annotated_skills", []))
            
            if not text:
                continue
            
            # Normalize
            result = self.normalizer.normalize_text(text)
            
            # Extract predicted skills
            predicted_skills = set()
            for entity in result.entities:
                skill_text = entity.get("text", "").lower().strip()
                if skill_text:
                    predicted_skills.add(skill_text)
            
            # Calculate matches (case-insensitive)
            gt_normalized = {s.lower().strip() for s in gt_skills}
            pred_normalized = {s.lower().strip() for s in predicted_skills}
            
            # Match counting
            tp = len(gt_normalized & pred_normalized)
            fp = len(pred_normalized - gt_normalized)
            fn = len(gt_normalized - pred_normalized)
            
            true_positives += tp
            false_positives += fp
            false_negatives += fn
            
            skill_details.append({
                "job_id": item.get("job_id"),
                "title": item.get("title", ""),
                "gt_skills": list(gt_normalized)[:10],
                "pred_skills": list(pred_normalized)[:10],
                "tp": tp,
                "fp": fp,
                "fn": fn
            })
        
        # Calculate metrics
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"\nResults (on {len(samples)} samples):")
        print(f"  True Positives:  {true_positives}")
        print(f"  False Positives: {false_positives}")
        print(f"  False Negatives: {false_negatives}")
        print(f"\n  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        
        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives,
            "sample_size": len(samples),
            "details": skill_details[:5]  # First 5 for review
        }
    
    def _evaluate_on_samples(self, sample_size: int = 100) -> Dict:
        """Evaluate using sample jobs without ground truth."""
        print("\nEvaluating on sample jobs...")
        
        storage_samples = list(self.storage.collection.aggregate([
            {"$match": {"skills_count": {"$gt": 0}}},
            {"$sample": {"size": sample_size}}
        ]))
        
        if not storage_samples:
            print("No stored samples available.")
            return {
                "precision": 0,
                "recall": 0,
                "f1": 0,
                "message": "No samples available"
            }
        
        # Analyze skill distribution
        all_skills = []
        confidences = []
        skill_counts = []
        
        for sample in storage_samples:
            matches = sample.get("normalization_data", {}).get("matches", [])
            for m in matches:
                all_skills.append(m.get("label", ""))
                confidences.append(m.get("score", 0))
            skill_counts.append(sample.get("skills_count", 0))
        
        avg_skills = sum(skill_counts) / len(skill_counts) if skill_counts else 0
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Count unique skills
        skill_counter = Counter(all_skills)
        
        print(f"\nAnalysis on {len(storage_samples)} samples:")
        print(f"  Avg skills per job: {avg_skills:.2f}")
        print(f"  Avg confidence: {avg_confidence:.4f}")
        print(f"  Unique skills: {len(skill_counter)}")
        print(f"  Top skills: {skill_counter.most_common(5)}")
        
        return {
            "avg_skills_per_job": round(avg_skills, 2),
            "avg_confidence": round(avg_confidence, 4),
            "unique_skills": len(skill_counter),
            "sample_size": len(storage_samples),
            "top_skills": skill_counter.most_common(10)
        }
    
    def evaluate_normalization_metrics(self) -> Dict:
        """Evaluate normalization accuracy."""
        _check_stdout()
        
        print("\n" + "=" * 70)
        print("NORMALIZATION METRICS")
        print("=" * 70)
        
        storage_stats = self.storage.get_statistics()
        
        # Get more detailed stats
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_confidence": {"$avg": "$confidence"},
                    "avg_skills": {"$avg": "$skills_count"},
                    "avg_matched": {"$avg": "$matched_count"},
                    "total_jobs": {"$sum": 1},
                    "jobs_with_high_conf": {
                        "$sum": {"$cond": [{"$gte": ["$confidence", 0.85]}, 1, 0]}
                    }
                }
            }
        ]
        
        results = list(self.storage.collection.aggregate(pipeline))
        
        if results:
            r = results[0]
            metrics = {
                "total_normalized_jobs": r.get("total_normalized_jobs", r.get("total_jobs", 0)),
                "avg_confidence": round(r.get("avg_confidence", 0), 4),
                "avg_skills_per_job": round(r.get("avg_skills", 0), 2),
                "avg_matched_per_job": round(r.get("avg_matched", 0), 2),
                "high_confidence_jobs": r.get("jobs_with_high_conf", 0),
                "high_confidence_rate": round(r.get("jobs_with_high_conf", 0) / r.get("total_jobs", 1), 4)
            }
        else:
            metrics = {
                "total_normalized_jobs": storage_stats.get("total_jobs", 0),
                "avg_confidence": storage_stats.get("avg_confidence", 0),
                "avg_skills_per_job": storage_stats.get("avg_skills_per_job", 0)
            }
        
        print(f"\nNormalization Metrics:")
        print(f"  Total jobs normalized: {metrics.get('total_normalized_jobs', 0)}")
        print(f"  Avg confidence: {metrics.get('avg_confidence', 0):.4f}")
        print(f"  Avg skills/job: {metrics.get('avg_skills_per_job', 0):.2f}")
        print(f"  High confidence rate: {metrics.get('high_confidence_rate', 0):.2%}")
        
        return metrics
    
    def evaluate_performance(self, sample_size: int = 50) -> Dict:
        """Benchmark processing speed."""
        _check_stdout()
        
        print("\n" + "=" * 70)
        print("PERFORMANCE BENCHMARK")
        print("=" * 70)
        
        # Sample jobs for benchmarking
        samples = list(self.storage.collection.aggregate([
            {"$match": {"description_raw": {"$exists": True, "$ne": ""}}},
            {"$limit": sample_size}
        ]))
        
        if not samples:
            # Use default texts
            texts = [
                "Cần người biết Python, Java, Excel và có kinh nghiệm 3 năm.",
                "Tuyển dụng Backend Developer với Django, PostgreSQL, REST API.",
                "Cần kỹ sư cơ khí biết AutoCAD, SolidWorks.",
            ] * 10
        else:
            texts = [s.get("description_raw", "")[:1000] for s in samples]
        
        # Warmup
        print("\nWarming up...")
        for text in texts[:5]:
            self.normalizer.normalize_text(text)
        
        # Benchmark
        print(f"Benchmarking on {len(texts)} texts...")
        times = []
        
        for text in texts:
            start = time.time()
            self.normalizer.normalize_text(text)
            elapsed = (time.time() - start) * 1000  # ms
            times.append(elapsed)
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print(f"\nPerformance Results:")
        print(f"  Average: {avg_time:.1f} ms/text")
        print(f"  Min:     {min_time:.1f} ms/text")
        print(f"  Max:     {max_time:.1f} ms/text")
        print(f"  Throughput: {1000/avg_time:.1f} texts/sec")
        
        return {
            "avg_processing_time_ms": round(avg_time, 1),
            "min_processing_time_ms": round(min_time, 1),
            "max_processing_time_ms": round(max_time, 1),
            "throughput_texts_per_sec": round(1000/avg_time, 1),
            "sample_size": len(texts)
        }
    
    def generate_report(self, output_file: str = None) -> Dict:
        """Generate comprehensive evaluation report."""
        _check_stdout()
        
        print("\n" + "=" * 70)
        print("GENERATING FINAL EVALUATION REPORT")
        print("=" * 70)
        
        report = {
            "evaluation_date": datetime.now().isoformat(),
            "pipeline_version": "1.0.0",
            "threshold": self.threshold,
            "components": {}
        }
        
        # Run all evaluations
        print("\n[1/3] Evaluating NER metrics...")
        report["components"]["ner_metrics"] = self.evaluate_ner_metrics()
        
        print("\n[2/3] Evaluating normalization metrics...")
        report["components"]["normalization_metrics"] = self.evaluate_normalization_metrics()
        
        print("\n[3/3] Benchmarking performance...")
        report["components"]["performance"] = self.evaluate_performance()
        
        # Summary
        print("\n" + "=" * 70)
        print("EVALUATION SUMMARY")
        print("=" * 70)
        
        ner = report["components"]["ner_metrics"]
        norm = report["components"]["normalization_metrics"]
        perf = report["components"]["performance"]
        
        print(f"\nNER Quality:")
        if "f1" in ner:
            print(f"  F1 Score: {ner.get('f1', 0):.4f}")
            print(f"  Precision: {ner.get('precision', 0):.4f}")
            print(f"  Recall: {ner.get('recall', 0):.4f}")
        else:
            print(f"  Avg skills/job: {ner.get('avg_skills_per_job', 0):.2f}")
            print(f"  Avg confidence: {ner.get('avg_confidence', 0):.4f}")
        
        print(f"\nNormalization:")
        print(f"  Jobs normalized: {norm.get('total_normalized_jobs', 0)}")
        print(f"  Avg confidence: {norm.get('avg_confidence', 0):.4f}")
        print(f"  Avg skills/job: {norm.get('avg_skills_per_job', 0):.2f}")
        
        print(f"\nPerformance:")
        print(f"  Avg time: {perf.get('avg_processing_time_ms', 0):.1f} ms")
        print(f"  Throughput: {perf.get('throughput_texts_per_sec', 0):.1f} texts/sec")
        
        # Save report
        if output_file:
            output_path = Path(output_file)
        else:
            output_path = PROJECT_ROOT / "data" / "final_metrics.json"
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\nReport saved to: {output_path}")
        
        return report


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate ESCO pipeline')
    parser.add_argument('--threshold', type=float, default=0.75, help='ESCO threshold')
    parser.add_argument('--sample-size', type=int, default=100, help='Sample size for evaluation')
    parser.add_argument('--output', type=str, default=None, help='Output file path')
    parser.add_argument('--ner-only', action='store_true', help='Run NER evaluation only')
    parser.add_argument('--perf-only', action='store_true', help='Run performance benchmark only')
    
    args = parser.parse_args()
    
    evaluator = PipelineEvaluator(threshold=args.threshold)
    
    if args.ner_only:
        evaluator.evaluate_ner_metrics(sample_size=args.sample_size)
    elif args.perf_only:
        evaluator.evaluate_performance(sample_size=args.sample_size)
    else:
        evaluator.generate_report(output_file=args.output)


if __name__ == "__main__":
    main()
