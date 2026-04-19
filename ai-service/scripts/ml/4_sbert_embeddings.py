# -*- coding: utf-8 -*-
"""
Script 4: SBERT Embeddings + FAISS Index Builder
================================================
Tạo embeddings cho jobs sử dụng Sentence-BERT
và build FAISS index cho semantic search nhanh

Input:  data/jobs_cleaned.csv hoặc jobs_enriched.csv
Output: data/jobs_embeddings.npy
        data/jobs_faiss.index
        data/jobs_metadata.json

Models:
- all-MiniLM-L6-v2: 384 dimensions, nhanh nhất
- paraphrase-multilingual-MiniLM-L12-v2: 384 dimensions, hỗ trợ tiếng Việt tốt hơn

Author: Thanh Sơn
Date: 2026-04-19
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime

# Config logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
AI_SERVICE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = AI_SERVICE_DIR / 'data'


# ============================================================================
# SBERT + FAISS
# ============================================================================

def install_dependencies():
    """Install required packages"""
    packages = ['sentence-transformers', 'faiss-cpu']
    for pkg in packages:
        try:
            __import__(pkg.replace('-', '_').replace('.', '_'))
        except ImportError:
            logger.info(f"Installing {pkg}...")
            os.system(f"pip install {pkg} -q")


def load_sbert_model(model_name: str = 'all-MiniLM-L6-v2'):
    """Load SBERT model"""
    from sentence_transformers import SentenceTransformer
    
    logger.info(f"Loading SBERT model: {model_name}")
    start = time.time()
    
    model = SentenceTransformer(model_name)
    
    elapsed = time.time() - start
    logger.info(f"Model loaded in {elapsed:.1f}s")
    
    return model


def load_faiss():
    """Load FAISS"""
    try:
        import faiss
        return faiss
    except ImportError:
        logger.info("Installing faiss-cpu...")
        os.system("pip install faiss-cpu -q")
        import faiss
        return faiss


# ============================================================================
# TEXT PREPROCESSING
# ============================================================================

def preprocess_job_text(job: Dict) -> str:
    """
    Tạo combined text từ job data để encode
    
    Args:
        job: Dict chứa job data
        
    Returns:
        Combined text string
    """
    parts = []
    
    # Title - quan trọng nhất
    title = job.get('title', '')
    if title:
        parts.append(f"Job: {title}")
    
    # Company
    company = job.get('company', '')
    if company and company != 'nan':
        parts.append(f"Company: {company}")
    
    # Skills
    skills = job.get('skills', '')
    if skills:
        # Parse skills
        if isinstance(skills, str):
            skill_list = [s.strip() for s in skills.split('|') if s.strip()]
        elif isinstance(skills, list):
            skill_list = [str(s).strip() for s in skills if s]
        else:
            skill_list = []
        
        if skill_list:
            parts.append(f"Skills: {', '.join(skill_list)}")
    
    # Description
    description = job.get('description', '')
    if description and description != 'nan':
        # Truncate description
        desc_clean = str(description)[:500].replace('\n', ' ').replace('\r', '')
        parts.append(f"Description: {desc_clean}")
    
    # Requirements
    requirements = job.get('requirements', '')
    if requirements and requirements != 'nan':
        req_clean = str(requirements)[:300].replace('\n', ' ').replace('\r', '')
        parts.append(f"Requirements: {req_clean}")
    
    # Experience
    exp = job.get('experience_required', 0)
    if exp and str(exp) != 'nan':
        parts.append(f"Experience: {exp} years")
    
    # Location
    location = job.get('location', '')
    if location and location != 'nan':
        parts.append(f"Location: {location}")
    
    # Type
    job_type = job.get('type', '')
    if job_type and job_type != 'nan':
        parts.append(f"Job Type: {job_type}")
    
    return ' | '.join(parts)


def preprocess_user_profile(
    skills: List[str],
    experience: int = 0,
    target_job: Optional[str] = None,
    location: Optional[str] = None
) -> str:
    """
    Tạo combined text từ user profile để encode
    
    Args:
        skills: List of user skills
        experience: Years of experience
        target_job: Target job title
        location: Preferred location
        
    Returns:
        Combined text string
    """
    parts = []
    
    if target_job:
        parts.append(f"I want to work as: {target_job}")
    
    if skills:
        parts.append(f"My skills: {', '.join(skills)}")
    
    if experience > 0:
        parts.append(f"I have {experience} years of experience")
    
    if location:
        parts.append(f"I prefer working in: {location}")
    
    return ' | '.join(parts) if parts else "Looking for any job"


# ============================================================================
# EMBEDDINGS BUILDER
# ============================================================================

class SBERTEmbeddingsBuilder:
    """Build SBERT embeddings cho jobs"""
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Khởi tạo SBERT Embeddings Builder
        
        Args:
            model_name: Tên model SBERT
                - 'all-MiniLM-L6-v2': 384 dims, nhanh, English
                - 'paraphrase-multilingual-MiniLM-L12-v2': 384 dims, hỗ trợ tiếng Việt
                - 'all-mpnet-base-v2': 768 dims, chất lượng cao hơn
        """
        self.model_name = model_name
        self.model = None
        self.faiss = None
        
        self.jobs_df = None
        self.embeddings = None
        self.metadata = None
        
        self.stats = {
            'total_jobs': 0,
            'embedding_time': 0,
            'index_build_time': 0,
            'model_name': model_name,
            'embedding_dim': 0
        }
    
    def _load_jobs(self, data_path: Path) -> pd.DataFrame:
        """Load jobs data"""
        if not data_path.exists():
            raise FileNotFoundError(f"Data file not found: {data_path}")
        
        df = pd.read_csv(data_path, encoding='utf-8')
        logger.info(f"Loaded {len(df)} jobs from {data_path.name}")
        
        return df
    
    def build_embeddings(self, data_path: Path, batch_size: int = 32) -> np.ndarray:
        """
        Build embeddings cho tất cả jobs
        
        Args:
            data_path: Path đến jobs CSV
            batch_size: Batch size cho encoding
            
        Returns:
            Numpy array shape (n_jobs, embedding_dim)
        """
        # Load data
        self.jobs_df = self._load_jobs(data_path)
        self.stats['total_jobs'] = len(self.jobs_df)
        
        # Load model
        if self.model is None:
            self.model = load_sbert_model(self.model_name)
        
        # Load FAISS
        if self.faiss is None:
            self.faiss = load_faiss()
        
        # Prepare texts
        logger.info("Preparing job texts...")
        texts = []
        for idx, row in self.jobs_df.iterrows():
            job_dict = row.to_dict()
            text = preprocess_job_text(job_dict)
            texts.append(text)
        
        # Show sample
        logger.info(f"\nSample text:\n{texts[0][:300]}...")
        
        # Encode
        logger.info(f"\nEncoding {len(texts)} jobs...")
        logger.info(f"Batch size: {batch_size}")
        
        start = time.time()
        self.embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True  # L2 normalize cho cosine similarity
        )
        self.stats['embedding_time'] = time.time() - start
        
        self.stats['embedding_dim'] = self.embeddings.shape[1]
        logger.info(f"Embeddings shape: {self.embeddings.shape}")
        logger.info(f"Embedding time: {self.stats['embedding_time']:.1f}s")
        
        return self.embeddings
    
    def build_faiss_index(self, metric: str = 'ip') -> any:
        """
        Build FAISS index cho fast similarity search
        
        Args:
            metric: 'ip' (Inner Product) cho cosine similarity,
                   'l2' (L2 distance) cho Euclidean distance
                   
        Returns:
            FAISS index
        """
        if self.embeddings is None:
            raise ValueError("Must call build_embeddings() first")
        
        logger.info(f"Building FAISS index (metric: {metric})...")
        start = time.time()
        
        dim = self.embeddings.shape[1]
        
        if metric == 'ip':
            # Inner Product cho normalized vectors = cosine similarity
            index = self.faiss.IndexFlatIP(dim)
        else:
            # L2 distance
            index = self.faiss.IndexFlatL2(dim)
        
        index.add(self.embeddings.astype('float32'))
        
        self.stats['index_build_time'] = time.time() - start
        logger.info(f"FAISS index built in {self.stats['index_build_time']:.2f}s")
        logger.info(f"Index size: {index.ntotal} vectors")
        
        return index
    
    def save(self, output_dir: Path = None) -> Dict:
        """
        Save embeddings, index và metadata
        
        Args:
            output_dir: Output directory
            
        Returns:
            Dict chứa các file paths
        """
        if output_dir is None:
            output_dir = DATA_DIR
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save embeddings numpy array
        embeddings_path = output_dir / 'jobs_embeddings.npy'
        if self.embeddings is not None:
            np.save(embeddings_path, self.embeddings)
            logger.info(f"Saved embeddings: {embeddings_path}")
        
        # Save FAISS index (as numpy for portability)
        index_path = output_dir / 'jobs_faiss.index'
        if self.embeddings is not None:
            # Save index using numpy (simpler, portable)
            index_data = {
                'embeddings': self.embeddings.astype('float32'),
                'dim': self.embeddings.shape[1]
            }
            np.save(index_path.with_suffix('.npy'), index_data['embeddings'])
            logger.info(f"Saved FAISS embeddings: {index_path.with_suffix('.npy')}")
        
        # Save metadata
        metadata_path = output_dir / 'jobs_metadata.json'
        
        # Prepare metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'stats': self.stats,
            'model_name': self.model_name,
            'jobs_count': len(self.jobs_df) if self.jobs_df is not None else 0,
            'jobs': []
        }
        
        # Add job metadata
        if self.jobs_df is not None:
            for idx, row in self.jobs_df.iterrows():
                job_meta = {
                    'id': str(row.get('id', idx)),
                    'index': idx,
                    'title': str(row.get('title', ''))[:100],
                    'company': str(row.get('company', ''))[:100],
                    'location': str(row.get('location', '')),
                    'salary_min': float(row.get('salary_min', 0)),
                    'salary_max': float(row.get('salary_max', 0)),
                }
                metadata['jobs'].append(job_meta)
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved metadata: {metadata_path}")
        
        return {
            'embeddings': str(embeddings_path),
            'index': str(index_path.with_suffix('.npy')),
            'metadata': str(metadata_path)
        }
    
    def load(self, embeddings_path: Path, metadata_path: Path = None):
        """Load pre-computed embeddings"""
        self.embeddings = np.load(embeddings_path)
        logger.info(f"Loaded embeddings: {self.embeddings.shape}")
        
        if metadata_path and metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            logger.info(f"Loaded metadata for {len(self.metadata.get('jobs', []))} jobs")


