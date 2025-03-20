import asyncio
import aio_pika
import json
import os
import cv2
from typing import Dict, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('video_enhancement_worker')

class VideoEnhancementWorker:
    def __init__(self, rabbitmq_url: str = "amqp://guest:guest@localhost/"):
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.queue = None
        self.task_exchange = None
        self.status_exchange = None
        self.processed_dir = "processed_videos"
        os.makedirs(self.processed_dir, exist_ok=True)

    async def connect(self):
        """Establish connection to RabbitMQ"""
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
        
        # Bind only to the task exchange
        self.queue = await self.channel.declare_queue(
            "video_enhancement_queue",
            durable=True
        )
        await self.queue.bind(self.task_exchange)

    async def close(self):
        """Close RabbitMQ connection"""
        if self.connection:
            await self.connection.close()

    async def process_video(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Process the video file with enhancements"""
        try:
            file_id = message["file_id"]
            input_path = message["filepath"]
            output_path = os.path.join(
                self.processed_dir,
                f"enhanced_{os.path.basename(input_path)}"
            )

            # Open video file
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                raise Exception("Failed to open video file")

            # Get video properties
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Create video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

            frame_count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Apply video enhancements
                # 1. Increase contrast
                lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
                cl = clahe.apply(l)
                enhanced = cv2.merge((cl,a,b))
                enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

                # 2. Denoise
                enhanced = cv2.fastNlMeansDenoisingColored(enhanced, None, 10, 10, 7, 21)

                # Write enhanced frame
                out.write(enhanced)
                frame_count += 1

                # Simulate progress updates
                if frame_count % 30 == 0:  # Update every 30 frames
                    progress = int((frame_count / total_frames) * 100)
                    await self.update_status(file_id, "processing", progress)

            # Release resources
            cap.release()
            out.release()

            return {
                "file_id": file_id,
                "status": "completed",
                "output_path": output_path,
                "processed_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error processing video: {str(e)}")
            return {
                "file_id": file_id,
                "status": "failed",
                "error": str(e),
                "processed_at": datetime.utcnow().isoformat()
            }

    async def update_status(self, file_id: str, status: str, progress: int = 0, error: str = None):
        """Update processing status via RabbitMQ"""
        status_message = {
            "type": "video_enhancement_status",
            "file_id": file_id,
            "status": status,
            "progress": progress,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        # Publish to status exchange, not task exchange
        await self.status_exchange.publish(
            aio_pika.Message(body=json.dumps(status_message).encode()),
            routing_key=""
        )

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
                logger.info(f"Processing video: {file_id}")
                
                # Update status to processing
                await self.update_status(file_id, "processing", 0)
                
                # Process the video
                result = await self.process_video(data)
                
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
        await self.connect()
        logger.info("Video Enhancement Worker started")
        
        try:
            await self.queue.consume(self.process_message)
            while True:
                await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
        finally:
            await self.close()

async def main():
    worker = VideoEnhancementWorker()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(main()) 