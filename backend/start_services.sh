#!/bin/bash

# Create the necessary directories
mkdir -p uploads processed_videos processed_videos/metadata

# Check if Python virtual environment is active
if [[ -z "${VIRTUAL_ENV}" ]]; then
    echo "No Python virtual environment detected. Please activate your venv."
    echo "Run: source venv/bin/activate"
    exit 1
fi

# Function to handle script termination
cleanup() {
    echo "Terminating all services..."
    kill $FASTAPI_PID $VIDEO_WORKER_PID $METADATA_WORKER_PID 2>/dev/null
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start FastAPI server
echo "Starting FastAPI server..."
uvicorn app.main:app --reload &
FASTAPI_PID=$!
echo "FastAPI server started with PID $FASTAPI_PID"

# Wait for FastAPI to start
sleep 3

# Start Video Enhancement Worker
echo "Starting Video Enhancement Worker..."
python run_worker.py --worker video-enhancement &
VIDEO_WORKER_PID=$!
echo "Video Enhancement Worker started with PID $VIDEO_WORKER_PID"

# Start Metadata Extraction Worker
echo "Starting Metadata Extraction Worker..."
python run_worker.py --worker metadata-extraction &
METADATA_WORKER_PID=$!
echo "Metadata Extraction Worker started with PID $METADATA_WORKER_PID"

echo "All services started. Press Ctrl+C to stop all services."

# Wait for all background processes
wait 