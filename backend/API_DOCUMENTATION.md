# Distributed Video Processing API Documentation

## Overview

This API allows clients to upload videos for processing through a distributed system. It uses WebSockets for real-time status updates and HTTP endpoints for video uploads and status queries.

The API enables two main processing capabilities:
1. Video enhancement - improves video quality and applies filters
2. Metadata extraction - extracts comprehensive metadata about the video

## Base URLs

- **Development**: `http://localhost:8000`
- **WebSocket Base**: `ws://localhost:8000`

## Authentication

Currently, the API does not require authentication. Client identification is handled through client IDs.

---

## WebSocket API

### Connect to Status Updates

Establish a WebSocket connection to receive real-time updates about video processing.

```
WebSocket: /ws/{client_id}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| client_id | string | A unique identifier for the client |

#### Messages Received

**Connection Confirmation**
```json
{
  "type": "connection",
  "status": "connected",
  "client_id": "string"
}
```

**Upload Status**
```json
{
  "type": "upload_status",
  "file_id": "string",
  "status": "uploaded",
  "message": "Video uploaded successfully",
  "timestamp": "string (ISO format)"
}
```

**Video Enhancement Status Update**
```json
{
  "type": "status_update",
  "file_id": "string",
  "process_type": "video_enhancement",
  "status": "string (pending|processing|completed|failed)",
  "progress": 0-100,
  "error": "string or null",
  "timestamp": "string (ISO format)"
}
```

**Metadata Extraction Status Update**
```json
{
  "type": "status_update",
  "file_id": "string",
  "process_type": "metadata_extraction",
  "status": "string (pending|processing|completed|failed)",
  "progress": 0-100,
  "error": "string or null",
  "timestamp": "string (ISO format)"
}
```

#### Possible Status Values

| Status | Description |
|--------|-------------|
| pending | Task is queued but not yet started |
| processing | Task is currently being processed |
| completed | Task has completed successfully |
| failed | Task has failed (check error field) |

---

## HTTP API

### Upload Video

Upload a video file for processing.

```http
POST /upload
```

#### Request

**Content-Type**: `multipart/form-data`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | file | Yes | Video file to upload (must be a video MIME type) |
| client_id | string | No | Client identifier to associate with this upload |

#### Response

**Content-Type**: `application/json`

**Success Response (200 OK)**
```json
{
  "file_id": "string (UUID)",
  "message": "Video uploaded successfully"
}
```

**Error Responses**

- **400 Bad Request**: File is not a video
- **500 Internal Server Error**: Error saving file or queueing for processing

---

### Get Video Enhancement Status

Get the current status of the video enhancement process for a specific file.

```http
GET /internal/video-enhancement-status/{file_id}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| file_id | string | Unique identifier for the file |

#### Response

**Content-Type**: `application/json`

**Success Response (200 OK)**
```json
{
  "status": "string (pending|processing|completed|failed)",
  "progress": 0-100,
  "error": "string or null",
  "last_updated": "string (ISO format)"
}
```

**Error Responses**

- **404 Not Found**: File not found

---

### Get Metadata Extraction Status

Get the current status of the metadata extraction process for a specific file.

```http
GET /internal/metadata-extraction-status/{file_id}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| file_id | string | Unique identifier for the file |

#### Response

**Content-Type**: `application/json`

**Success Response (200 OK)**
```json
{
  "status": "string (pending|processing|completed|failed)",
  "progress": 0-100,
  "error": "string or null",
  "last_updated": "string (ISO format)"
}
```

**Error Responses**

- **404 Not Found**: File not found

---

## Metadata Format

When metadata extraction is complete, the system generates a JSON file with the following structure:

```json
{
  "file_id": "string",
  "filename": "string",
  "format": "string",
  "resolution": {
    "width": integer,
    "height": integer
  },
  "fps": float,
  "frame_count": integer,
  "duration_seconds": integer,
  "file_size_bytes": integer,
  "bit_rate": "string",
  "color_profile": {
    "histograms": {
      "b": [array of 256 float values],
      "g": [array of 256 float values],
      "r": [array of 256 float values]
    },
    "average_color": {
      "b": integer,
      "g": integer,
      "r": integer
    }
  },
  "advanced": {
    // Additional ffprobe data when available
  }
}
```

## Error Handling

The API uses standard HTTP status codes for error responses:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - The request is invalid (e.g., not a video file) |
| 404 | Not Found - The requested resource was not found |
| 500 | Internal Server Error - Something went wrong on the server |

WebSocket error messages will have the error details in the response message.

## Processing Flow

1. Client connects via WebSocket with a unique client_id
2. Client uploads a video file with the same client_id
3. System returns a file_id for tracking
4. Both video enhancement and metadata extraction workers process the file simultaneously
5. Status updates are sent via WebSocket in real-time
6. Final results can be found in the processed_videos directory
   - Enhanced video: `/processed_videos/enhanced_{file_id}.{extension}`
   - Metadata: `/processed_videos/metadata/{file_id}_metadata.json`

## Rate Limiting

Currently, the API does not implement rate limiting. This is planned for future versions.

## Best Practices

1. Always maintain the WebSocket connection while processing is ongoing
2. Use the same client_id for WebSocket connection and file uploads
3. Check status endpoints if WebSocket connection is lost
4. Keep video files under 100MB for optimal processing 