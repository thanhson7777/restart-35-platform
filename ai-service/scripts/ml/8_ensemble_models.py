"""
Ensemble Models Training Script
================================
Script train ensemble models (Voting, Stacking) cho classification problem.

Supported ensemble methods:
- VotingClassifier (soft/hard voting)
- StackingClassifier (meta-learner)
- Averaging ensemble

Usage:
    python scripts/ml/8_ensemble_models.py
    python scripts/ml/8_ensemble_models.py --method stacking
"""

import sys
import os
import json
import pickle
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import numpy as np
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
AI_SERVICE_DIR = os.path.dirname(ML_DIR)
sys.path.insert(0, AI_SERVICE_DIR)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
    StackingClassifier
)
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import LabelEncoder

# Paths
PROCESSED_DIR = os.path.join(AI_SERVICE_DIR, 'scripts', 'data', 'processed')
MODELS_DIR = os.path.join(AI_SERVICE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

X_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'X_train.csv')
Y_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'y_train.csv')
X_TEST_PATH = os.path.join(PROCESSED_DIR, 'X_test.csv')
Y_TEST_PATH = os.path.join(PROCESSED_DIR, 'y_test.csv')

RANDOM_STATE = 42
N_SPLITS = 5


class EnsembleTrainer:
    """Train and evaluate ensemble models."""

    def __init__(self):
        self.X_train = None
        self.y_train = None
        self.X_test = None
        self.y_test = None
        self.models = {}
        self.results = {}

    def load_data(self):
        """Load training and test data."""
        print("\n" + "="*60)
        print("LOADING DATA")
        print("="*60)

        X_train = pd.read_csv(X_TRAIN_PATH, encoding='utf-8-sig')
        y_train = pd.read_csv(Y_TRAIN_PATH, encoding='utf-8-sig')
        X_test = pd.read_csv(X_TEST_PATH, encoding='utf-8-sig')
        y_test = pd.read_csv(Y_TEST_PATH, encoding='utf-8-sig')

        # Drop userId if exists
        for df in [X_train, X_test]:
            if 'userId' in df.columns:
                df.drop(columns=['userId'], inplace=True)

        self.y_train = y_train['risk_level'].values
        self.y_test = y_test['risk_level'].values

        # Encode categorical features
        X_train_processed = self._encode_features(X_train)
        X_test_processed = self._encode_features(X_test)

        self.X_train = X_train_processed.values
        self.X_test = X_test_processed.values

        print(f"  Train samples: {len(self.X_train)}")
        print(f"  Test samples: {len(self.X_test)}")
        print(f"  Features: {self.X_train.shape[1]}")

        return self.X_train, self.y_train, self.X_test, self.y_test

    def _encode_features(self, X_df):
        """Encode categorical features."""
        X_processed = X_df.copy()
        for col in X_processed.columns:
            if X_processed[col].dtype == 'object':
                le = LabelEncoder()
                X_processed[col] = le.fit_transform(X_processed[col].astype(str))
        return X_processed

    def define_base_models(self):
        """Define base models for ensemble."""
        return {
            'rf': RandomForestClassifier(
                n_estimators=100,
                max_depth=5,
                random_state=RANDOM_STATE
            ),
            'gb': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=3,
                random_state=RANDOM_STATE
            ),
            'lr': LogisticRegression(
                max_iter=1000,
                random_state=RANDOM_STATE
            ),
            'dt': DecisionTreeClassifier(
                max_depth=5,
                random_state=RANDOM_STATE
            ),
            'knn': KNeighborsClassifier(n_neighbors=5),
            'svm': SVC(
                probability=True,
                random_state=RANDOM_STATE
            ),
            'nb': GaussianNB()
        }

    def train_voting_ensemble(self, voting='soft'):
        """Train VotingClassifier ensemble."""
        print("\n" + "="*60)
        print("VOTING ENSEMBLE")
        print("="*60)

        base_models = self.define_base_models()
        estimators = [(name, model) for name, model in base_models.items()]

        voting_clf = VotingClassifier(
            estimators=estimators,
            voting=voting,
            n_jobs=-1
        )

        print(f"Training VotingClassifier (voting={voting})...")
        voting_clf.fit(self.X_train, self.y_train)

        # Evaluate
        train_score = voting_clf.score(self.X_train, self.y_train)
        test_score = voting_clf.score(self.X_test, self.y_test)

        print(f"  Train accuracy: {train_score:.4f}")
        print(f"  Test accuracy: {test_score:.4f}")

        # Cross-validation
        cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
        cv_scores = cross_val_score(voting_clf, self.X_train, self.y_train,
                                    cv=cv, scoring='f1_macro', n_jobs=-1)
        print(f"  CV F1-macro: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

        self.models['voting'] = voting_clf
        self.results['voting'] = {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'cv_f1_mean': cv_scores.mean(),
            'cv_f1_std': cv_scores.std()
        }

        return voting_clf

    def train_stacking_ensemble(self):
        """Train StackingClassifier ensemble."""
        print("\n" + "="*60)
        print("STACKING ENSEMBLE")
        print("="*60)

        base_models = self.define_base_models()
        estimators = [(name, model) for name, model in base_models.items()]

        # Use LogisticRegression as meta-learner
        stacking_clf = StackingClassifier(
            estimators=estimators,
            final_estimator=LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
            cv=N_SPLITS,
            n_jobs=-1,
            passthrough=False
        )

        print("Training StackingClassifier...")
        stacking_clf.fit(self.X_train, self.y_train)

        # Evaluate
        train_score = stacking_clf.score(self.X_train, self.y_train)
        test_score = stacking_clf.score(self.X_test, self.y_test)

        print(f"  Train accuracy: {train_score:.4f}")
        print(f"  Test accuracy: {test_score:.4f}")

        # Cross-validation
        cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
        cv_scores = cross_val_score(stacking_clf, self.X_train, self.y_train,
                                    cv=cv, scoring='f1_macro', n_jobs=-1)
        print(f"  CV F1-macro: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

        self.models['stacking'] = stacking_clf
        self.results['stacking'] = {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'cv_f1_mean': cv_scores.mean(),
            'cv_f1_std': cv_scores.std()
        }

        return stacking_clf

    def train_averaging_ensemble(self):
        """Train simple averaging ensemble."""
        print("\n" + "="*60)
        print("AVERAGING ENSEMBLE")
        print("="*60)

        base_models = self.define_base_models()
        self.base_models = {}

        # Train individual models
        print("Training base models...")
        for name, model in base_models.items():
            model.fit(self.X_train, self.y_train)
            self.base_models[name] = model
            train_acc = model.score(self.X_train, self.y_train)
            test_acc = model.score(self.X_test, self.y_test)
            print(f"  {name}: train={train_acc:.4f}, test={test_acc:.4f}")

        # Predict with averaging (for probability-based models)
        probas = []
        for name, model in self.base_models.items():
            if hasattr(model, 'predict_proba'):
                probas.append(model.predict_proba(self.X_test))

        if probas:
            avg_probas = np.mean(probas, axis=0)
            avg_preds = np.argmax(avg_probas, axis=1)
            avg_accuracy = np.mean(avg_preds == self.y_test)
            print(f"\n  Averaging ensemble test accuracy: {avg_accuracy:.4f}")

            self.results['averaging'] = {
                'test_accuracy': avg_accuracy
            }

        return self.base_models

    def compare_all_models(self):
        """Compare all trained models."""
        print("\n" + "="*60)
        print("MODEL COMPARISON")
        print("="*60)

        results_df = pd.DataFrame(self.results).T
        print(results_df.round(4))

        return results_df

    def save_models(self):
        """Save all trained models."""
        print("\n" + "="*60)
        print("SAVING MODELS")
        print("="*60)

        ensemble_dir = os.path.join(MODELS_DIR, 'ensemble')
        os.makedirs(ensemble_dir, exist_ok=True)

        for name, model in self.models.items():
            model_path = os.path.join(ensemble_dir, f'{name}_ensemble.pkl')
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            print(f"  Saved: {model_path}")

        # Save results
        results_path = os.path.join(ensemble_dir, 'ensemble_results.json')
        with open(results_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2)
        print(f"  Saved: {results_path}")

    def run_all(self):
        """Run full pipeline."""
        print("\n" + "="*60)
        print("ENSEMBLE MODEL TRAINING PIPELINE")
        print("="*60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Load data
        self.load_data()

        # Train ensembles
        self.train_voting_ensemble(voting='soft')
        self.train_stacking_ensemble()
        self.train_averaging_ensemble()

        # Compare
        self.compare_all_models()

        # Save
        self.save_models()

        print("\n" + "="*60)
        print("TRAINING COMPLETE")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(description='Train ensemble models')
    parser.add_argument('--method', type=str, default='all',
                       choices=['voting', 'stacking', 'averaging', 'all'],
                       help='Ensemble method to train')
    args = parser.parse_args()

    trainer = EnsembleTrainer()
    trainer.load_data()

    if args.method in ['voting', 'all']:
        trainer.train_voting_ensemble()
    if args.method in ['stacking', 'all']:
        trainer.train_stacking_ensemble()
    if args.method in ['averaging', 'all']:
        trainer.train_averaging_ensemble()

    trainer.compare_all_models()
    trainer.save_models()


if __name__ == '__main__':
    main()
