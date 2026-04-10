# -*- coding: utf-8 -*-
"""
Script 4b: Train Job Recommender Model
======================================
Train Job Recommender su dung Content-Based Filtering voi TF-IDF + Cosine Similarity.

Tac gia: Thanh Son
Ngay: 2026-04-10
"""

import os
import sys
import pickle
import json
import warnings
warnings.filterwarnings('ignore')

# Set UTF-8 cho Windows (chi lam mot lan)
if sys.platform == 'win32':
    try:
        import io
        if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and not isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import pandas as pd
import numpy as np
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================================
# CONFIGURATION
# ============================================================================

# Đường dẫn
PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')

# TF-IDF settings
TFIDF_MAX_FEATURES = 200
TFIDF_NGRAM_RANGE = (1, 2)


# ============================================================================
# CLASS: JobRecommender
# ============================================================================

class JobRecommender:
    """
    Job Recommender sử dụng Content-Based Filtering.
    
    Architecture:
    1. TF-IDF vectorize worker skills + job skills
    2. Compute cosine similarity matrix
    3. For each worker, find top-N similar jobs
    
    Usage:
        recommender = JobRecommender()
        recommender.fit(workers_df, jobs_df)
        recommendations = recommender.recommend(user_id, top_n=10)
    """
    
    def __init__(self):
        self.workers_df = None
        self.jobs_df = None
        
        self.worker_tfidf = None
        self.job_tfidf = None
        
        self.worker_vectors = None
        self.job_vectors = None
        
        self.similarity_matrix = None
        
        self.artifacts = {}
        
    def load_data(self):
        """Load workers và jobs data."""
        print(f"\n{'='*60}")
        print(f"LOAD DATA")
        print(f"{'='*60}")
        
        # Load workers
        workers_path = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_clean_test.csv')
        if not os.path.exists(workers_path):
            workers_path = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_clean.csv')
        
        self.workers_df = pd.read_csv(workers_path, encoding='utf-8-sig')
        print(f"   Workers: {len(self.workers_df)} records")
        
        # Load jobs
        jobs_path = os.path.join(SCRIPT_DIR, '..', '..', 'data', 'jobs.csv')
        self.jobs_df = pd.read_csv(jobs_path, encoding='utf-8-sig')
        print(f"   Jobs: {len(self.jobs_df)} records")
        
        # Display sample
        print(f"\n   Sample worker skills: {self.workers_df['skills'].iloc[0][:50]}...")
        print(f"   Sample job skills: {self.jobs_df['skills'].iloc[0][:50]}...")
        
        return self
    
    def preprocess(self):
        """Preprocess skills text."""
        print(f"\n{'='*60}")
        print(f"PREPROCESS SKILLS")
        print(f"{'='*60}")
        
        # Worker skills - combine với target_job để tăng context
        self.workers_df['skills_text'] = (
            self.workers_df['skills'].fillna('').str.replace('|', ' ', regex=False) + ' ' +
            self.workers_df['target_job'].fillna('').str.lower()
        )
        
        # Job skills - combine với job title
        self.jobs_df['skills_text'] = (
            self.jobs_df['skills'].fillna('').str.replace('|', ' ', regex=False) + ' ' +
            self.jobs_df['title'].fillna('').str.lower()
        )
        
        # Remove empty
        self.workers_df['skills_text'] = self.workers_df['skills_text'].str.strip()
        self.jobs_df['skills_text'] = self.jobs_df['skills_text'].str.strip()
        
        print(f"   Worker skills: {self.workers_df['skills_text'].str.len().mean():.1f} chars avg")
        print(f"   Job skills: {self.jobs_df['skills_text'].str.len().mean():.1f} chars avg")
        
        return self
    
    def fit(self):
        """Fit TF-IDF vectorizers và compute similarity."""
        print(f"\n{'='*60}")
        print(f"FIT TF-IDF VECTORIZERS")
        print(f"{'='*60}")
        
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        
        # TF-IDF cho workers
        self.worker_tfidf = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
            lowercase=True,
            strip_accents='unicode'
        )
        
        # Fit trên tất cả skills (workers + jobs) để có cùng vocabulary
        all_skills = pd.concat([
            self.workers_df['skills_text'],
            self.jobs_df['skills_text']
        ]).fillna('')
        
        self.worker_tfidf.fit(all_skills)
        self.worker_vectors = self.worker_tfidf.transform(self.workers_df['skills_text'])
        
        # TF-IDF cho jobs
        self.job_tfidf = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
            lowercase=True,
            strip_accents='unicode'
        )
        self.job_tfidf.fit(all_skills)
        self.job_vectors = self.job_tfidf.transform(self.jobs_df['skills_text'])
        
        print(f"   Worker vocabulary size: {len(self.worker_tfidf.vocabulary_)}")
        print(f"   Worker vectors shape: {self.worker_vectors.shape}")
        print(f"   Job vectors shape: {self.job_vectors.shape}")
        
        # Sample vocabulary
        vocab_sample = list(self.worker_tfidf.vocabulary_.keys())[:10]
        print(f"   Sample vocabulary: {vocab_sample}")
        
        # Compute similarity matrix
        print(f"\n{'='*60}")
        print(f"COMPUTE SIMILARITY MATRIX")
        print(f"{'='*60}")
        
        self.similarity_matrix = cosine_similarity(self.worker_vectors, self.job_vectors)
        print(f"   Similarity matrix shape: {self.similarity_matrix.shape}")
        print(f"   Similarity range: {self.similarity_matrix.min():.4f} - {self.similarity_matrix.max():.4f}")
        print(f"   Mean similarity: {self.similarity_matrix.mean():.4f}")
        
        # Store artifacts
        self.artifacts['worker_tfidf'] = self.worker_tfidf
        self.artifacts['job_tfidf'] = self.job_tfidf
        self.artifacts['similarity_matrix'] = self.similarity_matrix
        
        return self
    
    def recommend(self, user_id, top_n=10, min_score=0.0):
        """
        Recommend jobs cho một worker.
        
        Args:
            user_id: Worker userId
            top_n: Số lượng jobs recommend
            min_score: Minimum similarity score
        
        Returns:
            DataFrame với top N jobs
        """
        # Find worker index
        worker_idx = self.workers_df[self.workers_df['userId'] == user_id].index
        
        if len(worker_idx) == 0:
            print(f"[WARN] User {user_id} not found")
            return None
        
        worker_idx = worker_idx[0]
        
        # Get similarity scores
        scores = self.similarity_matrix[worker_idx]
        
        # Sort by score (descending)
        sorted_indices = np.argsort(scores)[::-1]
        
        # Filter by min_score
        top_indices = [i for i in sorted_indices if scores[i] >= min_score][:top_n]
        
        # Build recommendations
        recommendations = self.jobs_df.iloc[top_indices].copy()
        recommendations['match_score'] = scores[top_indices]
        
        # Add rank
        recommendations['rank'] = range(1, len(recommendations) + 1)
        
        # Add skills match info
        worker_skills = set(self.workers_df.iloc[worker_idx]['skills'].split('|'))
        job_skills = recommendations['skills'].str.split('|')
        
        match_counts = []
        for js in job_skills:
            js_set = set(js) if isinstance(js, list) else set()
            match = worker_skills.intersection(js_set)
            match_counts.append(len(match))
        
        recommendations['skills_match_count'] = match_counts
        
        return recommendations[['rank', 'id', 'title', 'company', 'match_score', 
                               'skills_match_count', 'salary_min', 'salary_max', 
                               'location', 'type']]
    
    def recommend_batch(self, user_ids, top_n=5):
        """Recommend cho nhiều users."""
        results = {}
        for user_id in user_ids:
            recs = self.recommend(user_id, top_n=top_n)
            if recs is not None:
                results[user_id] = recs
        return results
    
    def qualitative_evaluation(self, n_samples=5):
        """
        Qualitative Evaluation - In ra sample để verify kết quả.
        
        Đây là cách đánh giá phù hợp vì không có ground truth labels.
        """
        print(f"\n{'='*60}")
        print(f"QUALITATIVE EVALUATION")
        print(f"{'='*60}")
        
        # Random sample workers
        sample_indices = np.random.choice(len(self.workers_df), min(n_samples, len(self.workers_df)), replace=False)
        
        for idx in sample_indices:
            worker = self.workers_df.iloc[idx]
            user_id = worker['userId']
            
            print(f"\n{'─'*50}")
            print(f"👤 Worker: {user_id}")
            print(f"   Age: {worker['age']:.0f}, Experience: {worker['experience_years']:.1f} years")
            print(f"   Skills: {worker['skills'][:80]}{'...' if len(str(worker['skills'])) > 80 else ''}")
            print(f"   Target Job: {worker['target_job']}")
            
            # Get recommendations
            recs = self.recommend(user_id, top_n=3)
            
            if recs is not None and len(recs) > 0:
                print(f"\n   📋 Top 3 Recommendations:")
                for _, job in recs.iterrows():
                    print(f"   {job['rank']}. {job['title']} @ {job['company']}")
                    print(f"      Score: {job['match_score']:.3f} | Skills match: {job['skills_match_count']}")
                    print(f"      Salary: {job['salary_min']:,.0f} - {job['salary_max']:,.0f} VND")
            else:
                print(f"   [WARN] No recommendations found")
        
        print(f"\n{'─'*50}")
        
        return self
    
    def save(self):
        """Save model và artifacts."""
        print(f"\n{'='*60}")
        print(f"SAVE MODEL")
        print(f"{'='*60}")
        
        os.makedirs(MODELS_DIR, exist_ok=True)
        
        # Save recommender
        model_path = os.path.join(MODELS_DIR, 'job_recommender.pkl')
        
        # Chỉ save cần thiết (không save similarity matrix vì nó lớn)
        model_data = {
            'worker_tfidf': self.worker_tfidf,
            'job_tfidf': self.job_tfidf,
            'workers_df': self.workers_df[['userId', 'skills', 'target_job', 'age', 
                                           'experience_years', 'target_province']],
            'jobs_df': self.jobs_df[['id', 'title', 'company', 'skills', 'location',
                                     'salary_min', 'salary_max', 'type']],
            'artifacts': {
                'similarity_matrix': self.similarity_matrix,
                'n_workers': len(self.workers_df),
                'n_jobs': len(self.jobs_df)
            }
        }
        
        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"   [OK] job_recommender.pkl: {model_path}")
        
        # Save metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'type': 'content_based_filtering',
            'n_workers': len(self.workers_df),
            'n_jobs': len(self.jobs_df),
            'vocabulary_size': len(self.worker_tfidf.vocabulary_),
            'similarity_stats': {
                'mean': float(self.similarity_matrix.mean()),
                'min': float(self.similarity_matrix.min()),
                'max': float(self.similarity_matrix.max())
            }
        }
        
        meta_path = os.path.join(MODELS_DIR, 'job_recommender_metadata.json')
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"   [OK] job_recommender_metadata.json: {meta_path}")
        
        return self
    
    def fit_recommend(self):
        """Run full pipeline."""
        self.load_data()
        self.preprocess()
        self.fit()
        self.qualitative_evaluation(n_samples=5)
        self.save()
        
        return self


