# ESCO Occupation Translation Scripts

Translate ESCO occupations from English to Vietnamese using GROQ API.

## Overview

This folder contains two scripts for translating ESCO occupation titles:
- **Single Mode** (`translate_esco_occupations.py`): Translates one occupation at a time
- **Batch Mode** (`translate_esco_batch.py`): Translates multiple occupations in one API call

## Setup

### 1. Environment Variables

Make sure your `.env` file contains:

```bash
# Required
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx

# Optional (defaults shown)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=restart35
```

Get your GROQ API key at: https://console.groq.com/keys

### 2. Dependencies

```bash
pip install pymongo python-dotenv groq
```

## Usage

### Check Pending Translations

```bash
cd ai-service

# Single mode stats
python -m scripts.translate_esco_occupations --stats

# Batch mode stats
python -m scripts.translate_esco_batch --stats
```

### Test Translation

```bash
# Test with sample titles
python -m scripts.translate_esco_occupations --test

# Test batch mode
python -m scripts.translate_esco_batch --test
```

### Run Full Translation

```bash
# Single mode (slower but more accurate)
python -m scripts.translate_esco_occupations

# Batch mode (faster - recommended)
python -m scripts.translate_esco_batch
```

### Run with Limits

```bash
# Translate only first 100 occupations
python -m scripts.translate_esco_occupations --limit 100
python -m scripts.translate_esco_batch --limit 100

# Skip first 500 and translate next 100
python -m scripts.translate_esco_occupations --limit 100 --skip 500
```

### Batch Mode Options

```bash
# Change batch size (default: 10)
python -m scripts.translate_esco_batch --batch-size 20
```

## Comparison

| Feature | Single Mode | Batch Mode |
|---------|-------------|-----------|
| Speed | ~2 items/sec | ~20 items/sec |
| Accuracy | Higher | Slightly lower |
| API calls | 1 per item | 1 per batch |
| Memory | Lower | Higher |
| Best for | Testing, small batches | Full translation |

## Progress

The scripts will show progress during execution:

```
============================================================
ESCO Occupation Translation - BATCH MODE
============================================================
Total pending translations: 2942
Batch size: 10 items/call
Processing limit: All
Delay between calls: 0.5s
============================================================

--- Batch 1 (10 items) ---
  [1] Software Developer
       -> Lập trình viên Phần mềm
  [2] Project Manager
       -> Quản lý Dự án
  ...

============================================================
PROGRESS: 100/2942
  Success: 98 | Failed: 2
  Batches: 10 | Rate: 18.5 items/s
  ETA: 2.5 minutes
============================================================
```

## Sample Output

```
--- Batch 15 (10 items) ---
  [1] Agricultural Equipment Design Engineer
       -> Kỹ sư Thiết kế Thiết bị Nông nghiệp
  [2] Software Developer
       -> Lập trình viên Phần mềm
  [3] Data Analyst
       -> Chuyên viên Phân tích Dữ liệu
  ...

============================================================
BATCH TRANSLATION COMPLETE
============================================================
Total processed: 100
Total batches: 10
Success: 98
Failed: 2
Time elapsed: 5.4 minutes
Average rate: 18.5 items/second
============================================================
```

## Retry Failed Items

If some translations fail, you can retry them:

```python
# Reset failed items in MongoDB shell
db.esco_occupations.updateMany(
    { "translationStatus": "llm", "titleVi": null },
    { "$set": { "titleVi": null } }
)

# Then run translation again
python -m scripts.translate_esco_occupations
```

Or programmatically:

```python
from pymongo import MongoClient

client = MongoClient()
db = client["restart35"]

# Reset items that failed
db.esco_occupations.update_many(
    {"titleVi": {"$in": [None, ""]}},
    {"$set": {"translationStatus": "pending"}}
)

print("Reset complete!")
```

## Translation Quality

The scripts use a carefully crafted prompt for Vietnamese job title translation:

- Uses commonly accepted Vietnamese terminology
- Maintains proper job title structure
- Preserves English terms already common in Vietnam (IT, software, manager, etc.)
- Sets `translationStatus` to `"llm"` for tracking

## Troubleshooting

### GROQ API not available

```
ERROR: GROQ API not available
Please set GROQ_API_KEY in your .env file
```

**Solution**: Add `GROQ_API_KEY=gsk_xxx` to your `.env` file.

### MongoDB connection error

```
pymongo.errors.ServerSelectionTimeoutError
```

**Solution**: Make sure MongoDB is running and `MONGODB_URI` is correct.

### Rate limit errors

If you see rate limit errors, increase the delay:

```python
# In script, change:
DELAY_BETWEEN_CALLS = 0.5  # increase to 1.0
```

## Files

| File | Description |
|------|-------------|
| `translate_esco_occupations.py` | Single translation script |
| `translate_esco_batch.py` | Batch translation script |
| `README_TRANSLATION.md` | This file |

## Author

Restart-35 Project
Date: 2026-05-23
