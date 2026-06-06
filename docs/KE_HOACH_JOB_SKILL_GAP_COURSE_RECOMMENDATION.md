# Kế hoạch thực hiện: Job → Skill Gap → Course Recommendation

> **Ngày tạo:** 06/06/2026  
> **Trạng thái:** Đã hoàn thành thiết kế  
> **Dự án:** Restart-35 Platform  
> **Phương pháp:** Hybrid (Synonym + ESCO Taxonomy + Semantic Matching)

---

## Mục lục

1. [Tổng quan phương pháp](#1-tổng-quan-phương-pháp)
2. [Kiến trúc đích tổng quan](#2-kiến-trúc-đích-tổng-quan)
3. [Phase 1 — Nền tảng dữ liệu và mapping](#phase-1--nền-tảng-dữ-liệu-và-mapping)
4. [Phase 2 — AI Service: Skill Normalization và Taxonomy Expansion](#phase-2--ai-service-skill-normalization-và-taxonomy-expansion)
5. [Phase 3 — Backend Orchestration và Frontend Integration](#phase-3--backend-orchestration-và-frontend-integration)
6. [Phase 4 — Ranking Nâng cao, LLM Explanation và Learning Path](#phase-4--ranking-nâng-cao-llm-explanation-và-learning-path)
7. [Phase 5 — Tối ưu và Mở rộng](#phase-5--tối-ưu-và-mở-rộng)
8. [Phase 6 — Testing và Documentation](#phase-6--testing-và-documentation)
9. [Phase 7 — Deployment và Monitoring](#phase-7--deployment-và-monitoring)
10. [Tổng kết lộ trình](#tổng-kết-lộ-trình)

---

## 1. Tổng quan phương pháp

### 1.1. Phương pháp đang chọn

Phương pháp đang được thiết kế là **Hybrid Multi-Layer Course Recommendation**:

- **Gợi ý việc làm** phù hợp với hồ sơ người lao động
- Từ mỗi việc làm, xác định **kỹ năng còn thiếu** (skill gap)
- Từ các kỹ năng còn thiếu, **đề xuất khóa học phù hợp nhất**
- Để tăng chất lượng match, dùng tổ hợp:
  - **Synonym matching** — sửa lệch tên gọi
  - **ESCO taxonomy** — hiểu quan hệ nghề-kỹ năng
  - **Semantic matching** — hiểu gần nghĩa

### 1.2. Luồng cốt lõi

```
User Profile → Job Recommendation → Skill Gap Analysis
→ Skill Normalization → Taxonomy Expansion
→ Course Candidate Generation → Semantic Reranking
→ Final Ranking → Recommended Courses + Reasons
```

### 1.3. Mục tiêu cốt lõi

> Không đề xuất khóa học từ "sở thích chung chung", mà đề xuất khóa học từ **"khoảng trống kỹ năng cụ thể giữa người lao động và công việc mục tiêu"**.

### 1.4. Tại sao phải dùng 3 lớp: Synonym + ESCO Taxonomy + Semantic?

| Lớp | Mục tiêu | Ví dụ |
|---|---|---|
| **Synonym** | Xử lý khác cách gọi, viết tắt, tiếng Việt/tiếng Anh | `CSKH` = `chăm sóc khách hàng` |
| **ESCO Taxonomy** | Hiểu skill cha/con/cùng nhóm nghề | thiếu `xử lý khiếu nại` → mở ra `giải quyết phản hồi`, `chăm sóc KH nâng cao` |
| **Semantic Matching** | Hiểu nghĩa gần nhau dù text khác | `xử lý phàn nàn khách hàng` ≈ `giải quyết khiếu nại trong dịch vụ` |

### 1.5. Điểm mạnh của phương pháp

- Không bị lệ thuộc exact keyword
- Đúng với ngữ cảnh nghề nghiệp (nhờ ESCO)
- Chịu lỗi tốt với dữ liệu thực tế lộn xộn
- Dễ mở rộng về sau (thêm placement success, enterprise demand, trainer quality)

### 1.6. Điểm yếu và giới hạn

- **Synonym** cần được curate thủ công
- **Taxonomy** cần mapping skill-course vào cùng taxonomy
- **Semantic** có thể "na ná" nhưng sai nghiệp vụ — nên dùng để rerank chứ không quyết định duy nhất
- Cần công thức scoring rõ ràng để tránh recommend course dài dòng nhưng không thực dụng

---

## 2. Kiến trúc đích tổng quan

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                            │
│  /pages/AIRecommendationPage.jsx                                             │
│  /pages/JobLearningPathPage.jsx                                               │
│  /components/CourseCard.jsx                                                   │
│  /components/SkillGapSection.jsx                                              │
│  /apis/learningPathAPI.js                                                    │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │ axios / fetch
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  BACKEND Node.js                                                             │
│  /routes/v1/jobRoute.js           → getJobById()                             │
│  /routes/v1/courseRoute.js       → course search/filter                     │
│  NEW: /routes/v1/learningPath.js → orchestration layer                      │
│  NEW: /services/learningPathService.js                                       │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │ axios POST
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  AI SERVICE (FastAPI / Python)                                               │
│                                                                              │
│  EXISTING:                                                                   │
│  /routers/ai.py                    → /recommend-jobs, /skill-gap/esco         │
│  /services/hybrid_skill_gap_engine.py   → skill gap analysis                  │
│  /services/semantic_search.py            → embedding similarity              │
│  /services/skill_matcher.py              → synonym + semantic skill match    │
│  /services/esco_normalizer.py             → ESCO taxonomy matching           │
│                                                                              │
│  NEW:                                                                        │
│  /services/skill_normalizer.py                                               │
│  /services/course_recommendation_engine.py                                   │
│  /services/learning_path_generator.py                                        │
│  /services/course_explainer.py                                              │
│  /routers/course_recommendation.py       → /course-recommendations           │
│  /scripts/seed_skill_synonyms.py                                             │
│  /scripts/ml/build_course_embeddings.py                                      │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  MONGODB                                                                     │
│  courses              → skills, outcomes, title, description, level, fee       │
│  scraped_jobs        → title, skills, requirements, experience                │
│  esco_skills         → isEssentialFor, isOptionalFor, relatedSkills        │
│  skill_synonyms      → synonym map (cần tạo mới)                            │
│  recommendation_feedback → feedback tracking (cần tạo mới)                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Luồng người dùng end-to-end

```
Bước 1: User mở trang AI Recommendation
         → Frontend gọi POST /api/v1/ai/recommend-jobs
         → Backend gọi AI service → trả danh sách job phù hợp

Bước 2: User bấm chọn 1 job
         → Frontend gọi GET /v1/jobs/:id/learning-path?user_skills=[...]

Bước 3: Backend orchestration
         → Lấy job detail
         → Gọi AI skill gap (POST /skill-gap/esco)
         → Gọi AI course recommendation (POST /course-recommendations)
         → Gộp kết quả

Bước 4: Frontend hiển thị
         → Job summary
         → Skill gap breakdown (essential / important / nice-to-have)
         → Danh sách khóa học gợi ý
         → CTA đăng ký học
```

---

## Phase 1 — Nền tảng dữ liệu và mapping

**Mục tiêu:** Chuẩn bị dữ liệu để các bước sau chạy được.  
**Thời gian ước tính:** 3–5 ngày

---

### Phase 1.1 — Nghiệp vụ

#### 1.1.1. Thiết kế bảng Synonym Map

**Mục tiêu:** Tạo bảng đồng nghĩa để hệ thống hiểu các cách gọi khác nhau của cùng 1 skill.

**Cấu trúc dữ liệu:**

```json
{
  "primary_skill": "chăm sóc khách hàng",
  "aliases": [
    "CSKH",
    "cskh",
    "customer service",
    "chăm sóc khách",
    "hỗ trợ khách hàng"
  ],
  "category": "service",
  "esco_related": ["customer service"],
  "notes": "dùng chung cho cả bán lẻ và dịch vụ"
}
```

**Các skill ưu tiên mapping trước:**

1. **Kỹ năng mềm:** giao tiếp, làm việc nhóm, giải quyết vấn đề, thuyết trình
2. **Kỹ năng văn phòng:** Excel, Word, PowerPoint, tin học
3. **Kỹ năng bán hàng:** sales, chốt đơn, chăm sóc khách
4. **Kỹ năng quản lý:** quản lý, giám sát, lãnh đạo
5. **Kỹ năng nghề:** kế toán, nhân sự, hành chính

**Cách thu thập synonym:**

1. **Nguồn chính:** ESCO MongoDB (`esco_skills` collection)
   - `titleVi` ↔ `titleEn` — song ngữ chuẩn
   - `alternativeLabelsEn` — aliases chuẩn từ ESCO taxonomy
   - Script: `seed_skill_synonyms_from_esco.py`

2. **Nguồn bổ sung:** Skills thực tế trong `courses.skills` và `scraped_jobs.skills`
   - Lấy unique skills → dùng LLM gợi ý synonym nhóm lại
   - Human review trước khi seed

3. **Nguồn viết tắt** (thủ công):
   - `CSKH`, `VP`, `NN`, `KD`, `QL`, `GT`, `LVN`...
   - Thêm sau khi xem thực tế dữ liệu trong MongoDB

#### 1.1.2. Đánh giá field `skills` và `outcomes` của course

**Field hiện có trong `courseModel.js`:**

| Field | Độ sẵn sàng | Ghi chú |
|---|---|---|
| `title` | Tốt | Đã bắt buộc |
| `description` | Tốt | Đã bắt buộc |
| `shortDescription` | Tốt | Rất hữu ích để match |
| `skills` | Cần cải thiện | Nên bắt buộc, nên có ESCO mapping |
| `outcomes` | Cần cải thiện | Rất quan trọng cho match, nên bắt buộc |
| `level` | Tốt | Dùng để learner fit |
| `fee` | Tốt | Dùng để practical fit |
| `duration` | Tốt | Dùng để learner fit |
| `location.type` | Tốt | Dùng để filter |

**Nghiệp vụ cần làm:**
- Quy định trainer phải nhập tối thiểu:
  - 3 skill trong `skills`
  - 2 outcome trong `outcomes`
- Khuyến khích nhập bằng tiếng Việt chuẩn, có mapping ESCO

---

### Phase 1.2 — Kỹ thuật

#### Bước 1 — Backend: `skillSynonymModel.js` và `skillNormalizer.js`

**File 1a:** `backend/src/models/skillSynonymModel.js`

Pattern giống `scrapedJobModel.js` — dùng `GET_DB()` static model:

```js
const COLLECTION_NAME = 'skill_synonyms';

class SkillSynonymModel {
  static getCollection() {
    return GET_DB().collection(COLLECTION_NAME);
  }

  static async createIndexes() {
    const collection = this.getCollection();
    await collection.createIndex({ primary_skill: 1 });
    await collection.createIndex({ normalized_key: 1 }, { unique: true });
    await collection.createIndex({ aliases: 1 });
    await collection.createIndex({ category: 1 });
  }

  static async findByNormalizedKey(key) {
    return this.getCollection().findOne({ normalized_key: key });
  }

  static async findByAlias(alias) {
    return this.getCollection().findOne({ aliases: alias.toLowerCase() });
  }

  static async upsert(data) {
    const normalized = normalizeSkill(data.primary_skill);
    return this.getCollection().updateOne(
      { normalized_key: normalized },
      {
        $set: { ...data, normalized_key: normalized, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
  }

  static async getAllAsDict() {
    const docs = await this.getCollection().find({}).toArray();
    const dict = {};
    for (const doc of docs) {
      for (const alias of doc.aliases) {
        dict[alias.toLowerCase()] = doc.primary_skill;
      }
      dict[doc.normalized_key] = doc.primary_skill;
    }
    return dict;
  }
}

export default SkillSynonymModel;
```

**File 1b:** `backend/src/utils/skillNormalizer.js`

```js
export const normalizeSkill = (skill) => {
  return skill
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // bỏ dấu
    .replace(/[_\s]+/g, '_')           // space/underscore → _
    .replace(/[^a-z0-9_]/g, '');       // bỏ ký tự đặc biệt
};
```

**File 1c:** `backend/src/scripts/createSkillSynonymIndexes.js` (chạy 1 lần)

```js
import { CONNECT_DB } from '../config/mongodb.js';
import SkillSynonymModel from '../models/skillSynonymModel.js';

async function main() {
  await CONNECT_DB();
  await SkillSynonymModel.createIndexes();
  console.log('Done!');
  process.exit(0);
}
main().catch(console.error);
```

**Thứ tự thực hiện Bước 1:**
1. Tạo `skillNormalizer.js`
2. Tạo `skillSynonymModel.js`
3. Chạy `node backend/src/scripts/createSkillSynonymIndexes.js`

---

#### Bước 2 — AI Service: Seed synonym từ ESCO MongoDB

**File:** `ai-service/scripts/seed_skill_synonyms_from_esco.py`

Pattern giống `prepare_esco_data.py` — kết nối MongoDB qua `MONGODB_URI`:

```python
#!/usr/bin/env python3
"""Seed skill_synonyms collection from ESCO MongoDB."""
import sys, os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

def normalize_skill(text: str) -> str:
    return (text.lower()
        .normalize('NFD')
        .replace('\u0300-\u036f', '')
        .replace(' ', '_')
        .replace(r'[^a-z0-9_]', ''))

def main():
    client = MongoClient(MONGO_URI)
    EscoSkills = client[DB_NAME]['esco_skills']
    Synonyms = client[DB_NAME]['skill_synonyms']

    EscoSkills_cursor = EscoSkills.find({"titleVi": {"$exists": True, "$ne": None, "$ne": ""}})
    count = 0

    for doc in EscoSkills_cursor:
        title_en = doc.get("titleEn", "")
        title_vi = doc.get("titleVi", "")
        alt_labels = doc.get("alternativeLabelsEn", [])

        if not title_en or not title_vi:
            continue

        # Document 1: primary = English
        en_doc = {
            "primary_skill": title_en,
            "normalized_key": normalize_skill(title_en),
            "aliases": [title_vi] + [l for l in alt_labels if l],
            "category": doc.get("skillType", "general"),
            "esco_uri": doc.get("escoUri", ""),
        }

        # Document 2: primary = Vietnamese
        vi_doc = {
            "primary_skill": title_vi,
            "normalized_key": normalize_skill(title_vi),
            "aliases": [title_en] + [l for l in alt_labels if l],
            "category": doc.get("skillType", "general"),
            "esco_uri": doc.get("escoUri", ""),
        }

        Synonyms.update_one(
            {"normalized_key": en_doc["normalized_key"]},
            {"$setOnInsert": en_doc},
            upsert=True
        )
        Synonyms.update_one(
            {"normalized_key": vi_doc["normalized_key"]},
            {"$setOnInsert": vi_doc},
            upsert=True
        )
        count += 1

    print(f"Seeded {count} ESCO skills (created {count * 2} synonym documents)")
    client.close()

if __name__ == "__main__":
    main()
```

**Chạy:**
```bash
cd ai-service
python scripts/seed_skill_synonyms_from_esco.py
```

---

#### Bước 3 — AI Service: Build course embeddings

**File:** `ai-service/scripts/preprocessing/build_course_embeddings.py`

Dựa theo pattern `2_generate_job_embeddings.py`:

```python
#!/usr/bin/env python3
"""Build Course Embeddings — preprocess course data for semantic matching."""
import sys, json, os
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

def normalize_skill_inline(text: str) -> str:
    return (text.lower()
        .normalize('NFD')
        .replace('\u0300-\u036f', '')
        .replace(' ', '_')
        .replace(r'[^a-z0-9_]', ''))

def create_course_text(course: dict) -> str:
    parts = [
        course.get('title', ''),
        course.get('shortDescription', ''),
        ', '.join(course.get('skills', [])),
        ', '.join(course.get('outcomes', [])),
    ]
    return ' | '.join(p for p in parts if p)

def main():
    mongodb_uri = os.getenv('MONGODB_URI')
    client = MongoClient(mongodb_uri)
    db = client[os.getenv('DATABASE_NAME', 'restart35')]
    courses = list(db.courses.find({
        'status': 'APPROVED',
        '_destroy': {'$ne': True}
    }))

    texts = [create_course_text(c) for c in courses]
    model = SentenceTransformer(MODEL_NAME)
    embeddings = model.encode(texts, show_progress_bar=True,
                               convert_to_numpy=True, batch_size=32)

    np.save(DATA_DIR / "course_embeddings.npy", embeddings)

    labels = [{
        'course_id': str(c['_id']),
        'title': c['title'],
        'skills': c.get('skills', []),
        'normalized_skills': [normalize_skill_inline(s) for s in c.get('skills', [])],
    } for c in courses]

    with open(DATA_DIR / "course_labels.json", 'w', encoding='utf-8') as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

    print(f"✓ Embeddings: {embeddings.shape}, Labels: {len(labels)} courses")

if __name__ == "__main__":
    main()
```

**Chạy:**
```bash
cd ai-service
python scripts/preprocessing/build_course_embeddings.py
```

---

#### Bước 4 — Backend: Cập nhật `courseModel.js`

**File:** `backend/src/models/courseModel.js`

**Thay đổi validation cho `skills` và `outcomes`:**

```js
// Trước:
skills: Joi.array().items(Joi.string()).max(20),
outcomes: Joi.array().items(Joi.string()),

// Sau:
skills: Joi.array()
  .items(Joi.string().min(2).max(100))
  .min(3)       // tối thiểu 3 skills
  .max(20),

outcomes: Joi.array()
  .items(Joi.string().min(2).max(200))
  .min(2)       // tối thiểu 2 outcomes
  .max(20),
```

**Thêm hàm `findBySkillGaps()`** (sau `findBySkills` trong model):

```js
static async findBySkillGaps(missingSkills, limit = 20) {
  try {
    const query = {
      status: COURSE_STATUS.APPROVED,
      _destroy: { $ne: true },
      skills: {
        $in: missingSkills.map(s => new RegExp(s, 'i'))
      }
    }
    return await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(query)
      .project({
        _id: 1, title: 1, shortDescription: 1,
        skills: 1, fee: 1, duration: 1,
        level: 1, rating: 1, enrollmentCount: 1,
        'location.type': 1
      })
      .sort({ rating: -1, enrollmentCount: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}
```

---

#### Bước 5 — Thứ tự thực hiện tổng hợp

| # | Bước | File tạo | Thời gian |
|---|-------|----------|-----------|
| 1 | `skillNormalizer.js` + `skillSynonymModel.js` + index script | `backend/src/utils/skillNormalizer.js`, `backend/src/models/skillSynonymModel.js`, `backend/src/scripts/createSkillSynonymIndexes.js` | 1.5 giờ |
| 2 | Seed ESCO synonym | `ai-service/scripts/seed_skill_synonyms_from_esco.py` | 1 giờ |
| 3 | Build course embeddings | `ai-service/scripts/preprocessing/build_course_embeddings.py` | 1 giờ |
| 4 | Cập nhật `courseModel.js` | `backend/src/models/courseModel.js` | 30 phút |

**Tổng Phase 1: ~4 giờ**

---

### Phase 1 — Checklist

- [ ] Tạo `skillNormalizer.js` (`backend/src/utils/skillNormalizer.js`)
- [ ] Tạo `skillSynonymModel.js` (`backend/src/models/skillSynonymModel.js`)
- [ ] Chạy `createSkillSynonymIndexes.js` để tạo index
- [ ] Seed synonym từ ESCO MongoDB (`seed_skill_synonyms_from_esco.py`)
- [ ] Tạo script build course embeddings (`preprocessing/build_course_embeddings.py`)
- [ ] Chạy build course embeddings
- [ ] Cập nhật validation `courseModel` — `skills` (min 3), `outcomes` (min 2)
- [ ] Thêm `findBySkillGaps()` vào `courseModel.js`

---

## Phase 2 — AI Service: Skill Normalization và Taxonomy Expansion

**Mục tiêu:** Xây dựng 2 service lõi để skill được chuẩn hóa và mở rộng trước khi match với course.  
**Thời gian ước tính:** 5–7 ngày

---

### Phase 2.1 — Nghiệp vụ

#### 2.1.1. Chuẩn hóa skill thiếu

**Quy tắc chuẩn hóa:**

1. **Lowercase** — bỏ HOA
2. **Bỏ dấu** — chuyển `kỹ năng` → `ky nang`
3. **Loại từ thừa** — bỏ `kỹ năng`, `kinh nghiệm`, `cơ bản`, `nâng cao`
4. **Map synonym** — `cskh` → `cham_soc_khach_hang`
5. **Map viết tắt** — `VP` → `van_phong`, `NN` → `ngoai_ngu`

#### 2.1.2. Mở rộng skill bằng ESCO taxonomy

**Các loại expansion:**

| Loại expansion | Ví dụ |
|---|---|
| exact | `Excel` |
| related | `Excel` → `spreadsheet`, `báo cáo dữ liệu` |
| parent | `Excel` → `tin học văn phòng` (parent trong taxonomy) |
| child | `tin học văn phòng` → `Word`, `Excel`, `PowerPoint` |
| same_group | `giao tiếp` → `thuyết trình`, `đàm phán` |

**Kết quả expansion format:**

```json
{
  "original_skill": "Excel",
  "normalized": "excel",
  "expansions": {
    "exact": ["excel", "microsoft excel"],
    "related": ["spreadsheet", "báo cáo dữ liệu", "xử lý số liệu"],
    "parent": ["tin học văn phòng", "office IT"],
    "child": [],
    "same_group": ["word", "powerpoint", "văn bản"]
  },
  "all_variations": ["excel", "microsoft excel", "spreadsheet", "tin học văn phòng", ...]
}
```

---

### Phase 2.2 — Kỹ thuật

#### 2.2.1. Tạo service `SkillNormalizer`

**File:** `ai-service/services/skill_normalizer.py`

```python
class SkillNormalizer:
    def __init__(self):
        # Load synonym map từ MongoDB
        # Load abbreviation map

    def normalize(self, skill: str) -> str:
        """
        Chuẩn hóa 1 skill:
        - lowercase
        - bỏ dấu
        - bỏ từ thừa
        - map synonym
        """

    def normalize_batch(self, skills: List[str]) -> List[str]:
        """Chuẩn hóa nhiều skills"""

    def get_variations(self, skill: str) -> List[str]:
        """
        Lấy tất cả variations của 1 skill:
        - exact
        - synonym
        - related terms
        """

    def are_equivalent(self, skill_a: str, skill_b: str) -> bool:
        """Kiểm tra 2 skill có tương đương nhau không"""
```

#### 2.2.2. Mở rộng `ESCONormalizer` thêm các method expansion

**File:** `ai-service/services/esco_normalizer.py` (hiện đã có, cần thêm method)

```python
class ESCONormalizer:
    def get_related_skills(self, skill_uri: str, depth: int = 1) -> List[str]:
        """Lấy skill liên quan đến 1 skill theo taxonomy ESCO"""

    def get_parent_skills(self, skill_uri: str) -> List[str]:
        """Lấy skill cha của 1 skill"""

    def get_child_skills(self, skill_uri: str) -> List[str]:
        """Lấy skill con của 1 skill"""

    def expand_skill(self, skill: str) -> Dict:
        """Trả về expansion đầy đủ bao gồm tất cả loại"""
```

#### 2.2.3. Tạo service `CourseRecommendationEngine`

**File:** `ai-service/services/course_recommendation_engine.py` (MỚI — service cốt lõi nhất)

```python
class CourseRecommendationEngine:
    def __init__(self):
        self.normalizer = SkillNormalizer()
        self.esco = ESCONormalizer()
        self.semantic_search = SemanticSearch()
        self._load_course_embeddings()

    def recommend_courses(
        self,
        skill_gaps: List[Dict],        # [{skill_name, priority}]
        target_job_title: str,
        constraints: Dict = None       # {isFree, maxFee, locationType, level}
    ) -> List[Dict]:
        """
        Main entry point.
        Returns list of recommended courses sorted by score.
        """

    def _normalize_skill_gaps(self, skill_gaps):
        """Chuẩn hóa skill gaps"""

    def _expand_skill_gaps(self, normalized_gaps):
        """Mở rộng skill gaps bằng ESCO taxonomy"""

    def _generate_candidates(self, expanded_gaps, constraints):
        """Tìm course ứng viên từ MongoDB"""

    def _semantic_rerank(self, candidates, expanded_gaps, target_job):
        """Semantic similarity reranking"""

    def _final_ranking(self, reranked_candidates, skill_gaps):
        """Final scoring và ranking"""

    def _generate_reasons(self, course, covered_skills, priority_covered):
        """Tạo lý do đề xuất cho course"""
```

#### 2.2.4. Tạo router `CourseRecommendation`

**File:** `ai-service/routers/course_recommendation.py` (MỚI)

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/ai", tags=["Course Recommendation"])

class SkillGapItem(BaseModel):
    skill_name: str
    priority: str  # essential | important | nice_to_have
    score: Optional[float] = None

class CourseRecommendRequest(BaseModel):
    user_skills: List[str]
    target_job_id: Optional[str] = None
    target_job_title: str
    skill_gaps: List[SkillGapItem]
    constraints: Optional[dict] = None
    limit: int = 10

class RecommendedCourse(BaseModel):
    course_id: str
    title: str
    score: float
    covered_skills: List[str]
    missing_skills_covered: int
    priority_coverage: float
    semantic_relevance: float
    reason: str
    # Course metadata
    fee: float
    duration: dict
    level: str
    location_type: str
    rating: dict

@router.post("/course-recommendations", response_model=dict)
async def recommend_courses(req: CourseRecommendRequest):
    engine = get_course_engine()
    results = engine.recommend_courses(
        skill_gaps=req.skill_gaps,
        target_job_title=req.target_job_title,
        constraints=req.constraints
    )
    return {"success": True, "courses": results}
```

#### 2.2.5. Đăng ký router mới vào FastAPI

**File:** `ai-service/main.py`

```python
from routers.course_recommendation import router as course_recommendation_router

app.include_router(course_recommendation_router)
```

### Phase 2 — Checklist

- [ ] Tạo `SkillNormalizer` với synonym và normalization
- [ ] Seed synonym từ ESCO MongoDB (target: 200+ cặp từ titleVi↔titleEn)
- [ ] Mở rộng `ESCONormalizer` thêm các method expansion
- [ ] Tạo `CourseRecommendationEngine` với 5 method nội bộ
- [ ] Tạo router `course_recommendation.py`
- [ ] Đăng ký router vào `main.py`
- [ ] Test endpoint `/api/v1/ai/course-recommendations`

---

## Phase 3 — Backend Orchestration và Frontend Integration

**Mục tiêu:** Nối AI service vào backend, tạo API orchestration, rồi tích hợp lên frontend.  
**Thời gian ước tính:** 5–7 ngày

---

### Phase 3.1 — Nghiệp vụ

#### 3.1.1. Thiết kế API orchestration cho learning path

**Mục tiêu:** Tạo endpoint tổng hợp ở backend để orchestrate toàn bộ luồng.

#### 3.1.2. Thiết kế response structure cho FE

```json
{
  "job": {
    "id": "job_001",
    "title": "Nhân viên chăm sóc khách hàng",
    "company": "Công ty ABC",
    "match_score": 0.82
  },
  "skill_gap": {
    "total": 6,
    "essential": 2,
    "important": 3,
    "nice_to_have": 1,
    "skills": [
      {
        "skill_name": "Excel",
        "priority": "essential",
        "reason": "Kỹ năng thiết yếu cho công việc hành chính"
      }
    ]
  },
  "recommended_courses": [
    {
      "course_id": "c001",
      "title": "Excel cơ bản cho dân văn phòng",
      "match_score": 0.91,
      "covered_skills": ["Excel"],
      "reason": "Bù kỹ năng Essential cho công việc mục tiêu",
      "fee": 0,
      "duration": { "value": 4, "unit": "weeks" },
      "level": "BEGINNER",
      "rating": { "average": 4.5, "count": 120 }
    }
  ]
}
```

#### 3.1.3. Thiết kế UI flow

```
Bước 1: User nhập thông tin hồ sơ
         → Skills hiện có
         → Kinh nghiệm, tuổi, địa điểm
         → Nghề muốn ứng tuyển

Bước 2: Hệ thống gợi ý job phù hợp
         → Danh sách top 5-10 jobs
         → Điểm match, skills đã có/đang thiếu

Bước 3: User bấm chọn 1 job
         → Hiển thị chi tiết job
         → Skill gap breakdown (essential/important/nice-to-have)
         → Danh sách khóa học gợi ý cho skill gap đó

Bước 4: User bấm vào khóa học
         → Chuyển sang trang chi tiết khóa học
         → Nút "Đăng ký học"
```

---

### Phase 3.2 — Kỹ thuật

#### 3.2.1. Tạo backend orchestration service

**File:** `backend/src/services/learningPathService.js` (MỚI)

```javascript
// Lấy job detail + skill gap + course recommendations
async function getJobLearningPath(jobId, userSkills, userAge, constraints) {
  // 1. Lấy job detail
  const job = await ScrapedJob.findOne({ scrapedJobId: jobId })
  if (!job) throw new Error('Job not found')

  // 2. Gọi AI skill gap service
  const skillGapResult = await callAIService('/skill-gap/esco', {
    user_skills: userSkills,
    target_occupation: job.title,
    age: userAge,
    max_gaps: 15
  })

  // 3. Gọi AI course recommendation service
  const courseResult = await callAIService('/course-recommendations', {
    user_skills: userSkills,
    target_job_id: jobId,
    target_job_title: job.title,
    skill_gaps: skillGapResult.skill_gaps,
    constraints: constraints
  })

  // 4. Gộp kết quả
  return {
    job: {
      id: job.scrapedJobId,
      title: job.title,
      company: job.company,
      match_score: calculateJobMatchScore(userSkills, job.skills)
    },
    skill_gap: skillGapResult,
    recommended_courses: courseResult.courses
  }
}
```

#### 3.2.2. Tạo backend controller và route

**File:** `backend/src/controllers/learningPathController.js` (MỚI)

```javascript
// GET /v1/jobs/:id/learning-path
export const getJobLearningPath = async (req, res) => {
  const { id } = req.params
  const { user_skills, user_age = 30, constraints = {} } = req.query

  if (!user_skills || user_skills.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'user_skills là bắt buộc'
    })
  }

  const skills = Array.isArray(user_skills)
    ? user_skills
    : JSON.parse(user_skills)

  const result = await getJobLearningPath(id, skills, user_age, constraints)
  return res.json({ success: true, data: result })
}
```

**File:** `backend/src/routes/v1/learningPathRoute.js` (MỚI)

```javascript
import express from 'express'
import { getJobLearningPath } from '~/controllers/learningPathController'

const router = express.Router()

// Lấy job + skill gap + course recommendations cho 1 job
router.get('/:id/learning-path', getJobLearningPath)

export const learningPathRoute = router
```

**Đăng ký route vào app** (trong `backend/src/routes/v1/index.js` hoặc `app.js`):

```javascript
import { learningPathRoute } from './v1/learningPathRoute'
app.use('/v1/jobs', learningPathRoute)
```

#### 3.2.3. Tạo FE API wrapper

**File:** `frontend/src/apis/learningPathAPI.js` (MỚI)

```javascript
import axiosInstance from './axiosClient'

const BASE_URL = '/v1/jobs'

export const getJobLearningPathAPI = async ({
  jobId,
  userSkills,
  userAge = 30,
  constraints = {}
}) => {
  const response = await axiosInstance.get(
    `${BASE_URL}/${jobId}/learning-path`,
    {
      params: {
        user_skills: userSkills,
        user_age: userAge,
        constraints: JSON.stringify(constraints)
      }
    }
  )
  return response.data
}
```

#### 3.2.4. Tạo FE page component

**File:** `frontend/src/pages/JobLearningPathPage.jsx` (MỚI)

**Cấu trúc component:**

```
JobLearningPathPage
├── JobSummaryCard          → thông tin job đã chọn
├── SkillGapSection
│   ├── EssentialSkills     → skill bắt buộc
│   ├── ImportantSkills     → skill quan trọng
│   └── NiceToHaveSkills    → skill bổ sung
├── CourseRecommendationSection
│   └── CourseCard          → danh sách khóa học
│       ├── MatchBadge       → điểm match
│       ├── SkillTags        → skill được bù
│       └── CTAButton        → đăng ký
└── LearningPathSummary      → tóm tắt lộ trình học
```

**CourseCard component:**

```jsx
const CourseCard = ({ course, coveredSkills, onEnroll }) => {
  return (
    <div className="course-card">
      <div className="course-header">
        <h3>{course.title}</h3>
        <span className="match-score">{course.match_score}% phù hợp</span>
      </div>

      <div className="covered-skills">
        {coveredSkills.map(skill => (
          <span key={skill} className="skill-badge covered">{skill}</span>
        ))}
      </div>

      <p className="reason">{course.reason}</p>

      <div className="course-meta">
        <span>{course.duration.value} {course.duration.unit}</span>
        <span>{course.fee === 0 ? 'Miễn phí' : formatCurrency(course.fee)}</span>
        <span>⭐ {course.rating.average} ({course.rating.count})</span>
      </div>

      <button onClick={() => onEnroll(course.course_id)}>
        Đăng ký học
      </button>
    </div>
  )
}
```

#### 3.2.5. Tích hợp routing

**File:** `frontend/src/App.jsx` — thêm route:

```jsx
import JobLearningPathPage from './pages/JobLearningPathPage'

<Route path="/job/:jobId/learning-path" element={<JobLearningPathPage />} />
```

### Phase 3 — Checklist

- [ ] Tạo `learningPathService.js` ở backend
- [ ] Tạo `learningPathController.js` và route
- [ ] Đăng ký route vào app backend
- [ ] Tạo `learningPathAPI.js` ở frontend
- [ ] Tạo `JobLearningPathPage.jsx`
- [ ] Tạo `CourseCard.jsx` component
- [ ] Tích hợp vào routing (`App.jsx`)
- [ ] Test end-to-end luồng job → skill gap → course

---

## Phase 4 — Ranking Nâng cao, LLM Explanation và Learning Path

**Mục tiêu:** Cải thiện chất lượng ranking, thêm giải thích bằng LLM, tạo lộ trình học nhiều bước.  
**Thời gian ước tính:** 5–7 ngày

---

### Phase 4.1 — Nghiệp vụ

#### 4.1.1. Công thức scoring nâng cao

**Công thức tổng:**

```
total_score =
  (essential_coverage × 0.35)
+ (important_coverage × 0.25)
+ (skill_count_coverage × 0.15)
+ (semantic_relevance × 0.15)
+ (learner_fit × 0.10)
```

| Thành phần | Trọng số | Mô tả |
|---|---|---|
| `essential_coverage` | 0.35 | Đã cover bao nhiêu skill essential |
| `important_coverage` | 0.25 | Đã cover bao nhiêu skill important |
| `skill_count_coverage` | 0.15 | Tổng % skill được cover |
| `semantic_relevance` | 0.15 | Điểm semantic similarity |
| `learner_fit` | 0.10 | Phù hợp với learner (level, duration, fee) |

**Cách tính `learner_fit`:**

```
learner_fit =
  (level_fit × 0.4)
+ (duration_fit × 0.3)
+ (fee_fit × 0.3)
```

| Yếu tố | Cách tính |
|---|---|
| `level_fit` | beginner → 1.0, intermediate → 0.7, advanced → 0.4 |
| `duration_fit` | ngắn ≤4 tuần → 1.0, 4-8 tuần → 0.8, >8 tuần → 0.6 |
| `fee_fit` | free → 1.0, <1M → 0.8, 1M-3M → 0.5, >3M → 0.3 |

#### 4.1.2. Lộ trình học nhiều bước

**Mục tiêu:** Không chỉ gợi ý 1 khóa mà gợi ý chuỗi khóa học.

**Ví dụ:**

```
Job: Nhân viên chăm sóc khách hàng

Lộ trình:
Bước 1 (Tuần 1-2):
  → Khóa: Excel cơ bản cho dân văn phòng
  → Skill bù: Excel

Bước 2 (Tuần 3-5):
  → Khóa: Giao tiếp chăm sóc khách hàng chuyên nghiệp
  → Skill bù: Giao tiếp, xử lý khiếu nại

Bước 3 (Tuần 6):
  → Khóa: Kỹ năng phỏng vấn và tạo CV
  → Skill bù: Ứng tuyển
```

**Strategy:**
1. Essential skills trước
2. Important skills tiếp theo
3. Nice-to-have cuối cùng
4. Ghép các khóa cùng chủ đề lại

#### 4.1.3. Giải thích bằng LLM

**Mục tiêu:** Thay vì chỉ hiển thị điểm số, hệ thống nói bằng lời vì sao nên học khóa này.

**Prompt LLM đề xuất:**

```
Bạn là một chuyên gia tư vấn nghề nghiệp cho người lao động trung niên (35+).
Dựa trên thông tin sau, hãy viết 1-2 câu giải thích ngắn gọn, dễ hiểu
vì sao khóa học này phù hợp với người dùng:

- Khóa học: [title]
- Skill được bù: [covered_skills]
- Skill còn thiếu: [remaining_skills]
- Job mục tiêu: [job_title]
- Trình độ người dùng: [level]

Yêu cầu:
- Viết bằng tiếng Việt
- Không quá 3 câu
- Tập trung vào giá trị thực tế cho công việc
- Không dùng thuật ngữ quá chuyên nghiệp
```

---

### Phase 4.2 — Kỹ thuật

#### 4.2.1. Nâng cấp `CourseRecommendationEngine` với scoring mới

```python
def _final_ranking(self, reranked_candidates, skill_gaps, learner_profile=None):
    scored = []

    for course in reranked_candidates:
        essential_cov = self._essential_coverage(course, skill_gaps)
        important_cov = self._important_coverage(course, skill_gaps)
        skill_count_cov = self._skill_count_coverage(course, skill_gaps)
        sem_rel = course.get('semantic_score', 0.5)
        learner_fit = self._learner_fit(course, learner_profile)

        total = (
            essential_cov * 0.35 +
            important_cov * 0.25 +
            skill_count_cov * 0.15 +
            sem_rel * 0.15 +
            learner_fit * 0.10
        )

        course['final_score'] = round(total, 3)
        course['score_breakdown'] = {
            'essential_coverage': essential_cov,
            'important_coverage': important_cov,
            'skill_count_coverage': skill_count_cov,
            'semantic_relevance': sem_rel,
            'learner_fit': learner_fit
        }
        scored.append(course)

    return sorted(scored, key=lambda x: x['final_score'], reverse=True)
```

#### 4.2.2. Tạo LLM explanation service

**File:** `ai-service/services/course_explainer.py` (MỚI)

```python
class CourseExplainer:
    def __init__(self):
        self.llm_client = GeminiClient()  # hoặc GroqClient

    def explain_recommendation(
        self,
        course: dict,
        covered_skills: list,
        remaining_skills: list,
        job_title: str
    ) -> str:
        prompt = f"""
Bạn là chuyên gia tư vấn nghề nghiệp.
Khóa học: {course['title']}
Skill được bù: {covered_skills}
Skill còn thiếu: {remaining_skills}
Job mục tiêu: {job_title}

Viết 1-2 câu tiếng Việt, ngắn gọn, dễ hiểu.
"""
        return self.llm_client.generate(prompt)
```

#### 4.2.3. Tạo learning path generator

**File:** `ai-service/services/learning_path_generator.py` (MỚI)

```python
class LearningPathGenerator:
    def generate_path(
        self,
        skill_gaps: List[Dict],
        courses: List[Dict],
        job_title: str
    ) -> List[Dict]:
        """
        Tạo lộ trình học nhiều bước từ danh sách khóa học.
        Strategy:
        1. Essential skills trước
        2. Important skills tiếp theo
        3. Nice-to-have cuối cùng
        4. Ghép các khóa cùng chủ đề lại
        """
        path = []
        covered = set()
        remaining_gaps = skill_gaps.copy()

        while remaining_gaps:
            best_course = self._find_best_next_course(
                remaining_gaps, courses, covered
            )
            if not best_course:
                break

            path.append({
                'step': len(path) + 1,
                'course': best_course,
                'skills_covered': best_course['covered_skills'],
                'reason': f"Nên học trước vì bù {best_course['covered_skills']}"
            })

            for skill in best_course['covered_skills']:
                covered.add(skill)

            remaining_gaps = [
                g for g in remaining_gaps
                if g['skill_name'] not in covered
            ]

        return path
```

#### 4.2.4. Thêm endpoint composite

**File:** `ai-service/routers/course_recommendation.py`

```python
@router.post("/learning-path")
async def generate_learning_path(req: CourseRecommendRequest):
    engine = get_course_engine()
    path_gen = get_path_generator()

    courses = engine.recommend_courses(...)
    path = path_gen.generate_path(req.skill_gaps, courses, req.target_job_title)

    return {
        "success": True,
        "learning_path": path,
        "total_steps": len(path),
        "estimated_weeks": sum(step['course']['duration']['value'] for step in path)
    }
```

### Phase 4 — Checklist

- [ ] Cập nhật scoring engine với công thức multi-factor
- [ ] Tạo `CourseExplainer` dùng LLM
- [ ] Tạo `LearningPathGenerator` để tạo chuỗi khóa học
- [ ] Thêm endpoint `/learning-path`
- [ ] Cập nhật FE component hiển thị learning path
- [ ] Thêm LLM explanation vào course card

---

## Phase 5 — Tối ưu và Mở rộng

**Mục tiêu:** Tối ưu hiệu năng, thêm các tính năng nâng cao khi dữ liệu đã đủ.  
**Thời gian ước tính:** 5–7 ngày

---

### Phase 5.1 — Nghiệp vụ

#### 5.1.1. Theo dõi và cải thiện điểm số

| Metric | Mục đích |
|---|---|
| `course_enrollment_rate` | Khóa học được đề xuất → đăng ký thật |
| `course_completion_rate` | Đăng ký → hoàn thành |
| `placement_rate` | Học xong → có việc |
| `recommendation_ctr` | Đề xuất → user click xem |
| `learning_path_completion` | Lộ trình → hoàn thành hết các bước |

#### 5.1.2. Feedback loop

| Loại feedback | Cách thu thập |
|---|---|
| "Không phù hợp" | User bấm nút dismiss trên khóa học |
| Đăng ký sau gợi ý | Track enrollment từ recommendation |
| Hoàn thành / bỏ dở | Track enrollment status |
| Có việc sau học | Placement tracking |

#### 5.1.3. Enterprise demand awareness

- Tạo collection `enterprise_job_skills` lưu skill mà enterprise đang tuyển
- Khi recommend course, ưu tiên khóa học cover skill enterprise đang cần

---

### Phase 5.2 — Kỹ thuật

#### 5.2.1. Caching strategy

| Data | TTL | Lý do |
|---|---|---|
| Course embeddings | 24h | Ít thay đổi |
| Synonym map | 6h | Thỉnh thoảng cập nhật |
| Job skill extraction | 1h | Job có thể cập nhật |
| Course recommendation result | 1h | Skill gap ít thay đổi trong ngắn hạn |

#### 5.2.2. Performance optimization — FAISS index

```python
# Thay vì numpy search thuần, dùng FAISS
import faiss

index = faiss.IndexFlatIP(384)  # 384 = embedding dimension
index.add(course_embeddings)

# Search nhanh
D, I = index.search(query_embedding.reshape(1, -1), k=20)
```

#### 5.2.3. Feedback tracking service

**File:** `backend/src/services/recommendationFeedbackService.js` (MỚI)

```javascript
async function trackRecommendationFeedback({
  userId,
  courseId,
  jobId,
  action,       // 'view' | 'enroll' | 'dismiss' | 'complete'
  recommendationScore
}) {
  return await RecommendationFeedback.create({
    userId,
    courseId,
    jobId,
    action,
    recommendationScore,
    timestamp: new Date()
  })
}
```

#### 5.2.4. Collaborative filtering integration

**File:** `ai-service/services/cf_course_recommender.py` (MỚI — dùng khi đủ dữ liệu)

```python
class CFCourseRecommender:
    def recommend_similar_users_courses(
        self,
        user_id: str,
        skill_gaps: List[str],
        top_k: int = 5
    ) -> List[Dict]:
        """
        Tìm khóa học mà user tương tự đã enroll thành công.
        """
```

### Phase 5 — Checklist

- [ ] Thêm caching cho course embeddings và synonym map
- [ ] Thêm FAISS index thay vì numpy search thuần
- [ ] Tạo `RecommendationFeedback` model và service
- [ ] Tạo tracking UI (thumbs up/down, dismiss)
- [ ] Tạo analytics dashboard cho admin
- [ ] Thêm enterprise demand signal vào scoring
- [ ] Thử nghiệm collaborative filtering khi đủ data

---

## Phase 6 — Testing và Documentation

**Mục tiêu:** Đảm bảo chất lượng trước khi production.  
**Thời gian ước tính:** 2–3 ngày

---

### Phase 6.1 — Testing

#### 6.1.1. Unit tests

```python
# ai-service/tests/test_course_recommendation_engine.py

def test_skill_normalizer():
    normalizer = SkillNormalizer()
    assert normalizer.normalize("CSKH") == "cham_soc_khach_hang"
    assert normalizer.normalize("Excel") == "excel"

def test_essential_coverage_scoring():
    engine = CourseRecommendationEngine()
    course = {"covered_skills": ["Excel"], "skills": ["Excel", "Word"]}
    gaps = [
        {"skill_name": "Excel", "priority": "essential"},
        {"skill_name": "Word", "priority": "important"}
    ]
    score = engine._essential_coverage(course, gaps)
    assert score == 1.0

def test_skill_expansion():
    engine = CourseRecommendationEngine()
    expanded = engine._expand_skill_gaps([
        {"skill_name": "Excel", "priority": "essential"}
    ])
    assert "excel" in expanded[0]["all_variations"]
```

#### 6.1.2. Integration tests

```python
def test_full_recommendation_flow():
    result = engine.recommend_courses(
        skill_gaps=[{"skill_name": "Excel", "priority": "essential"}],
        target_job_title="Kế toán"
    )
    assert len(result) > 0
    assert result[0]['final_score'] >= 0
```

#### 6.1.3. A/B testing setup

```python
# ai-service/scripts/ml/ab_testing.py
# Test 2 phiên bản scoring:
# A: rule-based thuần (baseline)
# B: hybrid synonym + taxonomy + semantic (new)
```

---

### Phase 6.2 — Documentation

- Viết tài liệu API (request/response schema, error codes, rate limits)
- Viết tài liệu nghiệp vụ (sơ đồ luồng, công thức scoring, hướng dẫn vận hành)
- Viết runbook (deploy, monitor, xử lý lỗi, cập nhật synonym map)

### Phase 6 — Checklist

- [ ] Unit tests cho SkillNormalizer
- [ ] Unit tests cho CourseRecommendationEngine
- [ ] Integration test cho full flow
- [ ] A/B testing setup
- [ ] Tài liệu API
- [ ] Tài liệu nghiệp vụ
- [ ] Runbook vận hành

---

## Phase 7 — Deployment và Monitoring

**Thời gian ước tính:** 2–3 ngày

---

### Deployment checklist

- [ ] Deploy AI service với endpoint mới
- [ ] Deploy backend với route mới
- [ ] Deploy frontend với page mới
- [ ] Cấu hình environment variables
- [ ] Cấu hình rate limiting
- [ ] Cấu hình logging
- [ ] Cấu hình alerting cho lỗi AI service
- [ ] Chạy smoke test sau deploy
- [ ] Cấu hình monitoring dashboard

---

## Tổng kết lộ trình

### Bảng tổng hợp thời gian

| Phase | Nội dung | Thời gian |
|---|---|---|
| 1 | Nền tảng dữ liệu và mapping | 3–5 ngày |
| 2 | AI service: normalization + expansion + engine | 5–7 ngày |
| 3 | Backend orchestration + Frontend integration | 5–7 ngày |
| 4 | Ranking nâng cao + LLM explanation + learning path | 5–7 ngày |
| 5 | Tối ưu + feedback + collaborative filtering | 5–7 ngày |
| 6 | Testing + documentation | 2–3 ngày |
| 7 | Deployment + monitoring | 2–3 ngày |
| **Tổng** | | **22–39 ngày** |

### Phân bổ thời gian theo tầng

| Tầng | % Thời gian |
|---|---|
| Data & infrastructure (Phase 1) | 15% |
| AI/ML core (Phase 2) | 25% |
| Backend + Frontend (Phase 3) | 25% |
| Nâng cao (Phase 4) | 20% |
| Optimization (Phase 5) | 10% |
| Testing + Deploy (Phase 6+7) | 5% |

### Ưu tiên triển khai

**Milestone 1 — MVP (2–3 tuần)**
- Phase 1 (rút gọn, chỉ synonym map cơ bản)
- Phase 2 (chỉ rule-based, chưa semantic)
- Phase 3 (backend orchestration + FE cơ bản)
- Chỉ dùng keyword matching đơn giản, chưa cần ESCO expansion

**Milestone 2 — Production (3–4 tuần)**
- Thêm semantic matching
- Thêm ESCO taxonomy expansion
- Thêm LLM explanation
- Thêm learning path generator
- Thêm feedback tracking

### Những file cần tạo mới

| File | Vị trí | Phase |
|---|---|---|
| `seed_skill_synonyms.py` | `ai-service/scripts/` | 1 |
| `build_course_embeddings.py` | `ai-service/scripts/ml/` | 1 |
| `skill_normalizer.py` | `ai-service/services/` | 2 |
| `course_recommendation_engine.py` | `ai-service/services/` | 2 |
| `course_recommendation.py` | `ai-service/routers/` | 2 |
| `course_explainer.py` | `ai-service/services/` | 4 |
| `learning_path_generator.py` | `ai-service/services/` | 4 |
| `learningPathService.js` | `backend/src/services/` | 3 |
| `learningPathController.js` | `backend/src/controllers/` | 3 |
| `learningPathRoute.js` | `backend/src/routes/v1/` | 3 |
| `learningPathAPI.js` | `frontend/src/apis/` | 3 |
| `JobLearningPathPage.jsx` | `frontend/src/pages/` | 3 |
| `CourseCard.jsx` | `frontend/src/components/` | 3 |
| `recommendationFeedbackService.js` | `backend/src/services/` | 5 |
| `cf_course_recommender.py` | `ai-service/services/` | 5 |

### Những file cần sửa

| File | Thay đổi | Phase |
|---|---|---|
| `ai-service/main.py` | Đăng ký course_recommendation router | 2 |
| `ai-service/services/esco_normalizer.py` | Thêm method expansion | 2 |
| `backend/src/app.js` hoặc `routes/v1/index.js` | Đăng ký learningPathRoute | 3 |
| `frontend/src/App.jsx` | Thêm route JobLearningPathPage | 3 |
| `ai-service/services/course_recommendation_engine.py` | Cập nhật scoring | 4 |
| `ai-service/routers/course_recommendation.py` | Thêm endpoint learning-path | 4 |
| `backend/src/models/courseModel.js` | Yêu cầu skills/outcomes tối thiểu | 1 |

---

*Bản thiết kế này được tạo dựa trên codebase Restart-35 Platform ngày 06/06/2026.*
