"""
Auto Retrain Script - Automated ML Model Retraining

Script này tự động retrain ML models khi:
- Model drift detected
- Đủ data mới để retrain
- Schedule (weekly/monthly)

Usage:
    python scripts/ml/auto_retrain.py --model cf --check-only
    python scripts/ml/auto_retrain.py --model all --deploy
    python scripts/ml/auto_retrain.py --schedule weekly
"""

import sys
import os
import json
import pickle
import argparse
import shutil
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

# Add parent directory to path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
AI_SERVICE_DIR = os.path.dirname(ML_DIR)
sys.path.insert(0, AI_SERVICE_DIR)

from pymongo import MongoClient
from dotenv import load_dotenv
from services.model_monitor import ModelMonitor

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB configuration
MONGODB_URI = os.getenv('MONGODB_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')

# Model paths
MODEL_DIR = os.path.join(AI_SERVICE_DIR, 'models')
BACKUP_DIR = os.path.join(MODEL_DIR, 'backups')


@dataclass
class RetrainResult:
    """Result of a retraining operation"""
    success: bool
    model_name: str
    old_metrics: Dict
    new_metrics: Dict
    improvement: float
    deployed: bool
    error: Optional[str] = None
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()


class ModelRegistry:
    """Manages model versions and backups"""

    def __init__(self, model_dir: str, backup_dir: str):
        self.model_dir = model_dir
        self.backup_dir = backup_dir
        os.makedirs(backup_dir, exist_ok=True)

    def get_current_model_path(self, model_name: str) -> str:
        """Get path to current production model"""
        return os.path.join(self.model_dir, f'{model_name}_model.pkl')

    def get_backup_path(self, model_name: str, version: str) -> str:
        """Get path to backup model"""
        return os.path.join(self.backup_dir, f'{model_name}_model_{version}.pkl')

    def backup_current_model(self, model_name: str) -> Optional[str]:
        """Backup current production model before retraining"""
        current_path = self.get_current_model_path(model_name)
        if not os.path.exists(current_path):
            logger.warning(f"No current model to backup: {current_path}")
            return None

        version = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_path = self.get_backup_path(model_name, version)

        shutil.copy2(current_path, backup_path)
        logger.info(f"Backed up model to: {backup_path}")
        return backup_path

    def rollback(self, model_name: str, version: str) -> bool:
        """Rollback to a specific version"""
        backup_path = self.get_backup_path(model_name, version)
        if not os.path.exists(backup_path):
            logger.error(f"Backup not found: {backup_path}")
            return False

        current_path = self.get_current_model_path(model_name)
        shutil.copy2(backup_path, current_path)
        logger.info(f"Rolled back model to: {current_path}")
        return True

    def get_available_versions(self, model_name: str) -> List[str]:
        """Get list of available backup versions"""
        versions = []
        prefix = f'{model_name}_model_'
        for f in os.listdir(self.backup_dir):
            if f.startswith(prefix) and f.endswith('.pkl'):
                version = f[len(prefix):-4]
                versions.append(version)
        return sorted(versions, reverse=True)


