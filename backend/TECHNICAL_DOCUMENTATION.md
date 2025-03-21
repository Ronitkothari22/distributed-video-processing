# Backend Technical Documentation

This document provides detailed technical information about the backend implementation of the Distributed Video Processing system, including modules, classes, functions, their inputs, and outputs.

## Core Modules

### 1. FastAPI Server (`app/main.py`)

The main application entry point that initializes the FastAPI server, configures middleware, and defines all API endpoints.

#### Key Functions

##### `startup_event()`
- **Description**: Initializes RabbitMQ connection when the server starts
- **Input**: None
- **Output**: None
- **Side Effects**: Establishes RabbitMQ connection and starts consuming status messages

##### `shutdown_event()`
- **Description**: Closes RabbitMQ connection when the server shuts down
- **Input**: None
- **Output**: None
- **Side Effects**: Closes RabbitMQ connection

##### `handle_status_message(message: aio_pika.IncomingMessage)`
- **Description**: Handles status messages from workers and forwards them to the appropriate client
- **Input**: `message` - RabbitMQ message containing status information
- **Output**: None
- **Side Effects**: Updates processing state and sends WebSocket messages to clients

##### `websocket_endpoint(websocket: WebSocket, client_id: str)`
- **Description**: Handles WebSocket connections from clients
- **Input**:
  - `websocket` - WebSocket connection object
  - `client_id` - Unique identifier for the client
- **Output**: None
- **Side Effects**: Adds client to active connections and listens for messages

##### `upload_video(file: UploadFile, client_id: str = Form(None))`
- **Description**: Handles video file uploads and queues them for processing
- **Input**:
  - `file` - Uploaded video file
  - `client_id` - Optional client identifier
- **Output**: JSON response with file_id and status message
- **Side Effects**: Saves file to upload directory and publishes message to RabbitMQ

##### `video_enhancement_status(file_id: str)`
- **Description**: Returns the current status of video enhancement for a specific file
- **Input**: `file_id` - Unique file identifier
- **Output**: JSON response with status information
- **Side Effects**: None

##### `metadata_extraction_status(file_id: str)`
- **Description**: Returns the current status of metadata extraction for a specific file
- **Input**: `file_id` - Unique file identifier
- **Output**: JSON response with status information
- **Side Effects**: None

##### `get_processed_video(file_id: str, request: Request, response: Response)`
- **Description**: Streams a processed video file with support for HTTP range requests
- **Input**:
  - `file_id` - Unique file identifier
  - `request` - HTTP request object
  - `response` - HTTP response object
- **Output**: Video file stream with appropriate headers
- **Side Effects**: None

##### `get_metadata(file_id: str, response: Response)`
- **Description**: Returns the extracted metadata for a specific file
- **Input**:
  - `file_id` - Unique file identifier
  - `response` - HTTP response object
- **Output**: JSON metadata file
- **Side Effects**: None

### 2. RabbitMQ Client (`app/utils/rabbitmq.py`)

Handles communication with RabbitMQ for task distribution and status updates.

#### Classes

##### `RabbitMQClient`

###### `__init__(self, rabbitmq_url: str = RABBITMQ_URL)`
- **Description**: Initializes the RabbitMQ client
- **Input**: `rabbitmq_url` - RabbitMQ connection URL
- **Output**: None
- **Side Effects**: None

###### `connect(self)`
- **Description**: Establishes connection to RabbitMQ
- **Input**: None
- **Output**: None
- **Side Effects**: Creates connection to RabbitMQ, declares exchanges and queues

###### `close(self)`
- **Description**: Closes the RabbitMQ connection
- **Input**: None
- **Output**: None
- **Side Effects**: Closes RabbitMQ connection

###### `publish_message(self, message: Dict[str, Any], exchange_name: str = "video_tasks")`
- **Description**: Publishes a message to a RabbitMQ exchange
- **Input**:
  - `message` - Dictionary containing message data
  - `exchange_name` - Name of the exchange to publish to
- **Output**: None
- **Side Effects**: Sends message to RabbitMQ exchange

###### `start_consuming_status(self, callback: Callable[[aio_pika.IncomingMessage], Awaitable[None]])`
- **Description**: Starts consuming messages from the status exchange
- **Input**: `callback` - Async function to call for each received message
- **Output**: None
- **Side Effects**: Sets up message consumer

### 3. State Management (`app/utils/state.py`)

Manages processing state for uploaded files with file locking for concurrent access.

#### Classes

##### `ProcessingState`

###### `__init__(self, state_file_path: str = "processing_states.json")`
- **Description**: Initializes the processing state manager
- **Input**: `state_file_path` - Path to the JSON file for state storage
- **Output**: None
- **Side Effects**: Loads existing state if available

###### `load_state(self)`
- **Description**: Loads state from the state file
- **Input**: None
- **Output**: None
- **Side Effects**: Updates internal state dictionary

###### `save_state(self)`
- **Description**: Saves state to the state file with file locking
- **Input**: None
- **Output**: None
- **Side Effects**: Writes state to disk

###### `update_state(self, file_id: str, status: str, progress: int = 0, error: str = None, process_type: str = None)`
- **Description**: Updates the processing state for a file
- **Input**:
  - `file_id` - Unique file identifier
  - `status` - Current status (pending, processing, completed, failed)
  - `progress` - Processing progress percentage (0-100)
  - `error` - Error message if applicable
  - `process_type` - Type of process (video_enhancement or metadata_extraction)
- **Output**: None
- **Side Effects**: Updates state in memory and on disk

