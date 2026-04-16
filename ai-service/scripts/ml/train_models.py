"""
Model Training Pipeline

Script train và evaluate ML models cho recommendation system.
Hỗ trợ:
- Collaborative Filtering model
- Ranking model (LightGBM/XGBoost)
- Evaluation metrics

Usage:
    python scripts/ml/train_models.py --model ranking --epochs 50
    python scripts/ml/train_models.py --model all
    python scripts/ml/train_models.py --evaluate --model cf
"""

import sys
import os
import json
import argparse
import pickle
from datetime import datetime
from typing import Dict, List, Tuple, Optional
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

# Model paths
MODEL_DIR = os.path.join(AI_SERVICE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)


def load_interaction_data(filepath: Optional[str] = None) -> List[Dict]:
    """Load interaction data for training"""
    if filepath and os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    # Try default path
    default_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'interactions_sample.json')
    if os.path.exists(default_path):
        with open(default_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    return []


def create_training_samples(interactions: List[Dict]) -> Tuple[List, List]:
    """
    Create positive and negative samples for training

    Args:
        interactions: List of user-job interactions

    Returns:
        (positive_samples, negative_samples)
    """
    # Group by user
    user_jobs = defaultdict(list)
    for interaction in interactions:
        user_id = interaction['userId']
        job_id = interaction['jobId']
        action = interaction.get('action', 'view')
        weight = interaction.get('weight', 1.0)

        user_jobs[user_id].append({
            'jobId': job_id,
            'action': action,
            'weight': weight
        })

    positive_samples = []
    negative_samples = []

    for user_id, jobs in user_jobs.items():
        # Sort by weight (apply > bookmark > click > view)
        applied_jobs = {j['jobId'] for j in jobs if j['weight'] >= 4.0}
        clicked_jobs = {j['jobId'] for j in jobs if j['weight'] >= 2.0}

        # Positive: jobs user applied/bookmarked
        for job_id in applied_jobs:
            positive_samples.append({
                'userId': user_id,
                'jobId': job_id,
                'label': 1,
                'action': 'apply'
            })

        # Negative: jobs user clicked but didn't apply
        for job_id in clicked_jobs:
            if job_id not in applied_jobs:
                negative_samples.append({
                    'userId': user_id,
                    'jobId': job_id,
                    'label': 0,
                    'action': 'click'
                })

        # Hard negative: jobs user skipped or viewed briefly
        for job in jobs:
            if job['weight'] <= 1.0:
                negative_samples.append({
                    'userId': user_id,
                    'jobId': job['jobId'],
                    'label': 0,
                    'action': job['action']
                })

    return positive_samples, negative_samples


def train_cf_model(data: List[Dict]) -> Dict:
    """
    Train Collaborative Filtering model

    Args:
        data: Interaction data

    Returns:
        Model metadata
    """
    logger.info("Training Collaborative Filtering model...")

    # Import CF
    from services.collaborative_filter import CollaborativeFiltering

    cf = CollaborativeFiltering()
    success = cf._lazy_init(data)

    if not success:
        logger.error(f"CF training failed: {cf._init_error}")
        return {'error': cf._init_error}

    # Save model
    model_path = os.path.join(MODEL_DIR, 'cf_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(cf, f)

    stats = {
        'model_type': 'collaborative_filtering',
        'trained_at': datetime.now().isoformat(),
        'training_samples': len(data),
        'stats': cf.get_stats()
    }

    # Save stats
    stats_path = os.path.join(MODEL_DIR, 'cf_stats.json')
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    logger.info(f"CF model saved to: {model_path}")
    logger.info(f"Stats: {stats}")

    return stats


def train_ranking_model(positive_samples: List, negative_samples: List) -> Dict:
    """
    Train LightGBM ranking model

    Args:
        positive_samples: Positive training samples
        negative_samples: Negative training samples

    Returns:
        Model metadata
    """
    logger.info("Training Ranking model...")

    try:
        import lightgbm as lgb
        from sklearn.model_selection import train_test_split

        # Prepare training data
        # Features: user_interaction_count, job_popularity, user_job_score, etc.

        all_samples = positive_samples + negative_samples
        np.random.shuffle(all_samples)

        # Create simple features (placeholder - real implementation would extract real features)
        X = []
        y = []
        groups = []

        # Group by user for ranking
        user_samples = defaultdict(list)
        for sample in all_samples:
            user_samples[sample['userId']].append(sample)

        for user_id, samples in user_samples.items():
            for sample in samples:
                # Simple features: just use weights as features
                X.append([sample.get('weight', 1.0), 1])  # Placeholder features
                y.append(sample['label'])
            groups.append(len(samples))

        X = np.array(X)
        y = np.array(y)

        # Train LightGBM
        train_data = lgb.Dataset(X, label=y, group=groups)

        params = {
            'objective': 'lambdarank',
            'metric': 'ndcg',
            'ndcg_eval_at': [5, 10],
            'learning_rate': 0.1,
            'num_leaves': 31,
            'min_data_in_leaf': 20,
            'verbose': -1
        }

        model = lgb.train(params, train_data, num_boost_round=100)

        # Save model
        model_path = os.path.join(MODEL_DIR, 'ranking_model.txt')
        model.save_model(model_path)

        stats = {
            'model_type': 'lightgbm_ranking',
            'trained_at': datetime.now().isoformat(),
            'positive_samples': len(positive_samples),
            'negative_samples': len(negative_samples),
            'total_samples': len(all_samples),
            'params': params
        }

        # Save stats
        stats_path = os.path.join(MODEL_DIR, 'ranking_stats.json')
        with open(stats_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2)

        logger.info(f"Ranking model saved to: {model_path}")
        return stats

    except ImportError:
        logger.warning("LightGBM not available, skipping ranking model")
        return {'error': 'LightGBM not installed', 'model_type': 'lightgbm_ranking'}
    except Exception as e:
        logger.error(f"Ranking model training failed: {e}")
        return {'error': str(e)}


def evaluate_model(model_type: str, test_data: Optional[List] = None) -> Dict:
    """
    Evaluate trained model

    Args:
        model_type: Model type (cf, ranking)
        test_data: Optional test data

    Returns:
        Evaluation metrics
    """
    logger.info(f"Evaluating {model_type} model...")

    metrics = {
        'model_type': model_type,
        'evaluated_at': datetime.now().isoformat()
    }

    if model_type == 'cf':
        model_path = os.path.join(MODEL_DIR, 'cf_model.pkl')
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                cf = pickle.load(f)

            # Get stats
            stats = cf.get_stats()

            # Calculate coverage metrics
            coverage = {
                'users_with_recs': stats['total_users'],
                'jobs_covered': stats['total_jobs'],
                'total_interactions': stats['total_interactions'],
                'sparsity': 1 - (stats['total_interactions'] / (stats['total_users'] * stats['total_jobs'])) if stats['total_users'] > 0 and stats['total_jobs'] > 0 else 1
            }

            metrics.update(coverage)
        else:
            metrics['error'] = 'Model not found'

    elif model_type == 'ranking':
        model_path = os.path.join(MODEL_DIR, 'ranking_model.txt')
        if os.path.exists(model_path):
            # Load model and evaluate
            import lightgbm as lgb
            model = lgb.Booster(model_file=model_path)

            # Placeholder evaluation
            metrics['model_loaded'] = True
            metrics['num_trees'] = model.num_trees()
        else:
            metrics['error'] = 'Model not found'

    return metrics


def main():
    """Main training pipeline"""
    parser = argparse.ArgumentParser(description='Train ML models')
    parser.add_argument('--model', choices=['cf', 'ranking', 'all'], default='all',
                        help='Model to train')
    parser.add_argument('--evaluate', action='store_true',
                        help='Evaluate model instead of training')
    parser.add_argument('--data', type=str, default=None,
                        help='Path to interaction data')

    args = parser.parse_args()

    print("\n" + "="*60)
    print("ML Model Training Pipeline")
    print("="*60)

    # Load data
    data = load_interaction_data(args.data)

    if not data:
        print("\nNo training data available!")
        print("Generating sample data...")

        # Generate sample data
        from scripts.ml.generate_sample_interactions import generate_interactions
        data = generate_interactions(num_users=50, interactions_per_user=20)

    print(f"\nLoaded {len(data)} interactions")

    if args.evaluate:
        # Evaluation mode
        if args.model == 'all':
            models = ['cf', 'ranking']
        else:
            models = [args.model]

        for model_type in models:
            metrics = evaluate_model(model_type)
            print(f"\n{model_type.upper()} Evaluation:")
            print(json.dumps(metrics, indent=2))
    else:
        # Training mode
        results = {}

        if args.model in ['cf', 'all']:
            print("\n" + "-"*40)
            print("Training Collaborative Filtering Model")
            print("-"*40)
            cf_stats = train_cf_model(data)
            results['cf'] = cf_stats

        if args.model in ['ranking', 'all']:
            print("\n" + "-"*40)
            print("Training Ranking Model")
            print("-"*40)

            positive, negative = create_training_samples(data)
            print(f"Positive samples: {len(positive)}")
            print(f"Negative samples: {len(negative)}")

            ranking_stats = train_ranking_model(positive, negative)
            results['ranking'] = ranking_stats

        # Save overall results
        results_path = os.path.join(MODEL_DIR, 'training_results.json')
        with open(results_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print("\n" + "="*60)
        print("Training Complete!")
        print("="*60)
        print(f"\nResults saved to: {results_path}")
        print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()