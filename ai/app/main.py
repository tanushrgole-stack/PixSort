from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api.routes import router as api_router
from app.services.face_detector import face_detector
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pixsort.ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PixSort AI Service...")
    # Attempt to load InsightFace model on startup
    face_detector.load_model()
    yield
    logger.info("Shutting down PixSort AI Service...")

app = FastAPI(
    title="PixSort AI Service",
    description="Face detection, embedding extraction, and clustering service for PixSort",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "service": "PixSort AI Service",
        "docs": "/docs",
        "health": "/api/v1/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
