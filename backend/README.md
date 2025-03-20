# Distributed Video Processing - Backend

This is the backend component of the distributed video processing pipeline. It consists of a FastAPI server and two workers for video enhancement and metadata extraction.

## Components

1. FastAPI Server
   - Handles video uploads
   - Manages WebSocket connections
   - Coordinates with workers
   - Provides status updates

2. Video Enhancement Worker
   - Processes video enhancement tasks
   - Performs video modifications
   - Reports processing status

3. Metadata Extraction Worker
   - Extracts video metadata
   - Processes video information
   - Reports extraction status

## Setup Instructions

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install and start RabbitMQ:
   ```bash
   # For Linux
   sudo apt-get install rabbitmq-server
   sudo systemctl start rabbitmq-server
   ```

3. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Start the workers:
   ```bash
   # In separate terminals
   python -m app.workers.video_enhancement_worker
   python -m app.workers.metadata_extraction_worker
   ```

## API Endpoints

- `POST /upload`: Upload video files
- `WS /ws`: WebSocket connection for real-time updates
- `POST /internal/video-enhancement-status`: Worker status updates
- `POST /internal/metadata-extraction-status`: Worker status updates

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── workers/             # Worker implementations
│   └── utils/              # Utility functions
├── requirements.txt        # Python dependencies
└── README.md              # This file
``` 