# Distributed Video Processing Frontend

A modern React application for video upload, processing, and playback with real-time status updates.

## Features

- **Video Upload**: Upload videos with progress tracking
- **Real-time Status Updates**: WebSocket connection for live processing updates
- **Enhanced Video Player**: Browser-compatible video playback with advanced features
- **Metadata Visualization**: Display extracted video metadata
- **Responsive Design**: Works across desktop and mobile devices

## Advanced Video Player

The frontend includes a state-of-the-art video player with the following features:

- **Multi-format Support**: Handles various video formats through multiple source elements
- **Resilient Loading**: Automatic retry mechanism for intermittent connection issues
- **Comprehensive Error Handling**: Detailed error messages for troubleshooting
- **Video Controls**: Play/pause, volume, fullscreen, and download functionality
- **Cross-browser Compatibility**: Works across Chrome, Firefox, Safari, and Edge

## Technologies Used

- React 18
- TypeScript
- Material UI
- Vite (for fast development and building)
- WebSocket for real-time communication
- Fetch API for HTTP requests

## Installation and Setup

1. Install dependencies
```bash
npm install
```

2. Start development server
```bash
npm run dev
```

3. Build for production
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── upload/
│   │   │   └── VideoUpload.tsx       # Video upload component
│   │   ├── video/
│   │   │   └── VideoPlayer.tsx       # Enhanced video player component
│   │   ├── metadata/
│   │   │   └── MetadataDisplay.tsx   # Metadata visualization
│   │   └── common/
│   │       └── StatusIndicator.tsx   # Processing status component
│   ├── services/
│   │   ├── ApiService.ts             # HTTP API calls
│   │   └── WebSocketService.ts       # WebSocket connection 
│   ├── utils/
│   │   └── helpers.ts                # Utility functions
│   ├── App.tsx                       # Main application component
│   └── main.tsx                      # Application entry point
├── public/                           # Static assets
├── index.html                        # HTML template
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies and scripts
```


### Comprehensive Error Handling

The player provides detailed error feedback:
- Network errors (server unreachable)
- Format errors (unsupported codec)
- CORS errors (cross-origin issues)
- Specific browser codec support issues



## Development Mode

Run the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

## Building for Production

Create an optimized production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Troubleshooting

If you encounter video playback issues:

1. Check the browser console for specific error messages
2. Verify that the backend server is running
3. Ensure the video has been fully processed
4. Try a different browser to isolate browser-specific issues
5. Check network tab in dev tools for HTTP status codes
6. Verify that CORS is properly configured


