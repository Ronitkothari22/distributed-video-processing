# Frontend Technical Documentation

This document provides detailed technical information about the frontend implementation of the Distributed Video Processing system, including React components, services, and utilities with their inputs and outputs.

## Core Components

### 1. Main Application (`src/App.tsx`)

The main application component that coordinates the video upload, processing, and playback experience.

#### State Management
- `videoProcessing`: Manages the current video processing state
- `wsConnected`: Tracks WebSocket connection status
- `notification`: Manages user notifications

#### Key Functions

##### `updateProcessingStatus(message: StatusUpdateMessage)`
- **Description**: Updates the processing status based on WebSocket messages
- **Input**: `message` - Status update message from WebSocket
- **Output**: None
- **Side Effects**: Updates the videoProcessing state

##### `handleVideoUpload(fileId: string, filename: string)`
- **Description**: Handles successful video upload events
- **Input**: 
  - `fileId` - Unique identifier for the uploaded file
  - `filename` - Name of the uploaded file
- **Output**: None
- **Side Effects**: Initializes videoProcessing state for the file

##### `showNotification(message: string, severity: 'success' | 'info' | 'warning' | 'error')`
- **Description**: Shows a notification to the user
- **Input**: 
  - `message` - Notification message text
  - `severity` - Type of notification
- **Output**: None
- **Side Effects**: Updates the notification state

### 2. Video Upload Component (`src/components/upload/VideoUpload.tsx`)

Handles the video upload process with progress tracking.

#### Props
- `onUploadComplete`: Callback function when upload is completed
- `wsConnected`: WebSocket connection status

#### Key Functions

##### `handleFileSelect(event: React.ChangeEvent<HTMLInputElement>)`
- **Description**: Handles file selection from the file input
- **Input**: `event` - File input change event
- **Output**: None
- **Side Effects**: Updates selectedFile state

##### `handleUpload()`
- **Description**: Initiates the file upload process
- **Input**: None
- **Output**: None
- **Side Effects**: Starts file upload, updates upload progress

##### `uploadFile(file: File)`
- **Description**: Uploads a file to the server
- **Input**: `file` - File to upload
- **Output**: Promise resolving to the upload response
- **Side Effects**: Updates upload progress, shows error messages

### 3. Video Player Component (`src/components/video/VideoPlayer.tsx`)

Plays processed videos with enhanced player controls and error handling.

#### Props
- `fileId`: Unique identifier for the video file
- `isProcessingComplete`: Boolean indicating if processing is complete

#### Key Functions

##### `loadVideo()`
- **Description**: Loads the video when processing is complete
- **Input**: None
- **Output**: None
- **Side Effects**: Sets video source URL, updates loading state

##### `handleVideoError()`
- **Description**: Handles video loading errors
- **Input**: None
- **Output**: None
- **Side Effects**: Shows error message, attempts to reload

##### `handleVideoLoaded()`
- **Description**: Handles successful video loading
- **Input**: None
- **Output**: None
- **Side Effects**: Updates loading state, hides error message

### 4. Metadata Display Component (`src/components/video/MetadataDisplay.tsx`)

Displays extracted video metadata in a structured format.

#### Props
- `fileId`: Unique identifier for the video file
- `isProcessingComplete`: Boolean indicating if metadata processing is complete

#### Key Functions

##### `fetchMetadata()`
- **Description**: Fetches metadata from the server
- **Input**: None
- **Output**: None
- **Side Effects**: Updates metadata state

##### `formatMetadataValue(key: string, value: any)`
- **Description**: Formats metadata values for display
- **Input**: 
  - `key` - Metadata field name
  - `value` - Metadata field value
- **Output**: Formatted metadata value
- **Side Effects**: None

### 5. Processing Status Component (`src/components/status/ProcessingStatus.tsx`)

Displays the current processing status with progress bars.

#### Props
- `videoProcessing`: Current video processing state

#### Key Functions

##### `getStatusColor(status: string)`
- **Description**: Gets the appropriate color for a status
- **Input**: `status` - Processing status string
- **Output**: Color string for the status
- **Side Effects**: None

##### `renderTimestamp(timestamp: string)`
- **Description**: Formats and renders a timestamp
- **Input**: `timestamp` - ISO format timestamp
- **Output**: Formatted timestamp string
- **Side Effects**: None

## Services

### 1. WebSocket Service (`src/services/WebSocketService.ts`)

