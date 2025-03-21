from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from starlette.requests import Request
import json
import os
from typing import Dict, Set
import uuid
from datetime import datetime
import logging
from .utils.rabbitmq import RabbitMQClient
from .utils.state import processing_state
import aio_pika
from .config import ALLOWED_ORIGINS
import stat

app = FastAPI(title="Distributed Video Processing API")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Use origins from config
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Video upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# RabbitMQ client
rabbitmq_client = RabbitMQClient()

@app.on_event("startup")
async def startup_event():
    """Initialize RabbitMQ connection and start consuming status messages"""
    await rabbitmq_client.connect()
    await rabbitmq_client.start_consuming_status(handle_status_message)

@app.on_event("shutdown")
async def shutdown_event():
    """Close RabbitMQ connection"""
    await rabbitmq_client.close()

async def handle_status_message(message: aio_pika.IncomingMessage):
    """Handle status messages from workers"""
    async with message.process():
        try:
            data = json.loads(message.body.decode())
            logger.info(f"Received status update: {data}")
            
            if data["type"] == "video_enhancement_status":
                file_id = data["file_id"]
                status = data["status"]
                progress = data.get("progress", 0)
                error = data.get("error")
                
                # Update processing state
                processing_state.update_state(file_id, status, progress, error, "video_enhancement")
                
                # Forward status to connected client if available
                if file_id in processing_state.states:
                    client_id = processing_state.states[file_id].get("client_id")
                    logger.info(f"Found client_id {client_id} for file_id {file_id}")
                    
                    if client_id and client_id in active_connections:
                        try:
                            status_update = {
                                "type": "status_update",
                                "file_id": file_id,
                                "process_type": "video_enhancement",
                                "status": status,
                                "progress": progress,
                                "error": error,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            logger.info(f"Sending video enhancement status update to client {client_id}: {status_update}")
                            await active_connections[client_id].send_json(status_update)
                            logger.info(f"Successfully sent video enhancement status update to client {client_id}")
                        except Exception as e:
                            logger.error(f"Error sending status to client {client_id}: {str(e)}")
                    else:
                        logger.warning(f"Client {client_id} not connected for file_id {file_id}. Active connections: {list(active_connections.keys())}")
                else:
                    logger.warning(f"No client found for file_id {file_id} in processing state")
            
            elif data["type"] == "metadata_extraction_status":
                file_id = data["file_id"]
                status = data["status"]
                progress = data.get("progress", 0)
                error = data.get("error")
                
                # Update processing state
                processing_state.update_state(file_id, status, progress, error, "metadata_extraction")
                
                # Forward status to connected client if available
                if file_id in processing_state.states:
                    client_id = processing_state.states[file_id].get("client_id")
                    logger.info(f"Found client_id {client_id} for file_id {file_id}")
                    
                    if client_id and client_id in active_connections:
                        try:
                            status_update = {
                                "type": "status_update",
                                "file_id": file_id,
                                "process_type": "metadata_extraction",
                                "status": status,
                                "progress": progress,
                                "error": error,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            logger.info(f"Sending metadata extraction status update to client {client_id}: {status_update}")
                            await active_connections[client_id].send_json(status_update)
                            logger.info(f"Successfully sent metadata extraction status update to client {client_id}")
                        except Exception as e:
                            logger.error(f"Error sending status to client {client_id}: {str(e)}")
                    else:
                        logger.warning(f"Client {client_id} not connected for file_id {file_id}. Active connections: {list(active_connections.keys())}")
                else:
                    logger.warning(f"No client found for file_id {file_id} in processing state")
                        
        except Exception as e:
            logger.error(f"Error handling status message: {str(e)}")

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    
    logger.info(f"WebSocket connection established with client_id: {client_id}")
    logger.info(f"Active connections: {list(active_connections.keys())}")
    
    # Send initial connection message
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "client_id": client_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WebSocket message from client {client_id}: {data}")
            # Handle incoming messages if needed
            await websocket.send_json({
                "type": "message",
                "content": f"Received: {data}",
                "timestamp": datetime.utcnow().isoformat()
            })
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
    finally:
        if client_id in active_connections:
            logger.info(f"Removing WebSocket connection for client_id: {client_id}")
            del active_connections[client_id]

@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    client_id: str = None
):
    # Log the client_id to debug issues
    logger.info(f"Upload request received with client_id: '{client_id}'")
    
    # Error if file is not a video
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{file_id}{file_extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save the file
    try:
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Make sure client_id is a string, not None
    effective_client_id = client_id if client_id else "unknown_client"
    logger.info(f"Creating processing state for file_id: {file_id} with client_id: '{effective_client_id}'")
    
    # Create processing state
    state = processing_state.create_state(file_id, effective_client_id)
    
    # Publish task to RabbitMQ
    message = {
        "file_id": file_id,
        "filepath": filepath,
        "filename": filename,
        "client_id": effective_client_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        await rabbitmq_client.publish_task(message)
        logger.info(f"Published task for file {file_id} to RabbitMQ")
        
        # Send initial upload status to WebSocket if client is connected
        if effective_client_id in active_connections:
            logger.info(f"Sending initial upload status to client {effective_client_id}")
            await active_connections[effective_client_id].send_json({
                "type": "upload_status",
                "file_id": file_id,
                "status": "uploaded",
                "message": "Video uploaded successfully",
                "timestamp": datetime.utcnow().isoformat()
            })
            logger.info(f"Successfully sent initial upload status to client {effective_client_id}")
        else:
            logger.warning(f"Client {effective_client_id} not connected. Active connections: {list(active_connections.keys())}")
    except Exception as e:
        logger.error(f"Failed to publish task to RabbitMQ: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to queue video for processing")
    
    return {"file_id": file_id, "message": "Video uploaded successfully"}

@app.get("/internal/video-enhancement-status/{file_id}")
async def get_video_enhancement_status(file_id: str):
    state = processing_state.get_state(file_id)
    if not state:
        raise HTTPException(status_code=404, detail="File not found")
    return state["video_enhancement"]

@app.get("/internal/metadata-extraction-status/{file_id}")
async def get_metadata_extraction_status(file_id: str):
    state = processing_state.get_state(file_id)
    if not state:
        raise HTTPException(status_code=404, detail="File not found")
    return state["metadata_extraction"]

# Add new endpoints to serve the processed files

@app.get("/processed_videos/{file_id}")
async def get_processed_video(file_id: str):
    """Serve a processed video file by file_id"""
    # Look for the file with the given ID
    processed_dir = os.environ.get('PROCESSED_DIR', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'processed_videos'))
    
    logger.info(f"Looking for processed video with file_id: {file_id}")
    
    # The pattern used by the worker is "{file_id}_enhanced.{extension}"
    # Try different possible extensions
    possible_extensions = [".mp4", ".avi", ".mov", ".mkv"]
    
    # List files in the directory to debug
    try:
        files_in_dir = os.listdir(processed_dir)
        logger.info(f"Files in processed_dir: {files_in_dir}")
    except Exception as e:
        logger.error(f"Error listing processed_dir: {str(e)}")
    
    # First, try the exact pattern from video_enhancement_worker.py
    found_file = None
    file_extension = None
    
    for ext in possible_extensions:
        filepath = os.path.join(processed_dir, f"{file_id}_enhanced{ext}")
        if os.path.exists(filepath):
            logger.info(f"Found processed video: {filepath}")
            found_file = filepath
            file_extension = ext
            break
    
    # If not found, try alternative patterns
    if not found_file:
        for file in files_in_dir:
            if file.startswith(file_id) and any(file.endswith(ext) for ext in possible_extensions):
                filepath = os.path.join(processed_dir, file)
                logger.info(f"Found alternative processed video: {filepath}")
                found_file = filepath
                file_extension = os.path.splitext(file)[1]
                break
    
    # If we get here and no file was found, return 404
    if not found_file:
        logger.warning(f"Processed video not found for file_id: {file_id}")
        raise HTTPException(status_code=404, detail="Processed video not found")
    
    # Set the appropriate media type based on extension
    media_type = f"video/{file_extension[1:]}" if file_extension != ".mkv" else "video/x-matroska"
    
    # Function to handle range requests properly
    def send_file_partial(file_path: str, request: Request):
        file_size = os.stat(file_path).st_size
        
        # Parse the Range header
        range_header = request.headers.get("range")
        
        # Default values (no range specified - full file)
        start = 0
        end = file_size - 1
        
        # If a range is specified
        if range_header:
            range_match = range_header.strip().lower()
            if range_match.startswith("bytes="):
                ranges = range_match[6:].split(",")[0].split("-")
                if ranges[0]:
                    start = int(ranges[0])
                if ranges[1]:
                    end = min(int(ranges[1]), file_size - 1)
        
        # Calculate the chunk size
        chunk_size = end - start + 1
        
        # Open file and seek to the right position
        def iterfile():
            with open(file_path, mode="rb") as f:
                f.seek(start)
                yield from iter(lambda: f.read(4096), b"")
        
        # Set appropriate headers
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": media_type,
            "Content-Disposition": f'inline; filename="{os.path.basename(file_path)}"',
            "Cache-Control": "max-age=86400",  # Cache for a day
        }
        
        # Return a partial response if a range was specified
        if range_header:
            return StreamingResponse(iterfile(), status_code=206, headers=headers)
        else:
            return StreamingResponse(iterfile(), headers=headers)
    
    from starlette.background import BackgroundTask
    
    # Return the file with proper headers and range support
    return send_file_partial(found_file, Request(scope={"type": "http", "headers": []}))

@app.get("/metadata/{file_id}.json")
async def get_metadata(file_id: str):
    """Serve a metadata file by file_id"""
    metadata_dir = os.environ.get('METADATA_DIR', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'processed_videos', 'metadata'))
    
    logger.info(f"Looking for metadata with file_id: {file_id}")
    
    # The pattern used by the worker is "{file_id}_metadata.json"
    metadata_file = f"{file_id}_metadata.json"
    filepath = os.path.join(metadata_dir, metadata_file)
    
    # List files in the directory to debug
    try:
        files_in_dir = os.listdir(metadata_dir)
        logger.info(f"Files in metadata_dir: {files_in_dir}")
    except Exception as e:
        logger.error(f"Error listing metadata_dir: {str(e)}")
    
    # Check for the exact pattern used by the metadata worker
    if os.path.exists(filepath):
        logger.info(f"Found metadata file: {filepath}")
        # Read the file content and return as JSON with proper CORS headers
        with open(filepath, 'r') as f:
            metadata_content = json.loads(f.read())
            return JSONResponse(
                content=metadata_content,
                headers={
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "max-age=86400",  # Cache for a day
                }
            )
    
    # If not found, try alternative patterns
    for file in files_in_dir:
        if file.startswith(file_id) and file.endswith(".json"):
            alt_filepath = os.path.join(metadata_dir, file)
            logger.info(f"Found alternative metadata file: {alt_filepath}")
            with open(alt_filepath, 'r') as f:
                metadata_content = json.loads(f.read())
                return JSONResponse(
                    content=metadata_content,
                    headers={
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "max-age=86400",  # Cache for a day
                    }
                )
    
    # If we get here, no matching file was found
    logger.warning(f"Metadata file not found for file_id: {file_id}")
    raise HTTPException(status_code=404, detail="Metadata file not found") 