###### `get_state(self, file_id: str, process_type: str = None)`
- **Description**: Gets the current state for a file
- **Input**:
  - `file_id` - Unique file identifier
  - `process_type` - Optional process type to filter by
- **Output**: State dictionary for the file
- **Side Effects**: None

### 4. Video Enhancement Worker (`app/workers/video_enhancement_worker.py`)

Processes videos to enhance quality and convert to browser-compatible formats.

#### Classes

##### `VideoEnhancementWorker`

###### `__init__(self, rabbitmq_url: str = RABBITMQ_URL)`
- **Description**: Initializes the video enhancement worker
- **Input**: `rabbitmq_url` - RabbitMQ connection URL
- **Output**: None
- **Side Effects**: Creates necessary directories

###### `startup(self)`
- **Description**: Runs startup checks and initialization
- **Input**: None
- **Output**: None
- **Side Effects**: Checks for FFprobe availability

###### `connect(self)`
- **Description**: Establishes connection to RabbitMQ
- **Input**: None
- **Output**: None
- **Side Effects**: Creates connection, declares exchanges and queues

###### `close(self)`
- **Description**: Closes the RabbitMQ connection
- **Input**: None
- **Output**: None
- **Side Effects**: Closes RabbitMQ connection

###### `enhance_video(self, message: Dict[str, Any])`
- **Description**: Enhances a video file using OpenCV and FFmpeg
- **Input**: `message` - Dictionary containing file information
- **Output**: Dictionary with processing results
- **Side Effects**: Creates enhanced video file

###### `start_consuming(self)`
- **Description**: Starts consuming tasks from the RabbitMQ queue
- **Input**: None
- **Output**: None
- **Side Effects**: Sets up message consumer and begins processing tasks

###### `process_message(self, message: aio_pika.IncomingMessage)`
- **Description**: Processes a message from the RabbitMQ queue
- **Input**: `message` - RabbitMQ message containing task information
- **Output**: None
- **Side Effects**: Calls enhance_video and updates status

### 5. Metadata Extraction Worker (`app/workers/metadata_extraction_worker.py`)

Extracts metadata from video files including resolution, duration, fps, etc.

#### Classes

##### `MetadataExtractionWorker`

###### `__init__(self, rabbitmq_url: str = RABBITMQ_URL)`
- **Description**: Initializes the metadata extraction worker
- **Input**: `rabbitmq_url` - RabbitMQ connection URL
- **Output**: None
- **Side Effects**: Creates necessary directories

###### `startup(self)`
- **Description**: Runs startup checks and initialization
- **Input**: None
- **Output**: None
- **Side Effects**: Checks for FFprobe availability

###### `connect(self)`
- **Description**: Establishes connection to RabbitMQ
- **Input**: None
- **Output**: None
- **Side Effects**: Creates connection, declares exchanges and queues

###### `close(self)`
- **Description**: Closes the RabbitMQ connection
- **Input**: None
- **Output**: None
- **Side Effects**: Closes RabbitMQ connection

###### `extract_metadata(self, message: Dict[str, Any])`
- **Description**: Extracts metadata from a video file
- **Input**: `message` - Dictionary containing file information
- **Output**: Dictionary with extracted metadata
- **Side Effects**: Creates metadata JSON file

###### `start_consuming(self)`
- **Description**: Starts consuming tasks from the RabbitMQ queue
- **Input**: None
- **Output**: None
- **Side Effects**: Sets up message consumer and begins processing tasks

###### `process_message(self, message: aio_pika.IncomingMessage)`
- **Description**: Processes a message from the RabbitMQ queue
- **Input**: `message` - RabbitMQ message containing task information
- **Output**: None
- **Side Effects**: Calls extract_metadata and updates status

## Utility Modules

### 1. Configuration (`app/config.py`)

Contains all configuration settings for the application.

- **RABBITMQ_URL**: RabbitMQ connection URL
- **MAX_FILE_SIZE_MB**: Maximum allowed file size in MB
- **UPLOAD_DIR**: Directory for uploaded files
- **PROCESSED_DIR**: Directory for processed files
- **METADATA_DIR**: Directory for metadata files
- **THUMBNAILS_DIR**: Directory for thumbnail images
- **ALLOWED_ORIGINS**: List of allowed CORS origins
- **PROCESSING_TIMEOUT**: Timeout for processing operations
- **LOG_LEVEL**: Logging level
- **MAX_PROCESSING_ATTEMPTS**: Maximum number of processing attempts

### 2. Validators (`app/utils/validators.py`)

Contains validation utilities for video files.

#### Functions

##### `check_ffprobe_availability()`
- **Description**: Checks if FFprobe is available on the system
- **Input**: None
- **Output**: Boolean indicating if FFprobe is available
- **Side Effects**: None

##### `validate_video_file(file_path: str)`
- **Description**: Validates if a file is a valid video
- **Input**: `file_path` - Path to the file to validate
- **Output**: Tuple of (is_valid, error_message)
- **Side Effects**: None

## Data Flow

1. Client uploads a video through `POST /upload`
2. FastAPI server saves the file and publishes a task to RabbitMQ
3. Both the Video Enhancement Worker and Metadata Extraction Worker receive the task
4. Workers process the file and send status updates to the Processing Status exchange
5. FastAPI server receives status updates and forwards them to the appropriate client via WebSocket
6. Client can access the processed video and metadata when processing is complete

## Error Handling

- File validation ensures only valid videos are processed
- RabbitMQ connections are robust with automatic reconnection
- Processing timeouts prevent indefinite processing
- File locking ensures thread-safe state management
- Comprehensive error reporting to clients via WebSocket 