# -*- coding: utf-8 -*-
"""
Risk Predictor Service
=======================
Dịch vụ dự đoán mức độ rủi ro thất nghiệp cho lao động trung niên.

Tính năng:
- Load trained XGBoost model (regularized)
- Apply threshold optimization (0.15) để đạt Recall (high) = 1.00
- Chiến lược nhân văn: "Thà bắt nhầm còn hơn bỏ sót"

Tác giả: Thanh Son
Ngày: 2026-04-10
"""

import pickle
import json
import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RiskPredictorML:
    """
    Risk Predictor sử dụng XGBoost với Threshold Optimization.

    Chiến lược: "Thà bắt nhầm còn hơn bỏ sót"
    - Threshold = 0.15 (thay vì 0.5 mặc định)
    - Recall (high) = 1.00 - không bỏ sót ai
    - Precision (high) = 0.55 - chấp nhận false alarm
    """

    # Ngưỡng tối ưu cho Recall (Humanitarian Approach)
    OPTIMAL_THRESHOLD = 0.15

    # Map risk level sang score
    RISK_SCORE_MAP = {
        'low': 0.2,
        'medium': 0.5,
        'high': 0.8
    }

    # Recommendations cho từng mức rủi ro
    RISK_RECOMMENDATIONS = {
        'high': {
            'priority': 'URGENT',
            'message': 'Ưu tiên hỗ trợ khẩn cấp',
            'action': 'Liên hệ ngay để được tư vấn việc làm thời vụ, tạm thời',
            'job_filter': ['temporary', 'part-time', 'seasonal']
        },
        'medium': {
            'priority': 'MEDIUM',
            'message': 'Cần hỗ trợ trong tháng tới',
            'action': 'Gợi ý các khóa đào tạo kỹ năng số',
            'job_filter': ['full-time', 'permanent']
        },
        'low': {
            'priority': 'LOW',
            'message': 'Ổn định, có thể phát triển',
            'action': 'Gợi ý các công việc phù hợp với kỹ năng',
            'job_filter': ['full-time', 'permanent', 'freelance']
        }
    }

    def __init__(self, models_dir: Optional[Path] = None):
        """
        Khởi tạo RiskPredictorML.

        Args:
            models_dir: Đường dẫn đến thư mục models
        """
        if models_dir is None:
            # Default: scripts/models (từ ai-service/services/ -> ai-service/scripts/models/)
            base_dir = Path(__file__).parent.parent
            models_dir = base_dir / "scripts" / "models"

        self.models_dir = Path(models_dir)
        self.model = None
        self.artifacts = None
        self.feature_names = None
        self.label_encoder = None
        self.skill_vocabulary = set()
        self.shap_explainer = None
        self._shap_available = False

        # Load model và artifacts
        self._load_model()
        self._load_feature_names()
        self._init_shap()

    def _load_model(self) -> None:
        """Load trained model và artifacts."""
        model_path = self.models_dir / "risk_predictor_tuned.pkl"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {model_path}. "
                "Vui lòng chạy training trước (scripts/ml/4_train_risk_model.py)"
            )

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        self.model = model_data['model']
        self.artifacts = model_data.get('artifacts', {})
        self.label_encoder = model_data.get('label_encoder')

        # Use feature names from model itself
        if 'feature_names' in model_data:
            self.feature_names = model_data['feature_names']
        else:
            # Fallback: load from file and filter numeric only
            artifacts_dir = self.models_dir.parent / "data" / "processed" / "artifacts"
            feature_names_path = artifacts_dir / "feature_names.json"
            if feature_names_path.exists():
                with open(feature_names_path, 'r', encoding='utf-8') as f:
                    all_features = json.load(f)
                self.feature_names = [
                    f for f in all_features 
                    if not f.startswith('skill_') and not f.startswith('job_')
                ]
            else:
                self.feature_names = None

        # Load skill vocabulary if available
        if 'skill_vocabulary' in self.artifacts:
            self.skill_vocabulary = set(self.artifacts['skill_vocabulary'])

        logger.info(f"Loaded model from {model_path}")
        logger.info(f"Optimal threshold: {self.OPTIMAL_THRESHOLD}")

    def _init_shap(self) -> None:
        """Initialize SHAP explainer if available."""
        try:
            import shap
            self._shap_available = True
            self.shap_explainer = shap.TreeExplainer(self.model)
            logger.info("SHAP explainer initialized")
        except ImportError:
            logger.warning("SHAP not installed. Install with: pip install shap")
            self._shap_available = False
        except Exception as e:
            logger.warning(f"Failed to initialize SHAP: {e}")
            self._shap_available = False

    def _load_feature_names(self):
        """
        Load và apply feature selection giống như lúc train.
        
        Model được train với 56 features (sau khi loại bỏ TF-IDF và constant).
        """
        import pandas as pd

        # Load X_train để apply feature selection
        data_dir = self.models_dir.parent / "data" / "processed"
        X_path = data_dir / "X_train.csv"

        if not X_path.exists():
            logger.warning("X_train.csv not found, using metadata features")
            return

        X = pd.read_csv(X_path)

        # Apply same feature selection as training
        # 1. Chỉ chọn numeric columns
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()

        # 2. Loại bỏ TF-IDF features (skill_, job_)
        non_tfidf_cols = [c for c in numeric_cols if not c.startswith('skill_')]

        # 3. Chọn features
        if len(non_tfidf_cols) > 0:
            X_selected = X[non_tfidf_cols].copy()
        else:
            X_selected = X[numeric_cols].copy()

        # 4. Loại bỏ constant features
        std = X_selected.std()
        X_selected = X_selected.loc[:, std > 0]

        # Set feature names
        self.feature_names = X_selected.columns.tolist()

        logger.info(f"Feature selection: {len(self.feature_names)} features (after removing TF-IDF)")

    def _calculate_risk_proxy(self, worker: Dict) -> float:
        """
        Tính risk proxy score (để sử dụng khi không có model).

        Args:
            worker: Worker profile

        Returns:
            Risk proxy score (0-1)
        """
        score = 0.5  # Base score

        # Age factor
        age = worker.get('age', 45)
        if age >= 55:
            score += 0.2
        elif age >= 50:
            score += 0.1

        # Education factor
        education = worker.get('education', 'upper_secondary')
        if education in ['primary', 'lower_secondary']:
            score += 0.15

        # Barriers
        barriers = sum([
            worker.get('barrier_health', 0),
            worker.get('barrier_family', 0),
            worker.get('barrier_techGap', 0)
        ])
        score += barriers * 0.1

        # Employment status
        if worker.get('employment_status') == 'unemployed':
            score += 0.15

        return min(1.0, max(0.0, score))

    def _preprocess_worker_features(self, worker: Dict) -> pd.DataFrame:
        """
        Chuyển đổi worker profile thành feature vector.

        Args:
            worker: Worker profile dict

        Returns:
            DataFrame chứa features
        """
        # Create a dict with all features set to 0
        features = {name: 0 for name in self.feature_names}

        # Fill in the values we have
        age = worker.get('age', 45)
        experience_years = worker.get('experience_years', 0)
        target_salary = worker.get('target_salary', 5000000)
        skills = worker.get('skills', [])

        # Set basic features
        if 'age' in features:
            features['age'] = age
        if 'experience_years' in features:
            features['experience_years'] = experience_years
        if 'target_salary' in features:
            features['target_salary'] = target_salary
        if 'skills_count' in features:
            features['skills_count'] = len(skills)

        # Barrier features
        barrier_health = worker.get('barrier_health', 0)
        barrier_family = worker.get('barrier_family', 0)
        barrier_techGap = worker.get('barrier_techGap', 0)
        barrier_location = worker.get('barrier_location', 0)

        if 'barrier_health' in features:
            features['barrier_health'] = barrier_health
        if 'barrier_family' in features:
            features['barrier_family'] = barrier_family
        if 'barrier_techGap' in features:
            features['barrier_techGap'] = barrier_techGap
        if 'barrier_location' in features:
            features['barrier_location'] = barrier_location
        if 'total_barriers' in features:
            features['total_barriers'] = barrier_health + barrier_family + barrier_techGap + barrier_location

        # Education encoding
        education_map = {
            'primary': 1, 'lower_secondary': 2, 'upper_secondary': 3,
            'college': 4, 'university': 5, 'postgraduate': 6
        }
        if 'education_level' in features:
            features['education_level'] = education_map.get(worker.get('education', 'upper_secondary'), 3)

        # Gender encoding
        if 'is_male' in features:
            features['is_male'] = 1 if worker.get('gender', 'male') == 'male' else 0
        if 'is_female' in features:
            features['is_female'] = 1 if worker.get('gender', 'female') == 'female' else 0

        # Marital status
        marital = worker.get('marital_status', 'single')
        if 'is_married' in features:
            features['is_married'] = 1 if marital == 'married' else 0

        # Employment status
        employment = worker.get('employment_status', 'unemployed')
        if 'emp_employed' in features:
            features['emp_employed'] = 1 if employment == 'employed' else 0
        if 'emp_unemployed' in features:
            features['emp_unemployed'] = 1 if employment == 'unemployed' else 0
        if 'emp_self-employed' in features:
            features['emp_self-employed'] = 1 if employment == 'self-employed' else 0

        # Barrier weighted
        if 'barrier_weighted' in features:
            features['barrier_weighted'] = barrier_health * 2 + barrier_family + barrier_techGap * 1.5 + barrier_location

        # Has barriers
        if 'has_barriers' in features:
            features['has_barriers'] = 1 if (barrier_health + barrier_family + barrier_techGap + barrier_location) > 0 else 0

        # Interaction features
        if 'experience_age_ratio' in features and age > 0:
            features['experience_age_ratio'] = experience_years / age
        if 'age_exp_product' in features:
            features['age_exp_product'] = age * experience_years / 100
        if 'salary_per_exp' in features and experience_years > 0:
            features['salary_per_exp'] = target_salary / experience_years
        if 'age_squared' in features:
            features['age_squared'] = age ** 2 / 1000
        if 'exp_ratio' in features and (age - 35) > 0:
            features['exp_ratio'] = experience_years / (age - 35)
        if 'risk_score_proxy' in features:
            features['risk_score_proxy'] = self._calculate_risk_proxy(worker)
        if 'skill_density' in features:
            features['skill_density'] = len(skills) / max(experience_years, 1)

        # Create DataFrame
        df = pd.DataFrame([features])

        # Ensure correct number of features
        if self.feature_names:
            df = df[self.feature_names]

        return df

    def predict(self, worker: Dict) -> Dict:
        """
        Dự đoán mức độ rủi ro của worker.

        Args:
            worker: Worker profile dict chứa các fields:
                - age: int (tuổi)
                - gender: str (male/female)
                - education: str (education level)
                - experience_years: int
                - employment_status: str
                - target_salary: float
                - skills: List[str]
                - barriers: Dict (optional)

        Returns:
            Dict chứa:
                - risk_level: str (high/medium/low)
                - risk_score: float (0.0-1.0)
                - probability: Dict (confidence cho từng class)
                - recommendation: Dict (hướng dẫn hành động)
        """
        try:
            # Preprocess features
            X = self._preprocess_worker_features(worker)

            # Convert to numpy array for XGBoost compatibility
            X_array = X.values.astype(np.float32)

            # Predict probabilities
            proba = self.model.predict_proba(X_array)[0]

            # Get class labels
            if hasattr(self.label_encoder, 'classes_'):
                classes = self.label_encoder.classes_.tolist()
            else:
                classes = ['high', 'low', 'medium']

            # Build probability dict
            prob_dict = {
                classes[i]: float(proba[i])
                for i in range(len(classes))
            }

            # Apply threshold optimization
            # Nếu P(high) > threshold → predict "high"
            if prob_dict['high'] > self.OPTIMAL_THRESHOLD:
                risk_level = 'high'
            else:
                # Lấy class có probability cao nhất trong remaining
                remaining = {'low': prob_dict['low'], 'medium': prob_dict['medium']}
                risk_level = max(remaining, key=remaining.get)

            # Calculate risk score
            risk_score = self.RISK_SCORE_MAP.get(risk_level, 0.5)

            # Get recommendation
            recommendation = self.RISK_RECOMMENDATIONS.get(risk_level, {})

            # Get SHAP explanation
            shap_explanation = self._get_shap_explanation(X_array)

            # Build top features for response
            top_features = []
            if shap_explanation.get('available'):
                top_features = shap_explanation.get('top_features', [])[:5]
            else:
                # Fallback to model feature importance
                importance = self.get_feature_importance()[:5]
                top_features = [
                    {
                        'feature': f['feature'],
                        'importance': f['importance'],
                        'interpretation': f"Feature importance: {f['importance']:.4f}"
                    }
                    for f in importance
                ]

            result = {
                'success': True,
                'risk_level': risk_level,
                'risk_score': risk_score,
                'probability': prob_dict,
                'confidence': float(max(proba)),
                'top_features': top_features,
                'recommendation': recommendation,
                'model_info': {
                    'model_type': 'xgboost',
                    'threshold': self.OPTIMAL_THRESHOLD,
                    'strategy': 'humanitarian_recall_focused',
                    'shap_available': shap_explanation.get('available', False)
                }
            }

            logger.info(f"Risk prediction: {risk_level} (confidence: {max(proba):.2f})")

            return result

        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'risk_level': 'unknown',
                'risk_score': 0.5,
                'probability': {'high': 0.33, 'medium': 0.33, 'low': 0.33}
            }

    def batch_predict(self, workers: List[Dict]) -> List[Dict]:
        """
        Dự đoán cho nhiều workers.

        Args:
            workers: List of worker profiles

        Returns:
            List of predictions
        """
        return [self.predict(worker) for worker in workers]

    def _get_shap_explanation(self, X: np.ndarray) -> Dict:
        """
        Get SHAP explanation for predictions.

        Args:
            X: Feature array

        Returns:
            Dict with SHAP values and top features
        """
        if not self._shap_available or self.shap_explainer is None:
            return {'available': False}

        try:
            shap_values = self.shap_explainer.shap_values(X)

            # Handle multi-class output
            if isinstance(shap_values, list):
                # Average across classes for global importance
                shap_arr = np.mean([np.abs(sv) for sv in shap_values], axis=0)
            else:
                shap_arr = np.abs(shap_values)

            # Mean across samples
            mean_shap = shap_arr.mean(axis=0) if len(shap_arr.shape) > 1 else shap_arr

            # Create feature importance dict
            feature_importance = []
            for i, (name, importance) in enumerate(sorted(
                zip(self.feature_names, mean_shap),
                key=lambda x: abs(x[1]),
                reverse=True
            )[:10]):
                feature_importance.append({
                    'feature': name,
                    'shap_value': float(importance),
                    'interpretation': self._interpret_shap_value(name, importance)
                })

            return {
                'available': True,
                'top_features': feature_importance,
                'model_output': 'shap'
            }

        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")
            return {'available': False, 'error': str(e)}

    def _interpret_shap_value(self, feature: str, value: float) -> str:
        """Interpret a SHAP value for a feature."""
        if abs(value) < 0.01:
            return "Neutral impact"
        elif value > 0:
            return f"Increases risk (importance: {abs(value):.4f})"
        else:
            return f"Decreases risk (importance: {abs(value):.4f})"

    def get_feature_importance(self) -> List[Dict]:
        """
        Lấy feature importance từ model.

        Returns:
            List of dicts với feature và importance
        """
        if not self.model or not self.feature_names:
            return []

        importances = self.model.feature_importances_

        result = []
        for name, importance in sorted(
            zip(self.feature_names, importances),
            key=lambda x: x[1],
            reverse=True
        )[:20]:  # Top 20
            result.append({
                'feature': name,
                'importance': float(importance)
            })

        return result


