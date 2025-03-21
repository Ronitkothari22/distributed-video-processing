"""
Configuration module for the video processing system.
Contains system-wide settings and parameters.
"""
import os
from typing import List

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.environ.get('UPLOAD_DIR', os.path.join(BASE_DIR, 'uploads'))
PROCESSED_DIR = os.environ.get('PROCESSED_DIR', os.path.join(BASE_DIR, 'processed_videos'))
METADATA_DIR = os.environ.get('METADATA_DIR', os.path.join(PROCESSED_DIR, 'metadata'))
THUMBNAILS_DIR = os.environ.get('THUMBNAILS_DIR', os.path.join(PROCESSED_DIR, 'thumbnails'))
TEMP_DIR = os.environ.get('TEMP_DIR', os.path.join(BASE_DIR, 'temp'))
STATE_DIR = os.environ.get('STATE_DIR', os.path.join(BASE_DIR, 'state'))

# Create necessary directories
for directory in [UPLOAD_DIR, PROCESSED_DIR, METADATA_DIR, THUMBNAILS_DIR, TEMP_DIR, STATE_DIR]:
    os.makedirs(directory, exist_ok=True)

# RabbitMQ configuration
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.environ.get('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.environ.get('RABBITMQ_USER', 'guest')
RABBITMQ_PASS = os.environ.get('RABBITMQ_PASS', 'guest')
RABBITMQ_VHOST = os.environ.get('RABBITMQ_VHOST', '/')
RABBITMQ_URL = os.environ.get(
    'RABBITMQ_URL', 
    f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/{RABBITMQ_VHOST}"
)
RABBITMQ_RECONNECT_ATTEMPTS = int(os.environ.get('RABBITMQ_RECONNECT_ATTEMPTS', 10))
RABBITMQ_RECONNECT_DELAY = float(os.environ.get('RABBITMQ_RECONNECT_DELAY', 5.0))

# File configuration
MAX_FILE_SIZE_MB = int(os.environ.get('MAX_FILE_SIZE_MB', 500))  # 500MB default max file size
MAX_UPLOAD_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes
SUPPORTED_VIDEO_FORMATS: List[str] = [
    'mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp'
]

# Processing configuration
PROCESSING_TIMEOUT = int(os.environ.get('PROCESSING_TIMEOUT', 300))  # 5 minutes default
MAX_PROCESSING_ATTEMPTS = int(os.environ.get('MAX_PROCESSING_ATTEMPTS', 3))
STATE_RETENTION_DAYS = int(os.environ.get('STATE_RETENTION_DAYS', 7))  # How long to keep processing state

# Server configuration
API_HOST = os.environ.get('API_HOST', '0.0.0.0')
API_PORT = int(os.environ.get('API_PORT', 8000))
ALLOWED_ORIGINS = os.environ.get(
    'ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:5173,http://localhost:8000'
).split(',')
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')
API_PREFIX = os.environ.get('API_PREFIX', '/api')
WEBSOCKET_PATH = os.environ.get('WEBSOCKET_PATH', '/ws')

# Logging configuration
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.environ.get(
    'LOG_FORMAT',
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# State file
PROCESSING_STATES_FILE = "processing_states.json"

# CORS settings - Removed duplicate in favor of ALLOWED_ORIGINS above 