# ============================================================================
# SEMANTIC SEARCH
# ============================================================================

class SemanticJobSearcher:
    """Semantic search using SBERT + FAISS"""
    
    def __init__(self, embeddings_path: Path = None, metadata_path: Path = None):
        """
        Khởi tạo Semantic Job Searcher
        
        Args:
            embeddings_path: Path to jobs_embeddings.npy
            metadata_path: Path to jobs_metadata.json
        """
        self.faiss = load_faiss()
        
        # Load embeddings
        if embeddings_path and embeddings_path.exists():
            self.embeddings = np.load(embeddings_path)
            logger.info(f"Loaded embeddings: {self.embeddings.shape}")
        else:
            self.embeddings = None
            logger.warning("No embeddings loaded!")
        
        # Load metadata
        self.metadata = None
        if metadata_path and metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            logger.info(f"Loaded metadata: {len(self.metadata.get('jobs', []))} jobs")
        
        # Load model
        self.model = load_sbert_model('all-MiniLM-L6-v2')
        
        # Build FAISS index
        self.index = None
        if self.embeddings is not None:
            self.index = self.faiss.IndexFlatIP(self.embeddings.shape[1])
            self.index.add(self.embeddings.astype('float32'))
            logger.info(f"Built FAISS index with {self.index.ntotal} vectors")
    
    def search(
        self,
        query: str,
        k: int = 10,
        filters: Dict = None
    ) -> List[Dict]:
        """
        Semantic search jobs
        
        Args:
            query: Search query (text)
            k: Number of results
            filters: Optional filters (location, salary_range, etc.)
            
        Returns:
            List of matching jobs with scores
        """
        if self.index is None:
            raise ValueError("No FAISS index available!")
        
        # Encode query
        query_embedding = self.model.encode([query], normalize_embeddings=True)
        query_embedding = query_embedding.astype('float32')
        
        # Search
        scores, indices = self.index.search(query_embedding, k * 3)  # Get more for filtering
        
        # Get results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1:
                continue
            
            job = self.metadata['jobs'][idx].copy() if self.metadata else {}
            job['index'] = idx
            job['sbert_score'] = float(scores[0][i])
            
            # Apply filters
            if filters:
                skip = False
                
                # Location filter
                if filters.get('location'):
                    job_loc = job.get('location', '').lower()
                    filter_loc = filters['location'].lower()
                    if filter_loc not in job_loc and job_loc not in filter_loc:
                        skip = True
                
                # Salary filter
                if filters.get('salary_min') and job.get('salary_max', 0) < filters['salary_min']:
                    skip = True
                if filters.get('salary_max') and job.get('salary_min', float('inf')) > filters['salary_max']:
                    skip = True
                
                if skip:
                    continue
            
            results.append(job)
            
            if len(results) >= k:
                break
        
        return results
    
    def search_by_user_profile(
        self,
        skills: List[str],
        experience: int = 0,
        target_job: str = None,
        location: str = None,
        k: int = 10
    ) -> List[Dict]:
        """Search jobs by user profile"""
        query = preprocess_user_profile(skills, experience, target_job, location)
        
        filters = {}
        if location:
            filters['location'] = location
        
        return self.search(query, k=k, filters=filters)


