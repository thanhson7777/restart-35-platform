"""
Model Evaluation Script

Đánh giá performance của ML models sử dụng various metrics:
- Precision@K
- Recall@K
- NDCG@K
- MRR (Mean Reciprocal Rank)
- AUC-ROC

Usage:
    python scripts/ml/evaluate_models.py --model cf --test-size 0.2
    python scripts/ml/evaluate_models.py --model ranking --k 10
"""

import sys
import os
import json
import argparse
import pickle
from datetime import datetime
from typing import Dict, List, Tuple
import numpy as np
from collections import defaultdict

# Add parent directory to path (go up: ml -> scripts -> ai-service)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
AI_SERVICE_DIR = os.path.dirname(ML_DIR)
sys.path.insert(0, AI_SERVICE_DIR)

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def dcg_at_k(relevance_scores: List[float], k: int) -> float:
    """
    Calculate Discounted Cumulative Gain at K

    Args:
        relevance_scores: List of relevance scores
        k: Cutoff position

    Returns:
        DCG@k
    """
    relevance_scores = relevance_scores[:k]
    return sum((2**rel - 1) / np.log2(idx + 2) for idx, rel in enumerate(relevance_scores))


def ndcg_at_k(predicted_scores: List[float], actual_scores: List[float], k: int) -> float:
    """
    Calculate Normalized Discounted Cumulative Gain at K

    Args:
        predicted_scores: Predicted relevance scores
        actual_scores: Actual relevance scores
        k: Cutoff position

    Returns:
        NDCG@k
    """
    # Sort by predicted scores
    sorted_indices = np.argsort(predicted_scores)[::-1]
    sorted_actual = [actual_scores[i] for i in sorted_indices]

    # Calculate DCG
    dcg = dcg_at_k(sorted_actual, k)

    # Calculate ideal DCG
    ideal_sorted = sorted(actual_scores, reverse=True)
    idcg = dcg_at_k(ideal_sorted, k)

    if idcg == 0:
        return 0.0

    return dcg / idcg


def precision_at_k(predicted: List[str], actual: List[str], k: int) -> float:
    """
    Calculate Precision at K

    Args:
        predicted: List of predicted items
        actual: List of actual relevant items
        k: Cutoff position

    Returns:
        Precision@K
    """
    predicted_k = set(predicted[:k])
    actual_set = set(actual)

    if len(predicted_k) == 0:
        return 0.0

    return len(predicted_k & actual_set) / min(k, len(predicted_k))


def recall_at_k(predicted: List[str], actual: List[str], k: int) -> float:
    """
    Calculate Recall at K

    Args:
        predicted: List of predicted items
        actual: List of actual relevant items
        k: Cutoff position

    Returns:
        Recall@K
    """
    predicted_k = set(predicted[:k])
    actual_set = set(actual)

    if len(actual_set) == 0:
        return 0.0

    return len(predicted_k & actual_set) / len(actual_set)


def mrr(predicted_list: List[str], actual: str) -> float:
    """
    Calculate Mean Reciprocal Rank

    Args:
        predicted_list: List of predicted items in order
        actual: Actual relevant item

    Returns:
        MRR (1/rank if found, 0 otherwise)
    """
    for idx, item in enumerate(predicted_list):
        if item == actual:
            return 1.0 / (idx + 1)

    return 0.0


def apk(actual: str, predicted: List[str], k: int) -> float:
    """Average Precision at K for single item"""
    score = precision_at_k(predicted, [actual], k)
    return score


def map_at_k(actual_list: List[str], predicted_lists: List[List[str]], k: int) -> float:
    """
    Mean Average Precision at K

    Args:
        actual_list: List of actual relevant items
        predicted_lists: List of predicted item lists
        k: Cutoff position

    Returns:
        MAP@K
    """
    if len(actual_list) != len(predicted_lists):
        raise ValueError("actual_list and predicted_lists must have same length")

    scores = [apk(actual, predicted, k) for actual, predicted in zip(actual_list, predicted_lists)]
    return np.mean(scores)


