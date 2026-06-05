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
