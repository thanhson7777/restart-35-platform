# -*- coding: utf-8 -*-
"""
Script 6: Model Evaluation - Humanitarian Approach
==================================================
Đánh giá model với chiến lược "Thà bắt nhầm còn hơn bỏ sót"

Tư duy:
- Ưu tiên RECALL (không bỏ sót đối tượng rủi ro cao)
- Threshold Optimization: 0.5 → 0.3
- Precision-Recall Curve thay vì ROC-AUC

Tac gia: Thanh Son
Ngay: 2026-04-10
"""

import os
import sys
import pickle
import json
import warnings
warnings.filterwarnings('ignore')

# Set UTF-8 cho Windows
if sys.platform == 'win32':
    try:
        import io
        if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# =============================================================================
# CLASS WEIGHTS - Humanitarian Approach
# =============================================================================

CLASS_WEIGHTS = {
    'high': 10,    # Ưu tiên cao nhất - không bỏ sót người rủi ro cao
    'medium': 1,   # Bình thường
    'low': 0.5     # Chấp nhận bỏ sót nhẹ
}


class ModelEvaluator:
    """
    Model Evaluator với chiến lược nhân văn.

    Nguyên tắc: "Thà bắt nhầm còn hơn bỏ sót"
    - Ưu tiên RECALL cho class "high"
    - Threshold Optimization để tăng RECALL
    - Precision-Recall Curve thay vì ROC-AUC
    """

    def __init__(self):
        self.models_dir = os.path.join(SCRIPT_DIR, '..', 'models')
        self.eval_dir = os.path.join(self.models_dir, 'evaluation')
        self.data_dir = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')

        os.makedirs(self.eval_dir, exist_ok=True)

        self.X = None
        self.y = None
        self.y_encoded = None
        self.label_classes = None
        self.model = None
        self.results = {}

    # =========================================================================
    # LOAD DATA & MODEL
    # =========================================================================
    def load_data_and_model(self):
        """Load data và model đã được train/tune."""
        print("\n" + "=" * 60)
        print("LOAD DATA & MODEL")
        print("=" * 60)

        # Load data
        X_path = os.path.join(self.data_dir, 'X_train.csv')
        y_path = os.path.join(self.data_dir, 'y_train.csv')

        self.X = pd.read_csv(X_path)
        y_df = pd.read_csv(y_path)

        if 'risk_level' in y_df.columns:
            self.y = y_df['risk_level']
        else:
            self.y = y_df.iloc[:, 0]

        # Encode labels
        from sklearn.preprocessing import LabelEncoder
        le = LabelEncoder()
        self.y_encoded = le.fit_transform(self.y)
        self.label_classes = le.classes_.tolist()

        print(f"   Dataset: {len(self.X)} samples")
        print(f"   Features: {self.X.shape[1]}")
        print(f"   Classes: {self.label_classes}")

        # Class distribution
        print(f"\n   Class Distribution:")
        unique, counts = np.unique(self.y_encoded, return_counts=True)
        for idx, cls in enumerate(self.label_classes):
            count = counts[idx]
            pct = count / len(self.y_encoded) * 100
            print(f"   • {cls}: {count} ({pct:.1f}%)")

        # Load tuned model
        model_path = os.path.join(self.models_dir, 'risk_predictor_tuned.pkl')
        if not os.path.exists(model_path):
            # Fallback to default model
            model_path = os.path.join(self.models_dir, 'risk_predictor.pkl')

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            self.model = model_data['model']
            print(f"\n   Model loaded: {model_path}")

        return self.X, self.y_encoded

    # =========================================================================
    # FEATURE SELECTION (same as training)
    # =========================================================================
    def select_features(self, X):
        """Chọn features tương tự như lúc train."""
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        non_tfidf_cols = [c for c in numeric_cols if not c.startswith('skill_')]

        if len(non_tfidf_cols) > 0:
            X_selected = X[non_tfidf_cols].copy()
        else:
            X_selected = X[numeric_cols].copy()

        # Handle missing values
        for col in X_selected.columns:
            if X_selected.columns[X_selected.columns == col].empty:
                continue
            if X_selected[col].isnull().any():
                X_selected[col].fillna(X_selected[col].median(), inplace=True)

        # Remove constant features
        std = X_selected.std()
        X_selected = X_selected.loc[:, std > 0]

        return X_selected, non_tfidf_cols

    # =========================================================================
    # BASELINE METRICS (Default Threshold = 0.5)
    # =========================================================================
    def evaluate_baseline(self, X, y):
        """
        Đánh giá baseline với threshold mặc định 0.5.
        """
        print("\n" + "=" * 60)
        print("BASELINE EVALUATION (Threshold = 0.5)")
        print("=" * 60)

        from sklearn.model_selection import StratifiedKFold, cross_val_predict
        from sklearn.metrics import (
            classification_report, confusion_matrix,
            f1_score, accuracy_score, precision_score, recall_score
        )

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

        # Get CV predictions
        y_pred = cross_val_predict(self.model, X, y, cv=cv)
        y_prob = cross_val_predict(self.model, X, y, cv=cv, method='predict_proba')

        # Metrics với threshold = 0.5
        print("\n[INFO] Classification Report:")
        print(classification_report(y, y_pred, target_names=self.label_classes))

        # Confusion Matrix
        print("[INFO] Confusion Matrix:")
        cm = confusion_matrix(y, y_pred)
        print(f"              Predicted")
        print(f"            low  medium  high")
        for i, label in enumerate(self.label_classes):
            row = f"Actual {label:>5}"
            for j in range(len(self.label_classes)):
                row += f"  {cm[i][j]:>5}"
            print(row)

        # Per-class metrics
        precision = precision_score(y, y_pred, average=None)
        recall = recall_score(y, y_pred, average=None)
        f1 = f1_score(y, y_pred, average=None)
        f1_macro = f1_score(y, y_pred, average='macro')

        baseline_metrics = {
            'threshold': 0.5,
            'accuracy': float(accuracy_score(y, y_pred)),
            'f1_macro': float(f1_macro),
            'per_class': {}
        }

        for i, label in enumerate(self.label_classes):
            baseline_metrics['per_class'][label] = {
                'precision': float(precision[i]),
                'recall': float(recall[i]),
                'f1': float(f1[i])
            }

        # Highlight Recall (high) - đây là metric quan trọng nhất
        recall_high = recall[0]  # class 0 = high
        print(f"\n[CRITICAL] Recall (High): {recall_high:.4f}")
        print(f"[CRITICAL] F1-Macro: {f1_macro:.4f}")

        if recall_high < 0.5:
            print("[WARN] Recall (High) qua thap! Can dieu chinh threshold.")

        self.baseline_metrics = baseline_metrics
        self.y_prob = y_prob

        return baseline_metrics, y_pred, y_prob

    # =========================================================================
    # THRESHOLD OPTIMIZATION - Humanitarium Approach
    # =========================================================================
    def threshold_analysis(self, X, y, y_prob):
        """
        Phân tích threshold để tối ưu Recall (High).

        Chiến lược: "Thà bắt nhầm còn hơn bỏ sót"
        - Giảm threshold từ 0.5 xuống 0.3
        - Mục tiêu: Recall (High) >= 0.60
        """
        print("\n" + "=" * 60)
        print("THRESHOLD OPTIMIZATION - Humanitarian Approach")
        print("=" * 60)

        print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  CHIEN LƯỢC: "Thà bắt nhầm còn hơn bỏ sót"                               ║