# ============================================================================
# MAIN
# ============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Build SBERT embeddings + FAISS index')
    parser.add_argument('-i', '--input', type=str, default=None,
                       help='Input CSV file (default: data/jobs_cleaned.csv)')
    parser.add_argument('-o', '--output', type=str, default=None,
                       help='Output directory (default: data/)')
    parser.add_argument('-m', '--model', type=str, 
                       default='all-MiniLM-L6-v2',
                       choices=[
                           'all-MiniLM-L6-v2',      # English, nhanh
                           'paraphrase-multilingual-MiniLM-L12-v2',  # Multilingual
                           'all-mpnet-base-v2'      # English, chất lượng cao
                       ],
                       help='SBERT model name')
    parser.add_argument('-b', '--batch-size', type=int, default=32,
                       help='Batch size for encoding')
    parser.add_argument('--no-vietnamese', action='store_true',
                       help='Use English-only model (faster)')
    
    args = parser.parse_args()
    
    # Check/install dependencies
    install_dependencies()
    
    # Input file
    if args.input:
        data_path = Path(args.input)
    else:
        # Use enriched data if available, else cleaned
        enriched_path = DATA_DIR / 'jobs_enriched.csv'
        cleaned_path = DATA_DIR / 'jobs_cleaned.csv'
        
        if enriched_path.exists():
            data_path = enriched_path
            logger.info("Using enriched data")
        else:
            data_path = cleaned_path
    
    if not data_path.exists():
        logger.error(f"Input file not found: {data_path}")
        return
    
    # Output directory
    output_dir = Path(args.output) if args.output else DATA_DIR
    
    # Model selection
    model_name = args.model
    if args.no_vietnamese:
        model_name = 'all-MiniLM-L6-v2'
    elif 'vietnamese' in str(data_path).lower() or 'enriched' in str(data_path).lower():
        model_name = 'paraphrase-multilingual-MiniLM-L12-v2'
    
    logger.info(f"Using model: {model_name}")
    
    # Build embeddings
    builder = SBERTEmbeddingsBuilder(model_name=model_name)
    
    print("\n" + "="*60)
    print("STEP 1: Building SBERT Embeddings")
    print("="*60)
    embeddings = builder.build_embeddings(data_path, batch_size=args.batch_size)
    
    print("\n" + "="*60)
    print("STEP 2: Building FAISS Index")
    print("="*60)
    index = builder.build_faiss_index(metric='ip')
    builder.faiss_index = index
    
    print("\n" + "="*60)
    print("STEP 3: Saving Files")
    print("="*60)
    paths = builder.save(output_dir)
    
    # Summary
    print("\n" + "="*60)
    print("SBERT EMBEDDINGS BUILT SUCCESSFULLY!")
    print("="*60)
    print(f"\nOutput files:")
    for key, path in paths.items():
        if path:
            print(f"  {key}: {path}")
    
    print(f"\nStats:")
    for key, value in builder.stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.2f}")
        else:
            print(f"  {key}: {value}")
    
    print(f"\nTotal time: {sum(builder.stats.values()):.1f}s")


