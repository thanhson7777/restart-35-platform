# ESCO Pipeline Implementation Roadmap

**Ngày tạo**: 2026-05-30
**Dự án**: restart-35-platform / ai-service
**Nguồn**: `docs/ESCO_PIPELINE_README.md`

---

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Phase 1: Chuẩn Bị Data](#phase-1-chuẩn-bị-data-high-priority)
3. [Phase 2: ESCO Normalizer Service](#phase-2-esco-normalizer-service-high-priority)
4. [Phase 3: ESCO Storage Service](#phase-3-esco-storage-service-medium-priority)
5. [Phase 4: API Endpoints](#phase-4-api-endpoints-high-priority)
6. [Phase 5: Scripts](#phase-5-scripts-medium-priority)
7. [Phase 6: NER Model](#phase-6-ner-model-optional)
8. [Files Cần Tạo](#files-cần-tạo)
9. [Timeline](#timeline)

---

## Tổng Quan

### Mục Tiêu

Implement ESCO Skill Normalization Pipeline để:
- Extract skills từ job descriptions sử dụng NER
- Match skills với ESCO taxonomy sử dụng semantic similarity
- Enable skill-based job matching và recommendation

### Architecture

```
Job Description -> NER Extraction -> Skill Entities
                                    |
                    +---------------+---------------+
                    |                               |
              Exact Match                      Embedding Match
                    |                               |
                    v                               v
              ESCO URIs <------------------------+
                    |
                    v
            Filter by Threshold
                    |
                    v
            Normalized Result
```

### Components Cần Implement

| Component | File | Priority | Status |
|-----------|------|----------|--------|
| ESCO Normalizer | `services/esco_normalizer.py` | HIGH | Chưa implement |
| ESCO Storage | `services/esco_storage_service.py` | MEDIUM | Chưa implement |
| API Router | `routers/esco_normalization.py` | HIGH | Chưa implement |
| Batch Normalize | `scripts/batch_normalize.py` | MEDIUM | Chưa implement |
| Quality Check | `scripts/quality_check.py` | MEDIUM | Chưa implement |
| Evaluate Pipeline | `scripts/evaluate_pipeline.py` | MEDIUM | Chưa implement |
| NER Model | `models/skill_ner/` | LOW | Chưa implement |

---

## Phase 1: Chuẩn Bị Data (HIGH Priority)

### Mục Tiêu

Chuẩn bị ESCO data đã được xử lý (embeddings, labels, URIs).

### 1.1 Kiểm Tra Data Hiện Có

Kiểm tra xem đã có ESCO data chưa:

```bash
ls -la ai-service/data/esco_processed/
```

**File cần có:**
- `esco_embeddings.npy` - Skill embeddings
- `esco_labels_order.json` - Skill labels
- `esco_uris.json` - ESCO URIs
- `esco_skills.json` - Full skill data

### 1.2 Tạo Data Nếu Chưa Có

**Nếu chưa có data**, chạy script:

```bash
cd ai-service
python scripts/prepare_esco_data.py
```

### 1.3 Kiểm Tra Embeddings

Verify embeddings được load đúng:

```python
import numpy as np

embeddings = np.load("data/esco_processed/esco_embeddings.npy")
print(f"Embeddings shape: {embeddings.shape}")
```

### Checklist Phase 1

- [ ] Kiểm tra ESCO data tồn tại
- [ ] Verify embeddings shape
- [ ] Load và test ESCO URIs
- [ ] Tạo data nếu chưa có

---

## Phase 2: ESCO Normalizer Service (HIGH Priority)

### Mục Tiêu

Tạo `services/esco_normalizer.py` - Main normalization engine.

### 2.1 Tạo File

**File:** `ai-service/services/esco_normalizer.py`

### 2.2 Define Data Classes

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Any

@dataclass
class SkillEntity:
    """Một skill entity được extract từ text"""
    text: str
    label: str  # SKILL_TECHNICAL, SKILL_TOOL, SKILL_SOFT, etc.
    start: int
    end: int

@dataclass
class ESCOMatch:
    """Kết quả match với ESCO"""
    uri: str
    label: str
    score: float
    original_text: str

@dataclass
class NormalizationResult:
    """Kết quả normalization của một job"""
    job_id: str
    entities: List[Dict[str, Any]]
    total_skills: int
    matched_skills: int
    match_rate: float
```

### 2.3 Implement ESCONormalizer Class

```python
class ESCONormalizer:
    """
    Main normalization engine
    - Loads ESCO embeddings
    - Extracts skills using NER (hoặc regex fallback)
    - Matches skills to ESCO URIs
    """

    def __init__(
        self,
        threshold: float = 0.75,
        embedding_model: str = "intfloat/multilingual-e5-base"
    ):
        """
        Initialize normalizer

        Args:
            threshold: Similarity threshold (0.0-1.0)
            embedding_model: Sentence transformer model
        """
        self.threshold = threshold
        self.embeddings = None
        self.labels = None
        self.uris = None
        self.skills_data = None
        self.embedding_model = None

    def load(self):
        """Load ESCO data và embedding model"""
        pass

    def normalize_text(
        self,
        text: str,
        job_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> NormalizationResult:
        """
        Normalize a job description

        Args:
            text: Job description text
            job_id: Optional job ID
            title: Optional job title

        Returns:
            NormalizationResult
        """
        pass

    def _extract_skills(self, text: str) -> List[SkillEntity]:
        """
        Extract skill entities từ text
        Sử dụng regex patterns hoặc NER model
        """
        pass

    def _match_to_esco(
        self,
        skill: str,
        threshold: Optional[float] = None
    ) -> List[ESCOMatch]:
        """
        Match skill text to ESCO URIs
        Sử dụng embedding similarity
        """
        pass

    def _exact_match(self, skill: str) -> Optional[ESCOMatch]:
        """
        Exact string match với ESCO labels
        """
        pass

    def _embedding_match(
        self,
        skill: str,
        threshold: Optional[float] = None
    ) -> List[ESCOMatch]:
        """
        Semantic match sử dụng embeddings
        """
        pass
```

### 2.4 Implement Singleton Pattern

```python
# Global instance
_normalizer = None

def get_normalizer(threshold: float = 0.75) -> ESCONormalizer:
    """Get singleton normalizer instance"""
    global _normalizer
    if _normalizer is None:
        _normalizer = ESCONormalizer(threshold=threshold)
        _normalizer.load()
    return _normalizer
```

### 2.5 Support Functions

```python
def normalize_skills_list(
    skills: List[str],
    threshold: float = 0.75
) -> List[ESCOMatch]:
    """
    Normalize a list of skill strings
    (không cần NER, direct matching)
    """
    normalizer = get_normalizer(threshold)
    results = []
    for skill in skills:
        matches = normalizer._match_to_esco(skill, threshold)
        if matches:
            results.append(matches[0])  # Best match
    return results
```

### Checklist Phase 2

- [ ] Tạo `ESCONormalizer` class
- [ ] Implement `_extract_skills()` với regex patterns
- [ ] Implement `_exact_match()`
- [ ] Implement `_embedding_match()`
- [ ] Implement `normalize_text()`
- [ ] Implement singleton `get_normalizer()`
- [ ] Test với sample data

---

## Phase 3: ESCO Storage Service (MEDIUM Priority)

### Mục Tiêu

Tạo `services/esco_storage_service.py` - MongoDB storage cho normalized jobs.

### 3.1 Tạo File

**File:** `ai-service/services/esco_storage_service.py`

### 3.2 Define Models

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class NormalizedSkill(BaseModel):
    """Một skill đã được normalize"""
    original_text: str
    esco_uri: Optional[str] = None
    esco_label: Optional[str] = None
    confidence: float = 0.0
    match_type: str = "exact"  # exact, embedding, none

class StoredJob(BaseModel):
    """Job đã được normalize và stored"""
    job_id: str
    title: str
    description: str
    normalized_skills: List[NormalizedSkill]
    match_rate: float
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)
```

### 3.3 Implement ESCOStorageService

```python
class ESCOStorageService:
    """
    MongoDB storage cho normalized jobs
    """

    def __init__(self, mongo_uri: str = None, db_name: str = "restart35"):
        self.mongo_uri = mongo_uri or os.getenv("MONGO_URI")
        self.db_name = db_name
        self.client = None
        self.db = None
        self.collection = None

    def connect(self):
        """Connect to MongoDB"""
        pass

    def store_normalized_job(self, job: StoredJob) -> str:
        """
        Store a normalized job

        Returns:
            Job ID
        """
        pass

    def get_job(self, job_id: str) -> Optional[StoredJob]:
        """Get a stored job by ID"""
        pass

    def get_jobs_by_skill(
        self,
        esco_uri: str,
        limit: int = 100
    ) -> List[StoredJob]:
        """Get jobs matching a specific ESCO skill URI"""
        pass

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        pass

    def count_jobs(self) -> int:
        """Count total stored jobs"""
        pass
```

### Checklist Phase 3

- [ ] Tạo `ESCOStorageService` class
- [ ] Implement `connect()`, `store_normalized_job()`
- [ ] Implement `get_job()`, `get_jobs_by_skill()`
- [ ] Implement `get_storage_stats()`
- [ ] Test với sample data

---

## Phase 4: API Endpoints (HIGH Priority)

### Mục Tiêu

Tạo `routers/esco_normalization.py` - FastAPI endpoints.

### 4.1 Tạo File

**File:** `ai-service/routers/esco_normalization.py`

### 4.2 Define Request/Response Models

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

router = APIRouter(prefix="/api/v1/esco", tags=["ESCO Normalization"])

class NormalizeRequest(BaseModel):
    """Request cho normalize single job"""
    description: str = Field(..., description="Job description")
    title: Optional[str] = Field(None, description="Job title")
    job_id: Optional[str] = Field(None, description="Job ID")

class NormalizeAndStoreRequest(BaseModel):
    """Request cho normalize và store"""
    description: str = Field(..., description="Job description")
    title: Optional[str] = Field(None, description="Job title")
    job_id: Optional[str] = Field(None, description="Job ID")
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SkillMatchResponse(BaseModel):
    """Kết quả một skill match"""
    original_text: str
    esco_uri: Optional[str]
    esco_label: Optional[str]
    confidence: float
    match_type: str

class NormalizeResponse(BaseModel):
    """Response cho normalize"""
    job_id: str
    skills: List[SkillMatchResponse]
    total_skills: int
    matched_skills: int
    match_rate: float
    processing_time_ms: float

class StorageStatsResponse(BaseModel):
    """Storage statistics"""
    total_jobs: int
    total_skills: int
    avg_skills_per_job: float
    avg_match_rate: float
```

### 4.3 Implement Endpoints

```python
# Global instances
_normalizer = None
_storage = None

@router.post("/normalize", response_model=NormalizeResponse)
async def normalize_job(request: NormalizeRequest):
    """
    Normalize a single job description
    """
    pass

@router.post("/normalize-and-store", response_model=NormalizeResponse)
async def normalize_and_store_job(request: NormalizeAndStoreRequest):
    """
    Normalize a job and store in MongoDB
    """
    pass

@router.get("/jobs/{job_id}", response_model=Dict)
async def get_stored_job(job_id: str):
    """
    Get a stored normalized job by ID
    """
    pass

@router.get("/storage-stats", response_model=StorageStatsResponse)
async def get_storage_stats():
    """
    Get storage statistics
    """
    pass

@router.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    pass
```

### 4.4 Register Router in main.py

```python
# Trong main.py
from routers.esco_normalization import router as esco_router

app.include_router(esco_router)
```

### Checklist Phase 4

- [ ] Tạo `esco_normalization.py` router
- [ ] Define request/response models
- [ ] Implement `/normalize` endpoint
- [ ] Implement `/normalize-and-store` endpoint
- [ ] Implement `/jobs/{job_id}` endpoint
- [ ] Implement `/storage-stats` endpoint
- [ ] Register router in `main.py`
- [ ] Test endpoints

---

## Phase 5: Scripts (MEDIUM Priority)

### Mục Tiêu

Tạo các scripts cho batch processing, quality check, và evaluation.

### 5.1 Batch Normalize Script

**File:** `ai-service/scripts/batch_normalize.py`

```python
#!/usr/bin/env python3
"""
Batch normalize jobs from MongoDB

Usage:
    python scripts/batch_normalize.py --limit 1000
    python scripts/batch_normalize.py --all
    python scripts/batch_normalize.py --job-ids file.txt
"""

import argparse
import asyncio
from tqdm import tqdm

def main():
    parser = argparse.ArgumentParser(description="Batch normalize jobs")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of jobs")
    parser.add_argument("--all", action="store_true", help="Process all jobs")
    parser.add_argument("--job-ids", type=str, help="File with job IDs")
    parser.add_argument("--threshold", type=float, default=0.75)
    parser.add_argument("--output", type=str, default="data/batch_results.json")

    args = parser.parse_args()

    # Initialize normalizer
    normalizer = get_normalizer(threshold=args.threshold)

    # Get jobs to process
    jobs = get_jobs_from_mongo(limit=args.limit)

    # Process
    results = []
    for job in tqdm(jobs, desc="Normalizing"):
        result = normalizer.normalize_text(
            text=job["description"],
            job_id=job["_id"],
            title=job.get("title")
        )
        results.append(result)

    # Save results
    save_results(results, args.output)

    print(f"Processed {len(results)} jobs")
    print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()
```

### 5.2 Quality Check Script

**File:** `ai-service/scripts/quality_check.py`

```python
#!/usr/bin/env python3
"""
Quality check cho normalized results

Usage:
    python scripts/quality_check.py --sample 100
    python scripts/quality_check.py --all
"""

import argparse

def main():
    parser = argparse.ArgumentParser(description="Quality check for normalization")
    parser.add_argument("--sample", type=int, default=100, help="Sample size")
    parser.add_argument("--all", action="store_true", help="Check all")
    parser.add_argument("--input", type=str, default="data/batch_results.json")

    args = parser.parse_args()

    # Load results
    results = load_results(args.input)

    # Calculate metrics
    metrics = calculate_quality_metrics(results)

    # Print report
    print_quality_report(metrics)

if __name__ == "__main__":
    main()
```

### 5.3 Evaluate Pipeline Script

**File:** `ai-service/scripts/evaluate_pipeline.py`

```python
#!/usr/bin/env python3
"""
Evaluate ESCO pipeline performance

Usage:
    python scripts/evaluate_pipeline.py --sample-size 100
"""

import argparse
import json
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description="Evaluate ESCO pipeline")
    parser.add_argument("--sample-size", type=int, default=100)
    parser.add_argument("--output", type=str, default="data/final_metrics.json")

    args = parser.parse_args()

    # Run evaluation
    metrics = evaluate(args.sample_size)

    # Save results
    with open(args.output, "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    print(f"Metrics saved to {args.output}")
    print_metrics(metrics)

if __name__ == "__main__":
    main()
```

### Checklist Phase 5

- [ ] Tạo `batch_normalize.py`
- [ ] Tạo `quality_check.py`
- [ ] Tạo `evaluate_pipeline.py`
- [ ] Test batch processing
- [ ] Test quality check
- [ ] Test evaluation

---

## Phase 6: NER Model (Optional/LOW Priority)

### Mục Tiêu

Train spaCy NER model cho better skill extraction.

### 6.1 Directory Structure

```
ai-service/models/skill_ner/
├── model-best/      # Best trained model
├── model-last/      # Last checkpoint
├── training_data/   # Annotated training data
│   ├── train.spacy
│   ├── dev.spacy
│   └── test.spacy
└── config.cfg      # Training config
```

### 6.2 Entity Labels

- `SKILL_TECHNICAL` - Technical skills (Python, Java, SQL)
- `SKILL_TOOL` - Tools (Excel, Photoshop, AutoCAD)
- `SKILL_SOFT` - Soft skills (Communication, Leadership)
- `SKILL_LANGUAGE` - Languages (English, Japanese)
- `CERTIFICATION` - Certifications (CPA, PMP)

### 6.3 Training Script

**File:** `ai-service/scripts/train_ner_model.py`

### Checklist Phase 6

- [ ] Prepare training data
- [ ] Create training config
- [ ] Train NER model
- [ ] Evaluate model performance
- [ ] Export to `models/skill_ner/`

---

## Files Cần Tạo

### Services (2 files)

| File | Priority | Description |
|------|----------|-------------|
| `services/esco_normalizer.py` | HIGH | Main normalization engine |
| `services/esco_storage_service.py` | MEDIUM | MongoDB storage |

### Routers (1 file)

| File | Priority | Description |
|------|----------|-------------|
| `routers/esco_normalization.py` | HIGH | API endpoints |

### Scripts (3 files)

| File | Priority | Description |
|------|----------|-------------|
| `scripts/batch_normalize.py` | MEDIUM | Batch processing |
| `scripts/quality_check.py` | MEDIUM | Quality check |
| `scripts/evaluate_pipeline.py` | MEDIUM | Evaluation |

### Documentation (1 file)

| File | Priority | Description |
|------|----------|-------------|
| `docs/ESCO_PIPELINE_README.md` | HIGH | Đã có sẵn |

### Data Directory

| File | Description |
|------|-------------|
| `data/esco_processed/embeddings.npy` | ESCO embeddings |
| `data/esco_processed/labels.json` | Skill labels |
| `data/esco_processed/uris.json` | ESCO URIs |
| `data/normalization_stats.json` | Statistics |

---

## Timeline

```
Week 1: Phase 1 & 2 (Data + Normalizer)
├── Day 1-2: Check/correct ESCO data
├── Day 3-4: Implement ESCONormalizer class
├── Day 5: Test normalizer với sample data
└── Week 1 Goal: Normalizer hoạt động

Week 2: Phase 3 & 4 (Storage + API)
├── Day 1-2: Implement ESCOStorageService
├── Day 3-4: Implement API endpoints
├── Day 5: Register router & test integration
└── Week 2 Goal: API hoạt động

Week 3: Phase 5 (Scripts)
├── Day 1-2: Implement batch_normalize.py
├── Day 3-4: Implement quality_check.py
├── Day 5: Implement evaluate_pipeline.py
└── Week 3 Goal: Scripts hoạt động

Week 4: Phase 6 (Optional - NER Model)
├── Day 1-3: Prepare training data
├── Day 4-5: Train và evaluate NER model
└── Week 4 Goal: NER model trained
```

---

## Dependencies

### Python Packages

```
# requirements_esco.txt
numpy>=1.21.0
pandas>=1.3.0
pymongo>=4.0.0
sentence-transformers>=2.2.0
spacy>=3.4.0
fastapi>=0.100.0
uvicorn>=0.22.0
pydantic>=2.0.0
tqdm>=4.64.0
```

### Environment Variables

```bash
# .env
MONGO_URI=mongodb://localhost:27017
ESCO_EMBEDDINGS_PATH=data/esco_processed/embeddings.npy
ESCO_LABELS_PATH=data/esco_processed/labels.json
ESCO_URIS_PATH=data/esco_processed/uris.json
```

---

## Next Steps

1. **Ngay lập tức**: Review và approve roadmap này
2. **Week 1**: Implement Phase 1 & 2 (Data + Normalizer)
3. **Week 2**: Implement Phase 3 & 4 (Storage + API)
4. **Week 3**: Implement Phase 5 (Scripts)
5. **Week 4**: (Optional) Train NER model

---

## Troubleshooting

### Common Issues

1. **Embeddings không load được**
   - Kiểm tra file path đúng
   - Verify numpy array shape

2. **MongoDB connection fail**
   - Kiểm tra MONGO_URI
   - Verify MongoDB service đang chạy

3. **Threshold quá cao/thấp**
   - Production: 0.75-0.80
   - Development: 0.70

---

*Document được tạo dựa trên `docs/ESCO_PIPELINE_README.md`*
