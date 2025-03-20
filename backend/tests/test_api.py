import pytest
from fastapi.testclient import TestClient
import os
from app.main import app

client = TestClient(app)

def test_websocket_connection():
    with client.websocket_connect("/ws/test_client") as websocket:
        data = websocket.receive_text()
        assert data is not None

def test_video_upload():
    # Create a test video file
    test_video_path = "test_video.mp4"
    with open(test_video_path, "wb") as f:
        f.write(b"dummy video content")
    
    # Test video upload
    with open(test_video_path, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("test_video.mp4", f, "video/mp4")},
            params={"client_id": "test_client"}
        )
    
    assert response.status_code == 200
    assert "file_id" in response.json()
    assert "message" in response.json()
    
    # Clean up
    os.remove(test_video_path)

def test_status_endpoints():
    # First upload a video
    test_video_path = "test_video.mp4"
    with open(test_video_path, "wb") as f:
        f.write(b"dummy video content")
    
    with open(test_video_path, "rb") as f:
        upload_response = client.post(
            "/upload",
            files={"file": ("test_video.mp4", f, "video/mp4")},
            params={"client_id": "test_client"}
        )
    
    file_id = upload_response.json()["file_id"]
    
    # Test video enhancement status
    enhancement_response = client.get(f"/internal/video-enhancement-status/{file_id}")
    assert enhancement_response.status_code == 200
    assert "status" in enhancement_response.json()
    
    # Test metadata extraction status
    metadata_response = client.get(f"/internal/metadata-extraction-status/{file_id}")
    assert metadata_response.status_code == 200
    assert "status" in metadata_response.json()
    
    # Clean up
    os.remove(test_video_path)

def test_invalid_video_upload():
    # Test with non-video file
    test_file_path = "test.txt"
    with open(test_file_path, "w") as f:
        f.write("dummy text content")
    
    with open(test_file_path, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("test.txt", f, "text/plain")},
            params={"client_id": "test_client"}
        )
    
    assert response.status_code == 400
    assert "File must be a video" in response.json()["detail"]
    
    # Clean up
    os.remove(test_file_path) 