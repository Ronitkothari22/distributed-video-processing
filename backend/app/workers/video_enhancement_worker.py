import os
import time
import logging
import cv2
import numpy as np
import aio_pika
import json
import asyncio
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from shutil import which

from ..config import (
    RABBITMQ_URL, 
    PROCESSING_TIMEOUT,
    PROCESSED_DIR,
    METADATA_DIR,
    THUMBNAILS_DIR,
    MAX_PROCESSING_ATTEMPTS
)
from ..utils.validators import check_ffprobe_availability, validate_video_file

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('video_enhancement_worker')

class VideoEnhancementWorker:
    def __init__(self, rabbitmq_url: str = RABBITMQ_URL):
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.queue = None
        self.task_exchange = None
        self.status_exchange = None
        self.processed_dir = PROCESSED_DIR
        self.thumbnails_dir = THUMBNAILS_DIR
        self.ffprobe_available = False
        os.makedirs(self.processed_dir, exist_ok=True)
        os.makedirs(self.thumbnails_dir, exist_ok=True)
        
    async def startup(self):
        """Run startup checks and initialization"""
        # Check if ffprobe is available
        self.ffprobe_available = check_ffprobe_availability()
        if not self.ffprobe_available:
            logger.warning("FFprobe not available - some enhancement features will be limited")

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
                "video_enhancement_queue",
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

    async def enhance_video(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance the video file with various techniques"""
        start_time = time.time()
        temp_output_path = None
        try:
            file_id = message["file_id"]
            input_path = message["filepath"]
            filename = os.path.basename(input_path)
            base_name, extension = os.path.splitext(filename)
            enhanced_filename = f"{base_name}_enhanced{extension}"
            output_path = os.path.join(
                self.processed_dir,
                enhanced_filename
            )
            # Create a temporary path for intermediate output
            temp_output_path = os.path.join(
                self.processed_dir,
                f"{base_name}_temp{extension}"
            )
            thumbnail_path = os.path.join(
                self.thumbnails_dir,
                f"{file_id}_thumbnail.jpg"
            )
            
            # Validate the video file
            is_valid, error_message = validate_video_file(input_path)
            if not is_valid:
                raise ValueError(f"Invalid video file: {error_message}")
            
            # Update progress
            await self.update_status(file_id, "processing", 10)
            
            # Apply enhancement using OpenCV
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                raise Exception("Failed to open video file")
            
            # Get video properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Create video writer with codec that has good browser support
            # Try multiple codecs in order of preference
            codec_successful = False
            preferred_codecs = ['avc1', 'H264', 'h264', 'XVID', 'mp4v']
            
            for codec in preferred_codecs:
                try:
                    fourcc = cv2.VideoWriter_fourcc(*codec)
                    out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))
                    
                    if out.isOpened():
                        logger.info(f"Successfully created video writer with codec: {codec}")
                        codec_successful = True
                        break
                    else:
                        logger.warning(f"Failed to create video writer with codec: {codec}")
                except Exception as e:
                    logger.warning(f"Error using codec {codec}: {str(e)}")
            
            if not codec_successful:
                # Fallback to default codec as last resort
                logger.warning("All preferred codecs failed, using default codec")
                out = cv2.VideoWriter(temp_output_path, 0, fps, (width, height))
            
            if not out.isOpened():
                raise Exception("Failed to create output video file with any codec")
            
            # Process frame by frame
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            processed_frames = 0
            saved_thumbnail = False
            
            while True:
                # Check for timeout
                if time.time() - start_time > PROCESSING_TIMEOUT:
                    raise TimeoutError("Video enhancement timed out")
                
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Apply enhancement to the frame
                enhanced_frame = self.enhance_frame(frame)
                
                # Write the frame to output video
                out.write(enhanced_frame)
                
                # Save thumbnail from first enhanced frame
                if not saved_thumbnail:
                    cv2.imwrite(thumbnail_path, enhanced_frame)
                    saved_thumbnail = True
                
                # Update progress every 10% of frames
                processed_frames += 1
                if processed_frames % max(1, int(total_frames / 10)) == 0:
                    progress = min(90, int(processed_frames / total_frames * 90))
                    await self.update_status(file_id, "processing", progress)
            
            # Release video objects
            cap.release()
            out.release()
            
            # Update progress
            await self.update_status(file_id, "processing", 95)
            
            # Post-process the video to ensure browser compatibility
            is_converted = await self.convert_to_web_compatible(temp_output_path or output_path, output_path)
            if not is_converted and temp_output_path:
                # If conversion failed, but we have an OpenCV output, just use that
                logger.warning(f"FFmpeg conversion failed, using original OpenCV output for {file_id}")
                if os.path.exists(temp_output_path) and os.path.getsize(temp_output_path) > 0:
                    import shutil
                    shutil.copy2(temp_output_path, output_path)
            
            # Clean up temporary file
            if temp_output_path and os.path.exists(temp_output_path):
                try:
                    os.remove(temp_output_path)
                except Exception as e:
                    logger.warning(f"Failed to remove temporary file {temp_output_path}: {e}")
            
            # Update to completed status
            await self.update_status(file_id, "completed", 100)
            
            # Return processing result
            return {
                "file_id": file_id,
                "status": "completed",
                "output_path": output_path,
                "thumbnail_path": thumbnail_path if os.path.exists(thumbnail_path) else None,
                "enhancement_type": "default",
                "processed_at": datetime.utcnow().isoformat()
            }
        
        except TimeoutError as e:
            logger.error(f"Timeout enhancing video: {str(e)}")
            return {
                "file_id": file_id if 'file_id' in locals() else "unknown",
                "status": "failed",
                "error": f"Processing timeout: {str(e)}",
                "processed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error enhancing video: {str(e)}")
            return {
                "file_id": file_id if 'file_id' in locals() else "unknown",
                "status": "failed",
                "error": str(e),
                "processed_at": datetime.utcnow().isoformat()
            }
        finally:
            # Clean up any remaining resources
            try:
                if 'cap' in locals() and cap is not None:
                    cap.release()
                if 'out' in locals() and out is not None:
                    out.release()
            except Exception as e:
                logger.error(f"Error during cleanup: {str(e)}")

    def enhance_frame(self, frame):
        """Apply video enhancement techniques to a single frame"""
        try:
            # Convert to float for processing
            frame_float = frame.astype(np.float32) / 255.0
            
            # Apply contrast enhancement (simple method)
            alpha = 1.2  # Contrast control (1.0-3.0)
            beta = 10    # Brightness control (0-100)
            
            # Apply contrast enhancement
            enhanced = cv2.convertScaleAbs(frame, alpha=alpha, beta=beta)
            
            # Apply slight sharpening
            kernel = np.array([[-1,-1,-1], 
                               [-1, 9,-1],
                               [-1,-1,-1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
            # Return enhanced frame
            return enhanced
        except Exception as e:
            logger.error(f"Error enhancing frame: {str(e)}")
            # Return original frame if enhancement fails
            return frame

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
                logger.info(f"Enhancing video: {file_id}")
                
                # Check if file exists
                if not os.path.exists(data["filepath"]):
                    raise FileNotFoundError(f"Video file not found: {data['filepath']}")
                
                # Update status to processing
                await self.update_status(file_id, "processing", 0)
                
                # Process the video enhancement
                result = await self.enhance_video(data)
                
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
        logger.info("Video Enhancement Worker started")
        
        try:
            await self.queue.consume(self.process_message)
            while True:
                await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
        finally:
            await self.close()

    async def convert_to_web_compatible(self, input_path: str, output_path: str) -> bool:
        """
        Converts video to web-compatible format using ffmpeg.
        Returns True if successful, False otherwise.
        """
        # Check if ffmpeg is available
        if not which('ffmpeg'):
            logger.warning("FFmpeg not found, skipping conversion to web-compatible format")
            return False
        
        try:
            # If input and output paths are the same, create a temporary file
            using_temp = False
            if input_path == output_path:
                using_temp = True
                temp_output = f"{output_path}.temp.mp4"
            else:
                temp_output = output_path
            
            # FFmpeg command to convert to web-compatible H.264
            cmd = [
                'ffmpeg',
                '-i', input_path,
                '-c:v', 'libx264',  # H.264 video codec
                '-preset', 'fast',   # Encoding speed/quality balance
                '-crf', '22',        # Quality (lower is better, 18-28 is reasonable)
                '-c:a', 'aac',       # AAC audio codec
                '-b:a', '128k',      # Audio bitrate
                '-movflags', '+faststart',  # Optimize for web streaming
                '-y',                # Overwrite output file if it exists
                temp_output
            ]
            
            logger.info(f"Running FFmpeg conversion: {' '.join(cmd)}")
            
            # Run FFmpeg
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            # If using a temp file and conversion was successful, replace the original
            if using_temp and process.returncode == 0:
                if os.path.exists(temp_output) and os.path.getsize(temp_output) > 0:
                    if os.path.exists(output_path):
                        os.remove(output_path)
                    os.rename(temp_output, output_path)
                else:
                    logger.error(f"FFmpeg produced an empty or missing file: {temp_output}")
                    return False
            
            if process.returncode != 0:
                logger.error(f"FFmpeg conversion failed: {stderr.decode()}")
                return False
                
            logger.info(f"Successfully converted video to web-compatible format: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error during FFmpeg conversion: {str(e)}")
            return False

async def main():
    worker = VideoEnhancementWorker()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(main()) 