# =============================================================================
# STANDALONE FUNCTION
# =============================================================================

def predict_worker_risk(worker: Dict) -> Dict:
    """
    Hàm tiện ích để predict worker risk.

    Args:
        worker: Worker profile

    Returns:
        Prediction result
    """
    predictor = RiskPredictorML()
    return predictor.predict(worker)


if __name__ == '__main__':
    # Test
    sample_worker = {
        'age': 52,
        'gender': 'male',
        'education': 'upper_secondary',
        'experience_years': 20,
        'employment_status': 'unemployed',
        'target_salary': 8000000,
        'skills': ['bán hàng', 'quản lý'],
        'barrier_health': 1,
        'barrier_family': 0,
        'barrier_techGap': 1
    }

    result = predict_worker_risk(sample_worker)
    print("\n" + "=" * 60)
    print("RISK PREDICTION TEST")
    print("=" * 60)
    print(f"\nWorker: {sample_worker['age']} tuổi, {sample_worker['experience_years']} năm kinh nghiệm")
    print(f"\nRisk Level: {result['risk_level'].upper()}")
    print(f"Risk Score: {result['risk_score']}")
    print(f"Probability: {result['probability']}")
    print(f"\nRecommendation: {result['recommendation'].get('message', '')}")
    print("=" * 60)
