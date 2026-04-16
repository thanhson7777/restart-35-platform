"""
Model Monitor - MLOps Monitoring Service

Theo dõi performance của ML models trong production:
- Track prediction requests
- Monitor CTR (Click-Through Rate)
- Detect model drift
- Alert khi metrics degraded

Usage:
    from services.model_monitor import ModelMonitor
    monitor = ModelMonitor()
    monitor.log_prediction(user_id, job_ids, model_name, response_time_ms)
    monitor.log_interaction(user_id, job_id, action)
    monitor.get_metrics()
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Optional, Any

# Add parent directory to path
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_DIR = os.path.dirname(SERVICE_DIR)
sys.path.insert(0, AI_SERVICE_DIR)

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelMonitor:
    """
    MLOps Model Monitor - Theo dõi ML models trong production
    """

    # MongoDB configuration
    MONGODB_URI = os.getenv('MONGODB_URI')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')

    # Collection names
    PREDICTIONS_COLLECTION = 'model_predictions'
    METRICS_COLLECTION = 'model_metrics'

    # Default thresholds for alerts
    DEFAULT_THRESHOLDS = {
        'ctr_warning': 0.05,      # CTR below 5% = warning
        'ctr_critical': 0.02,     # CTR below 2% = critical
        'response_time_warning': 1000,  # ms
        'response_time_critical': 3000,
        'drift_threshold': 0.1,   # 10% change in distribution
    }

    def __init__(self, thresholds: Optional[Dict] = None):
        """
        Initialize Model Monitor

        Args:
            thresholds: Custom alert thresholds
        """
        self.thresholds = {**self.DEFAULT_THRESHOLDS, **(thresholds or {})}
        self._mongo_client = None
        self._reset_in_memory_stats()

    def _reset_in_memory_stats(self):
        """Reset in-memory statistics for this session"""
        self.predictions_count = 0
        self.interactions_count = 0
        self.clicks_count = 0
        self.applies_count = 0
        self.recommendation_ctr = defaultdict(int)  # job_id -> impressions
        self.click_ctr = defaultdict(int)  # job_id -> clicks
        self.response_times = []
        self.predictions_by_model = defaultdict(int)
        self.predictions_by_hour = defaultdict(int)

    @property
    def mongo_client(self) -> MongoClient:
        """Lazy MongoDB connection"""
        if self._mongo_client is None:
            self._mongo_client = MongoClient(self.MONGODB_URI)
        return self._mongo_client

    def _get_collection(self, name: str):
        """Get MongoDB collection"""
        return self.mongo_client[self.DATABASE_NAME][name]

    def log_prediction(
        self,
        user_id: str,
        job_ids: List[str],
        model_name: str,
        response_time_ms: float,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log a prediction request

        Args:
            user_id: User ID
            job_ids: List of recommended job IDs
            model_name: Name of model used (e.g., 'hybrid', 'cf', 'risk')
            response_time_ms: Response time in milliseconds
            metadata: Additional metadata

        Returns:
            True if logged successfully
        """
        try:
            # Log to MongoDB
            collection = self._get_collection(self.PREDICTIONS_COLLECTION)
            doc = {
                'user_id': user_id,
                'job_ids': job_ids,
                'model_name': model_name,
                'response_time_ms': response_time_ms,
                'num_recommendations': len(job_ids),
                'metadata': metadata or {},
                'created_at': datetime.utcnow()
            }
            collection.insert_one(doc)

            # Update in-memory stats
            self.predictions_count += 1
            self.response_times.append(response_time_ms)
            self.predictions_by_model[model_name] += 1
            self.predictions_by_hour[datetime.utcnow().hour] += 1

            for job_id in job_ids:
                self.recommendation_ctr[job_id] += 1

            logger.debug(f"Logged prediction: user={user_id}, jobs={len(job_ids)}, model={model_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to log prediction: {e}")
            return False

    def log_interaction(
        self,
        user_id: str,
        job_id: str,
        action: str,
        session_id: Optional[str] = None
    ) -> bool:
        """
        Log a user interaction with a recommended job

        Args:
            user_id: User ID
            job_id: Job ID
            action: Interaction type ('click', 'apply', 'view', 'bookmark')
            session_id: Optional session ID

        Returns:
            True if logged successfully
        """
        try:
            # Update in-memory stats
            self.interactions_count += 1

            if action == 'click':
                self.clicks_count += 1
                self.click_ctr[job_id] += 1
            elif action in ('apply', 'bookmark'):
                self.applies_count += 1
                self.click_ctr[job_id] += 1

            logger.debug(f"Logged interaction: user={user_id}, job={job_id}, action={action}")
            return True

        except Exception as e:
            logger.error(f"Failed to log interaction: {e}")
            return False

    def calculate_ctr(self, start_date: Optional[datetime] = None) -> float:
        """
        Calculate Click-Through Rate

        Args:
            start_date: Start date for calculation (default: last 7 days)

        Returns:
            CTR value (0.0 - 1.0)
        """
        if start_date is None:
            start_date = datetime.utcnow() - timedelta(days=7)

        collection = self._get_collection(self.PREDICTIONS_COLLECTION)

        # Get total impressions
        total_impressions = collection.count_documents({
            'created_at': {'$gte': start_date}
        })

        if total_impressions == 0:
            return 0.0

        # Get total clicks (from interactions collection)
        interactions_collection = self.mongo_client[self.DATABASE_NAME]['user_interactions']
        total_clicks = interactions_collection.count_documents({
            'action': {'$in': ['click', 'apply', 'bookmark']},
            'createdAt': {'$gte': start_date}
        })

        ctr = total_clicks / total_impressions if total_impressions > 0 else 0.0
        return ctr

    def calculate_model_drift(self, model_name: str, days: int = 7) -> Dict[str, Any]:
        """
        Detect model drift by comparing recent predictions with historical baseline

        Args:
            model_name: Name of model to check
            days: Number of days to compare

        Returns:
            Drift metrics
        """
        collection = self._get_collection(self.PREDICTIONS_COLLECTION)

        now = datetime.utcnow()
        recent_start = now - timedelta(days=days)
        baseline_start = now - timedelta(days=days*2)
        baseline_end = recent_start

        # Get recent predictions distribution
        recent = list(collection.aggregate([
            {'$match': {'model_name': model_name, 'created_at': {'$gte': recent_start}}},
            {'$unwind': '$job_ids'},
            {'$group': {'_id': '$job_ids', 'count': {'$sum': 1}}}
        ]))

        # Get baseline distribution
        baseline = list(collection.aggregate([
            {'$match': {'model_name': model_name, 'created_at': {'$gte': baseline_start, '$lt': baseline_end}}},
            {'$unwind': '$job_ids'},
            {'$group': {'_id': '$job_ids', 'count': {'$sum': 1}}}
        ]))

        # Calculate distribution change
        recent_dict = {item['_id']: item['count'] for item in recent}
        baseline_dict = {item['_id']: item['count'] for item in baseline}

        all_jobs = set(recent_dict.keys()) | set(baseline_dict.keys())
        if not all_jobs:
            return {'drift_detected': False, 'reason': 'No data'}

        # Calculate Jensen-Shannon divergence approximation
        total_recent = sum(recent_dict.values()) or 1
        total_baseline = sum(baseline_dict.values()) or 1

        max_change = 0
        for job_id in all_jobs:
            recent_prob = recent_dict.get(job_id, 0) / total_recent
            baseline_prob = baseline_dict.get(job_id, 0) / total_baseline
            change = abs(recent_prob - baseline_prob)
            max_change = max(max_change, change)

        drift_detected = max_change > self.thresholds['drift_threshold']

        return {
            'drift_detected': drift_detected,
            'max_distribution_change': max_change,
            'threshold': self.thresholds['drift_threshold'],
            'recent_predictions': len(recent),
            'baseline_predictions': len(baseline),
            'jobs_analyzed': len(all_jobs)
        }

    def get_metrics(self, days: int = 7) -> Dict[str, Any]:
        """
        Get comprehensive model metrics

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary of metrics
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        collection = self._get_collection(self.PREDICTIONS_COLLECTION)

        # Basic counts
        total_predictions = collection.count_documents({'created_at': {'$gte': start_date}})

        # Response time stats (use alternative to $percentile)
        response_pipeline = [
            {'$match': {'created_at': {'$gte': start_date}}},
            {'$group': {
                '_id': None,
                'avg_response_time': {'$avg': '$response_time_ms'},
                'max_response_time': {'$max': '$response_time_ms'},
                'min_response_time': {'$min': '$response_time_ms'},
                'count': {'$sum': 1}
            }}
        ]
        response_stats = list(collection.aggregate(response_pipeline))

        # Model usage distribution
        model_usage = list(collection.aggregate([
            {'$match': {'created_at': {'$gte': start_date}}},
            {'$group': {'_id': '$model_name', 'count': {'$sum': 1}}}
        ]))

        # CTR
        ctr = self.calculate_ctr(start_date)

        # Calculate alerts
        alerts = []
        if ctr < self.thresholds['ctr_critical']:
            alerts.append({'level': 'critical', 'message': f'CTR critically low: {ctr:.2%}'})
        elif ctr < self.thresholds['ctr_warning']:
            alerts.append({'level': 'warning', 'message': f'CTR below target: {ctr:.2%}'})

        if response_stats and response_stats[0].get('avg_response_time', 0) > self.thresholds['response_time_critical']:
            alerts.append({'level': 'critical', 'message': 'Response time critically high'})
        elif response_stats and response_stats[0].get('avg_response_time', 0) > self.thresholds['response_time_warning']:
            alerts.append({'level': 'warning', 'message': 'Response time above target'})

        return {
            'period_days': days,
            'total_predictions': total_predictions,
            'response_time': {
                'avg_ms': response_stats[0].get('avg_response_time', 0) if response_stats else 0,
                'max_ms': response_stats[0].get('max_response_time', 0) if response_stats else 0,
                'min_ms': response_stats[0].get('min_response_time', 0) if response_stats else 0,
            },
            'ctr': ctr,
            'model_usage': {item['_id']: item['count'] for item in model_usage},
            'alerts': alerts,
            'thresholds': self.thresholds
        }

    def get_top_performing_jobs(self, days: int = 7, limit: int = 10) -> List[Dict]:
        """
        Get top performing jobs by CTR

        Args:
            days: Number of days to analyze
            limit: Number of top jobs to return

        Returns:
            List of top performing jobs
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        collection = self._get_collection(self.PREDICTIONS_COLLECTION)

        # Aggregate job performance
        pipeline = [
            {'$match': {'created_at': {'$gte': start_date}}},
            {'$unwind': '$job_ids'},
            {'$group': {
                '_id': '$job_ids',
                'impressions': {'$sum': 1},
                'avg_position': {'$avg': {'$indexOfArray': ['$job_ids', '$_id']}}
            }},
            {'$sort': {'impressions': -1}},
            {'$limit': limit * 2}  # Get more to filter
        ]

        jobs = list(collection.aggregate(pipeline))

        # Get click data from interactions
        interactions_collection = self.mongo_client[self.DATABASE_NAME]['user_interactions']
        clicks = interactions_collection.aggregate([
            {'$match': {
                'action': {'$in': ['click', 'apply', 'bookmark']},
                'createdAt': {'$gte': start_date}
            }},
            {'$group': {'_id': '$jobId', 'clicks': {'$sum': 1}}}
        ])
        clicks_dict = {item['_id']: item['clicks'] for item in clicks}

        # Calculate CTR for each job
        results = []
        for job in jobs:
            job_id = job['_id']
            impressions = job['impressions']
            clicks = clicks_dict.get(job_id, 0)
            ctr = clicks / impressions if impressions > 0 else 0

            results.append({
                'job_id': job_id,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr
            })

        # Sort by CTR and return top
        results.sort(key=lambda x: x['ctr'], reverse=True)
        return results[:limit]

    def check_model_health(self, model_name: str) -> Dict[str, Any]:
        """
        Check health status of a model

        Args:
            model_name: Name of model to check

        Returns:
            Health status
        """
        metrics = self.get_metrics(days=7)
        drift = self.calculate_model_drift(model_name)

        status = 'healthy'
        issues = []

        if drift.get('drift_detected'):
            status = 'degraded'
            issues.append('Model drift detected')

        for alert in metrics.get('alerts', []):
            if alert['level'] == 'critical':
                status = 'unhealthy'
                issues.append(alert['message'])
            else:
                issues.append(alert['message'])

        return {
            'model_name': model_name,
            'status': status,
            'issues': issues,
            'drift': drift,
            'metrics': metrics
        }

    def close(self):
        """Close MongoDB connection"""
        if self._mongo_client:
            self._mongo_client.close()
            self._mongo_client = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# Singleton instance
_monitor_instance = None

def get_monitor() -> ModelMonitor:
    """Get singleton ModelMonitor instance"""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = ModelMonitor()
    return _monitor_instance


if __name__ == '__main__':
    # Test monitor
    monitor = ModelMonitor()

    print("Testing ModelMonitor...")
    print(f"Thresholds: {monitor.thresholds}")

    # Get metrics
    metrics = monitor.get_metrics(days=7)
    print(f"\nMetrics (last 7 days): {json.dumps(metrics, indent=2, default=str)}")

    # Check model health
    health = monitor.check_model_health('hybrid')
    print(f"\nModel Health: {json.dumps(health, indent=2, default=str)}")

    monitor.close()
