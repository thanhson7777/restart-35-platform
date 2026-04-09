"""
Restart-35 AI Service
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import os

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
    AI Service cho nền tảng Restart-35
    - Job Recommendation (TF-IDF + Hybrid Scoring)
    - Risk Prediction (Random Forest)
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


# Import routers
from routers.ai import router as ai_router

# Register routers
app.include_router(ai_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Restart-35 AI Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Global health check"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Restart-35 AI Service starting...")
    logger.info(f"📂 Data path: {os.getenv('AI_DATA_PATH', './data')}")
    logger.info("✅ Service ready!")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 Restart-35 AI Service shutting down...")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("AI_SERVICE_HOST", "localhost")
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