class ModelEvaluator:
    """
    Model Evaluator cho recommendation system

    Supports:
    - Collaborative Filtering
    - Content-based
    - Hybrid models
    """

    def __init__(self, model_path: str, model_type: str = 'cf'):
        self.model_path = model_path
        self.model_type = model_type
        self.model = None

    def load_model(self):
        """Load model from disk"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found: {self.model_path}")

        if self.model_type == 'cf':
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
        elif self.model_type == 'ranking':
            import lightgbm as lgb
            self.model = lgb.Booster(model_file=self.model_path)

        logger.info(f"Loaded {self.model_type} model from {self.model_path}")

    def evaluate_recommendations(
        self,
        test_data: List[Dict],
        k_values: List[int] = [5, 10, 20]
    ) -> Dict:
        """
        Evaluate recommendation quality

        Args:
            test_data: List of test interactions
            k_values: List of K values for metrics

        Returns:
            Evaluation metrics
        """
        if not self.model:
            self.load_model()

        results = {
            'model_type': self.model_type,
            'test_size': len(test_data),
            'k_values': k_values,
            'metrics': {}
        }

        # Group by user
        user_data = defaultdict(list)
        for interaction in test_data:
            user_data[interaction['userId']].append(interaction)

        # Calculate metrics for each K
        for k in k_values:
            precision_scores = []
            recall_scores = []
            ndcg_scores = []
            mrr_scores = []

            for user_id, interactions in user_data.items():
                # Get actual relevant items (applied jobs)
                actual_relevant = [
                    i['jobId'] for i in interactions
                    if i.get('action') in ['apply', 'bookmark']
                ]

                if not actual_relevant:
                    continue

                # Get predicted recommendations
                if self.model_type == 'cf':
                    predicted = self.model.get_user_based_recommendations(
                        user_id, limit=k, exclude_jobs=[i['jobId'] for i in interactions]
                    )
                    predicted_job_ids = [p['jobId'] for p in predicted]
                else:
                    # Placeholder for other model types
                    predicted_job_ids = []

                if not predicted_job_ids:
                    continue

                # Calculate metrics
                precision_scores.append(precision_at_k(predicted_job_ids, actual_relevant, k))
                recall_scores.append(recall_at_k(predicted_job_ids, actual_relevant, k))
                mrr_scores.append(mrr(predicted_job_ids, actual_relevant[0]))

            # Store results
            results['metrics'][f'precision@{k}'] = {
                'mean': float(np.mean(precision_scores)) if precision_scores else 0.0,
                'std': float(np.std(precision_scores)) if precision_scores else 0.0
            }

            results['metrics'][f'recall@{k}'] = {
                'mean': float(np.mean(recall_scores)) if recall_scores else 0.0,
                'std': float(np.std(recall_scores)) if recall_scores else 0.0
            }

            results['metrics'][f'mrr@{k}'] = {
                'mean': float(np.mean(mrr_scores)) if mrr_scores else 0.0,
                'std': float(np.std(mrr_scores)) if mrr_scores else 0.0
            }

        return results

    def cross_validate(
        self,
        data: List[Dict],
        n_folds: int = 5,
        test_ratio: float = 0.2
    ) -> Dict:
        """
        Cross-validation evaluation

        Args:
            data: Full interaction data
            n_folds: Number of folds
            test_ratio: Ratio of data for testing

        Returns:
            Cross-validation results
        """
        # Simple train/test split for now
        np.random.seed(42)
        indices = np.arange(len(data))
        np.random.shuffle(indices)

        split_idx = int(len(data) * (1 - test_ratio))
        train_data = [data[i] for i in indices[:split_idx]]
        test_data = [data[i] for i in indices[split_idx:]]

        # Re-train with train data
        from services.collaborative_filter import CollaborativeFiltering

        cf = CollaborativeFiltering()
        cf._lazy_init(train_data)

        # Evaluate with test data
        self.model = cf

        results = self.evaluate_recommendations(test_data)
        results['train_size'] = len(train_data)
        results['test_size'] = len(test_data)

        return results


def main():
    """Main evaluation"""
    parser = argparse.ArgumentParser(description='Evaluate ML models')
    parser.add_argument('--model', choices=['cf', 'ranking', 'all'], default='cf',
                        help='Model type to evaluate')
    parser.add_argument('--k', type=int, nargs='+', default=[5, 10, 20],
                        help='K values for metrics')
    parser.add_argument('--data', type=str, default=None,
                        help='Path to test data')
    parser.add_argument('--cross-validate', action='store_true',
                        help='Run cross-validation')

    args = parser.parse_args()

    print("\n" + "="*60)
    print("ML Model Evaluation")
    print("="*60)

    MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')

    # Load test data
    if args.data and os.path.exists(args.data):
        with open(args.data, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
    else:
        # Generate sample data
        from scripts.ml.generate_sample_interactions import generate_interactions
        test_data = generate_interactions(num_users=20, interactions_per_user=10)

    print(f"Loaded {len(test_data)} test interactions")

    # Evaluate specified models
    if args.model == 'all':
        models = ['cf', 'ranking']
    else:
        models = [args.model]

    for model_type in models:
        model_path = os.path.join(MODEL_DIR, f'{model_type}_model.pkl')

        if not os.path.exists(model_path):
            print(f"\n{model_type.upper()} model not found, skipping...")
            continue

        print(f"\n{'='*40}")
        print(f"Evaluating {model_type.upper()} Model")
        print(f"{'='*40}")

        try:
            evaluator = ModelEvaluator(model_path, model_type)

            if args.cross_validate:
                results = evaluator.cross_validate(test_data)
            else:
                results = evaluator.evaluate_recommendations(test_data, k_values=args.k)

            print("\nResults:")
            print(json.dumps(results, indent=2))

        except Exception as e:
            print(f"Evaluation failed: {e}")

    print("\n" + "="*60)
    print("Evaluation Complete")
    print("="*60)


if __name__ == '__main__':
    main()