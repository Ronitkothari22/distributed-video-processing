# Distributed Video Processing Backend

This is the backend service for the distributed video processing pipeline. It handles video uploads, task distribution, and status management.

## Features

- Video upload and storage
- Real-time status updates via WebSocket
- Task distribution via RabbitMQ
- Video enhancement processing
- Metadata extraction

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

1. **Start all services at once (recommended)**:
   ```bash
   cd backend
   chmod +x start_services.sh  # Make sure it's executable
   ./start_services.sh
   ```
   This script will start the FastAPI server, Video Enhancement Worker, and Metadata Extraction Worker simultaneously, with proper error handling and cleanup.

2. **Or start each service individually**:

   a. Start the FastAPI server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

   b. Start the Video Enhancement Worker:
   ```bash
   cd backend
   python run_worker.py --worker video-enhancement
   ```

   c. Start the Metadata Extraction Worker:
   ```bash
   cd backend
   python run_worker.py --worker metadata-extraction
   ```

For a complete distributed system, all three services must be running simultaneously.

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
│       ├── video_enhancement_worker.py
│       └── metadata_extraction_worker.py
├── tests/
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_video_enhancement_worker.py
│   └── test_metadata_extraction_worker.py
├── docs/                          # Generated API documentation
│   ├── index.html
│   └── openapi.json
├── processed_videos/              # Output directory for processed videos
│   └── metadata/                  # Output directory for metadata
├── uploads/                       # Storage for uploaded videos
├── API_DOCUMENTATION.md           # Detailed API documentation
├── generate_api_docs.py           # Script to generate OpenAPI docs
├── update_metadata_docs.py        # Script to update API docs with metadata examples
├── Video_Processing_API.postman_collection.json # Postman collection
├── start_services.sh              # Script to start all services
├── processing_states.json         # State tracking data
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

1. Import the provided Postman collection:
   - File: `Video_Processing_API.postman_collection.json`
   - This collection includes all endpoints and a script to automatically capture the file_id

2. Create a new WebSocket request:
   - URL: `ws://localhost:8000/ws/test_client`
   - This will establish a connection for real-time updates

3. Create a video upload request:
   - Method: POST
   - URL: `http://localhost:8000/upload`
   - Body: form-data
     - Key: `file` (Type: File)
     - Key: `client_id` (Type: Text, Value: test_client)

4. Monitor status endpoints:
   - GET `http://localhost:8000/internal/video-enhancement-status/{file_id}`
   - GET `http://localhost:8000/internal/metadata-extraction-status/{file_id}`

Note: The Postman collection automatically saves the file_id from the upload response as a collection variable, making it easier to check statuses.

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



## API Documentation

### Static Documentation

Detailed API documentation is available in the `API_DOCUMENTATION.md` file, which describes all endpoints, request/response formats, and examples.

### Interactive Documentation

FastAPI provides interactive API documentation using Swagger UI and ReDoc:

1. While the FastAPI server is running, visit:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

2. Generate static API documentation:
```bash
cd backend
./generate_api_docs.py
cd docs
python -m http.server 8080
```

Then visit `http://localhost:8080` in your browser to view the static documentation.

### Documentation Utilities

Several scripts are provided to help with documentation:

1. `generate_api_docs.py` - Generates OpenAPI/Swagger documentation
2. `update_metadata_docs.py` - Updates API documentation with real metadata examples

```bash
# Generate OpenAPI docs
./generate_api_docs.py

# Update metadata examples in documentation
./update_metadata_docs.py
```

### Postman Collection

A Postman collection is provided for testing the API:
- File: `Video_Processing_API.postman_collection.json`
- Import this into Postman to quickly test all endpoints 