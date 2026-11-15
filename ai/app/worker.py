"""
Background worker scaffold for processing uploaded photos from a queue.
In Phase 1, this worker polls pending photos from Supabase or a message queue,
fetches the image, extracts face embeddings via FaceDetectorService, and inserts
face records with pgvector embeddings into Supabase.
"""

import time
import logging
from app.services.face_detector import face_detector
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pixsort.ai.worker")

def process_single_photo(photo_id: str, image_url: str):
    logger.info(f"Processing photo {photo_id} from {image_url}")
    # Scaffold: To be implemented in Phase 1
    # 1. Download image from Supabase storage
    # 2. face_detector.extract_faces(image)
    # 3. Store embeddings into Supabase `photo_faces` table
    # 4. Update photo status to 'completed'
    return {"status": "processed", "photo_id": photo_id}

def run_worker_loop():
    logger.info("Starting PixSort AI background queue worker...")
    face_detector.load_model()

    while True:
        try:
            # Poll pending jobs
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Worker stopped by user.")
            break
        except Exception as e:
            logger.error(f"Error in worker loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    run_worker_loop()