# ============================================================================
# FUNCTIONS: Standalone usage
# ============================================================================

def train_job_recommender():
    """Train job recommender model."""
    recommender = JobRecommender()
    recommender.fit_recommend()
    return recommender


def load_recommender(model_path=None):
    """Load trained recommender."""
    import joblib
    model_path = model_path or os.path.join(MODELS_DIR, 'job_recommender.pkl')
    
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
    
    recommender = JobRecommender()
    recommender.worker_tfidf = model_data['worker_tfidf']
    recommender.job_tfidf = model_data['job_tfidf']
    recommender.workers_df = model_data['workers_df']
    recommender.jobs_df = model_data['jobs_df']
    recommender.similarity_matrix = model_data['artifacts']['similarity_matrix']
    
    return recommender


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Entry point khi chạy trực tiếp script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Job Recommender')
    parser.add_argument('--workers', type=str, default=None,
                        help='Workers CSV path')
    parser.add_argument('--jobs', type=str, default=None,
                        help='Jobs CSV path')
    parser.add_argument('--n-samples', type=int, default=5,
                        help='Number of samples for qualitative evaluation')
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"  JOB RECOMMENDER TRAINING PIPELINE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        recommender = JobRecommender()
        recommender.load_data()
        recommender.preprocess()
        recommender.fit()
        recommender.qualitative_evaluation(n_samples=args.n_samples)
        recommender.save()
        
        print(f"\n{'='*60}")
        print(f"[OK] TRAINING COMPLETED SUCCESSFULLY")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"\n[ERROR] Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
