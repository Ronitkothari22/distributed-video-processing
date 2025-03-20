import asyncio
import aio_pika
import json
import os
import cv2
import subprocess
import time
from typing import Dict, Any
import logging
from datetime import datetime

from ..config import METADATA_DIR, RABBITMQ_URL, PROCESSING_TIMEOUT
from ..utils.validators import check_ffprobe_availability, validate_video_file

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('metadata_extraction_worker')

class MetadataExtractionWorker:
    def __init__(self, rabbitmq_url: str = RABBITMQ_URL):
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.queue = None
        self.task_exchange = None
        self.status_exchange = None
        self.metadata_dir = METADATA_DIR
        self.ffprobe_available = False
        os.makedirs(self.metadata_dir, exist_ok=True)

    async def startup(self):
        """Run startup checks and initialization"""
        # Check if ffprobe is available
        self.ffprobe_available = check_ffprobe_availability()
        if not self.ffprobe_available:
            logger.warning("FFprobe not available - advanced metadata extraction will be limited")

    async def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()
            
            # Create separate exchanges for tasks and status updates
            self.task_exchange = await self.channel.declare_exchange(
                "video_tasks",
                aio_pika.ExchangeType.FANOUT
            )
            
            self.status_exchange = await self.channel.declare_exchange(
                "processing_status",
                aio_pika.ExchangeType.FANOUT
            )
            
            # Bind only to the task exchange with a unique queue name
            self.queue = await self.channel.declare_queue(
                "metadata_extraction_queue",
                durable=True
            )
            await self.queue.bind(self.task_exchange)
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
            raise

    async def close(self):
        """Close RabbitMQ connection"""
        if self.connection:
            await self.connection.close()
            logger.info("RabbitMQ connection closed")

    async def extract_metadata(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata from the video file"""
        start_time = time.time()
        try:
            file_id = message["file_id"]
            input_path = message["filepath"]
            output_path = os.path.join(
                self.metadata_dir,
                f"{file_id}_metadata.json"
            )

            # Validate the video file
            is_valid, error_message = validate_video_file(input_path)
            if not is_valid:
                raise ValueError(f"Invalid video file: {error_message}")

            # Open video file
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                raise Exception("Failed to open video file")

            # Extract basic video properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            
            metadata = {
                "file_id": file_id,
                "filename": os.path.basename(input_path),
                "format": os.path.splitext(input_path)[1][1:],
                "resolution": {
                    "width": width,
                    "height": height
                },
                "fps": fps,
                "frame_count": frame_count,
                "duration_seconds": int(duration)
            }
            
            # Update progress
            await self.update_status(file_id, "processing", 30)
            
            # Check processing timeout
            if time.time() - start_time > PROCESSING_TIMEOUT:
                raise TimeoutError("Metadata extraction timed out")
            
            # Additional metadata using ffprobe (if available)
            if self.ffprobe_available:
                try:
                    cmd = [
                        "ffprobe",
                        "-v", "quiet",
                        "-print_format", "json",
                        "-show_format",
                        "-show_streams",
                        input_path
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                    if result.returncode == 0:
                        ffprobe_data = json.loads(result.stdout)
                        metadata["advanced"] = ffprobe_data
                        
                        # Extract more user-friendly metadata from ffprobe output
                        if "format" in ffprobe_data:
                            metadata["file_size_bytes"] = int(ffprobe_data["format"].get("size", 0))
                            metadata["bit_rate"] = ffprobe_data["format"].get("bit_rate")
                        
                        # Update progress
                        await self.update_status(file_id, "processing", 70)
                except subprocess.TimeoutExpired:
                    logger.warning(f"ffprobe timed out for file {file_id}")
                except Exception as e:
                    logger.warning(f"Could not extract advanced metadata: {str(e)}")
            else:
                logger.info("Skipping ffprobe metadata extraction (not available)")
                
                # Get file size directly
                try:
                    metadata["file_size_bytes"] = os.path.getsize(input_path)
                except Exception as e:
                    logger.warning(f"Could not get file size: {str(e)}")
            
            # Check processing timeout again
            if time.time() - start_time > PROCESSING_TIMEOUT:
                raise TimeoutError("Metadata extraction timed out")
            
            # Calculate color histogram (sample from first frame)
            ret, frame = cap.read()
            if ret:
                # Calculate color histograms (normalized)
                histograms = {}
                for i, color in enumerate(['b', 'g', 'r']):
                    hist = cv2.calcHist([frame], [i], None, [256], [0, 256])
                    hist = cv2.normalize(hist, hist).flatten().tolist()
                    histograms[color] = hist
                
                # Add dominant color detection
                pixels = frame.reshape(-1, 3)
                
                # Simple approach: take average color
                average_color = pixels.mean(axis=0).astype(int).tolist()
                metadata["color_profile"] = {
                    "histograms": histograms,
                    "average_color": {
                        "b": average_color[0],
                        "g": average_color[1],
                        "r": average_color[2]
                    }
                }
            
            # Release resources
            cap.release()
            
            # Save metadata to file
            try:
                with open(output_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to save metadata to file: {str(e)}")
                # Continue anyway - we'll return the metadata even if we can't save it
            
            # Update progress
            await self.update_status(file_id, "processing", 100)
            
            return {
                "file_id": file_id,
                "status": "completed",
                "output_path": output_path,
                "metadata": metadata,
                "processed_at": datetime.utcnow().isoformat()
            }

        except TimeoutError as e:
            logger.error(f"Timeout extracting metadata: {str(e)}")
            return {
                "file_id": file_id if 'file_id' in locals() else "unknown",
                "status": "failed",
                "error": f"Processing timeout: {str(e)}",
                "processed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")
            return {
                "file_id": file_id if 'file_id' in locals() else "unknown",
                "status": "failed",
                "error": str(e),
                "processed_at": datetime.utcnow().isoformat()
            }

    async def update_status(self, file_id: str, status: str, progress: int = 0, error: str = None):
        """Update processing status via RabbitMQ"""
        status_message = {
            "type": "metadata_extraction_status",
            "file_id": file_id,
            "status": status,
            "progress": progress,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        # Publish to status exchange, not task exchange
        try:
            await self.status_exchange.publish(
                aio_pika.Message(
                    body=json.dumps(status_message).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                ),
                routing_key=""
            )
        except Exception as e:
            logger.error(f"Failed to publish status update: {str(e)}")

    async def process_message(self, message: aio_pika.IncomingMessage):
        """Process incoming message from queue"""
        async with message.process():
            try:
                data = json.loads(message.body.decode())
                logger.info(f"Received message: {data}")
                
                # Validate message structure
                if not isinstance(data, dict):
                    raise ValueError("Message must be a JSON object")
                
                if "file_id" not in data:
                    raise ValueError("Message must contain 'file_id'")
                
                if "filepath" not in data:
                    raise ValueError("Message must contain 'filepath'")
                
                file_id = data["file_id"]
                logger.info(f"Extracting metadata from video: {file_id}")
                
                # Update status to processing
                await self.update_status(file_id, "processing", 0)
                
                # Extract metadata
                result = await self.extract_metadata(data)
                
                # Update final status
                if result["status"] == "completed":
                    await self.update_status(
                        file_id,
                        "completed",
                        100,
                        None
                    )
                else:
                    await self.update_status(
                        file_id,
                        "failed",
                        0,
                        result.get("error")
                    )

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON message: {str(e)}")
                await self.update_status(
                    "unknown",
                    "failed",
                    0,
                    "Invalid message format"
                )
            except ValueError as e:
                logger.error(f"Invalid message structure: {str(e)}")
                await self.update_status(
                    "unknown",
                    "failed",
                    0,
                    str(e)
                )
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                file_id = data.get("file_id", "unknown") if 'data' in locals() else "unknown"
                await self.update_status(
                    file_id,
                    "failed",
                    0,
                    str(e)
                )

    async def start(self):
        """Start the worker"""
        await self.startup()
        await self.connect()
        logger.info("Metadata Extraction Worker started")
        
        try:
            await self.queue.consume(self.process_message)
            while True:
                await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
        finally:
            await self.close()

async def main():
    worker = MetadataExtractionWorker()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(main()) 