# Distributed Video Processing - Frontend

This is the frontend component of the distributed video processing pipeline. It provides a user interface for uploading videos and viewing processing status in real-time.

## Features

- Video upload with progress tracking
- Real-time status updates via WebSocket
- Display of processed videos
- Metadata visualization
- Multi-client support

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── src/
│   ├── components/         # React components
│   ├── services/          # API and WebSocket services
│   ├── utils/            # Utility functions
│   └── App.js            # Main application component
├── package.json          # Node.js dependencies
└── README.md            # This file
```

## Components

1. Video Upload
   - File selection
   - Upload progress
   - Error handling

2. Status Display
   - Processing status
   - Real-time updates
   - Error notifications

3. Video Player
   - Enhanced video playback
   - Metadata display
   - Download options

## Development

The application is built with:
- React
- WebSocket for real-time updates
- Material-UI for components
- Axios for HTTP requests 