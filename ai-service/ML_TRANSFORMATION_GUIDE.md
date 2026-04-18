# Hướng Dẫn Phát Triển AI/ML Platform

> **Mục đích**: Tài liệu này theo dõi tiến độ chuyển đổi từ "bộ lọc cơ bản" thành "AI/ML thật sự"
> **Ngày tạo**: 2026-04-18
> **Cập nhật lần cuối**: 2026-04-18

---

## MỤC LỤC

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Phân Tích Hiện Trạng](#2-phân-tích-hiện-trạng)
3. [Các Vấn Đề Cần Khắc Phục](#3-các-vấn-đề-cần-khắc-phục)
4. [Dữ Liệu Cần Thu Thập](#4-dữ-liệu-cần-thu-thập)
5. [Lộ Trình Phát Triển](#5-lộ-trình-phát-triển)
6. [Quy Tắc & Best Practices](#6-quy-tắc--best-practices)
7. [Theo Dõi Tiến Độ](#7-theo-dõi-tiến-độ)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mục Tiêu Cuối Cùng

Chuyển đổi hệ thống từ **"bộ lọc có trọng số cố định"** thành **"AI/ML thông minh thật sự"**:

| Hiện tại | Mục tiêu |
|----------|----------|
| If-else có trọng số | Model học được từ data |
| TF-IDF đếm từ | Semantic understanding thật sự |
| Collaborative Filtering đơn giản | Matrix Factorization + Deep Learning |
| Không có personalization | User embeddings riêng |
| Không có feedback loop | Continuous learning |
| Offline training | Online learning + A/B testing |

### 1.2 Cấu Trúc Hiện Tại

```
ai-service/
├── services/
│   ├── job_recommender.py      # TF-IDF + Hybrid Scoring
│   ├── hybrid_recommender.py   # Kết hợp TF-IDF + Semantic + CF
│   ├── semantic_search.py       # Sentence-BERT embeddings
│   ├── collaborative_filter.py  # User-based & Item-based CF
│   ├── risk_predictor.py        # XGBoost risk prediction
│   ├── priority_engine.py       # Priority scoring
│   ├── model_monitor.py         # Model monitoring
│   ├── gemini_explainer.py      # LLM explanations
│   ├── career_path_discoverer.py
│   ├── career_path_generator.py
│   ├── career_path_scorer.py
│   ├── career_ladder_builder.py
│   └── career_llm_scorer.py
├── routers/
│   ├── ai.py
│   └── career_path.py
├── data/
│   ├── jobs.csv                # ~10k jobs
│   ├── workers.csv
│   ├── age_transitions.json
│   └── career_ladders.json
├── scripts/
│   ├── ml/                     # ML training scripts
│   │   ├── 1_*.py - 10_*.py   # Pipeline steps
│   │   ├── test_step*.py       # Test scripts
│   │   ├── train_*.py          # Training scripts
│   │   └── *.py               # Utilities
│   └── scraping/               # Scraping scripts
│       └── *.py
└── models/
    ├── risk_predictor_tuned.pkl
    ├── job_recommender.pkl
    └── *.json (metadata)
```

---

## 2. PHÂN TÍCH HIỆN TRẠNG

### 2.1 Job Recommender (job_recommender.py)

**Kiến trúc hiện tại**:
```python
# Hybrid Scoring với weights cố định
final_score = (
    base_score * 0.55 +        # TF-IDF cosine similarity
    salary_score * 0.12 +
    job_type_score * 0.08 +
    experience_bonus +
    location_bonus +
    recency_bonus
)
```

**Vấn đề**:
- [x] ~~Weights do con người đặt, không học được~~
- [x] ~~TF-IDF không hiểu semantic~~
- [x] ~~Không có user embeddings~~
- [x] ~~Soft filter thay vì hard filter (đã fix)~~

### 2.2 Hybrid Recommender (hybrid_recommender.py)

**Kiến trúc hiện tại**:
```python
TFIDF_WEIGHT = 0.25
SEMANTIC_WEIGHT = 0.25
CF_WEIGHT = 0.30
CONTENT_WEIGHT = 0.20

# Hybrid scoring
hybrid_score = (
    tfidf_score * TFIDF_WEIGHT +
    semantic_score * SEMANTIC_WEIGHT +
    cf_score * CF_WEIGHT
)
```

**Vấn đề**:
- [x] ~~Weights cố định, không adaptive~~
- [x] ~~TF-IDF vẫn chiếm ưu thế (55% trong base)~~
- [x] ~~Semantic chỉ là rerank layer~~
- [x] ~~Không có learning-to-rank~~

### 2.3 Semantic Search (semantic_search.py)

**Kiến trúc hiện tại**:
```python
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
# Encode on-the-fly, cosine similarity
```

**Vấn đề**:
- [x] ~~Public model, không fine-tuned cho job market VN~~
- [x] ~~No pre-computed embeddings~~
- [x] ~~Không có vector indexing (FAISS/Pinecone)~~

### 2.4 Collaborative Filtering (collaborative_filter.py)

**Kiến trúc hiện tại**:
```python
# User-based CF: cosine similarity
# Item-based CF: co-occurrence
ACTION_WEIGHTS = {
    'apply': 5.0, 'bookmark': 4.0, 'click': 2.0, 'view': 1.0
}
```

**Vấn đề**:
- [x] ~~Không có Matrix Factorization (SVD/NMF/ALS)~~
- [x] ~~Sparse matrix → similarity không đáng tin~~
- [x] ~~Cold start user = CF fails hoàn toàn~~
- [x] ~~No implicit feedback learning~~

### 2.5 Risk Predictor (risk_predictor.py)

**Kiến trúc hiện tại**:
```python
OPTIMAL_THRESHOLD = 0.15  # Fixed threshold
model = XGBoost  # Trained offline
```

**Vấn đề**:
- [x] ~~Train 1 lần, không retrain~~
- [x] ~~Không có drift detection~~
- [x] ~~Threshold cố định~~

---

## 3. CÁC VẤN ĐỀ CẦN KHẮC PHỤC

### 3.1 Priority Matrix

| Priority | Vấn đề | Effort | Impact | Trạng thái |
|----------|---------|--------|--------|-------------|
| CRITICAL | Thu thập interaction data | Cao | Rất cao | TODO |
| CRITICAL | Enrich job data | Trung bình | Cao | TODO |
| HIGH | Fine-tune SBERT | Trung bình | Cao | TODO |
| HIGH | Train SVD/Matrix Factorization | Trung bình | Cao | TODO |
| MEDIUM | Learning-to-Rank | Cao | Trung bình | TODO |
| MEDIUM | User embeddings | Cao | Cao | TODO |
| LOW | Continuous learning | Rất cao | Cao | TODO |

### 3.2 Chi Tiết Từng Vấn Đề

#### 3.2.1 Data Collection (CRITICAL)

**Tại sao quan trọng**: Không có data = không train model

**Cần thu thập**:

```typescript
// 1. Interaction Events
interface InteractionEvent {
  user_id: string;
  job_id: string;
  timestamp: Date;
  
  // Explicit feedback
  action: 'view' | 'click' | 'apply' | 'save' | 'skip';
  
  // Implicit feedback
  view_duration_seconds?: number;
  scroll_depth?: number;        // 0-1
  return_visit?: boolean;
  
  // Context
  device: 'mobile' | 'desktop' | 'tablet';
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week: string;
  search_query?: string;
  
  // Outcome (sau này)
  hired?: boolean;
  interview?: boolean;
  rejected?: boolean;
}

// 2. Job Enrichment
interface EnrichedJob {
  // Hiện có
  id: string;
  title: string;
  company: string;
  skills: string[];
  salary_min: number;
  salary_max: number;
  location: string;
  
  // CẦN THÊM
  description_full?: string;
  requirements_detailed?: string[];
  benefits?: string[];
  company_size?: string;
  company_industry?: string;
  company_rating?: number;
  work_environment?: string;
  career_growth?: 'fast' | 'medium' | 'slow';
  training_provided?: boolean;
  soft_skills_required?: string[];
  hiring_speed?: 'fast' | 'medium' | 'slow';
  remote_policy?: 'remote' | 'hybrid' | 'onsite';
  
  // Job embeddings (pre-computed)
  embedding?: number[];  // 384-dim vector
}

// 3. User Profile
interface EnrichedUser {
  user_id: string;
  
  // Demographic
  age: number;
  gender: string;
  education: string;
  location: string;
  
  // Work history
  experience_years: number;
  current_job_title?: string;
  skills: string[];
  
  // Preferences (learned)
  preferred_locations?: string[];
  preferred_job_types?: string[];
  preferred_salary_range?: [number, number];
  preferred_industries?: string[];
  
  // User embedding (learned)
  embedding?: number[];
  
  // Engagement metrics
  avg_session_duration?: number;
  weekly_active_days?: number;
  conversion_rate?: number;
}
```

#### 3.2.2 Fine-tune SBERT (HIGH)

**Tại sao**: Public model không hiểu job market VN

**Cách làm**:

```python
# 1. Tạo training data (human-labeled)
training_pairs = [
    # Similar jobs
    {"job1": "Kế toán tổng hợp", "job2": "Kế toán trưởng", "label": 0.9},
    {"job1": "Kế toán", "job2": "Thu ngân", "label": 0.6},
    {"job1": "Kế toán", "job2": "Kiểm toán", "label": 0.7},
    {"job1": "Kế toán", "job2": "Tài chính", "label": 0.5},
    {"job1": "Kế toán", "job2": "Lập trình Python", "label": 0.1},
    
    # Skill-job relevance
    {"skill": "Excel", "job": "Kế toán", "label": 0.9},
    {"skill": "Excel", "job": "Nhân sự", "label": 0.6},
    {"skill": "Java", "job": "Kế toán", "label": 0.1},
    
    # Career transitions
    {"from": "Kế toán", "to": "Quản lý tài chính", "label": 0.8},
]

# 2. Fine-tune với SentenceTransformer
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch import DataLoader

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
train_examples = [InputExample(texts=[p['job1'], p['job2']], label=p['label']) 
                  for p in training_pairs]

train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)
train_loss = losses.CosineSimilarityLoss(model)

model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=10)
model.save('models/job_sbert_finetuned')
```

#### 3.2.3 Matrix Factorization (HIGH)

**Tại sao**: CF hiện tại không hiệu quả với sparse matrix

**Cách làm**:

```python
from surprise import SVD, Dataset, Reader
from scipy.sparse import csr_matrix

# Chuẩn bị data
# Format: user_id, job_id, rating (từ interactions)
ratings_df = pd.DataFrame([
    {'user_id': 'u1', 'job_id': 'j1', 'rating': 5.0},
    {'user_id': 'u1', 'job_id': 'j2', 'rating': 2.0},
    # ...
])

# Train SVD
reader = Reader(rating_scale=(1, 5))
data = Dataset.load_from_df(ratings_df[['user_id', 'job_id', 'rating']], reader)

trainset = data.build_full_trainset()
svd = SVD(n_factors=50, n_epochs=20, lr_all=0.005, reg_all=0.02)
svd.fit(trainset)

# Predict
predicted_score = svd.predict('u1', 'j3').est

# Lưu model
import pickle
with open('models/svd_recommender.pkl', 'wb') as f:
    pickle.dump({'svd': svd, 'n_factors': 50}, f)
```

#### 3.2.4 Learning-to-Rank (MEDIUM)

**Tại sao**: Cải thiện ranking quality thay vì weighted sum

**Cách làm**:

```python
from lightgbm import LGBMRanker

# Training data format:
# - features: job attributes + user-job interaction features
# - label: click/apply (1) hoặc skip (0)

def create_ltr_features(user, job, context):
    return [
        # Job features
        job.salary_match_score,
        job.location_score,
        job.skill_match_score,
        job.recency_score,
        
        # User features
        user.age,
        user.experience_years,
        user.education_level,
        
        # Cross features
        user.age * job.popularity,
        user.experience * job.seniority_level,
        
        # CF score
        context.cf_score,
        
        # Semantic similarity
        context.semantic_score,
    ]

# Train
ranker = LGBMRanker(
    objective='lambdarank',
    metric='ndcg',
    n_estimators=100,
    learning_rate=0.1
)

ranker.fit(X_train, y_train, group=query_groups)

# Predict
scores = ranker.predict(X_test)
```

#### 3.2.5 User Embeddings (MEDIUM)

**Tại sao**: Personalization thật sự, không chỉ demographics

**Cách làm**:

```python
import torch
from sentence_transformers import SentenceTransformer

class UserEmbedder:
    def __init__(self, sbert_model):
        self.sbert = sbert_model
        
    def create_user_embedding(self, user_profile):
        # Text representation của user
        user_text = self._profile_to_text(user_profile)
        
        # Encode
        embedding = self.sbert.encode([user_text])[0]
        
        return embedding
    
    def _profile_to_text(self, user):
        parts = [
            f"Tuổi {user.age}",
            f"Kinh nghiệm {user.experience_years} năm",
            f"Trình độ {user.education}",
            f"Kỹ năng: {', '.join(user.skills)}",
            f"Địa điểm: {user.location}",
            f"Lương mong muốn: {user.target_salary} triệu",
        ]
        
        if user.work_history:
            parts.append(f"Lịch sử: {', '.join(user.work_history)}")
            
        return " | ".join(parts)
    
    def compute_similarity(self, user1, user2):
        emb1 = self.create_user_embedding(user1)
        emb2 = self.create_user_embedding(user2)
        return cosine_similarity([emb1], [emb2])[0][0]

# Usage
embedder = UserEmbedder(sbert_model)
user_vector = embedder.create_user_embedding(current_user)

# Find similar users
similar_users = find_similar_users(user_vector, all_user_embeddings, k=10)
```

---

## 4. DỮ LIỆU CẦN THU THẬP

### 4.1 Minimum Viable Data

| Loại dữ liệu | Số lượng tối thiểu | Mục đích |
|--------------|---------------------|----------|
| User interactions | 1,000 | Train CF |
| Job outcomes (hired/rejected) | 500 | Train ranking |
| User feedback surveys | 100 | Preference learning |
| Job enrichment data | 50% jobs | Improve recommendations |

### 4.2 Target Data Volume

| Loại dữ liệu | Mục tiêu | Độ ưu tiên |
|--------------|----------|------------|
| User interactions | 50,000+ | P0 |
| Job descriptions (full) | 10,000 | P0 |
| Hired outcomes | 5,000 | P1 |
| Risk labels | 5,000 | P1 |
| A/B test results | 10,000/variant | P2 |

### 4.3 Data Schema Mới

```sql
-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    age INT,
    gender VARCHAR(10),
    education VARCHAR(50),
    location VARCHAR(100),
    experience_years INT,
    skills JSON,
    target_salary BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Jobs enriched table
CREATE TABLE jobs_enriched (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200),
    company VARCHAR(200),
    skills JSON,
    salary_min BIGINT,
    salary_max BIGINT,
    location VARCHAR(100),
    description_full TEXT,
    requirements JSON,
    benefits JSON,
    company_size VARCHAR(20),
    company_industry VARCHAR(100),
    company_rating DECIMAL(2,1),
    work_environment VARCHAR(50),
    career_growth VARCHAR(20),
    training_provided BOOLEAN,
    remote_policy VARCHAR(20),
    embedding VECTOR(384),
    created_at TIMESTAMP
);

-- Interactions table
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    job_id VARCHAR(50),
    action VARCHAR(20),
    view_duration_seconds INT,
    scroll_depth DECIMAL(3,2),
    device VARCHAR(20),
    time_of_day VARCHAR(20),
    day_of_week VARCHAR(20),
    timestamp TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs_enriched(id)
);

-- Outcomes table (for training)
CREATE TABLE outcomes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    job_id VARCHAR(50),
    status VARCHAR(20), -- applied, interviewed, hired, rejected
    applied_at TIMESTAMP,
    outcome_at TIMESTAMP,
    outcome VARCHAR(20) -- hired, rejected, withdrawn
);
```

---

## 5. LỘ TRÌNH PHÁT TRIỂN

### 5.1 Phase 1: Nền Tảng - Interaction Data Collection

> **Thời gian**: Week 1-2
> **Mục tiêu**: Thu thập đầy đủ interaction data để train ML models

---

#### 5.1.1 PHÂN TÍCH HIỆN TRẠNG BACKEND

**Đã có** ✅
```
backend/src/
├── models/interactionModel.js        # Schema + CRUD operations
├── services/interactionService.js    # Business logic
├── controllers/interactionController.js  # API handlers
└── routes/v1/interactionRoute.js    # API routes
```

**Schema hiện tại** (`interactionModel.js`):
```javascript
{
  userId: String,          // ✅ Có
  jobId: String,           // ✅ Có
  action: String,          // ✅ click, view, apply, bookmark, skip
  context: {              // ✅ Cơ bản
    page: String,
    position: Number,
    sessionId: String,
    referrer: String
  },
  viewDuration: Number,    // ✅ Có
  metadata: Object,        // ✅ Job info
  device: Object,          // ✅ Platform, browser
  createdAt: Date          // ✅ Timestamp
}
```

**Thiếu** ❌ (cần bổ sung):
```
1. Implicit feedback signals:
   - scroll_depth (0-1)
   - return_visit (boolean)
   - hover_duration (number)
   - search_refine (boolean)

2. Context enrichment:
   - time_of_day (morning/afternoon/evening/night)
   - day_of_week (monday-sunday)
   - session_duration (number)
   - previous_interactions_count (number)

3. Outcome tracking:
   - applied_at (timestamp)
   - interviewed_at (timestamp)
   - hired_at (timestamp)
   - rejected_at (timestamp)

4. Feature flags:
   - recommendation_position (1-20)
   - recommendation_method (cf/content/semantic)
   - experiment_variant (A/B test)
```

---

#### 5.1.2 CÁC BƯỚC CẦN THỰC HIỆN

**Bước 1: Mở rộng Backend Schema**

```javascript
// File: backend/src/models/interactionModel.js
// Thêm vào INTERACTION_COLLECTION_SCHEMA

// Implicit feedback signals
scrollDepth: Joi.number().min(0).max(1).default(0),
hoverDuration: Joi.number().integer().min(0).default(0),
returnVisit: Joi.boolean().default(false),
searchRefine: Joi.boolean().default(false),

// Enhanced context
timeOfDay: Joi.string().valid('morning', 'afternoon', 'evening', 'night'),
dayOfWeek: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
sessionDuration: Joi.number().integer().min(0).default(0),
previousInteractionsCount: Joi.number().integer().min(0).default(0),

// Feature flags for experimentation
recommendationPosition: Joi.number().integer().min(1).max(50),
recommendationMethod: Joi.string().valid('cf', 'content', 'semantic', 'hybrid'),
experimentVariant: Joi.string().allow('', null),

// Outcome tracking (nullable - fill later)
appliedAt: Joi.date().timestamp('javascript').allow(null),
interviewedAt: Joi.date().timestamp('javascript').allow(null),
hiredAt: Joi.date().timestamp('javascript').allow(null),
rejectedAt: Joi.date().timestamp('javascript').allow(null),
```

**Bước 2: Tạo Frontend Tracking Service**

```javascript
// File: frontend/src/services/interactionTracker.js

class InteractionTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.viewStartTimes = new Map(); // jobId -> timestamp
    this.viewedJobs = new Set();
    
    // Debounce for performance
    this.debouncedTrack = this.debounce(this.trackEvent.bind(this), 500);
    
    // Auto-track on mount
    this.initAutoTracking();
  }
  
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // ============================================
  // CORE TRACKING METHODS
  // ============================================
  
  async trackEvent(eventType, data) {
    const event = {
      userId: data.userId,
      jobId: data.jobId,
      action: eventType,
      context: {
        page: window.location.pathname,
        position: data.position || 0,
        sessionId: this.sessionId,
        referrer: document.referrer
      },
      viewDuration: data.viewDuration || this.getViewDuration(data.jobId),
      scrollDepth: data.scrollDepth || this.getScrollDepth(),
      device: {
        platform: navigator.platform,
        browser: navigator.userAgent
      },
      // Enhanced context
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: this.getDayOfWeek(),
      sessionDuration: (Date.now() - this.sessionStart) / 1000,
      previousInteractionsCount: data.previousInteractionsCount || 0,
      // Feature flags
      recommendationPosition: data.position || 0,
      recommendationMethod: data.method || 'unknown',
      experimentVariant: window.EXPERIMENT_VARIANT || null
    };
    
    // Send to backend
    try {
      await fetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('[InteractionTracker] Failed to track:', error);
    }
  }
  
  // ============================================
  // AUTO-TRACKING METHODS
  // ============================================
  
  initAutoTracking() {
    // Track scroll depth
    window.addEventListener('scroll', this.debounce(() => {
      this.currentScrollDepth = this.calculateScrollDepth();
    }, 200));
    
    // Track visibility changes (for view duration)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.resumeViewTracking();
      } else {
        this.pauseViewTracking();
      }
    });
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.flushPendingEvents();
    });
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  calculateScrollDepth() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    
    if (documentHeight <= windowHeight) return 1;
    
    const scrollable = documentHeight - windowHeight;
    return Math.min(1, scrollTop / scrollable);
  }
  
  getViewDuration(jobId) {
    const startTime = this.viewStartTimes.get(jobId);
    if (!startTime) return 0;
    return (Date.now() - startTime) / 1000;
  }
  
  getScrollDepth() {
    return this.currentScrollDepth || 0;
  }
  
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }
  
  getDayOfWeek() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }
  
  // ============================================
  // CONVENIENCE METHODS
  // ============================================
  
  trackView(jobId, userId, position, method) {
    this.viewStartTimes.set(jobId, Date.now());
    this.trackEvent('view', { jobId, userId, position, method });
  }
  
  trackClick(jobId, userId, position, method) {
    const viewDuration = this.getViewDuration(jobId);
    const scrollDepth = this.getScrollDepth();
    this.trackEvent('click', { 
      jobId, userId, position, method, viewDuration, scrollDepth 
    });
  }
  
  trackApply(jobId, userId, position, method) {
    this.trackEvent('apply', { jobId, userId, position, method });
  }
  
  trackBookmark(jobId, userId, position, method) {
    this.trackEvent('bookmark', { jobId, userId, position, method });
  }
  
  trackSkip(jobId, userId, position, method) {
    this.trackEvent('skip', { jobId, userId, position, method });
  }
  
  flushPendingEvents() {
    // Flush any pending events to localStorage for retry
    const pending = Array.from(this.pendingEvents || []);
    if (pending.length > 0) {
      localStorage.setItem('pending_interactions', JSON.stringify(pending));
    }
  }
}

// Export singleton
export const interactionTracker = new InteractionTracker();
```

**Bước 3: Tạo React Hooks cho Frontend**

```javascript
// File: frontend/src/hooks/useInteractionTracker.js

import { useEffect, useCallback, useRef } from 'react';
import { interactionTracker } from '../services/interactionTracker';

export const useInteractionTracker = (userId, options = {}) => {
  const { 
    autoTrackView = true,
    autoTrackClick = true,
    debounceMs = 500
  } = options;
  
  const trackedJobs = useRef(new Set());
  
  // Track job view
  const trackView = useCallback((jobId, position, method) => {
    if (!trackedJobs.current.has(jobId)) {
      trackedJobs.current.add(jobId);
      interactionTracker.trackView(jobId, userId, position, method);
    }
  }, [userId]);
  
  // Track job click
  const trackClick = useCallback((jobId, position, method) => {
    interactionTracker.trackClick(jobId, userId, position, method);
  }, [userId]);
  
  // Track apply
  const trackApply = useCallback((jobId, position, method) => {
    interactionTracker.trackApply(jobId, userId, position, method);
  }, [userId]);
  
  // Track bookmark
  const trackBookmark = useCallback((jobId, position, method) => {
    interactionTracker.trackBookmark(jobId, userId, position, method);
  }, [userId]);
  
  // Track skip (job scrolled past without click)
  const trackSkip = useCallback((jobId, position, method) => {
    interactionTracker.trackSkip(jobId, userId, position, method);
  }, [userId]);
  
  return {
    trackView,
    trackClick,
    trackApply,
    trackBookmark,
    trackSkip
  };
};

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Job Card Component
/*
import { useInteractionTracker } from '../hooks/useInteractionTracker';

const JobCard = ({ job, position, method }) => {
  const { trackView, trackClick, trackSkip } = useInteractionTracker(job.userId);
  const cardRef = useRef();
  
  useEffect(() => {
    // Track view when card is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackView(job.id, position, method);
        } else if (entry.boundingClientRect.top < 0) {
          // User scrolled past (skip)
          trackSkip(job.id, position, method);
        }
      },
      { threshold: 0.5 }
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => observer.disconnect();
  }, [job.id]);
  
  return (
    <div ref={cardRef} onClick={() => trackClick(job.id, position, method)}>
      <h3>{job.title}</h3>
      <p>{job.company}</p>
    </div>
  );
};
*/

// Example 2: Job List Component
/*
const JobList = ({ jobs, method }) => {
  const { trackView, trackClick } = useInteractionTracker(currentUserId);
  
  return (
    <div>
      {jobs.map((job, index) => (
        <JobCard
          key={job.id}
          job={job}
          position={index + 1}
          method={method}
          onView={() => trackView(job.id, index + 1, method)}
          onClick={() => trackClick(job.id, index + 1, method)}
        />
      ))}
    </div>
  );
};
*/
```

**Bước 4: Tạo Outcome Tracking**

```javascript
// File: backend/src/services/outcomeTracker.js

// Theo dõi outcome (hired/rejected) để train model
const trackOutcome = async (userId, jobId, outcome) => {
  const updateData = {
    $set: {}
  };
  
  switch (outcome) {
    case 'applied':
      updateData.$set.appliedAt = new Date();
      break;
    case 'interviewed':
      updateData.$set.interviewedAt = new Date();
      break;
    case 'hired':
      updateData.$set.hiredAt = new Date();
      // Strong positive signal - update interaction weight
      await interactionModel.createNew({
        userId,
        jobId,
        action: 'hired',
        weight: 10.0,
        metadata: { outcome: true }
      });
      break;
    case 'rejected':
      updateData.$set.rejectedAt = new Date();
      // Negative signal - useful for learning
      await interactionModel.createNew({
        userId,
        jobId,
        action: 'rejected',
        weight: -1.0,
        metadata: { outcome: false }
      });
      break;
    case 'withdrawn':
      updateData.$set.withdrawnAt = new Date();
      break;
  }
  
  // Update the interaction record
  await GET_DB().collection('user_interactions').updateOne(
    { userId, jobId },
    updateData
  );
};
```

**Bước 5: API Endpoints cần thêm**

```javascript
// File: backend/src/routes/v1/interactionRoute.js

// POST /v1/interactions/batch - Batch track multiple events
router.post('/batch', interactionController.createBatchInteractions);

// PUT /v1/interactions/:id/outcome - Update outcome
router.put('/:id/outcome', interactionController.updateOutcome);

// GET /v1/interactions/stats/dashboard - Dashboard stats
router.get('/stats/dashboard', interactionController.getDashboardStats);

// GET /v1/interactions/export - Export for ML training
router.get('/export', interactionController.exportForML);
```

---

#### 5.1.3 CHECKLIST PHASE 1

```
PHASE 1: INTERACTION DATA COLLECTION

□ Bước 1: Mở rộng Backend Schema
  □ Thêm implicit feedback fields
  □ Thêm enhanced context fields
  □ Thêm outcome tracking fields
  □ Thêm feature flags
  □ Update Joi validation

□ Bước 2: Tạo Frontend Tracking Service
  □ Tạo InteractionTracker class
  □ Implement auto-scroll tracking
  □ Implement visibility tracking
  □ Implement debouncing
  □ Add error handling + retry

□ Bước 3: Tạo React Hooks
  □ useInteractionTracker hook
  □ useJobView hook
  □ useJobClick hook
  □ Example components

□ Bước 4: Tạo Outcome Tracking
  □ Track applied_at
  □ Track interviewed_at
  □ Track hired_at
  □ Track rejected_at

□ Bước 5: API Endpoints mới
  □ POST /batch
  □ PUT /:id/outcome
  □ GET /stats/dashboard
  □ GET /export

□ Bước 6: Integration
  □ Tích hợp vào JobCard component
  □ Tích hợp vào JobList component
  □ Tích hợp vào Apply flow
  □ Tích hợp vào Dashboard

□ Bước 7: Testing
  □ Unit test tracking service
  □ Integration test với backend
  □ Manual testing flow

□ Bước 8: Documentation
  □ Hướng dẫn sử dụng
  □ API documentation
  □ Schema documentation
```

---

#### 5.1.4 MỤC TIÊU ĐẦU RA PHASE 1

| Metric | Target | Deadline |
|--------|--------|----------|
| Interactions / day | 500+ | End of Week 1 |
| Interactions / week | 3,500+ | End of Week 2 |
| Total interactions | 5,000+ | End of Phase 1 |
| Unique users | 500+ | End of Phase 1 |
| Jobs tracked | 2,000+ | End of Phase 1 |
| Outcome events | 100+ | End of Phase 1 |

---

#### 5.1.5 DỮ LIỆU CẦN THU THẬP (CHI TIẾT)

```typescript
// Minimum viable interaction record
interface InteractionRecord {
  // Required
  userId: string;           // User identifier
  jobId: string;            // Job identifier
  action: 'view' | 'click' | 'apply' | 'bookmark' | 'skip';
  
  // Timestamps
  createdAt: Date;
  
  // Context
  context: {
    page: string;           // e.g., "/jobs/search"
    position: number;      // 1-20 (ranking position)
    sessionId: string;
    referrer: string;
  };
  
  // Implicit feedback (quan trọng cho ML)
  viewDuration: number;     // seconds
  scrollDepth: number;      // 0-1
  returnVisit: boolean;    // visited this job before?
  
  // Device info
  device: {
    platform: string;       // "Win32", "MacIntel", etc.
    browser: string;       // User agent
  };
  
  // Enhanced context
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'monday' | 'tuesday' | ... | 'sunday';
  sessionDuration: number;  // seconds in session
  previousInteractionsCount: number;
  
  // Feature flags (for experimentation)
  recommendationPosition: number;
  recommendationMethod: 'cf' | 'content' | 'semantic' | 'hybrid';
  experimentVariant: string | null;
  
  // Outcome (nullable - fill later)
  appliedAt: Date | null;
  interviewedAt: Date | null;
  hiredAt: Date | null;
  rejectedAt: Date | null;
}
```

---

#### 5.1.6 CÁCH SỬ DỤNG DATA SAU KHI THU THẬP

```python
# ai-service/scripts/ml/train_cf_from_interactions.py

import pandas as pd
from collections import defaultdict

# Load interactions from MongoDB (export to CSV)
def load_interactions():
    # Connect to MongoDB and export
    # Or load from exported CSV
    return pd.read_csv('data/interactions_export.csv')

def prepare_cf_training_data(interactions_df):
    """
    Convert interactions to user-job ratings for CF training
    """
    # Aggregate by user-job pair
    aggregated = interactions_df.groupby(['userId', 'jobId']).agg({
        'action': lambda x: x.value_counts().index[0],  # Most common action
        'viewDuration': 'mean',
        'scrollDepth': 'mean',
        'createdAt': 'count'  # Number of interactions
    }).reset_index()
    
    # Create rating score
    action_weights = {
        'apply': 5.0,
        'bookmark': 4.0,
        'click': 2.0,
        'view': 1.0,
        'skip': 0.0
    }
    
    aggregated['rating'] = aggregated.apply(
        lambda row: (
            action_weights.get(row['action'], 1.0) +
            (row['viewDuration'] / 60) * 0.5 +  # View duration bonus
            (row['scrollDepth']) * 0.3 +          # Scroll depth bonus
            (row['createdAt'] - 1) * 0.2          # Repeat interaction bonus
        ),
        axis=1
    )
    
    # Normalize to 1-5 scale
    aggregated['rating'] = aggregated['rating'].clip(1, 5)
    
    return aggregated[['userId', 'jobId', 'rating']]

def prepare_ltr_training_data(interactions_df, jobs_df, users_df):
    """
    Create features for Learning-to-Rank training
    """
    # Merge data
    df = interactions_df.merge(jobs_df, on='jobId')
    df = df.merge(users_df, on='userId')
    
    # Create features
    df['clicked'] = (df['action'] == 'click').astype(int)
    df['applied'] = (df['action'] == 'apply').astype(int)
    df['label'] = df['applied'] * 2 + df['clicked']  # 0, 1, 2, 3
    
    # Feature columns
    feature_cols = [
        'position',          # Recommendation position
        'viewDuration',       # Engagement
        'scrollDepth',        # Engagement
        'salary_match',       # Job fit
        'skill_match',        # Job fit
        'location_match',     # Job fit
        'user_age',           # User feature
        'user_experience',    # User feature
    ]
    
    return df[feature_cols + ['label', 'userId']]  # userId for grouping

# Usage
if __name__ == '__main__':
    interactions = load_interactions()
    
    # For Collaborative Filtering
    cf_data = prepare_cf_training_data(interactions)
    cf_data.to_csv('data/processed/cf_training_data.csv', index=False)
    print(f"CF training data: {len(cf_data)} records")
    
    # For Learning-to-Rank
    jobs = pd.read_csv('data/jobs.csv')
    users = pd.read_csv('data/workers.csv')
    ltr_data = prepare_ltr_training_data(interactions, jobs, users)
    ltr_data.to_csv('data/processed/ltr_training_data.csv', index=False)
    print(f"LTR training data: {len(ltr_data)} records")
```

---

### 5.1.6 PHASE 1.5: JOB DATA ENRICHMENT

> **Mục tiêu**: Cải thiện chất lượng job data để tăng accuracy của recommendation system
> **Thời gian**: 1-2 tuần
> **Priority**: CRITICAL (nếu chưa có)

---

### 5.1.6.1 PHÂN TÍCH HIỆN TRẠNG

**Cấu trúc job data hiện tại** (`jobs.csv`):

| Column | Type | Status | Issues |
|--------|------|--------|--------|
| id | string | ✅ OK | Unique identifier |
| title | string | ⚠️ Limited | Thiếu standardized titles |
| company | string | ⚠️ Missing | Nhiều job không có company |
| skills | string | ⚠️ Incomplete | Skills không đầy đủ |
| location | string | ⚠️ Dirty | "Hồ Chí Minh" vs "TP HCM" |
| salary_min/max | int | ⚠️ Inconsistent | Đơn vị không đồng nhất (VND vs triệu) |
| type | string | ✅ OK | full-time/part-time |
| description | string | ❌ Missing | Nhiều job không có description |
| category | string | ⚠️ Dirty | Nhiều giá trị "other" |
| **Thiếu hoàn toàn** | | | |
| requirements | array | ❌ Missing | Yêu cầu công việc |
| benefits | array | ❌ Missing | Phúc lợi |
| company_size | string | ❌ Missing | Quy mô công ty |
| company_industry | string | ❌ Missing | Ngành công ty |
| work_environment | string | ❌ Missing | Môi trường làm việc |
| career_growth | string | ❌ Missing | Cơ hội thăng tiến |
| remote_policy | string | ❌ Missing | Remote/hybrid/onsite |
| hiring_speed | string | ❌ Missing | Tốc độ tuyển dụng |
| training_provided | bool | ❌ Missing | Có đào tạo không |
| embedding | vector | ❌ Missing | Pre-computed job embeddings |

---

### 5.1.6.2 QUY TRÌNH KỸ THUẬT

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JOB DATA ENRICHMENT PIPELINE                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   RAW DATA   │───▶│  CLEANING    │───▶│  ENRICHING   │───▶│   STORAGE   │
│   (10k jobs) │    │  & PARSING   │    │  & INFER     │    │  (MongoDB)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                   │
                           ▼                   ▼
                    ┌──────────────┐    ┌──────────────┐
                    │ Normalize    │    │ LLM-based    │
                    │ Salary       │    │ Extraction   │
                    │ Location      │    │ (Gemini API) │
                    │ Skills        │    └──────────────┘
                    └──────────────┘           │
                                             ▼
                                      ┌──────────────┐
                                      │ Vector       │
                                      │ Embeddings   │
                                      │ (SBERT)      │
                                      └──────────────┘
```

#### Bước 1: Data Cleaning & Normalization

```python
# ai-service/scripts/enrichment/1_clean_job_data.py

import pandas as pd
import re
from typing import Dict, List, Tuple

class JobDataCleaner:
    """Clean và normalize job data"""
    
    # Location mapping (handle aliases)
    LOCATION_MAPPING = {
        'hcm': 'Hồ Chí Minh',
        'tp hcm': 'Hồ Chí Minh',
        'ho chi minh': 'Hồ Chí Minh',
        'tphcm': 'Hồ Chí Minh',
        'hanoi': 'Hà Nội',
        'ha noi': 'Hà Nội',
        'hn': 'Hà Nội',
        # ... thêm các tỉnh thành khác
    }
    
    # Skill normalization
    SKILL_MAPPING = {
        'ms excel': 'Excel',
        'excel': 'Excel',
        'ms word': 'Word',
        'word': 'Word',
        'powerpoint': 'PowerPoint',
        # ... thêm mapping
    }
    
    def normalize_salary(self, salary_str: str) -> Tuple[int, int]:
        """Normalize salary về đơn vị VND"""
        if not salary_str:
            return 0, 0
        
        # Extract numbers
        numbers = re.findall(r'[\d,.]+', salary_str)
        if not numbers:
            return 0, 0
        
        # Convert to VND
        numbers = [float(n.replace(',', '.')) for n in numbers]
        
        # Detect unit (triệu, USD, VND)
        if 'triệu' in salary_str.lower() or 'tr' in salary_str.lower():
            numbers = [n * 1_000_000 for n in numbers]
        elif 'usd' in salary_str.lower():
            numbers = [n * 25_000 for n in numbers]  # ~25k VND/USD
        
        return min(numbers) if len(numbers) > 0 else 0, \
               max(numbers) if len(numbers) > 1 else numbers[0] if numbers else 0
    
    def normalize_location(self, location: str) -> str:
        """Normalize location names"""
        if not location:
            return 'Khác'
        
        location_lower = location.lower().strip()
        
        # Check mapping
        for key, value in self.LOCATION_MAPPING.items():
            if key in location_lower:
                return value
        
        return location.strip()
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract skills từ text"""
        # Common patterns
        skill_patterns = [
            r'\b(Excel|Word|PowerPoint)\b',
            r'\b(Python|Java|JavaScript|SQL|R)\b',
            r'\b(Photoshop|Illustrator|Canva)\b',
            # ... thêm patterns
        ]
        
        skills = []
        for pattern in skill_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            skills.extend(matches)
        
        return list(set(skills))
    
    def clean_title(self, title: str) -> str:
        """Clean job title"""
        if not title:
            return 'Unknown'
        
        # Remove emojis
        title = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF]', '', title)
        
        # Remove special chars
        title = re.sub(r'[^\w\s\-]', '', title)
        
        # Normalize whitespace
        title = ' '.join(title.split())
        
        return title.strip()
    
    def process_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process entire dataframe"""
        df = df.copy()
        
        # Clean columns
        df['title_clean'] = df['title'].apply(self.clean_title)
        df['location_normalized'] = df['location'].apply(self.normalize_location)
        
        # Normalize salary
        salary_pairs = df.apply(
            lambda row: self.normalize_salary(
                str(row.get('salary_min', '')) + ' ' + str(row.get('salary_max', ''))
            ), axis=1
        )
        df['salary_min_vnd'] = salary_pairs.apply(lambda x: x[0])
        df['salary_max_vnd'] = salary_pairs.apply(lambda x: x[1])
        
        # Extract skills
        df['skills_extracted'] = df.apply(
            lambda row: self.extract_skills(
                str(row.get('title', '')) + ' ' + str(row.get('description', ''))
            ), axis=1
        )
        
        return df
```

#### Bước 2: LLM-based Information Extraction

```python
# ai-service/scripts/enrichment/2_llm_extraction.py

from typing import Dict, List
from openai import OpenAI
import anthropic
import json
from tenacity import retry, stop_after_attempt

class JobEnricherLLM:
    """
    Use LLM to extract/enrich job information
    Supports multiple LLM providers: OpenAI, Anthropic (Claude), Gemini
    """
    
    def __init__(self, provider='gemini', api_key=None):
        self.provider = provider
        
        if provider == 'openai':
            self.client = OpenAI(api_key=api_key)
            self.model = 'gpt-4-turbo'
        elif provider == 'anthropic':
            self.client = anthropic.Anthropic(api_key=api_key)
            self.model = 'claude-3-sonnet-20240229'
        elif provider == 'gemini':
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.client = genai
            self.model = 'gemini-pro'
    
    def create_extraction_prompt(self, job_data: Dict) -> str:
        """Create prompt for job information extraction"""
        return f"""
Bạn là chuyên gia phân tích tin tuyển dụng Việt Nam.
Hãy trích xuất thông tin từ tin tuyển dụng sau:

TIÊU ĐỀ: {job_data.get('title', '')}
MÔ TẢ: {job_data.get('description', '')}
CÔNG TY: {job_data.get('company', '')}
NGÀNH: {job_data.get('category', '')}

Trả về JSON với các fields sau:
{{
    "job_summary": "Tóm tắt 2-3 câu về công việc",
    "key_responsibilities": [" trách nhiệm 1", "trách nhiệm 2"],
    "requirements": ["yêu cầu 1", "yêu cầu 2"],
    "benefits": ["phúc lợi 1", "phúc lợi 2"],
    "skills_required": ["kỹ năng 1", "kỹ năng 2"],
    "soft_skills": ["kỹ năng mềm 1"],
    "experience_level": "junior|mid|senior|manager",
    "education_level": "high_school|college|university|master",
    "company_size": "startup|small|medium|large|enterprise",
    "company_industry": "ngành công nghiệp cụ thể",
    "work_environment": "office|remote|hybrid|field",
    "career_growth": "fast|medium|slow",
    "training_provided": true|false,
    "remote_policy": "remote|hybrid|onsite",
    "hiring_urgency": "urgent|normal|slow"
}}

CHỈ TRẢ LỜI JSON, không giải thích gì thêm.
"""
    
    @retry(stop=stop_after_attempt(3))
    def extract_job_info(self, job_data: Dict) -> Dict:
        """Extract information from a single job"""
        prompt = self.create_extraction_prompt(job_data)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1
                )
                result = response.choices[0].message.content
                
            elif self.provider == 'anthropic':
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}]
                )
                result = response.content[0].text
                
            elif self.provider == 'gemini':
                model = self.client.GenerativeModel(self.model)
                response = model.generate_content(prompt)
                result = response.text
            
            return json.loads(result)
            
        except Exception as e:
            print(f"LLM extraction failed: {e}")
            return {}
    
    def process_batch(self, jobs: List[Dict], batch_size: int = 10) -> List[Dict]:
        """
        Process multiple jobs with rate limiting
        Returns enriched job data
        """
        enriched_jobs = []
        
        for i in range(0, len(jobs), batch_size):
            batch = jobs[i:i+batch_size]
            
            for job in batch:
                enriched = self.extract_job_info(job)
                enriched_jobs.append({**job, **enriched})
            
            # Rate limiting
            time.sleep(1)  # 1 request/second
            
            if (i + batch_size) % 100 == 0:
                print(f"Processed {i + batch_size}/{len(jobs)} jobs")
        
        return enriched_jobs
```

#### Bước 3: Vector Embeddings

```python
# ai-service/scripts/enrichment/3_compute_embeddings.py

from sentence_transformers import SentenceTransformer
import numpy as np
import pandas as pd

class JobEmbedder:
    """
    Compute job embeddings for semantic search
    Uses multilingual SBERT model optimized for Vietnamese
    """
    
    def __init__(self, model_name='paraphrase-multilingual-MiniLM-L12-v2'):
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
    
    def create_job_text(self, job: Dict) -> str:
        """Combine job fields into text for embedding"""
        parts = [
            job.get('title', ''),
            job.get('company', ''),
            job.get('category', ''),
            job.get('description', ''),
            ' '.join(job.get('skills_required', [])),
            ' '.join(job.get('requirements', [])),
            job.get('job_summary', ''),
            job.get('company_industry', ''),
        ]
        return ' | '.join(filter(None, parts))
    
    def compute_embeddings(self, jobs: List[Dict], batch_size: int = 32) -> np.ndarray:
        """Compute embeddings for all jobs"""
        texts = [self.create_job_text(job) for job in jobs]
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        return embeddings
    
    def save_embeddings(self, jobs: List[Dict], embeddings: np.ndarray, output_path: str):
        """Save embeddings with job IDs"""
        df = pd.DataFrame({
            'job_id': [job['id'] for job in jobs],
            'embedding': [emb.tolist() for emb in embeddings]
        })
        df.to_parquet(output_path, engine='pyarrow')
        
        # Also save metadata
        metadata = {
            'model': self.model_name,
            'embedding_dim': self.embedding_dim,
            'num_jobs': len(jobs),
            'created_at': pd.Timestamp.now().isoformat()
        }
        
        import json
        with open(output_path.replace('.parquet', '_metadata.json'), 'w') as f:
            json.dump(metadata, f)
    
    def load_embeddings(self, path: str) -> Tuple[pd.DataFrame, Dict]:
        """Load embeddings from disk"""
        df = pd.read_parquet(path)
        metadata_path = path.replace('.parquet', '_metadata.json')
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        return df, metadata
    
    def find_similar_jobs(self, job_id: str, df: pd.DataFrame, top_k: int = 10) -> List[Dict]:
        """Find similar jobs using cosine similarity"""
        job_emb = np.array(df[df['job_id'] == job_id]['embedding'].iloc[0])
        all_embs = np.array(df['embedding'].tolist())
        
        # Compute similarities
        similarities = np.dot(all_embs, job_emb) / (
            np.linalg.norm(all_embs, axis=1) * np.linalg.norm(job_emb)
        )
        
        # Get top-k (excluding self)
        top_indices = np.argsort(similarities)[::-1][:top_k+1]
        top_indices = [i for i in top_indices if df.iloc[i]['job_id'] != job_id][:top_k]
        
        return df.iloc[top_indices][['job_id', 'title']].to_dict('records')
```

#### Bước 4: FAISS Indexing (Optional - for production)

```python
# ai-service/scripts/enrichment/4_build_faiss_index.py

import faiss
import numpy as np
import pickle

class JobVectorIndex:
    """
    Build FAISS index for fast similarity search
    Supports: IVF, HNSW, or simple IDMap
    """
    
    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim
        self.index = None
        self.id_map = {}  # Maps index -> job_id
    
    def build_index(self, job_ids: List[str], embeddings: np.ndarray, method='IDMap'):
        """Build FAISS index"""
        embeddings = embeddings.astype('float32')
        
        if method == 'IDMap':
            # Simple approach - for small datasets (<100k)
            self.index = faiss.IndexFlatIP(embedding_dim)  # Inner Product (cosine sim)
            self.index.add(embeddings)
            
        elif method == 'IVF':
            # For larger datasets - inverted file index
            nlist = min(100, len(embeddings) // 10)
            quantizer = faiss.IndexFlatIP(embedding_dim)
            self.index = faiss.IndexIVFFlat(quantizer, embedding_dim, nlist)
            self.index.train(embeddings)
            self.index.add(embeddings)
            
        elif method == 'HNSW':
            # Hierarchical Navigable Small World - very fast
            self.index = faiss.IndexHNSWFlat(embedding_dim, 32)  # 32 neighbors
            self.index.add(embeddings)
        
        # Store ID mapping
        self.id_map = {i: job_id for i, job_id in enumerate(job_ids)}
    
    def save_index(self, path: str):
        """Save index to disk"""
        faiss.write_index(self.index, f"{path}.index")
        with open(f"{path}_idmap.pkl", 'wb') as f:
            pickle.dump(self.id_map, f)
    
    def load_index(self, path: str):
        """Load index from disk"""
        self.index = faiss.read_index(f"{path}.index")
        with open(f"{path}_idmap.pkl", 'rb') as f:
            self.id_map = pickle.load(f)
    
    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[str, float]]:
        """Search for similar jobs"""
        query_embedding = query_embedding.astype('float32')
        
        if hasattr(self.index, 'nprobe'):
            self.index.nprobe = 10  # For IVF index
        
        distances, indices = self.index.search(query_embedding.reshape(1, -1), top_k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx >= 0:  # Valid index
                job_id = self.id_map[idx]
                similarity = float(dist)  # Already cosine similarity for IP
                results.append((job_id, similarity))
        
        return results
```

---

### 5.1.6.3 CÔNG NGHỆ HỖ TRỢ

| Công nghệ | Mục đích | Ưu điểm | Nhược điểm |
|-----------|----------|----------|-------------|
| **LLM (Gemini/OpenAI/Claude)** | Trích xuất thông tin từ description | Accuracy cao, handle unstructured text | Cost cao, rate limiting |
| **SBERT (Sentence Transformers)** | Compute embeddings | Pre-trained, multilingual, fast | Chưa fine-tuned cho job market VN |
| **FAISS (Facebook)** | Vector indexing | Fast similarity search, scalable | Cần rebuild khi thêm data |
| **Pinecone/Weaviate** | Cloud vector DB | Managed, auto-scale | Cost, vendor lock-in |
| **Apache Spark** | Large-scale processing | Distributed, fast | Phức tạp setup |
| **dbt** | Data transformation | Version control, testing | Chỉ transform, không extract |

---

### 5.1.6.4 THÁCH THỨC VÀ GIẢI PHÁP

#### Thách thức 1: Data Quality Inconsistency

```
Vấn đề:
- Salary format không đồng nhất (triệu, VND, USD)
- Location có nhiều aliases ("HCM", "TPHCM", "Hồ Chí Minh")
- Skills không standardized ("MS Excel" vs "Excel" vs "Microsoft Excel")

Giải pháp:
1. Xây dựng comprehensive mapping tables
2. Sử dụng fuzzy matching cho location
3. Normalize skills với skill taxonomy (ESCO, O*NET)
```

```python
# Example: Skill normalization
SKILL_TAXONOMY = {
    'Microsoft Excel': ['excel', 'ms excel', 'excel 365', 'excel for windows'],
    'Python': ['python', 'python3', 'python programming'],
    # ...
}

def normalize_skill(skill: str) -> str:
    skill_lower = skill.lower().strip()
    for canonical, aliases in SKILL_TAXONOMY.items():
        if skill_lower in [a.lower() for a in aliases]:
            return canonical
    return skill.title()  # Default: title case
```

#### Thách thức 2: Missing Descriptions

```
Vấn đề:
- ~60% jobs không có description đầy đủ
- Chỉ có title và skills

Giải pháp:
1. Sử dụng LLM để infer từ title
2. Web scraping để lấy thêm thông tin từ job URL
3. Cross-reference với similar jobs
```

```python
# Infer description từ title
def infer_description(title: str, skills: List[str]) -> str:
    prompt = f"""
    Tạo mô tả công việc hợp lý cho:
    - Vị trí: {title}
    - Kỹ năng: {', '.join(skills)}
    
    Viết 3-5 câu mô tả ngắn gọn.
    """
    # Gọi LLM...
```

#### Thách thức 3: LLM Cost & Rate Limiting

```
Vấn đề:
- 10k jobs x $0.01/job = $100 (OpenAI GPT-4)
- Rate limit: 50-500 requests/minute

Giải pháp:
1. Batch requests (10-50 jobs/request)
2. Cache results để tránh duplicate calls
3. Fallback sang rule-based extraction khi LLM fails
4. Sử dụng cheaper models cho simple extractions
```

```python
# Batch processing với caching
from functools import lru_cache

class CachedJobEnricher:
    def __init__(self):
        self.cache = {}
    
    @lru_cache(maxsize=10000)
    def extract_info(self, title_hash: str, desc_hash: str) -> Dict:
        # Check cache first
        cache_key = f"{title_hash}_{desc_hash}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Extract from LLM
        result = self.llm.extract(...)
        
        # Cache result
        self.cache[cache_key] = result
        return result
```

#### Thách thức 4: Semantic Understanding

```
Vấn đề:
- Public SBERT models không hiểu job market VN tốt
- "Kế toán" vs "Kế toán tổng hợp" vs "Kế toán thuế" → nên similar nhưng không

Giải pháp:
1. Fine-tune SBERT với job-specific data
2. Sử dụng job taxonomy để create embeddings
3. Combine với keyword matching
```

```python
# Fine-tune SBERT
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

# Create training pairs từ job data
training_pairs = [
    InputExample(
        texts=['Kế toán', 'Kế toán tổng hợp'],
        label=0.9  # Similar jobs
    ),
    InputExample(
        texts=['Kế toán', 'Lập trình Python'],
        label=0.1  # Different jobs
    ),
    # ... thêm nhiều pairs
]

# Fine-tune
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
train_dataloader = DataLoader(training_pairs, shuffle=True, batch_size=16)
train_loss = losses.CosineSimilarityLoss(model)

model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=10)
model.save('models/job_sbert_finetuned')
```

#### Thách thức 5: Scalability

```
Vấn đề:
- FAISS index cần rebuild khi thêm jobs
- Embedding computation mất thời gian

Giải pháp:
1. Incremental indexing (thêm job mới vào index cũ)
2. Background job cho embedding computation
3. Distributed embedding với Spark
```

---

### 5.1.6.5 IMPLEMENTATION PLAN

```
WEEK 1: Data Cleaning
├── Day 1-2: Setup preprocessing pipeline
├── Day 3-4: Implement salary/location normalization
└── Day 5: Batch process existing jobs

WEEK 2: LLM Enrichment
├── Day 1-2: Setup LLM API (Gemini)
├── Day 3-4: Implement extraction pipeline
└── Day 5: Process top 1000 jobs as pilot

WEEK 3: Embeddings & Storage
├── Day 1-2: Compute embeddings
├── Day 3-4: Build FAISS index
└── Day 5: Integrate with recommendation system
```

---

### 5.1.6.6 SUCCESS METRICS

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Jobs with skills | 60% | 95% | Auto-extraction |
| Jobs with description | 40% | 80% | LLM inference |
| Jobs with salary | 70% | 95% | Normalization + inference |
| Skill accuracy | N/A | 85% | Manual validation |
| Embedding coverage | 0% | 100% | Batch computation |

---

### 5.1.6.7 COSTS ESTIMATION

| Activity | Volume | Cost | Provider |
|----------|--------|------|----------|
| LLM Extraction | 10,000 jobs | ~$20-50 | Gemini (free tier) |
| Embedding Computation | 10,000 x 384 dim | ~$5 | Local GPU |
| Vector Storage | 10k x 384 x 4 bytes | ~15MB | Local/FAISS |
| Total | - | **~$25-55** | - |

---

### 5.1.6.8 CHECKLIST

```
□ 1. Setup preprocessing pipeline
□ 2. Implement salary normalization
□ 3. Implement location normalization
□ 4. Implement skill normalization (skill taxonomy)
□ 5. Setup LLM API (Gemini/OpenAI)
□ 6. Implement job extraction prompt
□ 7. Add caching layer
□ 8. Batch process 10,000 jobs
□ 9. Compute SBERT embeddings
□ 10. Build FAISS index
□ 11. Update recommendation system
□ 12. Validate results
```

---

### 5.1.6.9 FILES TO CREATE

```
ai-service/scripts/enrichment/
├── 1_clean_job_data.py      # Data cleaning & normalization
├── 2_llm_extraction.py      # LLM-based extraction
├── 3_compute_embeddings.py   # SBERT embeddings
├── 4_build_faiss_index.py   # FAISS indexing
├── skill_taxonomy.json      # Skill normalization mapping
├── location_mapping.json    # Location aliases
└── __init__.py

ai-service/models/
├── job_sbert_finetuned/     # Fine-tuned SBERT model
└── job_faiss.index          # FAISS index
```

---

## 5.2 Phase 2: Core ML (Week 3-6)

```
TODO: [ ] Fine-tune SBERT với job pairs
TODO: [ ] Train SVD cho collaborative filtering
TODO: [ ] Implement vector indexing (FAISS)
TODO: [ ] Train initial LGBMRanker
TODO: [ ] A/B testing framework
```

**Deliverables**:
- [ ] Fine-tuned SBERT model
- [ ] SVD model với latent factors
- [ ] Learning-to-rank model
- [ ] A/B test running

### 5.3 Phase 3: Intelligence (Week 7-12)

```
TODO: [ ] User embeddings system
TODO: [ ] Contextual bandits cho explore/exploit
TODO: [ ] Online learning pipeline
TODO: [ ] Model monitoring & drift detection
TODO: [ ] Feedback loop implementation
```

**Deliverables**:
- [ ] User embeddings
- [ ] Continuous learning active
- [ ] Model monitoring dashboard
- [ ] Production-ready AI/ML system

### 5.4 Gantt Chart

```
Phase 1: Nền tảng       |██████|          (2 weeks)
Phase 2: Core ML        |      |████████|   (4 weeks)
Phase 3: Intelligence   |              |████|  (4 weeks)
                        1   2   3   4   5   6   7   8   9   10
```

---

## 6. QUY TẮC & BEST PRACTICES

### 6.1 Data Collection

```
QUY TẮC 1: Luôn thu thập implicit feedback
- View duration > 30s = positive signal
- Scroll depth > 80% = high interest
- Return visit = strong interest
- Skip after < 5s = negative signal

QUY TẮC 2: Context matters
- Device (mobile users có patterns khác)
- Time of day (work vs personal browsing)
- Day of week (urgent jobs on Monday)

QUY TẮC 3: Outcome labels are gold
- Hired = strongest positive feedback
- Interview = strong positive
- Rejected = learning from failure
- Withdrawn = user changed mind (useful signal)
```

### 6.2 Model Training

```
QUY TẮC 4: Split data properly
- Training: 70%
- Validation: 15%
- Test: 15%
- Temporal split for time-sensitive data

QUY TẮC 5: Evaluation metrics
- Recommendation: MAP@K, NDCG@K, Recall@K
- Classification: Precision, Recall, F1
- Ranking: MRR, AUC

QUY TẮC 6: Avoid overfitting
- Use cross-validation
- Monitor validation loss
- Regularization (L1/L2/dropout)
```

### 6.3 Production Deployment

```
QUY TẮC 7: Shadow mode trước khi switch
1. Deploy new model alongside old
2. Run both, log new model's predictions
3. Compare offline vs online metrics
4. Gradual traffic shift (10% → 50% → 100%)

QUY TẮC 8: Monitoring là bắt buộc
- Prediction distribution
- Feature drift
- Model drift
- Business metrics (CTR, conversion)

QUY TẮC 9: Rollback plan
- Keep old model artifacts
- A/B test before full switch
- Feature flags for quick disable
```

### 6.4 Code Organization

```
QUY TẮC 10: Model versioning
- ai-service/models/v1/
- ai-service/models/v2/
- ai-service/models/production → symlink

QUY TẮC 11: Experiment tracking
- Log hyperparameters
- Log metrics
- Log data versions
- Use MLflow/W&B

QUY TẮC 12: Feature engineering
- Features phải reproducible
- Document feature definitions
- Version control features
```

---

## 7. THEO DÕI TIẾN ĐỘ

### 7.1 Current Status (2026-04-18)

| Component | Status | Notes |
|-----------|--------|-------|
| Job Recommender | ✅ Basic | TF-IDF + hybrid scoring hoạt động |
| Hybrid Recommender | ✅ Basic | TF-IDF + Semantic + CF |
| Semantic Search | ✅ Basic | SBERT pre-trained (chưa fine-tune) |
| Collaborative Filtering | ⚠️ Limited | User-based CF, thiếu SVD |
| Risk Predictor | ⚠️ Offline | XGBoost trained, không retrain |
| **Interaction Tracking Backend** | ✅ **DONE** | Schema mở rộng với ML features |
| **Interaction Tracker Frontend** | ✅ **DONE** | `interactionTracker.js` service |
| **JobCard Integration** | ✅ **DONE** | View/Click/Apply tracking với position + method |
| Job Enrichment | ❌ Partial | Thiếu descriptions |
| Learning-to-Rank | ❌ Missing | Cần implement |
| User Embeddings | ❌ Missing | Cần implement |
| Online Learning | ❌ Missing | Cần implement |
| A/B Testing | ❌ Missing | Cần setup |

**Legend**: ✅ Done | ⚠️ Partial | ❌ Missing

### 7.2 Phase 1 Completed (2026-04-18)

**Backend Changes:**
- `backend/src/models/interactionModel.js` - Mở rộng schema:
  - ✅ Implicit feedback: `scrollDepth`, `hoverDuration`, `returnVisit`, `searchRefine`
  - ✅ Enhanced context: `timeOfDay`, `dayOfWeek`, `sessionDuration`, `previousInteractionsCount`
  - ✅ Feature flags: `recommendationPosition`, `recommendationMethod`, `experimentVariant`
  - ✅ Outcome tracking: `appliedAt`, `interviewedAt`, `hiredAt`, `rejectedAt`
  - ✅ Constants: `RECOMMENDATION_METHODS`, `TIME_OF_DAY`, `DAY_OF_WEEK`
  - ✅ Helper functions: `calculateImplicitFeedbackScore`, `getEngagementLevel`, `inferUserIntent`

**Frontend Changes:**
- `frontend/src/utils/interactionTracker.js` - Tạo mới:
  - ✅ Session management
  - ✅ Auto scroll tracking
  - ✅ Visibility tracking (view duration)
  - ✅ Debounced tracking
  - ✅ Pending queue với retry logic
  - ✅ React hooks (`useInteractionTracker`, `useIntersectionTracker`)

- `frontend/src/components/ai/JobCard.jsx` - Cập nhật:
  - ✅ Props mới: `position`, `method`
  - ✅ Sử dụng `interactionTracker` thay vì direct API calls
  - ✅ View tracking với Intersection Observer
  - ✅ Debounced view tracking

- `frontend/src/components/ai/AIRecommendations.jsx` - Cập nhật:
  - ✅ Truyền `position` (index + 1) khi render JobCard
  - ✅ Truyền `method="hybrid"` để đánh dấu AI recommendation

- `frontend/src/apis/interactionAPI.js` - Cập nhật:
  - ✅ Thêm parameters mới vào `trackInteractionAPI`
  - ✅ Thêm constants: `RECOMMENDATION_METHODS`, `TIME_OF_DAY`

### 7.3 Next Actions

```
IMMEDIATE (Week 1 - Continue):
□ Test interaction tracking với backend
□ Verify data collection in MongoDB
□ Tích hợp tracking vào các page khác (JobDetail, Search, etc.)

SHORT TERM (Week 2-4):
□ Enrich job data với descriptions
□ Fine-tune SBERT với job pairs
□ Train initial SVD model

MEDIUM TERM (Week 5-8):
□ Implement Learning-to-Rank (LambdaMART)
□ Setup A/B testing framework
□ User embeddings system
```
□ Train initial SVD

MEDIUM TERM (Week 5-8):
□ Implement Learning-to-Rank
□ Setup A/B testing
□ User embeddings
```

### 7.3 Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Interactions collected | 50,000 | 0 |
| Job descriptions enriched | 10,000 | ~2,000 |
| Model version | v2.0 | v1.0 |
| A/B tests running | 3 | 0 |
| Online learning active | Yes | No |
| Model refresh frequency | Weekly | Never |

---

## APPENDIX

### A. Useful Commands

```bash
# Train risk model
cd ai-service && python scripts/ml/4_train_risk_model.py

# Generate mock data
cd ai-service && python scripts/generate_mock_data.py

# Run service
cd ai-service && uvicorn main:app --reload

# Check data
cd ai-service && python -c "import pandas as pd; df=pd.read_csv('data/jobs.csv'); print(df.shape)"
```

### B. Key Files

| File | Purpose |
|------|---------|
| `services/hybrid_recommender.py` | Main recommendation logic |
| `services/semantic_search.py` | Semantic embeddings |
| `services/collaborative_filter.py` | CF engine |
| `services/risk_predictor.py` | Risk prediction |
| `data/jobs.csv` | Job database |
| `scripts/ml/*.py` | ML training pipeline |

### C. References

- Sentence-BERT: `paraphrase-multilingual-MiniLM-L12-v2`
- XGBoost for risk prediction
- LightGBM for learning-to-rank
- Surprise library for matrix factorization
- FAISS for vector indexing

---

**Document Version**: 1.0
**Last Updated**: 2026-04-18
**Next Review**: After Phase 1 completion
