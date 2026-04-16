"""
A/B Testing Framework for ML Models

Cho phép thử nghiệm các variant khác nhau của model/configuration
và đo lường hiệu quả thông qua metrics.

Usage:
    python scripts/ml/run_ab_test.py
"""

import sys
import os
import json
import hashlib
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import numpy as np

# Add parent directory to path (go up: ml -> scripts -> ai-service)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
AI_SERVICE_DIR = os.path.dirname(ML_DIR)
sys.path.insert(0, AI_SERVICE_DIR)

import logging

logger = logging.getLogger(__name__)


class ExperimentStatus(Enum):
    DRAFT = 'draft'
    RUNNING = 'running'
    PAUSED = 'paused'
    COMPLETED = 'completed'


@dataclass
class Variant:
    """Một variant trong experiment"""
    id: str
    name: str
    description: str = ''
    config: Dict = field(default_factory=dict)
    traffic_allocation: float = 0.5  # 0.0 - 1.0


@dataclass
class Metric:
    """Metrics được theo dõi"""
    name: str
    description: str = ''
    higher_is_better: bool = True


@dataclass
class Experiment:
    """A/B Testing Experiment"""
    id: str
    name: str
    description: str = ''
    status: ExperimentStatus = ExperimentStatus.DRAFT

    # Variants
    control: Variant = None
    treatment: Variant = None

    # Metrics to track
    metrics: List[Metric] = field(default_factory=list)

    # Traffic
    traffic_allocation: float = 0.5  # % users in experiment

    # Results storage
    results: Dict = field(default_factory=dict)

    # Metadata
    created_at: str = ''
    started_at: str = ''
    ended_at: str = ''
    owner: str = 'system'

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()


