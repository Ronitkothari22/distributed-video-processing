# Distributed Video Processing System

A scalable system for video processing with distributed workers.

## Overview

This system provides a robust, distributed architecture for video processing, featuring:

- **FastAPI Backend**: Handles HTTP requests and WebSocket connections
- **Video Enhancement Worker**: Processes videos to enhance quality
- **Metadata Extraction Worker**: Extracts metadata from videos
- **RabbitMQ**: Used for message passing between components
- **State Management**: Tracks processing status with file locking
- **Browser-Compatible Video Processing**: Ensures videos are playable across modern browsers

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
- FFmpeg (required for browser-compatible video processing)

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
- Browser-compatible codec conversion (H.264/AAC)
- Adaptive multi-codec processing pipeline

### Metadata Extraction
- Video properties (resolution, fps, duration)
- Color histogram analysis
- Advanced metadata with FFprobe (if available)

### Media Streaming Capabilities
- HTTP range requests support for efficient video streaming
- Proper MIME type handling for various formats
- Cross-origin resource sharing headers for better integration

### Frontend Video Player
- Resilient video loading with retry mechanism
- Multi-format source specification for browser compatibility
- Comprehensive error handling and user feedback
- Advanced video controls (play/pause, fullscreen, download)

### Reliability Features
- File locking for state management
- RabbitMQ connection resilience
- FFprobe availability check
- Video format validation
- Processing timeouts
- Graceful fallback for codec availability
- Client connection tracking and error recovery

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

6. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /upload` - Upload a new video
- `GET /internal/video-enhancement-status/{file_id}` - Get video enhancement status
- `GET /internal/metadata-extraction-status/{file_id}` - Get metadata extraction status
- `GET /processed_videos/{file_id}` - Stream processed video with range-request support
- `GET /metadata/{file_id}.json` - Get extracted metadata
- `WS /ws/{client_id}` - WebSocket for real-time status updates

## WebSocket Interface

Connect to the WebSocket server to receive real-time status updates:

```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/${clientId}`);
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
  │   ├── utils/               # Utility functions
  │   │   ├── rabbitmq.py      # RabbitMQ client
  │   │   ├── state.py         # State management
  │   │   └── validators.py    # Input validation
  │   └── workers/             # Background workers
  │       ├── video_enhancement_worker.py  # Video processing
  │       └── metadata_extraction_worker.py # Metadata extraction
  ├── tests/                   # Test files
  └── processed_videos/        # Output directory for processed files
      └── metadata/            # Output directory for metadata

frontend/
  ├── src/
  │   ├── components/          # React components
  │   │   ├── upload/          # Upload components
  │   │   ├── video/           # Video player components
  │   │   └── metadata/        # Metadata display components
  │   ├── services/            # API services
  │   └── utils/               # Utility functions
  └── public/                  # Static assets
```

## Error Handling

The system has been designed with comprehensive error handling:

- Video format validation
- File size limits
- Processing timeouts
- Connection recovery
- File locking for concurrent access
- FFprobe availability checks
- Codec compatibility detection
- Video player error recovery with retry mechanisms
- Detailed error reporting in UI

## Browser Compatibility

The system is designed to work with all modern browsers:

- Videos are processed with browser-compatible H.264/AAC codecs
- HTTP range requests enable efficient video streaming
- Multi-format source definitions ensure maximum compatibility
- Proper CORS headers for cross-origin resource sharing
- Adaptive video player with fallbacks and retry logic

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.