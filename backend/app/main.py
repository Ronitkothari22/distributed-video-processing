from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from typing import Dict, Set
import uuid
from datetime import datetime
import logging
from .utils.rabbitmq import RabbitMQClient
from .utils.state import processing_state
import aio_pika

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
    allow_origins=["*"],  # In production, replace with specific origins
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
                    if client_id and client_id in active_connections:
                        try:
                            await active_connections[client_id].send_json({
                                "type": "status_update",
                                "file_id": file_id,
                                "process_type": "video_enhancement",
                                "status": status,
                                "progress": progress,
                                "error": error,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            logger.info(f"Forwarded video enhancement status update to client {client_id}")
                        except Exception as e:
                            logger.error(f"Error sending status to client {client_id}: {str(e)}")
            
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
                    if client_id and client_id in active_connections:
                        try:
                            await active_connections[client_id].send_json({
                                "type": "status_update",
                                "file_id": file_id,
                                "process_type": "metadata_extraction",
                                "status": status,
                                "progress": progress,
                                "error": error,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            logger.info(f"Forwarded metadata extraction status update to client {client_id}")
                        except Exception as e:
                            logger.error(f"Error sending status to client {client_id}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Error handling status message: {str(e)}")

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    
    # Send initial connection message
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "client_id": client_id
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
            await websocket.send_json({
                "type": "message",
                "content": f"Received: {data}"
            })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if client_id in active_connections:
            del active_connections[client_id]

@app.post("/upload")
async def upload_video(file: UploadFile = File(...), client_id: str = None):
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
    
    # Create processing state
    state = processing_state.create_state(file_id, client_id)
    
    # Publish task to RabbitMQ
    message = {
        "file_id": file_id,
        "filepath": filepath,
        "filename": filename,
        "client_id": client_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        await rabbitmq_client.publish_task(message)
        logger.info(f"Published task for file {file_id} to RabbitMQ")
        
        # Send initial upload status to WebSocket if client is connected
        if client_id and client_id in active_connections:
            await active_connections[client_id].send_json({
                "type": "upload_status",
                "file_id": file_id,
                "status": "uploaded",
                "message": "Video uploaded successfully",
                "timestamp": datetime.utcnow().isoformat()
            })
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