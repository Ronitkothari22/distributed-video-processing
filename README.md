# Distributed Video Processing Pipeline

A distributed event-driven system for video processing, featuring real-time video enhancement and metadata extraction.

## Overview

This project implements a scalable video processing pipeline with the following components:
- FastAPI server for handling uploads and coordination
- RabbitMQ for task distribution
- Video enhancement worker for processing videos
- Metadata extraction worker for analyzing video content
- React frontend for user interaction

## Features

- Real-time video upload and processing
- WebSocket-based status updates
- Multi-client support
- Asynchronous processing
- Error handling and retry mechanisms

## Prerequisites

- Python 3.8+
- Node.js 14+
- RabbitMQ
- FFmpeg (for video processing)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd distributed-video-processing
   ```

2. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. Start the workers (in separate terminals):
   ```bash
   cd backend
   python -m app.workers.video_enhancement_worker
   python -m app.workers.metadata_extraction_worker
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
distributed-video-processing/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── workers/
│   │   └── utils/
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── project_context.md
└── taskbreakdown.md
```

## Documentation

- [Project Context](project_context.md)
- [Task Breakdown](taskbreakdown.md)
- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)

## Development

1. Follow the task breakdown in `taskbreakdown.md`
2. Implement features incrementally
3. Test thoroughly before committing
4. Update documentation as needed

## Testing

- Backend tests: `pytest`
- Frontend tests: `npm test`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is part of an internship task and is not licensed for public use.