Manages WebSocket connection for real-time updates.

#### Key Functions

##### `connect()`
- **Description**: Establishes WebSocket connection
- **Input**: None
- **Output**: Promise resolving on successful connection
- **Side Effects**: Sets up WebSocket connection and message handling

##### `disconnect()`
- **Description**: Closes WebSocket connection
- **Input**: None
- **Output**: None
- **Side Effects**: Closes WebSocket connection if open

##### `sendMessage(message: any)`
- **Description**: Sends a message over WebSocket
- **Input**: `message` - Message to send
- **Output**: None
- **Side Effects**: Sends message if connection is open

##### `addMessageListener(listener: (message: any) => void)`
- **Description**: Adds a message listener
- **Input**: `listener` - Callback function for messages
- **Output**: None
- **Side Effects**: Adds listener to the message listeners array

##### `removeMessageListener(listener: (message: any) => void)`
- **Description**: Removes a message listener
- **Input**: `listener` - Callback function to remove
- **Output**: None
- **Side Effects**: Removes listener from the message listeners array

### 2. API Service (`src/services/ApiService.ts`)

Handles HTTP API calls to the backend.

#### Key Functions

##### `uploadVideo(file: File, clientId?: string)`
- **Description**: Uploads a video file
- **Input**: 
  - `file` - File to upload
  - `clientId` - Optional client identifier
- **Output**: Promise resolving to the upload response
- **Side Effects**: None

##### `getProcessedVideo(fileId: string)`
- **Description**: Gets the URL for a processed video
- **Input**: `fileId` - Unique file identifier
- **Output**: Video URL string
- **Side Effects**: None

##### `getMetadata(fileId: string)`
- **Description**: Fetches metadata for a video
- **Input**: `fileId` - Unique file identifier
- **Output**: Promise resolving to the metadata
- **Side Effects**: None

## Utilities

### 1. Helper Functions (`src/utils/helpers.ts`)

General utility functions used across the application.

#### Functions

##### `formatTimestamp(timestamp: string)`
- **Description**: Formats an ISO timestamp for display
- **Input**: `timestamp` - ISO format timestamp string
- **Output**: Human-readable timestamp string
- **Side Effects**: None

##### `formatFileSize(bytes: number)`
- **Description**: Formats file size in bytes to human-readable format
- **Input**: `bytes` - Size in bytes
- **Output**: Formatted size string (e.g., "1.5 MB")
- **Side Effects**: None

##### `generateClientId()`
- **Description**: Generates a unique client identifier
- **Input**: None
- **Output**: Unique client ID string
- **Side Effects**: None

## Type Definitions

### 1. Types (`src/types/index.ts`)

TypeScript type definitions used throughout the application.

#### Key Types

##### `VideoProcessingState`
- **Description**: Represents the state of video processing
- **Properties**:
  - `file_id`: Unique file identifier
  - `filename`: Original filename
  - `uploadTime`: Timestamp of upload
  - `videoEnhancement`: Processing state for video enhancement
  - `metadataExtraction`: Processing state for metadata extraction

##### `ProcessingStatus`
- **Description**: Represents the status of a single processing step
- **Properties**:
  - `status`: Current status (pending, processing, completed, failed)
  - `progress`: Processing progress (0-100)
  - `error`: Error message if applicable
  - `last_updated`: Timestamp of last update

##### `StatusUpdateMessage`
- **Description**: WebSocket message for status updates
- **Properties**:
  - `type`: Message type
  - `file_id`: File identifier
  - `process_type`: Type of process
  - `status`: Current status
  - `progress`: Processing progress
  - `error`: Error message if applicable
  - `timestamp`: Timestamp of update

##### `WebSocketMessage`
- **Description**: Base type for WebSocket messages
- **Properties**:
  - `type`: Message type

## Data Flow

1. User selects a video file in the VideoUpload component
2. VideoUpload uploads the file to the server using ApiService
3. The server responds with a file_id
4. App component initializes a videoProcessing state for the file
5. WebSocketService receives status updates from the server
6. updateProcessingStatus updates the videoProcessing state
7. ProcessingStatus component displays current progress
8. When both tasks are complete, VideoPlayer and MetadataDisplay components load content

## Error Handling

- VideoUpload component shows file validation errors
- VideoPlayer has retry logic for video loading failures
- App component displays notification messages for process status
- WebSocketService includes reconnection logic
- ApiService includes error handling for HTTP requests 