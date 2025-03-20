import os
import pytest
import json
import asyncio
from app.workers.metadata_extraction_worker import MetadataExtractionWorker

# Mock test video file path
TEST_VIDEO_PATH = os.path.join("tests", "resources", "test_video.mp4")

# Create resources directory if it doesn't exist
os.makedirs(os.path.join("tests", "resources"), exist_ok=True)

@pytest.fixture
def test_message():
    """Create a test message for metadata extraction"""
    return {
        "file_id": "test_file_id",
        "filepath": TEST_VIDEO_PATH,
        "filename": "test_video.mp4",
        "client_id": "test_client_id",
        "timestamp": "2023-03-20T12:00:00.000000"
    }

@pytest.mark.asyncio
async def test_create_worker():
    """Test that a worker can be created"""
    worker = MetadataExtractionWorker()
    assert worker is not None
    assert worker.metadata_dir == "processed_videos/metadata"

@pytest.mark.asyncio
async def test_update_status():
    """Test status update function"""
    worker = MetadataExtractionWorker()
    # Mock the status exchange
    class MockExchange:
        async def publish(self, message, routing_key):
            data = json.loads(message.body.decode())
            assert data["type"] == "metadata_extraction_status"
            assert data["file_id"] == "test_file_id"
            assert data["status"] == "testing"
            assert data["progress"] == 50
    
    worker.status_exchange = MockExchange()
    await worker.update_status("test_file_id", "testing", 50)

@pytest.mark.skipif(not os.path.exists(TEST_VIDEO_PATH), 
                    reason="Test video file not available")
@pytest.mark.asyncio
async def test_extract_metadata(test_message):
    """Test metadata extraction with a real video file"""
    # This test is skipped if the test video doesn't exist
    worker = MetadataExtractionWorker()
    
    # Mock the update_status method to avoid RabbitMQ dependency
    worker.update_status = lambda file_id, status, progress=0, error=None: None
    
    result = await worker.extract_metadata(test_message)
    
    assert result["file_id"] == test_message["file_id"]
    assert result["status"] == "completed"
    assert "output_path" in result
    assert "metadata" in result
    assert "resolution" in result["metadata"]
    
    # Verify the output file exists
    assert os.path.exists(result["output_path"])
    
    # Clean up the created file
    if os.path.exists(result["output_path"]):
        os.remove(result["output_path"]) 