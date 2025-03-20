import pytest
import asyncio
import os
import cv2
import numpy as np
from app.workers.video_enhancement_worker import VideoEnhancementWorker

@pytest.fixture
def sample_video():
    """Create a sample video file for testing"""
    output_path = "test_video.mp4"
    fps = 30
    width, height = 640, 480
    duration = 2  # seconds
    
    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Generate frames
    for _ in range(fps * duration):
        # Create a frame with some pattern
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        cv2.rectangle(frame, (100, 100), (300, 300), (255, 255, 255), -1)
        out.write(frame)
    
    out.release()
    yield output_path
    
    # Cleanup
    if os.path.exists(output_path):
        os.remove(output_path)

@pytest.mark.asyncio
async def test_video_enhancement_worker(sample_video):
    """Test the video enhancement worker"""
    worker = VideoEnhancementWorker()
    
    # Test connection
    await worker.connect()
    assert worker.connection is not None
    assert worker.channel is not None
    assert worker.queue is not None
    assert worker.exchange is not None
    
    # Test video processing
    message = {
        "file_id": "test_123",
        "filepath": sample_video
    }
    
    result = await worker.process_video(message)
    assert result["status"] == "completed"
    assert "output_path" in result
    assert os.path.exists(result["output_path"])
    
    # Verify enhanced video
    cap = cv2.VideoCapture(result["output_path"])
    assert cap.isOpened()
    
    # Read first frame
    ret, frame = cap.read()
    assert ret
    assert frame.shape == (480, 640, 3)
    
    cap.release()
    
    # Cleanup
    if os.path.exists(result["output_path"]):
        os.remove(result["output_path"])
    
    await worker.close()

@pytest.mark.asyncio
async def test_status_updates():
    """Test status update functionality"""
    worker = VideoEnhancementWorker()
    await worker.connect()
    
    # Test status update
    await worker.update_status("test_123", "processing", 50)
    await worker.update_status("test_123", "completed", 100)
    
    await worker.close()

@pytest.mark.asyncio
async def test_error_handling():
    """Test error handling in video processing"""
    worker = VideoEnhancementWorker()
    await worker.connect()
    
    # Test with non-existent file
    message = {
        "file_id": "test_456",
        "filepath": "non_existent.mp4"
    }
    
    result = await worker.process_video(message)
    assert result["status"] == "failed"
    assert "error" in result
    
    await worker.close() 