║                                                                              ║
║  Trong bối cảnh tái hòa nhập cho lao động trung niên:                    ║
║  • False Negative (Bỏ sót người rủi ro cao) → Gây hậu quả nghiêm trọng  ║
║  • False Positive (Cảnh báo nhầm người ổn định) → Chấp nhận được        ║
║                                                                              ║
║  Hệ thống ưu tiên đảm bảo:                                                ║
║  "Không một ai có rủi ro cao bị gạt ra ngoài mạng lưới an sinh"          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
        """)

        from sklearn.metrics import precision_score, recall_score, f1_score

        # Thử nghiệm với các threshold khác nhau
        # Thay vì dùng argmax, ta điều chỉnh probability threshold
        thresholds = np.arange(0.15, 0.55, 0.05)

        results = []

        print(f"\n[INFO] Testing thresholds: {thresholds.tolist()}")
        print("-" * 80)
        print(f"{'Threshold':>10} | {'Precision':>10} | {'Recall':>10} | {'F1':>10} | Strategy")
        print("-" * 80)

        for threshold in thresholds:
            # Điều chỉnh predictions dựa trên threshold
            # Nếu P(high) > threshold → predict "high"
            # Nếu không → predict class có probability cao nhất trong remaining

            y_pred_adjusted = []
            for probs in y_prob:
                # Cách 1: Nếu P(high) > threshold → high
                if probs[0] > threshold:  # class 0 = high
                    y_pred_adjusted.append(0)
                else:
                    # Lấy class có probability cao nhất trong các class còn lại
                    # (bỏ qua high vì không đạt threshold)
                    remaining_probs = [probs[1], probs[2]]  # low, medium
                    best_class = np.argmax(remaining_probs) + 1
                    y_pred_adjusted.append(best_class)

            y_pred_adjusted = np.array(y_pred_adjusted)

            # Tính metrics cho class "high"
            precision_high = precision_score(y, y_pred_adjusted, average=None,
                                           labels=[0], zero_division=0)[0]
            recall_high = recall_score(y, y_pred_adjusted, average=None,
                                      labels=[0], zero_division=0)[0]
            f1_high = f1_score(y, y_pred_adjusted, average=None,
                              labels=[0], zero_division=0)[0]

            # F1-Macro tổng thể
            f1_macro = f1_score(y, y_pred_adjusted, average='macro',
                               zero_division=0)

            # Strategy description
            if threshold <= 0.30:
                strategy = "AGGRESSIVE (prefer recall)"
            elif threshold <= 0.40:
                strategy = "BALANCED"
            else:
                strategy = "CONSERVATIVE (prefer precision)"

            results.append({
                'threshold': float(threshold),
                'precision_high': float(precision_high),
                'recall_high': float(recall_high),
                'f1_high': float(f1_high),
                'f1_macro': float(f1_macro),
                'strategy': strategy
            })

            print(f"{threshold:>10.2f} | {precision_high:>10.4f} | {recall_high:>10.4f} | {f1_high:>10.4f} | {strategy}")

        print("-" * 80)

        # Chọn threshold tối ưu
        # Mục tiêu: Recall (High) >= 0.60, Precision >= 0.30
        optimal_result = None
        for r in sorted(results, key=lambda x: x['recall_high'], reverse=True):
            if r['recall_high'] >= 0.60 and r['f1_macro'] >= 0.60:
                optimal_result = r
                break

        # Fallback: chọn threshold với Recall cao nhất
        if optimal_result is None:
            optimal_result = max(results, key=lambda x: x['recall_high'])

        print(f"\n[OPTIMAL] Selected Threshold: {optimal_result['threshold']:.2f}")
        print(f"[OPTIMAL] Strategy: {optimal_result['strategy']}")
        print(f"[OPTIMAL] Recall (High): {optimal_result['recall_high']:.4f}")
        print(f"[OPTIMAL] Precision (High): {optimal_result['precision_high']:.4f}")

        self.threshold_results = results
        self.optimal_threshold = optimal_result['threshold']

        return results, optimal_result

    # =========================================================================
    # FINAL EVALUATION WITH OPTIMAL THRESHOLD
    # =========================================================================
    def final_evaluation(self, X, y, optimal_threshold):
        """
        Đánh giá cuối cùng với threshold tối ưu.
        """
        print("\n" + "=" * 60)
        print(f"FINAL EVALUATION (Threshold = {optimal_threshold:.2f})")
        print("=" * 60)

        from sklearn.metrics import (
            classification_report, confusion_matrix,
            accuracy_score, f1_score, precision_score, recall_score
        )

        # Generate predictions with optimal threshold
        y_prob = self.model.predict_proba(X)

        y_pred_final = []
        for probs in y_prob:
            if probs[0] > optimal_threshold:
                y_pred_final.append(0)
            else:
                remaining_probs = [probs[1], probs[2]]
                best_class = np.argmax(remaining_probs) + 1
                y_pred_final.append(best_class)

        y_pred_final = np.array(y_pred_final)

        # Metrics
        print("\n[INFO] Classification Report:")
        print(classification_report(y, y_pred_final, target_names=self.label_classes))

        print("[INFO] Confusion Matrix:")
        cm = confusion_matrix(y, y_pred_final)
        print(f"              Predicted")
        print(f"            low  medium  high")
        for i, label in enumerate(self.label_classes):
            row = f"Actual {label:>5}"
            for j in range(len(self.label_classes)):
                row += f"  {cm[i][j]:>5}"
            print(row)

        # Calculate metrics
        precision = precision_score(y, y_pred_final, average=None, zero_division=0)
        recall = recall_score(y, y_pred_final, average=None, zero_division=0)
        f1 = f1_score(y, y_pred_final, average=None, zero_division=0)
        f1_macro = f1_score(y, y_pred_final, average='macro', zero_division=0)

        final_metrics = {
            'threshold': float(optimal_threshold),
            'accuracy': float(accuracy_score(y, y_pred_final)),
            'f1_macro': float(f1_macro),
            'per_class': {}
        }

        for i, label in enumerate(self.label_classes):
            final_metrics['per_class'][label] = {
                'precision': float(precision[i]),
                'recall': float(recall[i]),
                'f1': float(f1[i])
            }

        print(f"\n[SUMMARY]")
        print(f"   Accuracy: {final_metrics['accuracy']:.4f}")
        print(f"   F1-Macro: {final_metrics['f1_macro']:.4f}")
        print(f"   Recall (High): {final_metrics['per_class']['high']['recall']:.4f}")

        self.final_metrics = final_metrics
        return final_metrics

    # =========================================================================
    # PRECISION-RECALL CURVE (Thay vì ROC-AUC)
    # =========================================================================
    def plot_precision_recall_curve(self, X, y):
        """
        Vẽ Precision-Recall Curve cho multi-class.
        Với Imbalanced Data, PR-Curve chính xác hơn ROC-AUC.
        """
        print("\n" + "=" * 60)
        print("PRECISION-RECALL CURVE ANALYSIS")
        print("=" * 60)

        # Use non-interactive backend for Windows
        import matplotlib
        matplotlib.use('Agg')  # Non-interactive backend
        import matplotlib.pyplot as plt

        from sklearn.metrics import precision_recall_curve, average_precision_score

        # Get probabilities
        y_prob = self.model.predict_proba(X)

        # Calculate PR curve cho class "high" (class 0)
        precision_curve, recall_curve, thresholds = precision_recall_curve(
            y, y_prob[:, 0], pos_label=0
        )

        # Average Precision
        ap_high = average_precision_score(y, y_prob[:, 0], pos_label=0)

        print(f"\n[INFO] Class 'High' Precision-Recall Analysis:")
        print(f"   Average Precision: {ap_high:.4f}")

        # Plot
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))

        # Plot 1: PR Curve cho từng class
        ax1 = axes[0]
        for i, label in enumerate(self.label_classes):
            precision, recall, _ = precision_recall_curve(
                y, y_prob[:, i], pos_label=i
            )
            ap = average_precision_score(y, y_prob[:, i], pos_label=i)
            ax1.plot(recall, precision, label=f'{label} (AP={ap:.2f})')

        ax1.set_xlabel('Recall')
        ax1.set_ylabel('Precision')
        ax1.set_title('Precision-Recall Curves')
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # Plot 2: Confusion Matrix
        ax2 = axes[1]
        from sklearn.metrics import confusion_matrix
        y_pred = self.model.predict(X)
        cm = confusion_matrix(y, y_pred)

        im = ax2.imshow(cm, interpolation='nearest', cmap='Blues')
        ax2.set_title('Confusion Matrix')
        ax2.set_xticks(range(len(self.label_classes)))
        ax2.set_yticks(range(len(self.label_classes)))
        ax2.set_xticklabels(self.label_classes)
        ax2.set_yticklabels(self.label_classes)
        ax2.set_xlabel('Predicted')
        ax2.set_ylabel('Actual')

        for i in range(len(self.label_classes)):
            for j in range(len(self.label_classes)):
                ax2.text(j, i, str(cm[i, j]), ha='center', va='center',
                        color='white' if cm[i, j] > cm.max()/2 else 'black')

        # Plot 3: Class Distribution
        ax3 = axes[2]
        unique, counts = np.unique(y, return_counts=True)
        colors = ['#ff6b6b', '#4ecdc4', '#95e1d3']
        ax3.bar([self.label_classes[i] for i in unique], counts, color=colors)
        ax3.set_title('Class Distribution')
        ax3.set_xlabel('Risk Level')
        ax3.set_ylabel('Count')
        for i, (cls, count) in enumerate(zip([self.label_classes[i] for i in unique], counts)):
            ax3.text(i, count + 1, f'{count}', ha='center')

        plt.tight_layout()

        # Save
        plot_path = os.path.join(self.eval_dir, 'evaluation_plots.png')
        plt.savefig(plot_path, dpi=150, bbox_inches='tight')
        print(f"\n[OK] Plots saved: {plot_path}")

        plt.close()

        return ap_high

    # =========================================================================
    # FEATURE IMPORTANCE ANALYSIS
    # =========================================================================
    def feature_importance_analysis(self, X, feature_names):
        """
        Phân tích feature importance.
        """
        print("\n" + "=" * 60)
        print("FEATURE IMPORTANCE ANALYSIS")
        print("=" * 60)

        # Train model on full data
        self.model.fit(X, self.y_encoded)

        # Get feature importance
        importance = pd.DataFrame({
            'feature': feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)

        print("\n[INFO] Top 15 Most Important Features:")
        for i, (_, row) in enumerate(importance.head(15).iterrows()):
            bar = "█" * int(row['importance'] * 50)
            print(f"   {i+1:2d}. {row['feature']:<30} {row['importance']:.4f} {bar}")

        return importance

    # =========================================================================
    # SAVE RESULTS
    # =========================================================================
    def save_results(self, baseline, threshold_results, optimal, final):
        """
        Lưu tất cả kết quả đánh giá.
        """
        print("\n" + "=" * 60)
        print("SAVE EVALUATION RESULTS")
        print("=" * 60)

        # Main evaluation report
        evaluation_report = {
            'model_info': {
                'name': 'XGBoost Regularized',
                'version': '1.0',
                'tuning_strategy': 'Anti-Overfitting',
                'evaluation_date': datetime.now().isoformat(),
                'approach': 'Humanitarian (Recall-Focused)'
            },

            'dataset_info': {
                'total_samples': int(len(self.X)),
                'features': int(self.X.shape[1]),
                'class_distribution': {
                    label: int(count) for label, count in
                    zip(self.label_classes, np.bincount(self.y_encoded))
                }
            },

            'baseline_metrics': baseline,

            'threshold_analysis': {
                'tested_thresholds': threshold_results,
                'optimal_threshold': float(optimal['threshold']),
                'optimal_strategy': optimal['strategy']
            },

            'final_metrics': final,

            'improvement': {
                'recall_high_improvement': float(
                    final['per_class']['high']['recall'] -
                    baseline['per_class']['high']['recall']
                ),
                'threshold_change': f"0.50 → {optimal['threshold']:.2f}"
            },

            'humanitarian_note': (
                "Hệ thống ưu tiên RECALL cho class 'high' để đảm bảo "
                "không bỏ sót đối tượng cần hỗ trợ khẩn cấp. "
                "Chấp nhận Precision thấp hơn để đổi lấy Recall cao hơn."
            ),

            'recommendations': [
                "Thu thập thêm mẫu cho class 'high' để cải thiện F1",
                "Khi dataset đủ lớn, áp dụng SMOTE/oversampling",
                "Định kỳ retrain model với data mới"
            ]
        }

        # Save JSON
        report_path = os.path.join(self.eval_dir, 'evaluation_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(evaluation_report, f, indent=2, ensure_ascii=False)
        print(f"   [OK] Report: {report_path}")

        # Save threshold analysis CSV
        threshold_df = pd.DataFrame(threshold_results)
        threshold_path = os.path.join(self.eval_dir, 'threshold_analysis.csv')
        threshold_df.to_csv(threshold_path, index=False)
        print(f"   [OK] Threshold Analysis: {threshold_path}")

        # Save final metrics summary
        summary_path = os.path.join(self.eval_dir, 'metrics_summary.txt')
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write("MODEL EVALUATION SUMMARY\n")
            f.write("=" * 60 + "\n\n")

            f.write("APPROACH: Humanitarian (Recall-Focused)\n")
            f.write("Principle: 'Thà bắt nhầm còn hơn bỏ sót'\n\n")

            f.write("-" * 60 + "\n")
            f.write("BASELINE (Threshold = 0.5)\n")
            f.write("-" * 60 + "\n")
            f.write(f"Accuracy: {baseline['accuracy']:.4f}\n")
            f.write(f"F1-Macro: {baseline['f1_macro']:.4f}\n")
            for label, metrics in baseline['per_class'].items():
                f.write(f"  {label}: P={metrics['precision']:.2f}, R={metrics['recall']:.2f}, F1={metrics['f1']:.2f}\n")

            f.write("\n" + "-" * 60 + "\n")
            f.write(f"OPTIMAL (Threshold = {optimal['threshold']:.2f})\n")
            f.write("-" * 60 + "\n")
            f.write(f"Accuracy: {final['accuracy']:.4f}\n")
            f.write(f"F1-Macro: {final['f1_macro']:.4f}\n")
            for label, metrics in final['per_class'].items():
                f.write(f"  {label}: P={metrics['precision']:.2f}, R={metrics['recall']:.2f}, F1={metrics['f1']:.2f}\n")

            f.write("\n" + "-" * 60 + "\n")
            f.write("IMPROVEMENT\n")
            f.write("-" * 60 + "\n")
            recall_improvement = final['per_class']['high']['recall'] - baseline['per_class']['high']['recall']
            f.write(f"Recall (High): {baseline['per_class']['high']['recall']:.4f} → {final['per_class']['high']['recall']:.4f}\n")
            f.write(f"Improvement: +{recall_improvement:.4f} ({recall_improvement/baseline['per_class']['high']['recall']*100:.1f}%)\n")

        print(f"   [OK] Summary: {summary_path}")

        return evaluation_report

    # =========================================================================
    # MAIN
    # =========================================================================
    def run(self):
        """Run full evaluation pipeline."""
        print("\n" + "=" * 60)
        print("  MODEL EVALUATION PIPELINE")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("  Approach: Humanitarian (Recall-Focused)")
        print("=" * 60)

        # Load
        X, y = self.load_data_and_model()
        X_selected, feature_names = self.select_features(X)

        # Baseline
        baseline_metrics, y_pred, y_prob = self.evaluate_baseline(X_selected, y)

        # Threshold Optimization
        threshold_results, optimal = self.threshold_analysis(X_selected, y, y_prob)

        # Final Evaluation
        final_metrics = self.final_evaluation(X_selected, y, optimal['threshold'])

        # Plots
        ap = self.plot_precision_recall_curve(X_selected, y)

        # Feature Importance
        importance = self.feature_importance_analysis(X_selected, feature_names)

        # Save
        report = self.save_results(baseline_metrics, threshold_results, optimal, final_metrics)

        # Summary
        print("\n" + "=" * 60)
        print("  EVALUATION SUMMARY")
        print("=" * 60)
        print(f"\n   Approach: Humanitarian (Recall-Focused)")
        print(f"   Threshold: 0.50 → {optimal['threshold']:.2f}")
        print(f"\n   BASELINE:")
        print(f"   • F1-Macro: {baseline_metrics['f1_macro']:.4f}")
        print(f"   • Recall (High): {baseline_metrics['per_class']['high']['recall']:.4f}")
        print(f"\n   AFTER OPTIMIZATION:")
        print(f"   • F1-Macro: {final_metrics['f1_macro']:.4f}")
        print(f"   • Recall (High): {final_metrics['per_class']['high']['recall']:.4f}")

        recall_gain = final_metrics['per_class']['high']['recall'] - baseline_metrics['per_class']['high']['recall']
        print(f"\n   IMPROVEMENT:")
        print(f"   • Recall (High): +{recall_gain:.4f} ({recall_gain/baseline_metrics['per_class']['high']['recall']*100:.1f}%)")

        print("\n" + "=" * 60)
        print("  EVALUATION COMPLETED")
        print("=" * 60)

        return report


if __name__ == '__main__':
    evaluator = ModelEvaluator()
    report = evaluator.run()
