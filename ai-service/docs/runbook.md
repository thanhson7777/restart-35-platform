# Course Recommendation Service — Runbook

**Author:** Restart-35
**Date:** 2026-06-06
**Version:** 1.0

---

## 1. Overview

Course Recommendation Service consists of 3 components:

```
Frontend (React) → Backend (Node.js) → AI Service (FastAPI/Python)
```

- **AI Service** (`ai-service/`): CourseRecommendationEngine — skill gap → recommended courses
- **Backend** (`backend/`): Express.js API — feedback tracking, analytics
- **Frontend** (`frontend/`): React UI — feedback buttons, analytics dashboard

---

## 2. Deployment

### 2.1. AI Service (FastAPI)

```bash
cd ai-service

# Install dependencies
pip install -r requirements.txt

# Run tests
python -m pytest tests/test_course_recommendation_engine.py -v
python -m pytest tests/test_course_recommendation_api.py -v

# Start service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2.2. Backend (Node.js)

```bash
cd backend
npm install
npm run dev
```

### 2.3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

### 2.4. Environment Variables

**AI Service** (`.env`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | mongodb://localhost:27017 | MongoDB connection |
| `DATABASE_NAME` | No | restart-35-platform | Database name |
| `GROQ_API_KEY` | No | - | Groq API key for LLM enrichment |
| `EMBEDDING_MODEL` | No | intfloat/multilingual-e5-base | Sentence transformer model |

**Backend** (`.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection |
| `JWT_SECRET` | Yes | JWT signing secret |
| `AI_SERVICE_URL` | Yes | AI service base URL (e.g. http://localhost:8000) |

---

## 3. Monitoring

### 3.1. Health Checks

```bash
# AI service health
curl http://localhost:8000/api/v1/ai/health

# Course recommendation stats
curl http://localhost:8000/api/v1/ai/course-recommendations/stats

# Backend health
curl http://localhost:3000/api/v1/
```

Expected health response:

```json
{
  "status": "healthy",
  "embeddings_loaded": true,
  "embeddings_count": 1500,
  "faiss_available": true,
  "cache_stats": { ... }
}
```

### 3.2. Cache Statistics

Cache stats are available in the health endpoint response under `cache_stats`:

- `embedding_cache.entries`: Number of cached course embeddings
- `synonym_cache.entries`: Number of cached synonym maps
- `result_cache.entries`: Number of cached recommendation results

### 3.3. Logs

Key log messages to watch:

```
[INFO] Cache HIT, returning N cached results  ← Good: cache working
[INFO] FAISS index built: N vectors, dim=D  ← FAISS initialized
[WARNING] FAISS not installed — using numpy cosine similarity  ← FAISS missing
[WARNING] Course embeddings not found — using fallback  ← Embeddings missing
```

---

## 4. Troubleshooting

### 4.1. FAISS Not Installed

**Symptom:** Log shows `FAISS not installed — using numpy cosine similarity`

**Impact:** Semantic reranking 3–5x slower than FAISS. Accuracy unchanged.

**Fix:**

```bash
pip install faiss-cpu

# Or with conda:
conda install -c pytorch faiss-cpu
```

After installing, restart the AI service. FAISS loads automatically.

### 4.2. Course Embeddings Not Found

**Symptom:** `course_embeddings.npy not found` in logs, no courses recommended.

**Fix:**

```bash
# Check data directory
ls ai-service/data/
# Must contain:
#   course_embeddings.npy
#   course_labels.json

# If missing, generate embeddings:
cd ai-service
python scripts/preprocessing/build_course_embeddings.py
```

If the script doesn't exist, create embeddings manually:

```python
# ai-service/scripts/preprocessing/build_course_embeddings.py
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
import numpy as np

model = SentenceTransformer('intfloat/multilingual-e5-base')
client = MongoClient(os.getenv("MONGODB_URI"))
courses = list(client["restart-35-platform"]["courses"].find({}, {"title": 1, "skills": 1}))

texts = [f"{c['title']} {' '.join(c.get('skills', []))}" for c in courses]
embeddings = model.encode(texts)

np.save("data/course_embeddings.npy", embeddings)
import json
with open("data/course_labels.json", "w", encoding="utf-8") as f:
    json.dump([{"course_id": str(c["_id"]), "title": c["title"], "skills": c.get("skills", [])}
               for c in courses], f, ensure_ascii=False)
```

### 4.3. Empty Recommendations

**Symptom:** API returns empty `courses` array.

**Diagnostic steps:**

1. Check embeddings loaded: `GET /api/v1/ai/health` → `embeddings_loaded: true`
2. Check MongoDB courses collection has data:

```javascript
// In mongo shell
db.courses.countDocuments()
```

3. Check skill normalization — skill names must be recognized:

```python
from services.skill_normalizer import SkillNormalizer
n = SkillNormalizer()
print(n.normalize("Excel"))  # Must return "excel"
print(n.normalize("CSKH"))  # Must return normalized form
```

### 4.4. Slow Response Time

**Expected:** < 500ms per recommendation request
**With FAISS:** < 100ms per request

**If slow:**

1. Check if cache is working: logs should show `Cache HIT`
2. Check FAISS is installed: logs should NOT show `FAISS not installed`
3. Check embedding dimension: `faiss_available: true` in health response
4. Check embeddings loaded: `embeddings_count > 0` in health response

### 4.5. Synonym Map Outdated

**Symptom:** Skill like "CSKH" not recognized.

**Fix:**

```bash
# Update synonym map from ESCO
cd ai-service
python scripts/seed_skill_synonyms_from_esco.py

# Force cache refresh (without restart):
python -c "
from services.cache_manager import get_course_cache
cache = get_course_cache()
cache._synonym_cache.clear()
print('Synonym cache cleared')
"
```

---

## 5. Cập nhật và Bảo trì

### 5.1. Cập nhật Synonym Map

Synonym map được cache 6 giờ. Sau khi cập nhật:

```bash
python scripts/seed_skill_synonyms_from_esco.py
# Cache tự clear sau 6h, hoặc restart service
```

### 5.2. Retrain Embeddings

Khi có thêm courses mới:

```bash
python scripts/preprocessing/build_course_embeddings.py
# Restart AI service để load embeddings mới
```

### 5.3. Thay đổi Scoring Weights

Weights được định nghĩa trong `course_recommendation_engine.py` → `_final_ranking()`.
Sau khi thay đổi:

```bash
# Chạy A/B test để xác nhận cải thiện
python scripts/ml/ab_testing.py --days 30 --output ab_results.json
```

---

## 6. Testing Checklist

Sau mỗi deploy, chạy:

```bash
# Unit tests
cd ai-service
python -m pytest tests/test_course_recommendation_engine.py -v

# Integration tests
python -m pytest tests/test_course_recommendation_api.py -v

# Smoke test
curl -X POST http://localhost:8000/api/v1/ai/course-recommendations \
  -H "Content-Type: application/json" \
  -d '{"skill_gaps":[{"skill_name":"Excel","priority":"essential"}],"limit":3}'
# Phải trả 200 với non-empty courses array
```

---

## 7. Performance Benchmarks

| Operation | Expected | FAISS | Numpy fallback |
|-----------|----------|-------|---------------|
| Semantic rerank (1000 courses) | < 50ms | < 10ms | < 200ms |
| Full recommend (5 gaps, 10 results) | < 500ms | < 300ms | < 800ms |
| Cache hit (same request) | < 50ms | < 50ms | < 50ms |

---

## 8. Alerts

Set up alerts for:

- `embeddings_loaded: false` in health check → PagerDuty alert
- Response time > 2s → Log spike notification
- `recommendation_feedback` collection growth stalled → Data pipeline issue
- FAISS `IndexFlatIP` not available → Fallback degradation warning
