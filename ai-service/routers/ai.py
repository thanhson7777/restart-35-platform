# -*- coding: utf-8 -*-
"""
AI Router - Endpoints cho AI Service
====================================
Cung cấp các endpoints cho:
- Job Recommendation (/recommend-jobs)
- Risk Prediction (/predict-risk)
- Worker Analysis (/analyze-worker)

Tác giả: Thanh Son
Ngày: 2026-04-10
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import json
import os

from services.job_recommender import JobRecommender
from services.risk_predictor import RiskPredictorML
from services.semantic_search import SemanticSearch
from services.hybrid_recommender import HybridRecommender

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

logger = logging.getLogger(__name__)

# Global instances (lazy load)
_recommender = None
_risk_predictor = None
_semantic_search = None
_hybrid_recommender = None


# =============================================================================
# Pydantic Models (Request/Response)
# =============================================================================

# --- Job Recommendation Models ---

class RecommendJobsRequest(BaseModel):
    """Request body cho job recommendation"""
    skills: List[str] = Field(
        ...,
        min_length=1,
        description="Danh sách skills của user"
    )
    experience: int = Field(
        default=0,
        ge=0,
        le=50,
        description="Số năm kinh nghiệm"
    )
    location: Optional[str] = Field(
        default=None,
        description="Tỉnh/Thành phố mong muốn"
    )
    target_job: Optional[str] = Field(
        default=None,
        description="Công việc mong muốn"
    )
    target_salary: Optional[float] = Field(
        default=None,
        ge=0,
        description="Mức lương mong muốn (VND)"
    )
    preferred_job_type: Optional[str] = Field(
        default=None,
        description="Loại công việc: full-time, part-time, temporary, freelance"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Số lượng jobs tối đa trả về"
    )
    allow_remote: bool = Field(
        default=False,
        description="Cho phép làm việc từ xa"
    )
    use_semantic: bool = Field(
        default=True,
        description="Sử dụng semantic search (default: True, fallback TF-IDF nếu fail)"
    )
    user_id: Optional[str] = Field(
        default=None,
        description="User ID cho Collaborative Filtering (nếu có)"
    )
    use_cf: bool = Field(
        default=True,
        description="Sử dụng Collaborative Filtering (default: True)"
    )


class JobResult(BaseModel):
    """Kết quả một job"""
    id: str
    title: str
    company: str
    score: float
    skills: List[str]
    skills_match: int
    salary_range: str
    salary_min: int
    salary_max: int
    location: str
    type: str
    experience_required: int
    description: str


class RecommendJobsResponse(BaseModel):
    """Response cho job recommendation"""
    success: bool
    data: dict


# --- Risk Prediction Models ---

class WorkerFeaturesRequest(BaseModel):
    """Request body cho risk prediction"""
    worker_id: Optional[str] = Field(
        default=None,
        description="Worker ID (optional)"
    )
    age: int = Field(
        ...,
        ge=35,
        le=65,
        description="Tuổi (35-65)"
    )
    gender: str = Field(
        default="male",
        description="Giới tính: male/female"
    )
    education: str = Field(
        default="upper_secondary",
        description="Trình độ học vấn"
    )
    experience_years: int = Field(
        default=0,
        ge=0,
        le=50,
        description="Số năm kinh nghiệm"
    )
    employment_status: str = Field(
        default="unemployed",
        description="Tình trạng việc làm: employed/unemployed/self-employed"
    )
    marital_status: str = Field(
        default="single",
        description="Tình trạng hôn nhân"
    )
    target_salary: float = Field(
        default=5000000,
        ge=0,
        description="Mức lương mong muốn (VND)"
    )
    region: str = Field(
        default="north",
        description="Khu vực: north/central/south"
    )
    skills: List[str] = Field(
        default=[],
        description="Danh sách kỹ năng"
    )
    target_job: Optional[str] = Field(
        default=None,
        description="Công việc mong muốn"
    )
    preferred_job_type: Optional[str] = Field(
        default=None,
        description="Loại công việc ưa thích"
    )
    barrier_health: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản sức khỏe"
    )
    barrier_family: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản gia đình"
    )
    barrier_techGap: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản kỹ thuật số"
    )
    barrier_location: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản địa lý"
    )
    barrier_language: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản ngôn ngữ"
    )


class FeatureImportanceItem(BaseModel):
    """Feature importance item in response"""
    feature: str
    importance: Optional[float] = None
    shap_value: Optional[float] = None
    interpretation: Optional[str] = None


class ModelInfo(BaseModel):
    """Model info in response"""
    model_type: str
    threshold: float
    strategy: str
    shap_available: Optional[bool] = False


class RiskPredictionData(BaseModel):
    """Risk prediction data"""
    risk_level: str
    risk_score: float
    probability: Dict[str, float]
    confidence: float
    top_features: Optional[List[FeatureImportanceItem]] = []
    recommendation: Dict[str, Any]
    model_info: ModelInfo


class RiskPredictionResponse(BaseModel):
    """Response cho risk prediction"""
    success: bool
    data: RiskPredictionData


# --- Worker Analysis Models ---

class WorkerAnalysisRequest(BaseModel):
    """Request body cho worker analysis (Risk + Jobs)"""
    worker_id: Optional[str] = Field(
        default=None,
        description="Worker ID (optional)"
    )
    age: int = Field(
        ...,
        ge=35,
        le=65,
        description="Tuổi (35-65)"
    )
    gender: str = Field(
        default="male",
        description="Giới tính: male/female"
    )
    education: str = Field(
        default="upper_secondary",
        description="Trình độ học vấn"
    )
    experience_years: int = Field(
        default=0,
        ge=0,
        le=50,
        description="Số năm kinh nghiệm"
    )
    employment_status: str = Field(
        default="unemployed",
        description="Tình trạng việc làm"
    )
    marital_status: str = Field(
        default="single",
        description="Tình trạng hôn nhân"
    )
    target_salary: float = Field(
        default=5000000,
        ge=0,
        description="Mức lương mong muốn (VND)"
    )
    region: str = Field(
        default="north",
        description="Khu vực"
    )
    skills: List[str] = Field(
        ...,
        min_length=1,
        description="Danh sách kỹ năng"
    )
    target_job: Optional[str] = Field(
        default=None,
        description="Công việc mong muốn"
    )
    preferred_job_type: Optional[str] = Field(
        default=None,
        description="Loại công việc ưa thích"
    )
    barrier_health: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản sức khỏe"
    )
    barrier_family: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản gia đình"
    )
    barrier_techGap: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản kỹ thuật số"
    )
    barrier_location: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản địa lý"
    )
    barrier_language: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Rào cản ngôn ngữ"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Số lượng jobs tối đa trả về"
    )


class WorkerAnalysisResponse(BaseModel):
    """Response cho worker analysis"""
    success: bool
    data: dict


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


# =============================================================================
# Helper Functions
# =============================================================================

def get_recommender() -> JobRecommender:
    """Lazy load JobRecommender"""
    global _recommender
    if _recommender is None:
        _recommender = JobRecommender()
    return _recommender


def get_risk_predictor() -> RiskPredictorML:
    """Lazy load RiskPredictorML"""
    global _risk_predictor
    if _risk_predictor is None:
        _risk_predictor = RiskPredictorML()
    return _risk_predictor


def get_semantic_search() -> SemanticSearch:
    """Lazy load SemanticSearch (lazy init on first use)"""
    global _semantic_search
    if _semantic_search is None:
        _semantic_search = SemanticSearch()
    return _semantic_search


def get_hybrid_recommender() -> HybridRecommender:
    """Lazy load HybridRecommender (TF-IDF + Semantic)"""
    global _hybrid_recommender, _recommender, _semantic_search
    
    if _hybrid_recommender is None:
        # Ensure base recommender is loaded
        tfidf_recommender = get_recommender()
        semantic_search = get_semantic_search()
        
        _hybrid_recommender = HybridRecommender(
            tfidf_recommender=tfidf_recommender,
            semantic_search=semantic_search
        )
    
    return _hybrid_recommender


def log_prediction(request_id: str, worker: Dict, prediction: Dict, request_time: float):
    """
    Log prediction ra file JSONL cho chương "Thử nghiệm hệ thống".

    Args:
        request_id: Unique request ID
        worker: Worker profile
        prediction: Prediction result
        request_time: Request processing time (seconds)
    """
    try:
        # Tạo logs directory nếu chưa có
        logs_dir = Path(__file__).parent.parent / "logs"
        logs_dir.mkdir(exist_ok=True)

        log_file = logs_dir / "predictions.jsonl"

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'request_id': request_id,
            'worker': {
                'age': worker.get('age'),
                'gender': worker.get('gender'),
                'education': worker.get('education'),
                'experience_years': worker.get('experience_years'),
                'employment_status': worker.get('employment_status'),
                'barriers': {
                    'health': worker.get('barrier_health'),
                    'family': worker.get('barrier_family'),
                    'techGap': worker.get('barrier_techGap')
                }
            },
            'prediction': {
                'risk_level': prediction.get('risk_level'),
                'risk_score': prediction.get('risk_score'),
                'probability': prediction.get('probability'),
                'confidence': prediction.get('confidence')
            },
            'model_info': prediction.get('model_info', {}),
            'request_time_ms': round(request_time * 1000, 2)
        }

        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')

        logger.info(f"Logged prediction to {log_file}")

    except Exception as e:
        logger.warning(f"Failed to log prediction: {e}")


from pathlib import Path


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "1.0.0"
    }


# ============================================================================
# JOB RECOMMENDATION ENDPOINTS
# ============================================================================

@router.post("/recommend-jobs", response_model=RecommendJobsResponse)
async def recommend_jobs(request: RecommendJobsRequest):
    """
    Gợi ý công việc phù hợp dựa trên profile của user.

    Sử dụng thuật toán Hybrid (TF-IDF + Semantic Search + Collaborative Filtering):
    - TF-IDF: Keyword matching (25%)
    - Semantic: Meaning matching (25%)
    - Collaborative Filtering: User-based recommendations (30%)
    - Soft Location Scoring
    - Bonus Score: Experience match

    Benefits:
    - "Kế toán" matches "Thu ngân" (semantic)
    - "Lái xe" matches "Tài xế" (semantic)
    - "Users like you also liked..." (collaborative filtering)
    - Exact keyword matches still prioritized (TF-IDF)

    Args:
        request: User profile data

    Returns:
        List of recommended jobs with scores
    """
    try:
        # Use hybrid recommender (TF-IDF + Semantic)
        hybrid = get_hybrid_recommender()

        result = hybrid.recommend(
            skills=request.skills,
            experience=request.experience,
            location=request.location,
            target_job=request.target_job,
            target_salary=request.target_salary,
            preferred_job_type=request.preferred_job_type,
            limit=request.limit,
            allow_remote=request.allow_remote,
            use_semantic=request.use_semantic,
            use_cf=request.use_cf,
            user_id=request.user_id
        )

        return result

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Data file not found: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation error: {str(e)}"
        )


@router.get("/jobs", response_model=dict)
async def get_all_jobs(limit: int = Query(default=50, ge=1, le=100)):
    """
    Lấy danh sách tất cả jobs có sẵn.

    Args:
        limit: Số lượng jobs tối đa

    Returns:
        List of all jobs
    """
    try:
        recommender = get_recommender()
        jobs = recommender.get_all_jobs(limit=limit)

        return {
            "success": True,
            "data": {
                "jobs": jobs,
                "total": len(jobs)
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching jobs: {str(e)}"
        )


@router.get("/jobs/{job_id}", response_model=dict)
async def get_job_by_id(job_id: str):
    """
    Lấy thông tin chi tiết của một job.

    Args:
        job_id: Job ID (vd: job_0001)

    Returns:
        Job details
    """
    try:
        recommender = get_recommender()
        job = recommender.get_job_by_id(job_id)

        if job is None:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {job_id}"
            )

        return {
            "success": True,
            "data": job
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching job: {str(e)}"
        )


# ============================================================================
# RISK PREDICTION ENDPOINTS
# ============================================================================

@router.post("/predict-risk", response_model=RiskPredictionResponse)
async def predict_risk(
    request: Request,
    worker: WorkerFeaturesRequest
):
    """
    Dự đoán mức độ rủi ro thất nghiệp của worker.

    Chiến lược: "Thà bắt nhầm còn hơn bỏ sót"
    - Threshold = 0.15 (thay vì 0.5)
    - Recall (high) = 1.00 - không bỏ sót ai
    - Precision (high) = 0.55 - chấp nhận false alarm

    Args:
        worker: Worker profile

    Returns:
        Risk prediction với level, score, probability, recommendation
    """
    import time
    start_time = time.time()

    try:
        predictor = get_risk_predictor()

        # Convert Pydantic model to dict
        worker_dict = worker.model_dump()

        # Predict
        prediction = predictor.predict(worker_dict)

        # Calculate request time
        request_time = time.time() - start_time

        # Log prediction
        request_id = f"req_{int(time.time() * 1000)}"
        log_prediction(request_id, worker_dict, prediction, request_time)

        if prediction['success']:
            return {
                "success": True,
                "data": prediction
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=prediction.get('error', 'Prediction failed')
            )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model not found: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk prediction error: {str(e)}"
        )


# ============================================================================
# WORKER ANALYSIS ENDPOINT (Risk + Jobs)
# ============================================================================

@router.post("/analyze-worker", response_model=WorkerAnalysisResponse)
async def analyze_worker(
    request: Request,
    worker: WorkerAnalysisRequest
):
    """
    Phân tích toàn diện worker: Risk Prediction + Job Recommendations.

    Kết hợp:
    1. Dự đoán risk level
    2. Gợi ý jobs phù hợp (filtered by risk level)

    Chiến lược filter jobs theo risk:
    - HIGH: Ưu tiên jobs thời vụ, part-time, yêu cầu thấp
    - MEDIUM: Cân bằng stability và growth
    - LOW: Ưu tiên jobs phù hợp skills, có growth potential

    Args:
        worker: Worker profile

    Returns:
        Comprehensive analysis với risk + jobs
    """
    import time
    start_time = time.time()

    try:
        predictor = get_risk_predictor()
        recommender = get_recommender()

        # Convert Pydantic model to dict
        worker_dict = worker.model_dump()

        # Step 1: Predict Risk
        risk_prediction = predictor.predict(worker_dict)

        # Step 2: Get Job Recommendations (filtered by risk)
        risk_level = risk_prediction.get('risk_level', 'medium')

        # Chiến lược filter jobs theo risk level
        job_filter_strategy = "default"
        job_type_filter = None

        if risk_level == 'high':
            # HIGH RISK: Ưu tiên jobs thời vụ, dễ xin
            job_filter_strategy = "high_risk_urgent"
            # Filter: jobs có type = temporary, part-time
            job_type_filter = ['temporary', 'part-time', 'seasonal', 'thời vụ', 'bán thời gian']
            job_type_filter_param = 'temporary'
            job_limit = min(worker.limit, 15)  # Ưu tiên nhiều options hơn

        elif risk_level == 'medium':
            # MEDIUM RISK: Cân bằng
            job_filter_strategy = "medium_risk_balanced"
            job_type_filter_param = worker.preferred_job_type
            job_limit = worker.limit

        else:
            # LOW RISK: Phù hợp skills
            job_filter_strategy = "low_risk_growth"
            job_type_filter_param = worker.preferred_job_type
            job_limit = worker.limit

        # Get jobs (use hybrid recommender for semantic search)
        hybrid = get_hybrid_recommender()
        jobs_result = hybrid.recommend(
            skills=worker.skills,
            experience=worker.experience_years,
            location=None,  # Không filter theo location cho người rủi ro cao
            target_job=worker.target_job,
            target_salary=worker.target_salary,
            preferred_job_type=job_type_filter_param,
            limit=job_limit,
            allow_remote=True,  # Cho phép remote để tăng options
            use_semantic=True
        )

        # Build response
        response = {
            "success": True,
            "data": {
                "worker_analysis": {
                    "worker_id": worker.worker_id,
                    "risk_prediction": {
                        "level": risk_prediction.get('risk_level'),
                        "score": risk_prediction.get('risk_score'),
                        "probability": risk_prediction.get('probability'),
                        "confidence": risk_prediction.get('confidence'),
                        "recommendation": risk_prediction.get('recommendation', {}),
                        "model_info": risk_prediction.get('model_info', {})
                    },
                    "jobs": {
                        "recommended": jobs_result.get('data', {}).get('jobs', []),
                        "total": jobs_result.get('data', {}).get('total', 0),
                        "filter_strategy": job_filter_strategy,
                        "risk_based_filtering": True
                    },
                    "analysis_metadata": {
                        "request_time_ms": round((time.time() - start_time) * 1000, 2),
                        "analyzed_at": datetime.now().isoformat()
                    }
                }
            }
        }

        # Log prediction
        request_id = f"req_{int(time.time() * 1000)}"
        log_prediction(request_id, worker_dict, risk_prediction, time.time() - start_time)

        return response

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Data file not found: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Worker analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Worker analysis error: {str(e)}"
        )


# ============================================================================
# FEATURE IMPORTANCE ENDPOINT
# ============================================================================

@router.get("/feature-importance", response_model=dict)
async def get_feature_importance():
    """
    Lấy feature importance từ model.

    Returns:
        Top 20 features ảnh hưởng đến prediction
    """
    try:
        predictor = get_risk_predictor()
        importance = predictor.get_feature_importance()

        return {
            "success": True,
            "data": {
                "features": importance,
                "model": "xgboost_regularized",
                "threshold": RiskPredictorML.OPTIMAL_THRESHOLD
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching feature importance: {str(e)}"
        )


# ============================================================================
# MODEL INFO ENDPOINT
# ============================================================================

@router.get("/model-info", response_model=dict)
async def get_model_info():
    """
    Lấy thông tin về model đang được sử dụng.

    Returns:
        Model metadata
    """
    try:
        predictor = get_risk_predictor()

        return {
            "success": True,
            "data": {
                "model_type": "xgboost",
                "model_version": "1.0",
                "threshold": RiskPredictorML.OPTIMAL_THRESHOLD,
                "strategy": "humanitarian_recall_focused",
                "description": "XGBoost Regularized với Threshold Optimization cho Recall (High)",
                "metrics": {
                    "recall_high": 1.0,
                    "precision_high": 0.55,
                    "f1_macro": 0.87,
                    "accuracy": 0.95
                }
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching model info: {str(e)}"
        )


# ============================================================================
# SEMANTIC SEARCH ENDPOINTS
# ============================================================================

@router.get("/semantic-status", response_model=dict)
async def get_semantic_status():
    """
    Kiểm tra trạng thái semantic search.

    Returns:
        Semantic search status và model info
    """
    try:
        semantic = get_semantic_search()
        hybrid = get_hybrid_recommender()

        return {
            "success": True,
            "data": {
                "semantic_search": {
                    "available": semantic.is_available,
                    "model_name": SemanticSearch.MODEL_NAME if semantic else None,
                    "initialized": semantic._initialized if semantic else False,
                    "error": semantic._init_error if semantic else None
                },
                "hybrid_mode": {
                    "active": hybrid.is_hybrid_active if hybrid else False,
                    "tfidf_weight": HybridRecommender.TFIDF_WEIGHT,
                    "semantic_weight": HybridRecommender.SEMANTIC_WEIGHT
                }
            }
        }

    except ImportError as e:
        return {
            "success": True,
            "data": {
                "semantic_search": {
                    "available": False,
                    "error": f"sentence-transformers not installed: {str(e)}",
                    "install_hint": "Run: pip install sentence-transformers"
                },
                "hybrid_mode": {
                    "active": False
                }
            }
        }
    except Exception as e:
        return {
            "success": True,
            "data": {
                "semantic_search": {
                    "available": False,
                    "error": str(e)
                },
                "hybrid_mode": {
                    "active": False
                }
            }
        }


@router.get("/jobs/{job_id}/similar", response_model=dict)
async def get_similar_jobs(job_id: str, limit: int = Query(default=5, ge=1, le=20)):
    """
    Tìm jobs tương tự dựa trên semantic search.

    Args:
        job_id: Job ID
        limit: Số lượng jobs tương tự

    Returns:
        List of similar jobs
    """
    try:
        hybrid = get_hybrid_recommender()
        
        if not hybrid.semantic or not hybrid.semantic.is_available:
            raise HTTPException(
                status_code=503,
                detail="Semantic search not available"
            )

        similar_jobs = hybrid.get_similar_jobs(job_id, limit=limit)

        return {
            "success": True,
            "data": {
                "job_id": job_id,
                "similar_jobs": similar_jobs
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar jobs error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error finding similar jobs: {str(e)}"
        )
