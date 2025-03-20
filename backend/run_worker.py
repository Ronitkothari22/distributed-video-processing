import asyncio
import logging
from app.workers.video_enhancement_worker import VideoEnhancementWorker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    try:
        worker = VideoEnhancementWorker()
        logger.info("Starting Video Enhancement Worker...")
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")
    except Exception as e:
        logger.error(f"Worker error: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 