"""
Train Collaborative Filtering Model

Script này train CF model từ interaction data và save model
cho production deployment.

Usage:
    python scripts/ml/train_cf_model.py

Output:
    - models/cf_model.pkl: Trained CF model
    - models/cf_stats.json: Model statistics
"""

import sys
import os
import json
import pickle
from datetime import datetime

# Add parent directory to path (go up: ml -> scripts -> ai-service)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
AI_SERVICE_DIR = os.path.dirname(ML_DIR)
sys.path.insert(0, AI_SERVICE_DIR)

import numpy as np
from services.collaborative_filter import CollaborativeFiltering
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment
load_dotenv()

# MongoDB configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://thanhson11052003_db_user:Thanhson1105@cluster0.axntlfn.mongodb.net/')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')

# Model save path
MODEL_DIR = os.path.join(AI_SERVICE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)


def load_interactions_from_mongodb(limit: int = 10000) -> list:
    """
    Load interaction data from MongoDB

    Args:
        limit: Maximum number of interactions to load

    Returns:
        List of interaction dicts
    """
    print(f"Connecting to MongoDB: {DATABASE_NAME}")

    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    collection = db['user_interactions']

    # Load interactions with weights
    interactions = list(collection.find(
        {'_destroy': False},
        {
            'userId': 1,
            'jobId': 1,
            'action': 1,
            'weight': 1,
            'createdAt': 1
        }
    ).limit(limit))

    # Convert ObjectId to string for JSON serialization
    for interaction in interactions:
        if '_id' in interaction:
            del interaction['_id']

    client.close()

    print(f"Loaded {len(interactions)} interactions from MongoDB")
    return interactions


def load_interactions_from_json(filepath: str) -> list:
    """
    Load interaction data from JSON file (for testing)

    Args:
        filepath: Path to JSON file

    Returns:
        List of interaction dicts
    """
    print(f"Loading interactions from: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} interactions from JSON")
    return data


def evaluate_cf_model(cf: CollaborativeFiltering, test_ratio: float = 0.2) -> dict:
    """
    Evaluate CF model performance

    Args:
        cf: Trained CF model
        test_ratio: Ratio of data to use for testing

    Returns:
        Evaluation metrics
    """
    if not cf.is_available:
        return {'error': 'CF not available', 'reason': cf._init_error}

    try:
        # Simple evaluation: calculate coverage and diversity
        metrics = {
            'total_users': cf.stats['total_users'],
            'total_jobs': cf.stats['total_jobs'],
            'total_interactions': cf.stats['total_interactions'],
            'avg_interactions_per_user': cf.stats['total_interactions'] / cf.stats['total_users'] if cf.stats['total_users'] > 0 else 0,
            'avg_jobs_per_user': cf.stats['total_interactions'] / cf.stats['total_users'] if cf.stats['total_users'] > 0 else 0,
            'sparsity': 1 - (cf.stats['total_interactions'] / (cf.stats['total_users'] * cf.stats['total_jobs'])) if cf.stats['total_users'] > 0 and cf.stats['total_jobs'] > 0 else 1,
            'is_available': cf.is_available
        }

        return metrics

    except Exception as e:
        return {'error': str(e)}


def train_and_save_model(interactions: list, model_path: str, stats_path: str):
    """
    Train CF model and save to disk

    Args:
        interactions: Training data
        model_path: Path to save model
        stats_path: Path to save stats
    """
    print("\n" + "="*60)
    print("Training Collaborative Filtering Model")
    print("="*60)

    # Initialize CF
    cf = CollaborativeFiltering()

    # Train
    print(f"\nTraining on {len(interactions)} interactions...")
    success = cf._lazy_init(interactions)

    if not success:
        print(f"Training failed: {cf._init_error}")
        return None

    # Evaluate
    print("\nEvaluating model...")
    metrics = evaluate_cf_model(cf)
    print(f"Metrics: {json.dumps(metrics, indent=2)}")

    # Add metadata
    stats = {
        **metrics,
        'trained_at': datetime.now().isoformat(),
        'training_data_size': len(interactions)
    }

    # Save model
    print(f"\nSaving model to: {model_path}")
    with open(model_path, 'wb') as f:
        pickle.dump(cf, f)

    # Save stats
    print(f"Saving stats to: {stats_path}")
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print("\n" + "="*60)
    print("Model training completed successfully!")
    print("="*60)

    return cf


def load_trained_model(model_path: str) -> CollaborativeFiltering:
    """
    Load trained model from disk

    Args:
        model_path: Path to model file

    Returns:
        Loaded CF model
    """
    with open(model_path, 'rb') as f:
        cf = pickle.load(f)

    print(f"Loaded CF model from: {model_path}")
    print(f"Model stats: {cf.get_stats()}")

    return cf


def main():
    """Main training pipeline"""
    print("\n" + "="*60)
    print("Collaborative Filtering Model Training Pipeline")
    print("="*60)

    # Try loading from MongoDB first, fallback to JSON
    interactions = None

    # Option 1: Try MongoDB
    try:
        interactions = load_interactions_from_mongodb()
    except Exception as e:
        print(f"MongoDB load failed: {e}")

    # Option 2: Try JSON file (for development/testing)
    if not interactions:
        json_path = os.path.join(
            AI_SERVICE_DIR,
            'data',
            'interactions_sample.json'
        )
        if os.path.exists(json_path):
            interactions = load_interactions_from_json(json_path)

    if not interactions:
        print("\nNo training data available!")
        print("Please ensure either:")
        print("1. MongoDB is accessible and has user_interactions collection")
        print("2. Create data/interactions_sample.json with sample interactions")

        # Create sample data for testing
        sample_data = [
            {'userId': 'user1', 'jobId': 'job1', 'action': 'click', 'weight': 2.0},
            {'userId': 'user1', 'jobId': 'job2', 'action': 'apply', 'weight': 5.0},
            {'userId': 'user2', 'jobId': 'job1', 'action': 'bookmark', 'weight': 4.0},
            {'userId': 'user2', 'jobId': 'job3', 'action': 'click', 'weight': 2.0},
            {'userId': 'user3', 'jobId': 'job2', 'action': 'view', 'weight': 1.0},
            {'userId': 'user3', 'jobId': 'job3', 'action': 'apply', 'weight': 5.0},
        ]

        print("\nUsing sample data for demonstration...")
        interactions = sample_data

    # Train model
    model_path = os.path.join(MODEL_DIR, 'cf_model.pkl')
    stats_path = os.path.join(MODEL_DIR, 'cf_stats.json')

    cf = train_and_save_model(interactions, model_path, stats_path)

    if cf:
        # Test recommendations
        print("\n" + "="*60)
        print("Testing Recommendations")
        print("="*60)

        if cf.stats['total_users'] > 0:
            # Get first user
            test_user = list(cf.user_to_idx.keys())[0]
            print(f"\nTest user: {test_user}")

            # Get recommendations
            recs = cf.get_user_based_recommendations(test_user, limit=5)
            print(f"User-based recommendations: {recs}")

            item_recs = cf.get_popular_items(limit=5)
            print(f"Popular items: {item_recs}")
        else:
            print("\nNot enough data for testing recommendations")

    print("\nTraining pipeline completed!")


if __name__ == '__main__':
    main()