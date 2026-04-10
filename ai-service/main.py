# -*- coding: utf-8 -*-
"""
Restart-35 AI Service
FastAPI Application Entry Point
===============================
AI Service cho nền tảng Restart-35:
- Job Recommendation (TF-IDF + Hybrid Scoring)
- Risk Prediction (XGBoost Regularized + Threshold Optimization)
- Worker Analysis (Risk + Jobs kết hợp)

Tác giả: Thanh Son
Ngày: 2026-04-10
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging
import os
import time
from pathlib import Path
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Restart-35 AI Service",
    description="""
    AI Service cho nền tảng Restart-35 - Tái hòa nhập lao động trung niên.

    ## Tính năng chính

    ### 1. Job Recommendation
    - TF-IDF Vectorization cho skills + title
    - Hybrid Scoring: Base Score + Salary + Job Type
    - Filter by location, experience, salary

    ### 2. Risk Prediction
    - XGBoost Regularized với Threshold Optimization
    - Chiến lược: "Thà bắt nhầm còn hơn bỏ sót"
    - Threshold = 0.15 để đạt Recall (High) = 1.00

    ### 3. Worker Analysis
    - Kết hợp Risk Prediction + Job Recommendation
    - Filter jobs theo risk level
    - Ưu tiên hỗ trợ người có risk cao

    ## Chiến lược nhân văn

    Hệ thống ưu tiên RECALL cho class "high" (rủi ro cao) để đảm bảo:
    - Không một ai có rủi ro cao bị bỏ sót
    - Chấp nhận Precision thấp hơn để đổi lấy Recall cao hơn
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả origins trong dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# MIDDLEWARE: Request Logging
# =============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware để log mọi request/response.
    Dùng cho việc theo dõi và debug.
    """
    start_time = time.time()

    # Log request
    logger.info(f"📥 {request.method} {request.url.path}")

    # Process request
    response = await call_next(request)

    # Calculate processing time
    process_time = time.time() - start_time

    # Log response
    logger.info(f"📤 {request.method} {request.url.path} - {response.status_code} ({process_time*1000:.1f}ms)")

    # Add custom header
    response.headers["X-Process-Time"] = str(process_time)

    return response


# =============================================================================
# Import routers
# =============================================================================

from routers.ai import router as ai_router

# Register routers
app.include_router(ai_router)


# =============================================================================
# Root Endpoints
# =============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Restart-35 AI Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "description": "AI Service cho nền tảng Restart-35 - Tái hòa nhập lao động trung niên"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Global health check"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# Startup & Shutdown Events
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Startup event - Pre-load models vào memory.
    Đảm bảo Response Time < 50ms khi inference.
    """
    logger.info("=" * 60)
    logger.info("🚀 Restart-35 AI Service starting...")
    logger.info("=" * 60)

    # Create logs directory
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    logger.info(f"📁 Logs directory: {logs_dir}")

    # Create data directories
    data_dir = Path(__file__).parent / "data"
    models_dir = Path(__file__).parent / "models"

    logger.info(f"📁 Data path: {data_dir}")
    logger.info(f"📁 Models path: {models_dir}")

    # Check model files
    risk_model = models_dir / "risk_predictor_tuned.pkl"
    if risk_model.exists():
        logger.info(f"✅ Risk model found: {risk_model}")
    else:
        logger.warning(f"⚠️  Risk model not found: {risk_model}")
        logger.warning("   Vui lòng chạy training: scripts/ml/4_train_risk_model.py")

    # Check job data
    jobs_file = data_dir / "jobs.csv"
    if jobs_file.exists():
        logger.info(f"✅ Jobs data found: {jobs_file}")
    else:
        logger.warning(f"⚠️  Jobs data not found: {jobs_file}")

    # Log prediction logs
    prediction_log = logs_dir / "predictions.jsonl"
    logger.info(f"📝 Prediction log: {prediction_log}")

    logger.info("=" * 60)
    logger.info("✅ Service ready!")
    logger.info("=" * 60)
    logger.info("")
    logger.info("📌 Available Endpoints:")
    logger.info("   • GET  /health              - Health check")
    logger.info("   • POST /api/v1/ai/health    - AI service health")
    logger.info("   • POST /api/v1/ai/recommend-jobs - Job recommendation")
    logger.info("   • POST /api/v1/ai/predict-risk   - Risk prediction")
    logger.info("   • POST /api/v1/ai/analyze-worker - Worker analysis")
    logger.info("   • GET  /api/v1/ai/model-info - Model information")
    logger.info("")
    logger.info(f"📚 API Docs: http://localhost:8000/docs")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event - Cleanup resources."""
    logger.info("👋 Restart-35 AI Service shutting down...")
    logger.info("✅ Cleanup completed!")


# =============================================================================
# Error Handlers
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"❌ Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") else "Internal server error"
        }
    )


# =============================================================================
# Run Server
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
