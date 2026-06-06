# ESCO Normalization API Documentation

## Base URL

```
http://localhost:8000/api/v1/esco
```

## Authentication

Currently no authentication required. Add API key middleware as needed.

---

## Endpoints

### Health Check

Check if the ESCO normalization service is healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
    "status": "healthy",
    "service": "esco_normalization"
}
```

---

### Get Statistics

Get ESCO data statistics.

**Endpoint:** `GET /stats`

**Response:**
```json
{
    "num_esco_skills": 13942,
    "threshold": 0.75,
    "ner_model": "models/skill_ner/model-last",
    "embedding_model": "intfloat/multilingual-e5-base",
    "status": "ready"
}
```

---

### Normalize Job

Normalize a single job description to ESCO URIs.

**Endpoint:** `POST /normalize`

**Request Body:**
```json
{
    "job_id": "optional-job-id",
    "title": "Software Developer",
    "description": "Cần người biết Python, Excel và kỹ năng giao tiếp",
    "threshold": 0.75
}
```

**Response:**
```json
{
    "job_id": "optional-job-id",
    "title": "Software Developer",
    "statistics": {
        "total_skills": 3,
        "matched_skills": 3,
        "unmatched_skills": 0,
        "match_rate": 1.0,
        "avg_confidence": 0.8923
    },
    "entities": [
        {
            "text": "Python",
            "start": 14,
            "end": 20,
            "label": "SKILL_TECHNICAL",
            "best_match": {
                "uri": "http://data.europa.eu/esco/skill/...",
                "label": "Python (computer_programming_language)",
                "score": 0.95,
                "match_type": "embedding"
            },
            "esco_matches": [...]
        }
    ],
    "processing_time_ms": 523.4,
    "timestamp": "2026-05-27T10:00:00"
}
```

---

### Normalize and Store

Normalize a job and store to MongoDB.

**Endpoint:** `POST /normalize-and-store`

**Request Body:** Same as `/normalize`

**Response:**
```json
{
    "status": "stored",
    "job_id": "job_abc123",
    "title": "Software Developer",
    "statistics": {
        "total_skills": 3,
        "matched_skills": 3,
        "match_rate": 1.0,
        "avg_confidence": 0.8923
    },
    "processing_time_ms": 567.2
}
```

---

### Get Normalized Job

Get a stored normalized job by ID.

**Endpoint:** `GET /jobs/{job_id}`

**Response:**
```json
{
    "job_id": "job_abc123",
    "title": "Software Developer",
    "description_raw": "...",
    "skills_esco": [
        "http://data.europa.eu/esco/skill/...",
        "http://data.europa.eu/esco/skill/..."
    ],
    "confidence": 0.8923,
    "skills_count": 3,
    "matched_count": 3,
    "match_rate": 1.0,
    "ner_stats": {
        "SKILL_TECHNICAL": 2,
        "SKILL_SOFT": 1
    },
    "created_at": "2026-05-27T10:00:00",
    "updated_at": "2026-05-27T10:00:00"
}
```

**Error (404):**
```json
{
    "detail": "Job job_xyz not found"
}
```

---

### Get Jobs by Skill

Find jobs that contain a specific ESCO skill.

**Endpoint:** `GET /jobs-by-skill/{skill_uri}`

**Query Parameters:**
- `limit` (optional): Max results, default 20, max 100

**Response:**
```json
{
    "skill_uri": "http://data.europa.eu/esco/skill/...",
    "total_jobs": 5,
    "jobs": [
        {
            "job_id": "job_001",
            "title": "Python Developer",
            "skills_count": 5,
            "confidence": 0.87
        }
    ]
}
```

---

### Get Jobs by Multiple Skills

Find jobs containing any or all of the specified ESCO skills.

**Endpoint:** `POST /jobs-by-skills`

**Request Body:**
```json
{
    "skill_uris": [
        "http://data.europa.eu/esco/skill/...",
        "http://data.europa.eu/esco/skill/..."
    ],
    "match_all": false,
    "limit": 20
}
```

**Response:**
```json
{
    "skill_uris": [...],
    "match_all": false,
    "total_jobs": 15,
    "jobs": [...]
}
```

---

### Get Storage Statistics

Get MongoDB storage statistics.

**Endpoint:** `GET /storage-stats`

**Response:**
```json
{
    "total_jobs": 50,
    "with_skills": 48,
    "without_skills": 2,
    "avg_skills_per_job": 4.98,
    "avg_confidence": 0.8273,
    "match_rate": 0.96
}
```

---

### Delete Normalized Job

Delete a stored normalized job.

**Endpoint:** `DELETE /jobs/{job_id}`

**Response:**
```json
{
    "status": "deleted",
    "job_id": "job_abc123"
}
```

**Error (404):**
```json
{
    "detail": "Job job_xyz not found"
}
```

---

### Extract Skills Only

Extract skill entities without ESCO matching (for debugging).

**Endpoint:** `POST /extract-skills`

**Request Body:** Same as `/normalize`

**Response:**
```json
{
    "job_id": "job_001",
    "title": "Software Developer",
    "total_skills": 3,
    "entities": [
        {
            "text": "Python",
            "start": 14,
            "end": 20,
            "label": "SKILL_TECHNICAL"
        }
    ],
    "processing_time_ms": 123.4
}
```

---

### Match Single Skill

Match a single skill text to ESCO URIs.

**Endpoint:** `POST /match-skill`

**Request Parameters:**
- `skill_text` (required): Skill text to match
- `threshold` (optional): Min score, default 0.75

**Response:**
```json
{
    "skill_text": "Python",
    "threshold": 0.75,
    "matches": [
        {
            "uri": "http://data.europa.eu/esco/skill/...",
            "label": "Python (computer_programming_language)",
            "score": 0.95,
            "match_type": "embedding"
        }
    ],
    "total_matches": 1
}
```

---

## Error Responses

All endpoints may return these error responses:

**500 Internal Server Error:**
```json
{
    "detail": "Error message here"
}
```

**400 Bad Request:**
```json
{
    "detail": "Invalid request parameters"
}
```

---

## Rate Limits

Currently no rate limits. Consider adding for production:
- 100 requests/minute per IP
- 1000 requests/minute per API key

---

## Course Recommendation Endpoints

### POST /api/v1/ai/course-recommendations

Gợi ý khóa học dựa trên skill gaps của user.

**Authentication:** Bearer token (JWT)

**Request:**
```json
{
  "skill_gaps": [
    {"skill_name": "Excel", "priority": "essential"},
    {"skill_name": "Word", "priority": "important"},
    {"skill_name": "Python", "priority": "nice_to_have"}
  ],
  "constraints": {
    "isFree": false,
    "maxFee": 2000000,
    "level": "BEGINNER",
    "locationType": "online"
  },
  "limit": 5,
  "target_job_title": "Kế toán"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skill_gaps` | Array | Yes | List of skill gaps with priority |
| `skill_gaps[].skill_name` | String | Yes | Skill name (e.g. "Excel") |
| `skill_gaps[].priority` | String | Yes | `essential`, `important`, `nice_to_have` |
| `constraints` | Object | No | Filter constraints |
| `constraints.isFree` | Boolean | No | Filter free courses only |
| `constraints.maxFee` | Number | No | Maximum fee in VND |
| `constraints.level` | String | No | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `limit` | Number | No | Max courses to return (default: 10, max: 50) |
| `target_job_title` | String | No | Job title context for scoring |

**Response (200 OK):**
```json
{
  "success": true,
  "courses": [
    {
      "course_id": "course_001",
      "title": "Excel Nâng Cao cho Kế Toán",
      "score": 0.87,
      "match_percent": 87,
      "covered_skills": ["excel", "financial_reporting"],
      "fee": 500000,
      "isFree": false,
      "duration": {"value": 4, "unit": "weeks"},
      "level": "INTERMEDIATE",
      "rating": {"average": 4.5, "count": 120},
      "thumbnail": "https://...",
      "reason": "Bổ sung 2/3 kỹ năng cần thiết: Excel (essential), Word (important)"
    }
  ],
  "total": 1,
  "cache_hit": false,
  "embedding_loaded": true,
  "faiss_available": true
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 422 | Validation error — missing or invalid `skill_gaps` |
| 500 | Engine not loaded — embeddings unavailable |
| 503 | MongoDB unavailable for candidate generation |

```json
// 422 — Validation Error
{
  "detail": "skill_gaps must be a non-empty array"
}

// 500 — Engine not loaded
{
  "detail": "Course recommendation engine not initialized"
}
```

**Rate Limit:** 30 requests/minute per user

---

### POST /api/v1/ai/learning-path

Tạo lộ trình học tập nhiều bước dựa trên skill gaps.

**Authentication:** Bearer token (JWT)

**Request:**
```json
{
  "skill_gaps": [
    {"skill_name": "Excel", "priority": "essential"},
    {"skill_name": "Python", "priority": "important"}
  ],
  "courses": [],
  "job_title": "Kế toán",
  "max_steps": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skill_gaps` | Array | Yes | Target skill gaps |
| `courses` | Array | No | Pre-selected courses to include |
| `job_title` | String | No | Job context for learner_fit scoring |
| `max_steps` | Number | No | Max steps in path (default: 5, max: 10) |

**Response (200 OK):**
```json
{
  "success": true,
  "learning_path": {
    "steps": [
      {
        "step": 1,
        "course": {
          "course_id": "course_001",
          "title": "Excel Cơ Bản",
          "covered_skills": ["excel"],
          "fee": 0,
          "duration": {"value": 2, "unit": "weeks"},
          "level": "BEGINNER"
        },
        "skills_covered": ["excel"],
        "skills_remaining": 1,
        "reason": "Bổ sung: Excel (essential)"
      }
    ],
    "total_steps": 1,
    "total_weeks": 2,
    "skills_covered_count": 1,
    "skills_total": 2
  }
}
```

**Rate Limit:** 10 requests/minute per user

---

### GET /api/v1/ai/course-recommendations/stats

Health and statistics for the course recommendation engine.

**Response:**
```json
{
  "success": true,
  "data": {
    "embeddings_loaded": true,
    "embeddings_count": 1500,
    "embedding_dim": 384,
    "faiss_available": true,
    "faiss_index_size": 1500,
    "cache_stats": {
      "embedding_cache": {"entries": 0, "ttl_seconds": 86400},
      "synonym_cache": {"entries": 120, "ttl_seconds": 21600},
      "result_cache": {"entries": 5, "ttl_seconds": 3600}
    }
  }
}
```

---

## Scoring Formula

### Final Score Calculation

```
final_score = (
  essential_coverage × 0.35 +
  important_coverage × 0.25 +
  coverage_count × 0.15 +
  semantic_similarity × 0.15 +
  learner_fit × 0.10
)
```

**Components:**

| Component | Weight | Description |
|-----------|--------|-------------|
| `essential_coverage` | 35% | % essential skill gaps covered by course |
| `important_coverage` | 25% | % important skill gaps covered by course |
| `coverage_count` | 15% | (essential_covered + important_covered) / total_gaps |
| `semantic_similarity` | 15% | FAISS cosine similarity score (0–1) |
| `learner_fit` | 10% | Fit between course level and user profile |

**Priority levels:** `essential` > `important` > `nice_to_have`

---

## Cache Strategy

| Data | TTL | Description |
|------|-----|-------------|
| Course embeddings | 24h | Heavy, rarely changes |
| Synonym map | 6h | Updated occasionally |
| Recommendation results | 1h | Skill gaps stable in short term |
| FAISS index | Rebuild on startup | Rebuilt when embeddings change |

Cache invalidation: automatic via TTL expiry. Manual invalidation available via `/api/v1/ai/course-recommendations/cache/invalidate` endpoint (admin only).

