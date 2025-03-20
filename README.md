# Distributed Video Processing System

A scalable system for video processing with distributed workers.

## Overview

This system provides a robust, distributed architecture for video processing, featuring:

- **FastAPI Backend**: Handles HTTP requests and WebSocket connections
- **Video Enhancement Worker**: Processes videos to enhance quality
- **Metadata Extraction Worker**: Extracts metadata from videos
- **RabbitMQ**: Used for message passing between components
- **State Management**: Tracks processing status with file locking

## System Architecture

```
                   ┌─────────────┐
                   │   Client    │
                   └──────┬──────┘
                          │
                          ▼
┌──────────────────────────────────────┐
│               FastAPI                │
│  ┌───────────┐        ┌───────────┐  │
│  │   REST    │        │ WebSocket │  │
│  │ Endpoints │        │  Server   │  │
│  └─────┬─────┘        └─────┬─────┘  │
└────────┼────────────────────┼────────┘
         │                    │
         ▼                    ▼
┌──────────────┐      ┌─────────────────┐
│   RabbitMQ   │      │   State Store   │
│   (Queue)    │      │  (File-based)   │
└──────┬───┬───┘      └─────────────────┘
       │   │
       │   └────────────────┐
       │                    │
       ▼                    ▼
┌─────────────────┐ ┌─────────────────┐
│      Video      │ │    Metadata     │
│   Enhancement   │ │   Extraction    │
│     Worker      │ │     Worker      │
└─────────────────┘ └─────────────────┘
```

## Prerequisites

- Python 3.8+
- RabbitMQ
- OpenCV
- FFmpeg (optional, for advanced features)

## Configuration

The system is highly configurable through environment variables or the default `config.py` file:

| Variable | Description | Default |
|----------|-------------|---------|
| RABBITMQ_URL | RabbitMQ connection URL | amqp://guest:guest@localhost/ |
| MAX_FILE_SIZE_MB | Maximum file size in MB | 500 |
| PROCESSING_TIMEOUT | Processing timeout in seconds | 300 |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:3000,http://localhost:8000 |
| LOG_LEVEL | Logging level | INFO |

See `backend/app/config.py` for all available configuration options.

## Features

### Video Enhancement
- Contrast enhancement
- Sharpening
- Thumbnail generation
- Format validation

### Metadata Extraction
- Video properties (resolution, fps, duration)
- Color histogram analysis
- Advanced metadata with FFprobe (if available)

### Reliability Features
- File locking for state management
- RabbitMQ connection resilience
- FFprobe availability check
- Video format validation
- Processing timeouts

## Installation & Setup

1. Clone this repository
```bash
git clone https://github.com/yourusername/distributed-video-processing.git
cd distributed-video-processing
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Start RabbitMQ
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

4. Start the FastAPI server
```bash
cd backend
uvicorn app.main:app --reload
```

5. Start the workers (in separate terminals)
```bash
# Video Enhancement Worker
python -m app.workers.video_enhancement_worker

# Metadata Extraction Worker
python -m app.workers.metadata_extraction_worker
```

## API Endpoints

- `POST /api/videos/upload` - Upload a new video
- `GET /api/videos/{video_id}` - Get video details
- `GET /api/videos/{video_id}/status` - Get processing status
- `GET /api/videos/{video_id}/metadata` - Get extracted metadata
- `GET /api/videos/{video_id}/thumbnail` - Get video thumbnail
- `GET /api/videos/{video_id}/download` - Download processed video
- `WS /ws/status` - WebSocket for real-time status updates

## WebSocket Interface

Connect to the WebSocket server to receive real-time status updates:

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/status");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Processing status:", data);
};
```

## Development

### Code Structure

```
backend/
  ├── app/
  │   ├── config.py            # Configuration settings
  │   ├── main.py              # FastAPI application
  │   ├── api/                 # API routes
  │   ├── models/              # Data models
  │   ├── services/            # Business logic
  │   ├── utils/               # Utility functions
  │   │   ├── rabbitmq.py      # RabbitMQ client
  │   │   ├── state.py         # State management
  │   │   └── validators.py    # Input validation
  │   └── workers/             # Background workers
  ├── tests/                   # Test files
  └── alembic/                 # Database migrations
```

## Error Handling

The system has been designed with comprehensive error handling:

- Video format validation
- File size limits
- Processing timeouts
- Connection recovery
- File locking for concurrent access
- FFprobe availability checks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.