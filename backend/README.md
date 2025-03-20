# Distributed Video Processing Backend

This is the backend service for the distributed video processing pipeline. It handles video uploads, task distribution, and status management.

## Features

- Video upload and storage
- Real-time status updates via WebSocket
- Task distribution via RabbitMQ
- Video enhancement processing
- Metadata extraction (coming soon)

## Prerequisites

- Python 3.11+
- RabbitMQ server
- OpenCV (for video processing)

## Installation

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start RabbitMQ server:
```bash
# On Arch Linux
sudo systemctl start rabbitmq
sudo systemctl enable rabbitmq
```

## Running the Services

1. Start the FastAPI server:
```bash
cd backend
uvicorn app.main:app --reload
```

2. Start the Video Enhancement Worker:
```bash
cd backend
python run_worker.py
```

## Testing

Run the test suite:
```bash
pytest tests/ -v
```

## API Endpoints

### WebSocket
- `ws://localhost:8000/ws/{client_id}` - WebSocket connection for real-time updates

### HTTP Endpoints
- `POST /upload` - Upload a video file
  - Parameters:
    - `file`: Video file (multipart/form-data)
    - `client_id`: Client identifier (optional)
  - Returns: Upload status and file ID

- `GET /internal/video-enhancement-status/{file_id}` - Get video enhancement status
  - Returns: Current status and progress

- `GET /internal/metadata-extraction-status/{file_id}` - Get metadata extraction status
  - Returns: Current status and progress

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── rabbitmq.py
│   │   └── state.py
│   └── workers/
│       ├── __init__.py
│       └── video_enhancement_worker.py
├── tests/
│   ├── __init__.py
│   ├── test_api.py
│   └── test_video_enhancement_worker.py
├── requirements.txt
├── run_worker.py
└── README.md
```

## Development

1. The FastAPI server handles video uploads and distributes tasks via RabbitMQ
2. The Video Enhancement Worker processes videos and reports status back
3. Real-time updates are sent to connected clients via WebSocket
4. All processing status is tracked in the state management system

## Testing with Postman

1. Create a new WebSocket request:
   - URL: `ws://localhost:8000/ws/test_client`
   - This will establish a connection for real-time updates

2. Create a video upload request:
   - Method: POST
   - URL: `http://localhost:8000/upload`
   - Body: form-data
     - Key: `file` (Type: File)
     - Key: `client_id` (Type: Text, Value: test_client)

3. Monitor status endpoints:
   - GET `http://localhost:8000/internal/video-enhancement-status/{file_id}`
   - GET `http://localhost:8000/internal/metadata-extraction-status/{file_id}`

## Error Handling

- Invalid file types are rejected during upload
- Failed processing attempts are reported via status endpoints
- WebSocket connections are automatically cleaned up
- RabbitMQ connection issues are handled gracefully

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security Considerations

- CORS is configured for development (should be restricted in production)
- File uploads are validated for content type
- Unique file IDs are generated using UUID
- WebSocket connections require client identification

## Next Steps

1. Implement video enhancement worker
2. Implement metadata extraction worker
3. Add database integration for state management
4. Implement proper authentication
5. Add rate limiting and other security measures 