class ABTestingFramework:
    """
    A/B Testing Framework cho ML System

    Features:
    - Traffic splitting (random assignment)
    - Sticky assignment (user stays in same variant)
    - Metrics tracking
    - Statistical significance testing
    - Experiment lifecycle management

    Usage:
        ab_test = ABTestingFramework()

        # Create experiment
        exp = ab_test.create_experiment(
            name='scoring_weights_test',
            control={'tfidf': 0.4, 'semantic': 0.3, 'cf': 0.3},
            treatment={'tfidf': 0.25, 'semantic': 0.25, 'cf': 0.5}
        )

        # Get variant for user
        variant = ab_test.get_variant_for_user(exp.id, user_id)

        # Record metric
        ab_test.record_metric(exp.id, variant.id, 'apply_rate', 0.05)
    """

    # Default experiments
    DEFAULT_EXPERIMENTS = {
        'scoring_weights_v1': {
            'name': 'Scoring Weights Optimization',
            'description': 'Test different weights for hybrid scoring',
            'control': {
                'tfidf': 0.40,
                'semantic': 0.60,
                'cf': 0.0
            },
            'treatment': {
                'tfidf': 0.25,
                'semantic': 0.25,
                'cf': 0.50
            },
            'metrics': [
                {'name': 'apply_rate', 'higher_is_better': True},
                {'name': 'click_rate', 'higher_is_better': True},
                {'name': 'session_duration', 'higher_is_better': True},
                {'name': 'ndcg_score', 'higher_is_better': True}
            ]
        },
        'cf_algorithm_v1': {
            'name': 'CF Algorithm Comparison',
            'description': 'User-based vs Item-based CF',
            'control': {
                'algorithm': 'item_based',
                'similarity': 'cosine'
            },
            'treatment': {
                'algorithm': 'user_based',
                'similarity': 'cosine'
            },
            'metrics': [
                {'name': 'apply_rate', 'higher_is_better': True},
                {'name': 'recommendation_relevance', 'higher_is_better': True}
            ]
        },
        'semantic_threshold_v1': {
            'name': 'Semantic Search Threshold',
            'description': 'Test different thresholds for semantic matching',
            'control': {
                'semantic_threshold': 0.5
            },
            'treatment': {
                'semantic_threshold': 0.7
            },
            'metrics': [
                {'name': 'precision_at_10', 'higher_is_better': True},
                {'name': 'recall_at_10', 'higher_is_better': True}
            ]
        }
    }

    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize A/B Testing Framework

        Args:
            storage_path: Path to store experiment data
        """
        self.storage_path = storage_path or 'data/ab_experiments.json'
        self.experiments: Dict[str, Experiment] = {}
        self.user_assignments: Dict[str, str] = {}  # user_id -> experiment_id -> variant_id

        # Load existing experiments
        self._load_experiments()

    def _load_experiments(self):
        """Load experiments from storage"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for exp_id, exp_data in data.get('experiments', {}).items():
                    exp_data['status'] = ExperimentStatus(exp_data.get('status', 'draft'))
                    self.experiments[exp_id] = Experiment(**exp_data)

                self.user_assignments = data.get('user_assignments', {})

                logger.info(f"Loaded {len(self.experiments)} experiments")
            except Exception as e:
                logger.warning(f"Failed to load experiments: {e}")

    def _variant_to_dict(self, variant: Variant) -> Dict:
        """Convert Variant to dict for JSON serialization"""
        return {
            'id': variant.id,
            'name': variant.name,
            'description': variant.description,
            'config': variant.config,
            'traffic_allocation': variant.traffic_allocation
        }
    
    def _metric_to_dict(self, metric: Metric) -> Dict:
        """Convert Metric to dict for JSON serialization"""
        return {
            'name': metric.name,
            'description': metric.description,
            'higher_is_better': metric.higher_is_better
        }

    def _save_experiments(self):
        """Save experiments to storage"""
        os.makedirs(os.path.dirname(self.storage_path) or '.', exist_ok=True)

        data = {
            'experiments': {
                exp_id: {
                    'id': exp.id,
                    'name': exp.name,
                    'description': exp.description,
                    'status': exp.status.value,
                    'control': self._variant_to_dict(exp.control),
                    'treatment': self._variant_to_dict(exp.treatment),
                    'metrics': [self._metric_to_dict(m) for m in exp.metrics],
                    'traffic_allocation': exp.traffic_allocation,
                    'results': exp.results,
                    'created_at': exp.created_at,
                    'started_at': exp.started_at,
                    'ended_at': exp.ended_at,
                    'owner': exp.owner
                }
                for exp_id, exp in self.experiments.items()
            },
            'user_assignments': self.user_assignments
        }

        with open(self.storage_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _generate_exp_id(self, name: str) -> str:
        """Generate experiment ID from name"""
        return hashlib.md5(name.encode()).hexdigest()[:8]

    def create_experiment(
        self,
        name: str,
        control_config: Dict,
        treatment_config: Dict,
        description: str = '',
        metrics: Optional[List[Dict]] = None,
        owner: str = 'system'
    ) -> Experiment:
        """
        Tạo một experiment mới

        Args:
            name: Experiment name
            control_config: Configuration for control variant
            treatment_config: Configuration for treatment variant
            description: Description
            metrics: List of metrics to track
            owner: Owner of experiment

        Returns:
            Created Experiment
        """
        exp_id = self._generate_exp_id(name)

        if exp_id in self.experiments:
            logger.warning(f"Experiment {name} already exists, returning existing")
            return self.experiments[exp_id]

        # Create variants
        control = Variant(
            id=f'{exp_id}_control',
            name='Control',
            config=control_config
        )

        treatment = Variant(
            id=f'{exp_id}_treatment',
            name='Treatment',
            config=treatment_config
        )

        # Create default metrics
        default_metrics = [
            Metric(name='apply_rate', description='Apply rate', higher_is_better=True),
            Metric(name='click_rate', description='Click rate', higher_is_better=True),
            Metric(name='ndcg_score', description='NDCG@10', higher_is_better=True)
        ]

        # Use provided metrics or defaults
        track_metrics = []
        if metrics:
            for m in metrics:
                if isinstance(m, dict):
                    track_metrics.append(Metric(**m))
                else:
                    track_metrics.append(m)
        else:
            track_metrics = default_metrics

        # Create experiment
        experiment = Experiment(
            id=exp_id,
            name=name,
            description=description,
            control=control,
            treatment=treatment,
            metrics=track_metrics,
            owner=owner
        )

        self.experiments[exp_id] = experiment
        self._save_experiments()

        logger.info(f"Created experiment: {name} ({exp_id})")
        return experiment

    def start_experiment(self, exp_id: str) -> bool:
        """Start an experiment"""
        if exp_id not in self.experiments:
            logger.error(f"Experiment {exp_id} not found")
            return False

        exp = self.experiments[exp_id]
        exp.status = ExperimentStatus.RUNNING
        exp.started_at = datetime.now().isoformat()

        self._save_experiments()
        logger.info(f"Started experiment: {exp.name}")

        return True

    def stop_experiment(self, exp_id: str) -> bool:
        """Stop an experiment"""
        if exp_id not in self.experiments:
            return False

        exp = self.experiments[exp_id]
        exp.status = ExperimentStatus.COMPLETED
        exp.ended_at = datetime.now().isoformat()

        self._save_experiments()
        logger.info(f"Stopped experiment: {exp.name}")

        return True

    def get_variant_for_user(self, exp_id: str, user_id: str) -> Optional[Variant]:
        """
        Get variant assignment for a user

        Args:
            exp_id: Experiment ID
            user_id: User ID

        Returns:
            Variant object or None
        """
        if exp_id not in self.experiments:
            return None

        exp = self.experiments[exp_id]

        if exp.status != ExperimentStatus.RUNNING:
            return None

        # Check sticky assignment
        assignment_key = f"{exp_id}:{user_id}"
        if assignment_key in self.user_assignments:
            variant_id = self.user_assignments[assignment_key]
            return exp.control if variant_id == exp.control.id else exp.treatment

        # Random assignment
        rand = random.random()
        variant = exp.treatment if rand < exp.traffic_allocation else exp.control

        # Store assignment
        self.user_assignments[assignment_key] = variant.id
        self._save_experiments()

        return variant

    def record_metric(
        self,
        exp_id: str,
        variant_id: str,
        metric_name: str,
        value: float,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Record a metric observation

        Args:
            exp_id: Experiment ID
            variant_id: Variant ID (control or treatment)
            metric_name: Metric name
            value: Metric value
            user_id: Optional user ID

        Returns:
            True if recorded successfully
        """
        if exp_id not in self.experiments:
            return False

        exp = self.experiments[exp_id]

        # Initialize results for variant
        if variant_id not in exp.results:
            exp.results[variant_id] = {
                'observations': {m.name: [] for m in exp.metrics},
                'summary': {}
            }

        # Add observation
        if metric_name in exp.results[variant_id]['observations']:
            exp.results[variant_id]['observations'][metric_name].append({
                'value': value,
                'timestamp': datetime.now().isoformat(),
                'user_id': user_id
            })

        self._save_experiments()
        return True

    def get_results(self, exp_id: str) -> Dict:
        """
        Get experiment results with statistical analysis

        Args:
            exp_id: Experiment ID

        Returns:
            Results dictionary with metrics and p-values
        """
        if exp_id not in self.experiments:
            return {'error': 'Experiment not found'}

        exp = self.experiments[exp_id]
        results = {
            'experiment': {
                'id': exp.id,
                'name': exp.name,
                'status': exp.status.value,
                'started_at': exp.started_at,
                'ended_at': exp.ended_at
            },
            'variants': {},
            'comparison': {}
        }

        for variant in [exp.control, exp.treatment]:
            if variant.id not in exp.results:
                continue

            observations = exp.results[variant.id]['observations']

            variant_results = {
                'name': variant.name,
                'config': variant.config,
                'metrics': {}
            }

            for metric in exp.metrics:
                values = [o['value'] for o in observations.get(metric.name, [])]

                if values:
                    variant_results['metrics'][metric.name] = {
                        'count': len(values),
                        'mean': np.mean(values),
                        'std': np.std(values),
                        'min': min(values),
                        'max': max(values),
                        'median': np.median(values)
                    }

            results['variants'][variant.id] = variant_results

        # Calculate statistical significance
        for metric in exp.metrics:
            control_values = []
            treatment_values = []

            if exp.control.id in exp.results:
                control_values = [
                    o['value'] for o in
                    exp.results[exp.control.id]['observations'].get(metric.name, [])
                ]

            if exp.treatment.id in exp.results:
                treatment_values = [
                    o['value'] for o in
                    exp.results[exp.treatment.id]['observations'].get(metric.name, [])
                ]

            if control_values and treatment_values:
                # Simple t-test approximation
                t_stat, p_value = self._t_test(control_values, treatment_values)

                results['comparison'][metric.name] = {
                    'control_mean': np.mean(control_values),
                    'treatment_mean': np.mean(treatment_values),
                    'lift': (np.mean(treatment_values) - np.mean(control_values)) / np.mean(control_values) if np.mean(control_values) > 0 else 0,
                    't_statistic': t_stat,
                    'p_value': p_value,
                    'significant': p_value < 0.05,
                    'winner': 'treatment' if p_value < 0.05 and np.mean(treatment_values) > np.mean(control_values) else 'control' if p_value < 0.05 else 'tie'
                }

        return results

    def _t_test(self, control: List[float], treatment: List[float]) -> Tuple[float, float]:
        """
        Simple two-sample t-test approximation

        Returns:
            (t_statistic, p_value)
        """
        n1, n2 = len(control), len(treatment)

        if n1 < 2 or n2 < 2:
            return 0.0, 1.0

        mean1, mean2 = np.mean(control), np.mean(treatment)
        var1, var2 = np.var(control), np.var(treatment)

        # Pooled standard error
        se = np.sqrt(var1/n1 + var2/n2)

        if se == 0:
            return 0.0, 1.0

        t_stat = (mean1 - mean2) / se

        # Approximate p-value (two-tailed)
        # Using simple approximation
        df = min(n1, n2) - 1
        p_value = 2 * (1 - min(0.99, abs(t_stat) / 10))  # Rough approximation

        return t_stat, max(0.01, min(0.99, p_value))

    def get_active_experiments(self) -> List[Experiment]:
        """Get all running experiments"""
        return [
            exp for exp in self.experiments.values()
            if exp.status == ExperimentStatus.RUNNING
        ]

    def get_config_for_user(
        self,
        user_id: str,
        default_config: Optional[Dict] = None
    ) -> Dict:
        """
        Get configuration for a user based on active experiments

        Args:
            user_id: User ID
            default_config: Default configuration to start with

        Returns:
            Final configuration for user
        """
        config = default_config.copy() if default_config else {}

        for exp in self.get_active_experiments():
            variant = self.get_variant_for_user(exp.id, user_id)
            if variant:
                config.update(variant.config)

        return config


def main():
    """Demo A/B Testing"""
    print("\n" + "="*60)
    print("A/B Testing Framework Demo")
    print("="*60)

    ab_test = ABTestingFramework()

    # Create experiment
    exp = ab_test.create_experiment(
        name='scoring_weights_test',
        control_config={'tfidf': 0.4, 'semantic': 0.6, 'cf': 0.0},
        treatment_config={'tfidf': 0.25, 'semantic': 0.25, 'cf': 0.5},
        description='Test new CF-enhanced scoring',
        metrics=[
            {'name': 'apply_rate', 'higher_is_better': True},
            {'name': 'ndcg_score', 'higher_is_better': True}
        ]
    )

    print(f"\nCreated experiment: {exp.name} ({exp.id})")
    print(f"Control: {exp.control.config}")
    print(f"Treatment: {exp.treatment.config}")

    # Start experiment
    ab_test.start_experiment(exp.id)
    print(f"\nStarted experiment: {exp.status}")

    # Test user assignments
    print("\nTesting user assignments:")
    test_users = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005']

    for user_id in test_users:
        variant = ab_test.get_variant_for_user(exp.id, user_id)
        print(f"  {user_id}: {variant.name if variant else 'None'}")

    # Simulate some data
    print("\nSimulating experiment data...")

    for _ in range(100):
        user_id = random.choice(test_users)
        variant = ab_test.get_variant_for_user(exp.id, user_id)

        if variant:
            # Random metric values
            if variant.id == exp.control.id:
                apply_rate = random.uniform(0.02, 0.05)
            else:
                apply_rate = random.uniform(0.03, 0.07)

            ab_test.record_metric(exp.id, variant.id, 'apply_rate', apply_rate, user_id)

    # Get results
    results = ab_test.get_results(exp.id)

    print("\n" + "="*60)
    print("Experiment Results")
    print("="*60)

    print(f"\nStatus: {results['experiment']['status']}")

    for variant_id, variant_results in results['variants'].items():
        print(f"\n{variant_results['name']}:")
        for metric_name, metric_data in variant_results['metrics'].items():
            print(f"  {metric_name}: {metric_data['mean']:.4f} (n={metric_data['count']})")

    if results['comparison']:
        print("\nComparison:")
        for metric_name, comparison in results['comparison'].items():
            print(f"  {metric_name}:")
            print(f"    Lift: {comparison['lift']*100:.2f}%")
            print(f"    P-value: {comparison['p_value']:.4f}")
            print(f"    Winner: {comparison['winner']}")


if __name__ == '__main__':
    main()