def test_semantic_search():
    """Test semantic search"""
    print("\n" + "="*60)
    print("TEST: Semantic Job Search")
    print("="*60)
    
    embeddings_path = DATA_DIR / 'jobs_embeddings.npy'
    metadata_path = DATA_DIR / 'jobs_metadata.json'
    
    if not embeddings_path.exists():
        logger.error("Embeddings not found! Run main() first.")
        return
    
    searcher = SemanticJobSearcher(embeddings_path, metadata_path)
    
    test_queries = [
        {
            'name': 'Python Developer',
            'skills': ['python', 'sql', 'flask'],
            'target_job': 'Software Developer',
            'location': 'Hồ Chí Minh'
        },
        {
            'name': 'Marketing Manager',
            'skills': ['marketing', 'digital marketing', 'facebook ads'],
            'target_job': 'Marketing Manager',
            'location': 'Hà Nội'
        },
        {
            'name': 'No skills',
            'skills': [],
            'target_job': 'Any job',
            'location': None
        }
    ]
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n[Test {i}] {test['name']}")
        print(f"  Query: skills={test['skills']}, job={test['target_job']}, loc={test['location']}")
        
        results = searcher.search_by_user_profile(
            skills=test['skills'],
            target_job=test['target_job'],
            location=test['location'],
            k=5
        )
        
        print(f"\n  Top {len(results)} results:")
        for j, job in enumerate(results, 1):
            print(f"  {j}. {job.get('title', 'N/A')[:50]}")
            print(f"     Score: {job.get('sbert_score', 0):.3f}")
            print(f"     Location: {job.get('location', 'N/A')}")


if __name__ == '__main__':
    main()
    test_semantic_search()
