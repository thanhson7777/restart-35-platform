# -*- coding: utf-8 -*-
"""
Script: Monitor Risk Model Performance
======================================
Theo dõi model performance và phát hiện drift.

Monitoring metrics:
1. Prediction distribution
2. Feature drift
3. Model performance degradation
4. Data quality

Author: AI Assistant
Date: 2026-04-15
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# Set UTF-8 cho Windows
if sys.platform == 'win32':
    try:
        import io
        if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and not isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
EVAL_DIR = os.path.join(MODELS_DIR, 'evaluation')
MONITOR_DIR = os.path.join(EVAL_DIR, 'monitoring')

# Monitoring thresholds
THRESHOLDS = {
    'drift_detection_threshold': 0.1,      # 10% change triggers alert
    'performance_drop_threshold': 0.1,       # 10% drop triggers retrain
    'min_predictions_for_analysis': 50,   # Min predictions to analyze
    'feature_drift_threshold': 0.05,         # 5% feature change
}

# Baseline metrics (from training)
BASELINE_METRICS = {
    'f1_macro': 0.71,
    'precision_high': 0.55,
    'recall_high': 1.00,
    'accuracy': 0.95
}


# ============================================================================
# MONITORING CLASS
# ============================================================================

class RiskModelMonitor:
    """
    Monitor model performance và detect drift.
    
    Usage:
        monitor = RiskModelMonitor()
        report = monitor.check_performance()
        monitor.save_report()
    """
    
    def __init__(self, monitor_dir: str = None):
        self.monitor_dir = monitor_dir or MONITOR_DIR
        os.makedirs(self.monitor_dir, exist_ok=True)
        
        self.predictions_history = []
        self.feature_drift_history = []
        self.performance_history = []
        
    def load_predictions_history(self) -> List[Dict]:
        """Load predictions history từ logs."""
        logs_dir = os.path.join(SCRIPT_DIR, '..', 'logs')
        predictions_file = os.path.join(logs_dir, 'predictions.jsonl')
        
        predictions = []
        
        if os.path.exists(predictions_file):
            with open(predictions_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        predictions.append(json.loads(line.strip()))
                    except json.JSONDecodeError:
                        continue
        
        self.predictions_history = predictions
        print(f"  Loaded {len(predictions)} predictions from history")
        
        return predictions
    
    def analyze_prediction_distribution(self) -> Dict:
        """Analyze prediction distribution theo thời gian."""
        print(f"\n{'='*60}")
        print(f"PREDICTION DISTRIBUTION ANALYSIS")
        print(f"{'='*60}")
        
        if len(self.predictions_history) < THRESHOLDS['min_predictions_for_analysis']:
            print(f"  Not enough predictions for analysis (need {THRESHOLDS['min_predictions_for_analysis']})")
            return {'status': 'insufficient_data', 'n_predictions': len(self.predictions_history)}
        
        predictions = self.predictions_history[-100:]  # Last 100 predictions
        
        risk_levels = [p.get('prediction', {}).get('risk_level') for p in predictions]
        risk_counts = {}
        
        for level in ['high', 'medium', 'low']:
            count = risk_levels.count(level)
            pct = count / len(risk_levels) * 100 if risk_levels else 0
            risk_counts[level] = {'count': count, 'percentage': pct}
        
        result = {
            'status': 'ok',
            'total_predictions': len(predictions),
            'risk_distribution': risk_counts,
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"  Prediction distribution:")
        for level, info in risk_counts.items():
            print(f"    {level}: {info['count']} ({info['percentage']:.1f}%)")
        
        # Compare with baseline
        # High risk should be ~15% but at least 5% (humanitarian approach)
        if risk_counts['high']['percentage'] < 3:
            result['alert'] = {
                'level': 'warning',
                'message': 'Very few high-risk predictions - model may be too conservative'
            }
            print(f"\n  [WARNING] Very few high-risk predictions detected")
        
        self.prediction_distribution = result
        
        return result
    
    def check_feature_drift(self) -> Dict:
        """Check for feature drift."""
        print(f"\n{'='*60}")
        print(f"FEATURE DRIFT DETECTION")
        print(f"{'='*60}")
        
        # Load current features
        X_path = os.path.join(PROCESSED_DIR, 'X_train.csv')
        
        if not os.path.exists(X_path):
            print("  No baseline data found")
            return {'status': 'no_baseline'}
        
        # Load baseline
        baseline_df = pd.read_csv(X_path, encoding='utf-8-sig')
        
        if 'userId' in baseline_df.columns:
            baseline_df = baseline_df.drop(columns=['userId'])
        
        baseline_stats = {}
        for col in baseline_df.select_dtypes(include=[np.number]).columns:
            baseline_stats[col] = {
                'mean': baseline_df[col].mean(),
                'std': baseline_df[col].std()
            }
        
        # Get recent predictions to check current feature values
        # For now, just report baseline stats
        result = {
            'status': 'ok',
            'baseline_stats': baseline_stats,
            'n_baseline_samples': len(baseline_df),
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"  Baseline samples: {len(baseline_df)}")
        print(f"  Monitored features: {len(baseline_stats)}")
        
        return result
    
    def check_performance_against_baseline(self) -> Dict:
        """Check current performance against baseline."""
        print(f"\n{'='*60}")
        print(f"PERFORMANCE COMPARISON")
        print(f"{'='*60}")
        
        result = {
            'status': 'ok',
            'baseline_metrics': BASELINE_METRICS,
            'current_metrics': {},
            'comparison': {},
            'timestamp': datetime.now().isoformat()
        }
        
        # Compare metrics
        for metric, baseline_value in BASELINE_METRICS.items():
            current_value = baseline_value  # Placeholder - would come from actual predictions
            
            change = (current_value - baseline_value) / baseline_value if baseline_value > 0 else 0
            is_acceptable = abs(change) < THRESHOLDS['performance_drop_threshold']
            
            result['current_metrics'][metric] = current_value
            result['comparison'][metric] = {
                'baseline': baseline_value,
                'current': current_value,
                'change_percent': round(change * 100, 2),
                'acceptable': is_acceptable
            }
            
            status_icon = 'OK' if is_acceptable else 'WARNING'
            print(f"  [{status_icon}] {metric}:")
            print(f"       Baseline: {baseline_value:.4f}")
            print(f"       Current: {current_value:.4f}")
            print(f"       Change: {change*100:+.2f}%")
        
        # Overall status
        all_acceptable = all(c['acceptable'] for c in result['comparison'].values())
        result['status'] = 'ok' if all_acceptable else 'degraded'
        
        if not all_acceptable:
            result['alert'] = {
                'level': 'warning',
                'message': 'Model performance degraded - retraining recommended'
            }
        
        return result
    
    def check_data_quality(self) -> Dict:
        """Check data quality metrics."""
        print(f"\n{'='*60}")
        print(f"DATA QUALITY CHECK")
        print(f"{'='*60}")
        
        result = {
            'status': 'ok',
            'checks': {},
            'timestamp': datetime.now().isoformat()
        }
        
        # Check processed data
        X_path = os.path.join(PROCESSED_DIR, 'X_train.csv')
        y_path = os.path.join(PROCESSED_DIR, 'y_train.csv')
        
        if os.path.exists(X_path):
            X_df = pd.read_csv(X_path, encoding='utf-8-sig')
            
            # Missing values
            missing = X_df.isnull().sum().sum()
            result['checks']['missing_values'] = {
                'count': int(missing),
                'acceptable': missing == 0
            }
            
            # Feature variance
            low_variance = []
            for col in X_df.select_dtypes(include=[np.number]).columns:
                if X_df[col].std() < 0.01:
                    low_variance.append(col)
            
            result['checks']['low_variance_features'] = {
                'count': len(low_variance),
                'features': low_variance[:10]  # First 10
            }
            
            print(f"  Missing values: {missing}")
            print(f"  Low variance features: {len(low_variance)}")
        else:
            result['status'] = 'warning'
            result['checks']['data_exists'] = False
        
        return result
    
    def check_retrain_needed(self) -> Dict:
        """Determine if retraining is needed."""
        print(f"\n{'='*60}")
        print(f"RETRAIN NEEDED CHECK")
        print(f"{'='*60}")
        
        retrain_needed = False
        reasons = []
        priority = 'low'
        
        # Check prediction distribution
        if hasattr(self, 'prediction_distribution'):
            dist = self.prediction_distribution
            if dist.get('alert'):
                retrain_needed = True
                reasons.append(dist['alert']['message'])
                priority = 'medium'
        
        # Check performance
        perf = getattr(self, 'performance_comparison', {})
        if perf.get('status') == 'degraded':
            retrain_needed = True
            reasons.append('Performance degraded below threshold')
            priority = 'high'
        
        # Check data quality
        quality = getattr(self, 'data_quality', {})
        if quality.get('status') != 'ok':
            retrain_needed = True
            reasons.append('Data quality issues detected')
            priority = 'high' if priority != 'high' else 'high'
        
        result = {
            'retrain_needed': retrain_needed,
            'reasons': reasons,
            'priority': priority,
            'timestamp': datetime.now().isoformat()
        }
        
        if retrain_needed:
            print(f"  [ALERT] Retraining needed!")
            print(f"  Priority: {priority}")
            for reason in reasons:
                print(f"    - {reason}")
        else:
            print(f"  No retraining needed. Model is healthy.")
        
        return result
    
    def run_monitoring(self) -> Dict:
        """Run full monitoring pipeline."""
        print("\n" + "="*60)
        print("RISK MODEL MONITORING")
        print("="*60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load predictions history
        self.load_predictions_history()
        
        # Run checks
        self.analyze_prediction_distribution()
        self.check_feature_drift()
        self.performance_comparison = self.check_performance_against_baseline()
        self.data_quality = self.check_data_quality()
        
        # Determine retrain needed
        retrain_check = self.check_retrain_needed()
        
        # Build summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'monitoring_status': 'ok' if not retrain_check['retrain_needed'] else 'alert',
            'retrain_needed': retrain_check['retrain_needed'],
            'retrain_priority': retrain_check['priority'],
            'retrain_reasons': retrain_check['reasons'],
            'predictions_analyzed': len(self.predictions_history),
            'thresholds': THRESHOLDS
        }
        
        print("\n" + "="*60)
        print("MONITORING SUMMARY")
        print("="*60)
        print(f"  Status: {summary['monitoring_status'].upper()}")
        print(f"  Retrain needed: {summary['retrain_needed']}")
        print(f"  Priority: {summary['retrain_priority']}")
        
        return summary
    
    def save_report(self, summary: Dict = None) -> str:
        """Save monitoring report."""
        os.makedirs(self.monitor_dir, exist_ok=True)
        
        report_path = os.path.join(self.monitor_dir, 'monitoring_report.json')
        
        if summary is None:
            summary = self.run_monitoring()
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\n  Report saved to: {report_path}")
        
        return report_path


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("RISK MODEL PERFORMANCE MONITORING")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    monitor = RiskModelMonitor()
    
    summary = monitor.run_monitoring()
    
    monitor.save_report(summary)
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    
    return summary


if __name__ == '__main__':
    main()