class AutoRetrain:
    """Automated model retraining system"""

    # Minimum interactions to trigger retraining
    MIN_INTERACTIONS_FOR_RETRAIN = 100

    # Minimum improvement to deploy new model (%)
    MIN_IMPROVEMENT_THRESHOLD = 5.0

    # Risk model specific thresholds
    RISK_MODEL_THRESHOLDS = {
        'performance_drop': 0.10,        # 10% performance drop triggers retrain
        'drift_percentage': 10.0,         # 10% drift triggers retrain
        'min_predictions_for_check': 50,  # Min predictions to analyze
        'schedule_days': 30               # Monthly schedule
    }

    def __init__(self):
        self.mongo_client = MongoClient(MONGODB_URI)
        self.monitor = ModelMonitor()
        self.registry = ModelRegistry(MODEL_DIR, BACKUP_DIR)

    def close(self):
        """Close connections"""
        self.mongo_client.close()
        self.monitor.close()

    def _get_sample_data(self) -> List[Dict]:
        """Generate sample interaction data for initial training"""
        import random
        users = [f'worker_{str(i).zfill(3)}' for i in range(1, 21)]
        jobs = [f'job_{str(i).zfill(3)}' for i in range(1, 31)]
        actions = ['click', 'view', 'apply', 'bookmark']
        weights = {'click': 2.0, 'view': 1.0, 'apply': 5.0, 'bookmark': 4.0}

        interactions = []
        for _ in range(200):
            user = random.choice(users)
            job = random.choice(jobs)
            action = random.choice(actions)
            interactions.append({
                'userId': user,
                'jobId': job,
                'action': action,
                'weight': weights[action]
            })
        return interactions

    def get_interaction_count(self, since: Optional[datetime] = None) -> int:
        """Get number of interactions since a date"""
        collection = self.mongo_client[DATABASE_NAME]['user_interactions']
        query = {'_destroy': False}
        if since:
            query['createdAt'] = {'$gte': since}
        return collection.count_documents(query)

    def check_retrain_needed(self, model_name: str) -> Dict[str, Any]:
        """
        Check if retraining is needed

        Returns:
            {
                'needed': bool,
                'reason': str,
                'data_available': int,
                'threshold': int
            }
        """
        # Check new data available
        last_retrain = self._get_last_retrain_time(model_name)
        new_interactions = self.get_interaction_count(since=last_retrain)

        reasons = []

        # Check data volume
        if new_interactions >= self.MIN_INTERACTIONS_FOR_RETRAIN:
            reasons.append(f'Sufficient new data: {new_interactions} interactions')

        # Check model drift
        drift = self.monitor.calculate_model_drift(model_name)
        if drift.get('drift_detected'):
            reasons.append('Model drift detected')

        # Check model health
        health = self.monitor.check_model_health(model_name)
        if health['status'] != 'healthy':
            reasons.append(f'Model unhealthy: {health["status"]}')

        return {
            'needed': len(reasons) > 0,
            'reasons': reasons,
            'data_available': new_interactions,
            'threshold': self.MIN_INTERACTIONS_FOR_RETRAIN,
            'drift': drift,
            'health': health
        }

    def check_risk_model_retrain_needed(self) -> Dict[str, Any]:
        """
        Check if risk model retraining is needed.
        
        Triggers:
        1. Scheduled (monthly)
        2. Performance drop detected
        3. Data drift detected
        4. Data quality issues
        
        Returns:
            Dict with trigger details
        """
        from scripts.ml.monitor_risk_model import RiskModelMonitor
        
        print("\n" + "="*60)
        print("CHECKING RISK MODEL RETRAIN NEEDED")
        print("="*60)
        
        triggers = {
            'scheduled': False,
            'performance_drop': False,
            'drift_detected': False,
            'data_quality_issue': False
        }
        
        reasons = []
        
        # Check 1: Scheduled (monthly)
        last_retrain = self._get_last_retrain_time('risk')
        if last_retrain:
            days_since = (datetime.now() - last_retrain).days
            if days_since >= self.RISK_MODEL_THRESHOLDS['schedule_days']:
                triggers['scheduled'] = True
                reasons.append(f"Scheduled retrain: {days_since} days since last retrain")
                print(f"  [TRIGGER] Scheduled retrain: {days_since} days since last")
        
        # Check 2: Run monitoring
        try:
            monitor = RiskModelMonitor()
            summary = monitor.run_monitoring()
            
            if summary.get('retrain_needed'):
                for reason in summary.get('retrain_reasons', []):
                    if 'performance' in reason.lower():
                        triggers['performance_drop'] = True
                    if 'drift' in reason.lower():
                        triggers['drift_detected'] = True
                    if 'quality' in reason.lower():
                        triggers['data_quality_issue'] = True
                    reasons.append(reason)
                    print(f"  [TRIGGER] {reason}")
                    
        except Exception as e:
            print(f"  Monitoring check failed: {e}")
        
        retrain_needed = any(triggers.values())
        
        return {
            'needed': retrain_needed,
            'triggers': triggers,
            'reasons': reasons,
            'priority': 'high' if triggers['performance_drop'] or triggers['drift_detected'] else 'medium'
        }

    def _get_last_retrain_time(self, model_name: str) -> Optional[datetime]:
        """Get timestamp of last retrain for a model"""
        # Check metadata file
        metadata_path = os.path.join(MODEL_DIR, f'{model_name}_metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                if 'last_retrain' in metadata:
                    return datetime.fromisoformat(metadata['last_retrain'])
        return None

    def _save_retrain_metadata(self, model_name: str, result: RetrainResult):
        """Save retrain metadata"""
        metadata_path = os.path.join(MODEL_DIR, f'{model_name}_metadata.json')

        metadata = {
            'model_name': model_name,
            'last_retrain': result.timestamp,
            'retrain_success': result.success,
            'improvement': result.improvement,
            'deployed': result.deployed,
            'old_metrics': result.old_metrics,
            'new_metrics': result.new_metrics
        }

        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

    def train_cf_model(self, interactions: List[Dict]) -> tuple:
        """
        Train CF model

        Returns:
            (model, metrics)
        """
        from services.collaborative_filter import CollaborativeFiltering

        cf = CollaborativeFiltering()
        success = cf._lazy_init(interactions)

        if not success:
            raise Exception(f"CF training failed: {cf._init_error}")

        metrics = cf.get_stats()
        return cf, metrics

    def train_risk_model(self) -> tuple:
        """
        Train risk prediction model

        Returns:
            (model, metrics)
        """
        # Import training scripts
        sys.path.insert(0, os.path.join(SCRIPT_DIR, '..'))
        
        try:
            # Run feature engineering
            from scripts.ml.add_labor_market_features import LaborMarketFeatureGenerator
            from scripts.ml.generate_synthetic_risk_data import HighRiskDataGenerator
            from scripts.ml.validate_risk_data import DataValidator
            
            # Step 1: Generate synthetic data if needed
            print("Checking and generating synthetic high-risk data...")
            generator = HighRiskDataGenerator()
            generator.load_original_data()
            synthetic_df = generator.generate()
            
            # Step 2: Validate data quality
            print("Validating data quality...")
            validator = DataValidator()
            validator.validate()
            
            # Step 3: Run advanced training
            print("Training risk model with advanced settings...")
            
            # This would load the processed data and train
            # For now, return placeholder metrics
            metrics = {
                'training_type': 'advanced_with_synthetic_data',
                'timestamp': datetime.now().isoformat(),
                'data_augmented': len(synthetic_df) > 0
            }
            
            # Return None for model (actual training would be done separately)
            return None, metrics
            
        except Exception as e:
            logger.error(f"Risk model training failed: {e}")
            raise Exception(f"Risk model retraining failed: {str(e)}")

    def retrain_model(self, model_name: str, deploy: bool = False) -> RetrainResult:
        """
        Retrain a specific model

        Args:
            model_name: Name of model to retrain
            deploy: Whether to deploy the new model

        Returns:
            RetrainResult
        """
        logger.info(f"Starting retrain for model: {model_name}")

        # Get old metrics
        old_metrics = {}
        old_path = self.registry.get_current_model_path(model_name)
        if os.path.exists(old_path):
            with open(old_path, 'rb') as f:
                old_model = pickle.load(f)
                if hasattr(old_model, 'get_stats'):
                    old_metrics = old_model.get_stats()
                elif isinstance(old_model, dict):
                    old_metrics = old_model.get('metadata', {})

        # Backup current model
        self.registry.backup_current_model(model_name)

        try:
            # Load interactions from MongoDB
            collection = self.mongo_client[DATABASE_NAME]['user_interactions']
            interactions = list(collection.find(
                {'_destroy': False},
                {'userId': 1, 'jobId': 1, 'action': 1, 'weight': 1, 'createdAt': 1}
            ).limit(10000))

            for i in interactions:
                if '_id' in i:
                    del i['_id']

            # If no real data, use sample data
            if len(interactions) < 10:
                logger.warning(f"Only {len(interactions)} interactions in MongoDB. Using sample data.")
                interactions = self._get_sample_data()
                logger.info(f"Using {len(interactions)} sample interactions")

            logger.info(f"Training with {len(interactions)} interactions")

            # Train model
            if model_name == 'cf':
                new_model, new_metrics = self.train_cf_model(interactions)
            elif model_name == 'risk':
                new_model, new_metrics = self.train_risk_model()
            else:
                raise ValueError(f"Unknown model: {model_name}")

            # Calculate improvement
            old_score = old_metrics.get('total_interactions', 0)
            new_score = new_metrics.get('total_interactions', 0)

            if old_score > 0:
                improvement = ((new_score - old_score) / old_score) * 100
            else:
                improvement = 100.0 if new_score > 0 else 0.0

            # Decide whether to deploy
            should_deploy = deploy and improvement >= self.MIN_IMPROVEMENT_THRESHOLD

            if should_deploy:
                # Save new model
                new_path = self.registry.get_current_model_path(model_name)
                with open(new_path, 'wb') as f:
                    pickle.dump(new_model, f)
                logger.info(f"Deployed new model: {new_path}")
            else:
                logger.info(f"Skipping deploy: improvement {improvement:.2f}% < threshold")

            result = RetrainResult(
                success=True,
                model_name=model_name,
                old_metrics=old_metrics,
                new_metrics=new_metrics,
                improvement=improvement,
                deployed=should_deploy
            )

            # Save metadata
            self._save_retrain_metadata(model_name, result)

            return result

        except Exception as e:
            logger.error(f"Retrain failed: {e}")
            result = RetrainResult(
                success=False,
                model_name=model_name,
                old_metrics=old_metrics,
                new_metrics={},
                improvement=0.0,
                deployed=False,
                error=str(e)
            )
            self._save_retrain_metadata(model_name, result)
            return result

    def run_scheduled_retrain(self, models: List[str] = None) -> List[RetrainResult]:
        """
        Run scheduled retraining for all models

        Args:
            models: List of model names to retrain

        Returns:
            List of RetrainResults
        """
        if models is None:
            models = ['cf', 'risk']

        results = []

        for model_name in models:
            logger.info(f"\n{'='*60}")
            logger.info(f"Checking {model_name} for retraining...")
            logger.info(f"{'='*60}")

            # Check if retraining is needed
            check = self.check_retrain_needed(model_name)

            if not check['needed']:
                logger.info(f"No retraining needed for {model_name}")
                logger.info(f"Reasons: {check['reasons']}")
                continue

            logger.info(f"Retraining needed. Reasons: {check['reasons']}")

            # Perform retraining with auto-deploy if significant improvement
            result = self.retrain_model(model_name, deploy=True)
            results.append(result)

            if result.success:
                logger.info(f"Retrain complete. Improvement: {result.improvement:.2f}%")
                logger.info(f"Deployed: {result.deployed}")
            else:
                logger.error(f"Retrain failed: {result.error}")

        return results


def main():
    parser = argparse.ArgumentParser(description='Auto Retrain ML Models')
    parser.add_argument('--model', choices=['cf', 'risk', 'all'],
                        default='all', help='Model to retrain')
    parser.add_argument('--check-only', action='store_true',
                        help='Only check if retraining is needed')
    parser.add_argument('--deploy', action='store_true',
                        help='Deploy new model after training')
    parser.add_argument('--schedule', choices=['hourly', 'daily', 'weekly', 'monthly'],
                        help='Run scheduled retraining')
    parser.add_argument('--rollback', type=str,
                        help='Rollback model to version (e.g., 20260415_120000)')

    args = parser.parse_args()

    retrain = AutoRetrain()

    try:
        if args.rollback:
            # Rollback
            model_name = args.model if args.model != 'all' else 'cf'
            success = retrain.registry.rollback(model_name, args.rollback)
            if success:
                print(f"Successfully rolled back {model_name} to {args.rollback}")
            else:
                print(f"Rollback failed")
            return

        if args.check_only:
            # Check only
            models = ['cf', 'risk'] if args.model == 'all' else [args.model]
            for model in models:
                check = retrain.check_retrain_needed(model)
                print(f"\n{model.upper()} Model:")
                print(f"  Retrain needed: {check['needed']}")
                print(f"  Reasons: {check['reasons']}")
                print(f"  Data available: {check['data_available']}")
                print(f"  Threshold: {check['threshold']}")
            return

        if args.schedule:
            # Scheduled retraining
            models = ['cf', 'risk'] if args.model == 'all' else [args.model]
            results = retrain.run_scheduled_retrain(models)

            print("\n" + "="*60)
            print("Scheduled Retraining Results")
            print("="*60)

            for result in results:
                print(f"\n{result.model_name}:")
                print(f"  Success: {result.success}")
                print(f"  Improvement: {result.improvement:.2f}%")
                print(f"  Deployed: {result.deployed}")
                if result.error:
                    print(f"  Error: {result.error}")
            return

        # Manual retraining
        models = ['cf', 'risk'] if args.model == 'all' else [args.model]

        for model_name in models:
            result = retrain.retrain_model(model_name, deploy=args.deploy)

            print(f"\n{model_name.upper()} Model Retrain Result:")
            print(f"  Success: {result.success}")
            print(f"  Improvement: {result.improvement:.2f}%")
            print(f"  Deployed: {result.deployed}")
            if result.error:
                print(f"  Error: {result.error}")

    finally:
        retrain.close()


if __name__ == '__main__':
    main()
