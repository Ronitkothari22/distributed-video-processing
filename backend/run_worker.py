import asyncio
import logging
import argparse
from app.workers.video_enhancement_worker import VideoEnhancementWorker
from app.workers.metadata_extraction_worker import MetadataExtractionWorker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run a specific worker")
    parser.add_argument(
        "--worker",
        type=str,
        choices=["video-enhancement", "metadata-extraction"],
        default="video-enhancement",
        help="Worker type to run (video-enhancement or metadata-extraction)"
    )
    args = parser.parse_args()
    
    try:
        if args.worker == "video-enhancement":
            worker = VideoEnhancementWorker()
            logger.info("Starting Video Enhancement Worker...")
            await worker.start()
        elif args.worker == "metadata-extraction":
            worker = MetadataExtractionWorker()
            logger.info("Starting Metadata Extraction Worker...")
            await worker.start()
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")
    except Exception as e:
        logger.error(f"Worker error: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 