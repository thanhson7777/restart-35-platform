# Federated Career Analysis - Lộ Trình Implement

> **Ngày tạo:** 2026-06-01  
> **Mục tiêu:** Gộp RAG + Skill Gap thành 1 API với shared context
> **Thời gian ước tính:** 14-18 ngày

---

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Lộ trình chi tiết theo Phase](#lộ-trình-chi-tiết-theo-phase)
4. [Chi tiết từng ngày](#chi-tiết-từng-ngày)
5. [Danh sách file cần tạo/sửa](#danh-sách-file-cần-tạosửa)
6. [Milestones](#milestones)
7. [Rủi ro và giải pháp](#rủi-ro-và-giải-pháp)
8. [Checklist trước production](#checklist-trước-production)

---

## Tổng quan

### Mục tiêu

Gộp 2 API riêng biệt (RAG Career Recommendation + Skill Gap Analysis) thành 1 API duy nhất với shared context, đảm bảo consistency giữa kết quả.

### Vấn đề hiện tại

```
HIỆN TẠI (2 API riêng - KHÔNG ĐỒNG BỘ):
┌─────────────────────────────────────┐
│ API 1: RAG Career Recommendation    │
│ Input: profile → Output: best_fits  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ API 2: Skill Gap Analysis          │
│ Input: user_skills + occupation    │
│ Output: skill_gaps                 │
└─────────────────────────────────────┘

⚠️ VẤN ĐỀ: 2 AI calls riêng → CÓ THỂ CHO RA KẾT QUẢ KHÔNG ĐỒNG BỘ
```

### Giải pháp đề xuất

```
ĐỀ XUẤT (1 API gộp - ĐỒNG BỘ):
┌─────────────────────────────────────────────────────────────┐
│ API: /api/v1/career/analyze-full                           │
│                                                             │
│ Input:                                                      │
│ {                                                           │
│   user_profile: {...},                                      │
│   options: { include_skill_gaps: true }                    │
│ }                                                           │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   career_paths: [...],   ← Từ RAG                          │
│   skill_gaps: [...],     ← Từ Skill Gap (đồng bộ với RAG) │
│   shared_context: {...}  ← Context dùng chung               │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### Thời gian

| Phase | Thời gian | Mô tả |
|-------|-----------|--------|
| Phase 1: Backend Foundation | 7 ngày | Context Bridge, Federation Service, API Endpoint |
| Phase 2: Backend Enhancement | 6 ngày | Safeguards, Cache, Consistency Checker |
| Phase 3: Frontend + Rollout | 5 ngày | Frontend Integration, Feature Flags, Monitoring |
| **Tổng cộng** | **18 ngày** | |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEDERATED API DESIGN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    API: /api/v1/career/analyze-full                │    │
│  │                                                                      │    │
│  │  Request:                                                            │    │
│  │  {                                                                   │    │
│  │    user_profile: {...},                                              │    │
│  │    options: {...}                                                    │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    ↓                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    FEDERATION LAYER                                   │    │
│  │                                                                      │    │
│  │    ┌─────────────────┐    ┌─────────────────┐                      │    │
│  │    │  RAG Engine     │    │  Skill Gap      │                      │    │
│  │    │                 │    │  Engine         │                      │    │
│  │    └────────┬────────┘    └────────┬────────┘                      │    │
│  │             │                        │                               │    │
│  │             └──────────┬─────────────┘                               │    │
│  │                        ↓                                               │    │
│  │               ┌─────────────────┐                                   │    │
│  │               │  Context Bridge  │ ← CHIA SẺ CONTEXT                │    │
│  │               └────────┬────────┘                                   │    │
│  └────────────────────────┼────────────────────────────────────────────┘    │
│                           ↓                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Response                                     │    │
│  │  { career_paths, skill_gaps, shared_context, consistency }          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Lộ trình chi tiết theo Phase

### Phase 1: Backend Foundation (Ngày 1-7)

#### Week 1 Overview

```
Day 1-2: Context Bridge Logic
Day 3-4: Federation Service
Day 5: Federated API Endpoint
Day 6-7: Testing Backend
```

#### Phase 1 Goals

- [ ] Context Bridge logic hoạt động
- [ ] Federation Service xử lý được request
- [ ] API Endpoint trả về đúng format
- [ ] Unit tests pass

---

### Phase 2: Backend Enhancement (Ngày 8-13)

#### Week 2 Overview

```
Day 8: Safeguards (Async, Validation)
Day 9: Cache System
Day 10-11: Consistency Checker
Day 12-13: Testing & Integration
```

#### Phase 2 Goals

- [ ] Async execution với timeout hoạt động
- [ ] Cache system hoạt động (Hierarchical + Tags)
- [ ] Consistency checker phát hiện được mismatch
- [ ] Integration tests pass
- [ ] Load tests pass

---

### Phase 3: Frontend + Rollout (Ngày 14-18)

#### Week 3 Overview

```
Day 14-15: Frontend Integration
Day 16: Feature Flags & Backward Compatibility
Day 17-18: Gradual Rollout & Monitoring
```

#### Phase 3 Goals

- [ ] Frontend gọi được API mới
- [ ] Feature flags hoạt động
- [ ] Backward compatibility với legacy API
- [ ] Monitoring dashboards active
- [ ] Rollback plan sẵn sàng

---

## Chi tiết từng ngày

---

### DAY 1-2: Context Bridge Logic

**Mục tiêu:** Tạo logic chia sẻ context giữa RAG và Skill Gap

#### Files cần tạo

| File | Mô tả | Độ phức tạp |
|------|--------|-------------|
| `services/context_bridge.py` | Logic chia sẻ context | Cao |

#### Methods cần implement

```python
# services/context_bridge.py
class ContextBridge:
    
    def extract_shared_context(self, user_profile) -> SharedAnalysisContext:
        """
        Extract context từ user profile - dùng chung cho cả RAG và Skill Gap
        """
        pass
    
    def update_with_rag_results(self, shared_context, rag_results) -> SharedAnalysisContext:
        """
        Update shared context sau khi có RAG results
        """
        pass
    
    def validate_context(self, context) -> bool:
        """
        Validate context trước khi dùng
        """
        pass
    
    def merge_contexts(self, *contexts) -> SharedAnalysisContext:
        """
        Merge multiple contexts → đảm bảo consistency
        """
        pass
    
    def create_context_hash(self, context) -> str:
        """
        Tạo hash để track context changes
        """
        pass
    
    def _identify_strengths(self, profile) -> List[str]:
        """
        Identify user strengths từ profile
        """
        pass
```

#### SharedAnalysisContext Model

```python
class SharedAnalysisContext(BaseModel):
    """Context được chia sẻ giữa RAG và Skill Gap"""
    
    context_version: str = "1.0"
    timestamp: str
    
    # Skills user đã có (dùng chung)
    user_existing_skills: List[str]
    
    # Skills được coi là "strengths" (dùng chung)
    user_strengths: List[str]
    
    # Occupation được chọn làm target
    primary_occupation: Optional[OccupationInfo] = None
    
    # Career paths từ RAG (để Skill Gap tham chiếu)
    career_paths: Optional[List[CareerPath]] = None
    
    # Match analysis
    skill_match_analysis: Optional[SkillMatchAnalysis] = None
    
    # Sources used
    sources: List[str]  # ["esco", "jobs", "rag_trends"]
```

#### Tests cần viết

```python
# tests/test_context_bridge.py
class TestContextBridge:
    
    def test_extract_shared_context(self):
        """Test extract context from user profile"""
        pass
    
    def test_validate_context(self):
        """Test context validation"""
        pass
    
    def test_merge_contexts(self):
        """Test merging multiple contexts"""
        pass
    
    def test_identify_strengths(self):
        """Test identifying user strengths"""
        pass
```

---

### DAY 3-4: Federation Service

**Mục tiêu:** Tạo service điều phối RAG và Skill Gap

#### Files cần tạo

| File | Mô tả | Độ phức tạp |
|------|--------|-------------|
| `services/career_federation.py` | Federation service | Trung bình |

#### Methods cần implement

```python
# services/career_federation.py
class CareerAnalysisService:
    
    def __init__(self):
        self.rag_engine = None  # Lazy load
        self.skill_gap_engine = None  # Lazy load
        self.context_bridge = ContextBridge()
    
    async def analyze_full(self, request: CareerAnalysisRequest) -> CareerAnalysisResponse:
        """
        Full career analysis - gộp RAG và Skill Gap
        """
        pass
    
    async def _run_rag_async(self, request) -> RAGResult:
        """
        Run RAG analysis asynchronously
        """
        pass
    
    async def _run_skill_gap_async(self, request, rag_context) -> SkillGapResult:
        """
        Run Skill Gap analysis asynchronously
        """
        pass
    
    def _build_response(self, rag_result, skill_gaps, shared_context, start_time):
        """
        Build unified response
        """
        pass
    
    def _build_partial_response(self, rag_result, skill_gap_result):
        """
        Build response khi có partial results
        """
        pass
    
    def _build_timeout_response(self):
        """
        Build response khi timeout
        """
        pass
```

#### Integration Flow

```python
async def analyze_full(self, request):
    start_time = datetime.now()
    
    # STEP 1: Extract Shared Context
    shared_context = self.context_bridge.extract_shared_context(
        user_profile=request.user_profile
    )
    
    # STEP 2: RAG Career Recommendations
    rag_result = None
    if request.options.include_career_paths:
        rag_engine = self._get_rag_engine()
        rag_result = await rag_engine.analyze(
            profile=request.user_profile,
            options=request.options,
            shared_context=shared_context
        )
    
    # STEP 3: Update Shared Context với RAG results
    if rag_result:
        shared_context = self.context_bridge.update_with_rag_results(
            shared_context=shared_context,
            rag_results=rag_result
        )
    
    # STEP 4: Skill Gap Analysis
    skill_gaps = []
    if request.options.include_skill_gaps:
        skill_gap_engine = self._get_skill_gap_engine()
        
        target_occupation = None
        if rag_result and rag_result.career_paths:
            target_occupation = rag_result.career_paths[0].job_title
        
        skill_gaps = skill_gap_engine.analyze_skill_gaps_with_context(
            user_skills=shared_context.user_existing_skills,
            target_occupation=target_occupation,
            age=request.user_profile.basic_info.age,
            rag_context={
                "user_strengths": shared_context.user_strengths,
                "primary_occupation": shared_context.primary_occupation,
                "career_paths": rag_result.career_paths if rag_result else []
            }
        )
    
    # STEP 5: Build Response
    return self._build_response(
        rag_result=rag_result,
        skill_gaps=skill_gaps,
        shared_context=shared_context,
        start_time=start_time
    )
```

---

### DAY 5: Federated API Endpoint

**Mục tiêu:** Tạo API endpoint `/api/v1/career/analyze-full`

#### Files cần tạo

| File | Mô tả | Độ phức tạp |
|------|--------|-------------|
| `routers/career_federated.py` | API router | Cao |

#### Request Model

```python
# routers/career_federated.py

class CareerAnalysisRequest(BaseModel):
    """Full career analysis request"""
    
    user_profile: UserProfile = Field(..., description="User profile data")
    
    options: AnalysisOptions = Field(
        default=AnalysisOptions(),
        description="Analysis options"
    )


class UserProfile(BaseModel):
    """User profile structure"""
    basic_info: BasicInfo
    employment_history: List[Experience]
    skills: List[str]
    aspirations: Aspirations
    barriers: Optional[Dict] = None


class AnalysisOptions(BaseModel):
    """Analysis options"""
    include_skill_gaps: bool = True
    include_career_paths: bool = True
    include_trends: bool = True
    max_career_paths: int = Field(default=5, ge=1, le=10)
    max_skill_gaps: int = Field(default=15, ge=5, le=30)
    skill_gap_priority_filter: Optional[List[str]] = None
```

#### Response Model

```python
class CareerAnalysisResponse(BaseModel):
    """Full career analysis response"""
    
    success: bool
    data: CareerAnalysisData
    timing: TimingInfo
    consistency: ConsistencyMetadata


class CareerAnalysisData(BaseModel):
    """Combined data from both engines"""
    
    career_paths: List[CareerPathRecommendation]  # Từ RAG
    skill_gaps: List[SkillGapItem]  # Từ Skill Gap
    shared_context: SharedAnalysisContext  # Context dùng chung
    summary: AnalysisSummary


class ConsistencyMetadata(BaseModel):
    """Metadata về consistency của kết quả"""
    
    context_source: str  # "federated_api"
    rag_used: bool
    skill_gap_used: bool
    shared_context_applied: bool
    consistency_score: float  # 0.0 - 1.0
    warnings: List[str]
```

#### API Endpoint

```python
# routers/career_federated.py

router = APIRouter(prefix="/api/v1/career", tags=["Career Analysis"])

@router.post("/analyze-full", response_model=CareerAnalysisResponse)
async def analyze_career_full(request: CareerAnalysisRequest):
    """
    Full career analysis endpoint.
    
    Gộp cả RAG career recommendation và Skill Gap analysis
    vào 1 API duy nhất với shared context.
    """
    service = CareerAnalysisService()
    return await service.analyze_full(request)
```

#### Cập nhật main.py

```python
# main.py

from routers.career_federated import router as career_federated_router

app.include_router(career_federated_router)
```

---

### DAY 6-7: Testing Backend

**Mục tiêu:** Đảm bảo backend hoạt động đúng

#### Test Cases

```python
# tests/test_career_federation.py

class TestCareerFederation:
    
    async def test_full_analysis_success(self):
        """Test full analysis với success case"""
        pass
    
    async def test_full_analysis_partial_rag_failure(self):
        """Test khi RAG fail nhưng Skill Gap success"""
        pass
    
    async def test_full_analysis_partial_skill_gap_failure(self):
        """Test khi Skill Gap fail nhưng RAG success"""
        pass
    
    async def test_full_analysis_both_failure(self):
        """Test khi cả 2 đều fail"""
        pass
    
    async def test_timing_reporting(self):
        """Test timing được report đúng"""
        pass
```

---

### DAY 8: Safeguards (Async + Timeout)

**Mục tiêu:** Xử lý performance và failure scenarios

#### Async Execution

```python
# services/career_federation.py

import asyncio
from concurrent.futures import ThreadPoolExecutor

class CareerAnalysisService:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.default_timeout = 30  # seconds
    
    async def analyze_full(self, request, timeout=None):
        timeout = timeout or self.default_timeout
        
        try:
            # Run cả 2 tasks song song với asyncio.gather
            results = await asyncio.wait_for(
                asyncio.gather(
                    self._run_rag_async(request),
                    self._run_skill_gap_async(request),
                    return_exceptions=True  # Không raise exception
                ),
                timeout=timeout
            )
            
            rag_result, skill_gap_result = results
            
            # Handle exceptions riêng
            if isinstance(rag_result, Exception):
                logger.warning(f"RAG failed: {rag_result}")
                rag_result = None
            
            if isinstance(skill_gap_result, Exception):
                logger.warning(f"Skill Gap failed: {skill_gap_result}")
                skill_gap_result = None
            
            return self._build_partial_response(rag_result, skill_gap_result)
            
        except asyncio.TimeoutError:
            logger.error(f"Analysis timed out after {timeout}s")
            return self._build_timeout_response()
```

#### Retry Logic

```python
async def _run_with_retry(self, func, max_retries=3):
    """Run function với retry logic"""
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt  # Exponential backoff
            logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s")
            await asyncio.sleep(wait_time)
```

---

### DAY 9: Cache System

**Mục tiêu:** Tối ưu performance với hierarchical caching

#### Files cần tạo

| File | Mô tả | Độ phức tạp |
|------|--------|-------------|
| `services/cache_manager.py` | Cache management | Trung bình |

#### HierarchicalCacheManager

```python
# services/cache_manager.py
from cachetools import TTLCache
from collections import defaultdict

class HierarchicalCacheManager:
    """
    Cache theo từng layer:
    - User profile cache (24h)
    - RAG results cache (1h)
    - Skill Gap results cache (1h)
    - Combined results cache (30min)
    """
    
    def __init__(self):
        self.user_profile_cache = TTLCache(maxsize=1000, ttl=86400)
        self.rag_cache = TTLCache(maxsize=500, ttl=3600)
        self.skill_gap_cache = TTLCache(maxsize=500, ttl=3600)
        self.combined_cache = TTLCache(maxsize=200, ttl=1800)
    
    def _generate_cache_key(self, user_profile, include_skill_gaps):
        """Generate deterministic cache key"""
        import hashlib
        content = {
            "skills": sorted(user_profile.get("skills", [])),
            "experiences": len(user_profile.get("employment_history", [])),
            "aspirations": user_profile.get("aspirations", {}).get("target_job"),
            "include_skill_gaps": include_skill_gaps
        }
        return hashlib.md5(json.dumps(content, sort_keys=True).encode()).hexdigest()
    
    def get_combined(self, user_profile, include_skill_gaps=True):
        """Get combined results from cache"""
        key = self._generate_cache_key(user_profile, include_skill_gaps)
        return self.combined_cache.get(key)
    
    def set_combined(self, user_profile, include_skill_gaps, results):
        """Cache combined results"""
        key = self._generate_cache_key(user_profile, include_skill_gaps)
        self.combined_cache[key] = results
    
    def invalidate_user(self, user_id):
        """Invalidate all caches khi profile thay đổi"""
        self.combined_cache.clear()
        self.rag_cache.clear()
        self.skill_gap_cache.clear()
```

#### TaggedCache

```python
class TaggedCache:
    """Cache với tags để invalidate theo tag"""
    
    def __init__(self):
        self.cache = {}
        self.tags = defaultdict(set)
    
    def set_with_tags(self, key, value, tags):
        """Set cache với tags"""
        self.cache[key] = {
            "value": value,
            "tags": set(tags),
            "created_at": datetime.now()
        }
        for tag in tags:
            self.tags[tag].add(key)
    
    def invalidate_by_tag(self, tag):
        """Invalidate all cache entries with this tag"""
        keys_to_remove = self.tags.get(tag, set())
        for key in keys_to_remove:
            del self.cache[key]
        self.tags[tag].clear()
```

---

### DAY 10-11: Consistency Checker

**Mục tiêu:** Đảm bảo RAG và Skill Gap cho kết quả đồng bộ

#### Files cần tạo

| File | Mô tả | Độ phức tạp |
|------|--------|-------------|
| `services/consistency_checker.py` | Consistency logic | Trung bình |

#### ConsistencyChecker

```python
# services/consistency_checker.py

class ConsistencyChecker:
    """
    Kiểm tra consistency giữa RAG và Skill Gap
    """
    
    def check_consistency(self, rag_result, skill_gap_result, shared_context):
        """
        Verify: Skills còn thiếu KHÔNG nằm trong user_skills
        """
        issues = []
        
        user_skills = set(shared_context.user_existing_skills)
        
        # Check 1: Skill gaps không nên có trong user_skills
        for gap in skill_gap_result.get("skill_gaps", []):
            if gap["skill_name"] in user_skills:
                issues.append({
                    "type": "SKILL_IN_BOTH",
                    "skill": gap["skill_name"],
                    "severity": "warning"
                })
        
        # Check 2: RAG suggested job phải match với Skill Gap target
        rag_job = rag_result.career_paths[0].job_title if rag_result.career_paths else None
        skill_gap_job = skill_gap_result.get("target_occupation")
        
        if rag_job and skill_gap_job and rag_job != skill_gap_job:
            issues.append({
                "type": "JOB_MISMATCH",
                "rag_job": rag_job,
                "skill_gap_job": skill_gap_job,
                "severity": "critical"
            })
        
        # Check 3: User strengths phải consistent
        rag_strengths = set()
        for path in rag_result.career_paths:
            rag_strengths.update(path.get("user_strengths", []))
        
        if rag_strengths != set(shared_context.user_strengths):
            issues.append({
                "type": "STRENGTHS_MISMATCH",
                "severity": "warning"
            })
        
        return {
            "is_consistent": len([i for i in issues if i["severity"] == "critical"]) == 0,
            "issues": issues,
            "consistency_score": 1.0 - (len(issues) * 0.1)
        }
```

---

### DAY 12-13: Testing & Integration

**Mục tiêu:** Đảm bảo tích hợp hoạt động đúng

#### Test Types

```python
# tests/test_integration.py

class TestIntegration:
    
    async def test_api_integration(self):
        """Test full API flow"""
        pass
    
    async def test_cache_hit(self):
        """Test cache working"""
        pass
    
    async def test_cache_miss(self):
        """Test cache miss"""
        pass
    
    async def test_consistency_check(self):
        """Test consistency checker"""
        pass

# tests/test_performance.py

class TestPerformance:
    
    async def test_response_time(self):
        """Test response time < 5s"""
        pass
    
    async def test_concurrent_requests(self):
        """Test 100 concurrent requests"""
        pass
    
    async def test_timeout_handling(self):
        """Test timeout handling"""
        pass
```

---

### DAY 14-15: Frontend Integration

**Mục tiêu:** Cập nhật frontend để sử dụng API mới

#### Files cần tạo

| File | Mô tả | Độ phức tạp |
|------|--------|-------------|
| `lib/apiAdapter.js` | API adapter | Thấp |
| `components/SkillGapSection.jsx` | Skill gaps UI | Trung bình |

#### Files cần sửa

| File | Thay đổi |
|------|----------|
| `apis/aiAPI.js` | Thêm `triggerFullCareerAnalysisAPI` |
| `redux/ai/aiSlice.js` | Thêm action & state |
| `components/CareerRecommendations.jsx` | Sử dụng API mới |

#### API Function

```javascript
// apis/aiAPI.js

export const triggerFullCareerAnalysisAPI = async (profile, options) => {
  const token = localStorage.getItem('accessToken')
  
  const response = await fetch(`${API_URL}/api/v1/career/analyze-full`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      user_profile: profile,
      options: options || {
        include_skill_gaps: true,
        include_career_paths: true,
        max_career_paths: 5
      }
    })
  })
  
  return response.json()
}
```

#### Redux Action

```javascript
// redux/ai/aiSlice.js

export const triggerFullCareerAnalysis = createAsyncThunk(
  'ai/triggerFullCareerAnalysis',
  async ({ profile, options }, { rejectWithValue }) => {
    try {
      const response = await triggerFullCareerAnalysisAPI(profile, options)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Thêm vào initialState
const initialState = {
  // ... existing states
  fullCareerAnalysis: null,
  fullCareerLoading: false,
  fullCareerError: null,
  skillGaps: [],
}

// Thêm reducer
.addCase(triggerFullCareerAnalysis.pending, (state) => {
  state.fullCareerLoading = true
  state.fullCareerError = null
})
.addCase(triggerFullCareerAnalysis.fulfilled, (state, action) => {
  state.fullCareerLoading = false
  if (action.payload?.success) {
    state.fullCareerAnalysis = action.payload.data
    state.skillGaps = action.payload.data.skill_gaps
  }
})
.addCase(triggerFullCareerAnalysis.rejected, (state, action) => {
  state.fullCareerLoading = false
  state.fullCareerError = action.payload
})
```

#### Component Update

```jsx
// components/CareerRecommendations.jsx

import { triggerFullCareerAnalysis } from '@/redux/ai/aiSlice'

const CareerRecommendations = ({ userProfile }) => {
  const [skillGaps, setSkillGaps] = useState([])
  const [selectedCareerPath, setSelectedCareerPath] = useState(null)
  
  const handleAnalyze = async () => {
    const result = await dispatch(triggerFullCareerAnalysis({
      profile: buildProfileData(userProfile),
      options: { include_skill_gaps: true }
    }))
    setSkillGaps(result.payload.data.skill_gaps)
  }
  
  return (
    <div>
      <CareerPathsList paths={result.data.career_paths} />
      {skillGaps.length > 0 && (
        <SkillGapSection
          skillGaps={skillGaps}
          targetOccupation={selectedCareerPath?.job_title}
        />
      )}
    </div>
  )
}
```

---

### DAY 16: Feature Flags & Backward Compatibility

**Mục tiêu:** Đảm bảo rollout an toàn

#### Feature Flags

```javascript
// config/features.js

export const featureFlags = {
  useFederatedAPI: import.meta.env.VITE_USE_FEDERATED_API === 'true',
  useNewSkillGapUI: import.meta.env.VITE_USE_NEW_SKILL_GAP === 'true'
}
```

#### API Adapter with Fallback

```javascript
// lib/apiAdapter.js

class CareerAPIAdapter {
    constructor() {
        this.useLegacy = true
    }
    
    async analyze(profile, options) {
        if (featureFlags.useFederatedAPI) {
            try {
                const response = await fetch('/api/v1/career/analyze-full', {
                    method: 'POST',
                    body: JSON.stringify({ profile, options })
                })
                
                if (!response.ok) {
                    throw new Error('Federated API failed')
                }
                
                return await response.json()
            } catch (error) {
                console.warn('Federated API failed, using legacy:', error)
                return await this.analyzeLegacy(profile)
            }
        }
        
        return await this.analyzeLegacy(profile)
    }
    
    async analyzeLegacy(profile) {
        // Gọi 2 APIs riêng như hiện tại
        const [ragResult, skillGapResult] = await Promise.all([
            triggerRAGRecommendation(profile),
            triggerSkillGapAnalysis(profile)
        ])
        
        return {
            success: true,
            data: {
                career_paths: ragResult.best_fits,
                skill_gaps: skillGapResult.skill_gaps
            }
        }
    }
}

export const careerAPI = new CareerAPIAdapter()
```

#### Backend Backward Compatibility

```python
# routers/career_federated.py

@router.post("/analyze-full")
async def analyze_career_full(request: CareerAnalysisRequest):
    """
    API với backward compatibility
    """
    
    # Check if client wants legacy response
    if request.response_format == "legacy":
        rag_result = await run_rag(request.user_profile)
        skill_gap_result = await run_skill_gap(...)
        
        return {
            "career_recommendation": rag_result,
            "skill_gap": skill_gap_result
        }
    
    return await analyze_federated(request)
```

---

### DAY 17-18: Gradual Rollout & Monitoring

**Mục tiêu:** Rollout an toàn với monitoring

#### Rollout Plan

```
Phase 1: 10% users (Day 17)
├── Enable feature flag for 10% users
├── Monitor metrics: success rate, response time, consistency
└── Check for errors

Phase 2: 50% users (Day 18+)
├── Expand to 50% if Phase 1 stable
├── Continue monitoring
└── Prepare for 100%

Phase 3: 100% users (Day 20+)
├── Full rollout if stable
├── Disable legacy API (optional)
└── Update documentation
```

#### Metrics to Track

```python
# Monitoring metrics
metrics = {
    "success_rate": 0.95,  # Target: > 95%
    "response_time_p50": 2000,  # Target: < 2s
    "response_time_p95": 5000,  # Target: < 5s
    "consistency_score": 0.90,  # Target: > 90%
    "fallback_rate": 0.05,  # Target: < 5%
    "error_rate": 0.01  # Target: < 1%
}
```

#### Rollback Plan

```python
# Rollback procedure
rollback_steps = [
    "1. Disable feature flag VITE_USE_FEDERATED_API=false",
    "2. Clear cache for affected users",
    "3. Monitor legacy API usage",
    "4. Verify legacy API handles load",
    "5. Send rollback notification to team"
]
```

---

## Danh sách file cần tạo/sửa

### Files MỚI

```
ai-service/
├── routers/
│   └── career_federated.py      [NEW - 200 lines]
├── services/
│   ├── context_bridge.py         [NEW - 250 lines]
│   ├── career_federation.py     [NEW - 300 lines]
│   ├── cache_manager.py         [NEW - 200 lines]
│   └── consistency_checker.py  [NEW - 150 lines]
│
frontend/src/
├── lib/
│   └── apiAdapter.js            [NEW - 100 lines]
├── components/
│   └── SkillGapSection.jsx      [NEW - 300 lines]
│
tests/
├── test_context_bridge.py       [NEW - 100 lines]
├── test_career_federation.py   [NEW - 150 lines]
├── test_consistency_checker.py  [NEW - 100 lines]
└── test_integration.py         [NEW - 150 lines]

Tổng: 11 files mới, ~1550 lines code
```

### Files CẦN SỬA

```
ai-service/
├── main.py                                 [MODIFY - +10 lines]
│   └── Thêm: include_router(career_federated_router)
├── services/
│   ├── hybrid_skill_gap_engine.py          [MODIFY - +50 lines]
│   │   └── Thêm: analyze_skill_gaps_with_context()
│   └── rag_engine.py                       [MODIFY - +50 lines]
│       └── Thêm: analyze_for_federation()
│
frontend/src/
├── apis/
│   └── aiAPI.js                           [MODIFY - +30 lines]
│       └── Thêm: triggerFullCareerAnalysisAPI()
├── redux/
│   └── ai/
│       └── aiSlice.js                    [MODIFY - +80 lines]
│           └── Thêm: triggerFullCareerAnalysis action & state
└── components/
    └── worker-profile/
        └── CareerRecommendations.jsx      [MODIFY - +100 lines]
            └── Sử dụng: triggerFullCareerAnalysis, hiển thị skill gaps

.env.example                              [MODIFY - +5 lines]
    └── Thêm: VITE_USE_FEDERATED_API, VITE_USE_NEW_SKILL_GAP

Tổng: 7 files sửa, ~325 lines thay đổi
```

---

## Milestones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MILESTONES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  M1: Day 5 - Backend MVP                                                    │
│  ═══════════════════════════════════                                        │
│  ✅ Federated API hoạt động                                               │
│  ✅ Context Bridge logic đúng                                              │
│  ✅ Integration tests pass                                                   │
│  ✅ Sẵn sàng test nội bộ                                                   │
│                                                                              │
│  M2: Day 13 - Backend Complete                                             │
│  ═══════════════════════════════════                                        │
│  ✅ Safeguards implemented (async, timeout)                                │
│  ✅ Cache system hoạt động                                                  │
│  ✅ Consistency checker hoạt động                                          │
│  ✅ Load tests pass (>100 concurrent)                                       │
│  ✅ Performance benchmarks đạt                                               │
│                                                                              │
│  M3: Day 16 - Frontend Complete                                            │
│  ═══════════════════════════════════                                        │
│  ✅ Frontend integration hoàn chỉnh                                         │
│  ✅ Feature flags hoạt động                                                 │
│  ✅ Backward compatibility work                                            │
│  ✅ UI/UX testing pass                                                     │
│                                                                              │
│  M4: Day 18 - Production Ready                                             │
│  ═══════════════════════════════════                                        │
│  ✅ Gradual rollout plan ready                                              │
│  ✅ Monitoring dashboards active                                            │
│  ✅ Rollback plan documented                                                │
│  ✅ Documentation complete                                                   │
│  ✅ Team training done                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Rủi ro và giải pháp

| Rủi ro | Xác suất | Ảnh hưởng | Giải pháp |
|--------|----------|-----------|-----------|
| **RAG + Skill Gap chạy đồng thời quá nặng** | Trung bình | High | Async execution + timeout 30s |
| **Context không đồng bộ** | Thấp | High | Validation + Consistency Checker |
| **Cache invalidation phức tạp** | Trung bình | Medium | Hierarchical cache + Tags |
| **Frontend breaking changes** | Thấp | Medium | Backward compatibility + Feature flags |
| **Integration issues** | Trung bình | Medium | Extensive testing + gradual rollout |

---

## Checklist trước production

- [ ] Unit tests > 80% coverage
- [ ] Integration tests pass
- [ ] Load tests pass (>100 concurrent users)
- [ ] Feature flags configured
- [ ] Monitoring dashboards active
- [ ] Rollback plan tested
- [ ] Documentation complete
- [ ] Team training done
- [ ] Rollout plan documented
- [ ] Alert thresholds set

---

## Tham khảo

- [RAG Router](./ai-service/routers/rag_router.py)
- [Skill Gap Router](./ai-service/routers/skill_gap.py)
- [Hybrid Skill Gap Engine](./ai-service/services/hybrid_skill_gap_engine.py)
- [CareerRecommendations Component](./frontend/src/components/worker-profile/CareerRecommendations.jsx)

---

> **Ghi chú:** Lộ trình này được thiết kế cho team 2 người (Backend + Frontend). Thời gian có thể thay đổi tùy theo kinh nghiệm và độ ưu tiên của team.
